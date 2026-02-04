/**
 * Proxy CORS pour Project Gutenberg
 * Permet de contourner les restrictions CORS de gutenberg.org
 */

const gutenbergCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const COOLDOWN_MS = 1000 * 60; // 1 minute
let gutenbergCooldownUntil = 0;

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCors(res);
        res.status(204).end();
        return;
    }

    try {
        const { url } = req.query || {};
        if (!url || typeof url !== 'string') {
            console.error('Gutenberg proxy: Missing url parameter');
            res.status(400).send('Missing url');
            return;
        }

        console.log('Gutenberg proxy: Fetching:', url.substring(0, 100));

        let parsed;
        try {
            parsed = new URL(url);
        } catch (e) {
            console.error('Gutenberg proxy: Invalid URL:', url);
            res.status(400).send('Invalid url');
            return;
        }

        const hostname = parsed.hostname.toLowerCase();

        // Liste blanche des domaines autorisés pour Gutenberg
        const allowedDomains = [
            'www.gutenberg.org',
            'gutenberg.org',
            'aleph.gutenberg.org'
        ];

        const allowed = allowedDomains.some(domain =>
            hostname === domain || hostname.endsWith('.' + domain)
        );

        if (!allowed) {
            console.error('Gutenberg proxy: Forbidden domain:', hostname);
            res.status(403).send(`Forbidden: ${hostname} not in whitelist`);
            return;
        }

        // Vérifier le cooldown (rate limiting)
        if (Date.now() < gutenbergCooldownUntil) {
            setCors(res);
            res.setHeader('Retry-After', Math.ceil((gutenbergCooldownUntil - Date.now()) / 1000));
            res.status(429).send('Gutenberg rate limit cooldown');
            return;
        }

        // Vérifier le cache
        const cacheKey = url;
        const cached = gutenbergCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log('Gutenberg proxy: Cache hit for:', url.substring(0, 60));
            setCors(res);
            res.setHeader('Content-Type', cached.contentType);
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.status(200).send(Buffer.from(cached.body));
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        console.log('Gutenberg proxy: Making request to:', hostname);

        const upstream = await fetch(url, {
            redirect: 'follow',
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                'Accept': 'text/plain, text/html, application/xhtml+xml, */*',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
                'Accept-Encoding': 'identity'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Gutenberg proxy: Response status:', upstream.status);

        if (!upstream.ok) {
            const errorText = await upstream.text().catch(() => 'Unknown error');
            console.error('Gutenberg proxy: Upstream error:', upstream.status, errorText.substring(0, 200));
            
            // Activer le cooldown si rate limited
            if (upstream.status === 429 || upstream.status === 503) {
                gutenbergCooldownUntil = Date.now() + COOLDOWN_MS;
            }
            
            setCors(res);
            res.status(upstream.status).send(errorText);
            return;
        }

        const contentType = upstream.headers.get('content-type') || 'text/plain; charset=utf-8';
        const body = await upstream.arrayBuffer();

        // Mettre en cache
        gutenbergCache.set(cacheKey, {
            timestamp: Date.now(),
            contentType,
            body: Buffer.from(body)
        });

        // Nettoyer le cache si trop grand (max 100 entrées)
        if (gutenbergCache.size > 100) {
            const oldestKey = gutenbergCache.keys().next().value;
            gutenbergCache.delete(oldestKey);
        }

        console.log('Gutenberg proxy: Success, body size:', body.byteLength);

        setCors(res);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=600');
        res.status(200).send(Buffer.from(body));
    } catch (err) {
        console.error('Gutenberg proxy: Error:', err.message);
        setCors(res);
        res.status(502).send('Gutenberg proxy error: ' + err.message);
    }
}
