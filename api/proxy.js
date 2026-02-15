/**
 * Proxy CORS générique pour Palimpseste
 * Remplace les proxies tiers (corsproxy.io, allorigins.win, r.jina.ai)
 * par un proxy maîtrisé sur Vercel.
 *
 * Usage : /api/proxy?url=<encoded-url>
 */

const ALLOWED_DOMAINS = [
    // Sources littéraires
    'archive.org',
    'openlibrary.org',
    'sacred-texts.com',
    'www.sacred-texts.com',
    'perseus.tufts.edu',
    'www.perseus.tufts.edu',
    // Gutenberg (texte brut)
    'www.gutenberg.org',
    'gutenberg.org',
    'aleph.gutenberg.org',
    // Wikisource / Wikimedia
    'wikisource.org',
    'wikipedia.org',
    'wikimedia.org',
    // PoetryDB
    'poetrydb.org',
];

// In-memory cache (per-instance, reset on cold start)
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
const MAX_CACHE_ENTRIES = 200;

function isDomainAllowed(hostname) {
    const h = hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(
        (d) => h === d || h.endsWith('.' + d)
    );
}

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

function evictCache() {
    if (cache.size <= MAX_CACHE_ENTRIES) return;
    // Remove oldest entries
    const entries = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
    for (const [key] of toRemove) cache.delete(key);
}

export default async function handler(req, res) {
    // Preflight
    if (req.method === 'OPTIONS') {
        setCors(res);
        res.status(204).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).send('Method not allowed');
        return;
    }

    try {
        const { url } = req.query || {};

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Missing ?url= parameter' });
            return;
        }

        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            res.status(400).json({ error: 'Invalid URL' });
            return;
        }

        if (!isDomainAllowed(parsed.hostname)) {
            res.status(403).json({
                error: `Domain not allowed: ${parsed.hostname}`,
                allowed: ALLOWED_DOMAINS,
            });
            return;
        }

        // Check cache
        const cacheKey = url;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
            setCors(res);
            res.setHeader('Content-Type', cached.contentType);
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.setHeader('X-Cache', 'HIT');
            res.status(200).send(Buffer.from(cached.body));
            return;
        }

        // Fetch upstream
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const upstream = await fetch(url, {
            redirect: 'follow',
            cache: 'no-store',
            headers: {
                'User-Agent':
                    'Palimpseste/1.0 (open-source literary reader; +https://palimpseste.vercel.app)',
                Accept: 'text/plain, application/json, text/html, text/xml, application/xml, */*',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!upstream.ok) {
            const errorText = await upstream.text().catch(() => 'Unknown error');
            setCors(res);
            res.status(upstream.status).send(errorText.substring(0, 2000));
            return;
        }

        const contentType =
            upstream.headers.get('content-type') || 'text/plain; charset=utf-8';
        const body = await upstream.arrayBuffer();

        // Store in cache
        if (body.byteLength < 512_000) {
            // Only cache responses < 500 KB
            cache.set(cacheKey, { ts: Date.now(), contentType, body });
            evictCache();
        }

        setCors(res);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('X-Cache', 'MISS');
        res.status(200).send(Buffer.from(body));
    } catch (err) {
        setCors(res);
        if (err.name === 'AbortError') {
            res.status(504).json({ error: 'Upstream timeout (15s)' });
        } else {
            res.status(502).json({ error: 'Proxy error: ' + err.message });
        }
    }
}
