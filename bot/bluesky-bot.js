/**
 * Bot Bluesky — Palimpseste
 * 
 * Poste automatiquement des extraits littéraires.
 * Source primaire : tendances Supabase (extraits curés par les utilisateurs).
 * Fallback : récupération live depuis Wikisource.
 * Exécuté via GitHub Actions (1x/heure, FR + EN).
 * 
 * Nécessite les variables d'environnement :
 *   BLUESKY_IDENTIFIER  (ex: palimpseste.bsky.social)
 *   BLUESKY_APP_PASSWORD (mot de passe d'app généré dans Settings)
 */

const https = require('https');

// ─── Wikisource Config ───

const WIKISOURCES = [
    { lang: 'fr', url: 'https://fr.wikisource.org', terms: ['Poésie', 'Roman', 'Conte', 'Théâtre', 'Philosophie', 'Lettres', 'Fable'] },
    { lang: 'en', url: 'https://en.wikisource.org', terms: ['Poetry', 'Novel', 'Tale', 'Play', 'Philosophy'] },
    { lang: 'de', url: 'https://de.wikisource.org', terms: ['Gedicht', 'Roman', 'Märchen', 'Theater'] },
    { lang: 'it', url: 'https://it.wikisource.org', terms: ['Poesia', 'Romanzo', 'Favola', 'Teatro'] },
    { lang: 'es', url: 'https://es.wikisource.org', terms: ['Poesía', 'Novela', 'Cuento', 'Teatro'] },
    { lang: 'la', url: 'https://la.wikisource.org', terms: ['carmen', 'ode', 'epistula', 'fabula'] },
];

const LANG_WEIGHTS = { fr: 5, en: 2, de: 1, it: 1, es: 1, la: 1 };

// ─── HTTP Helpers ───

function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'PalimpsestBot/1.0 (https://palimpseste.vercel.app)' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
            });
        }).on('error', reject);
    });
}

function httpPost(hostname, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const jsonBody = JSON.stringify(body);
        const options = {
            hostname,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonBody),
                ...headers
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
                    else reject(new Error(`Bluesky API ${res.statusCode}: ${JSON.stringify(parsed)}`));
                } catch (e) {
                    reject(new Error(`Bluesky API ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(jsonBody);
        req.end();
    });
}

// ─── Supabase Trending Config ───

const SUPABASE_URL = 'https://cqoepdrqifilqxnvflyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2VwZHJxaWZpbHF4bnZmbHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzQxMTksImV4cCI6MjA4NDc1MDExOX0.e7dJmzUEgzDIix12ca38HvBmF7Cgp_fTZPT6gZ6Xy5s';

/**
 * Fetch trending extraits from Supabase (the app's user-curated content).
 * Returns a quote object { text, author, source, lang } or null.
 */
async function fetchTrendingQuote(forceLang) {
    try {
        // Query Supabase REST API for top-liked extracts
        // Note: is_silent can be NULL (most rows), so we use or filter
        const query = new URLSearchParams({
            select: 'id,texte,source_title,source_author,source_url,likes_count',
            order: 'likes_count.desc,created_at.desc',
            limit: '30',
            'or': '(is_silent.is.null,is_silent.eq.false)',
            'source_author': 'not.is.null',
            'texte': 'not.is.null',
        });

        const url = `${SUPABASE_URL}/rest/v1/extraits?${query.toString()}`;

        const data = await new Promise((resolve, reject) => {
            https.get(url, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Accept': 'application/json',
                    'User-Agent': 'PalimpsestBot/1.0',
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
                        else reject(new Error(`Supabase ${res.statusCode}: ${body}`));
                    } catch (e) { reject(new Error(`Supabase JSON parse: ${e.message}`)); }
                });
            }).on('error', reject);
        });

        if (!Array.isArray(data) || data.length === 0) {
            console.log('   No trending extraits found in Supabase');
            return null;
        }

        console.log(`   Found ${data.length} trending extraits in Supabase`);

        // Filter: need texte >= 30 chars, real author, not junk content
        const valid = data.filter(e =>
            e.texte && e.texte.trim().length >= 30 &&
            e.source_author && e.source_author.trim().length > 1 &&
            isQuotePostWorthy(e.texte, e.source_author)
        );

        if (valid.length === 0) {
            console.log('   No valid extraits after filtering');
            return null;
        }

        // Pick a random one from top results (weighted toward top)
        // Top 5 get 3x weight, next 10 get 2x, rest get 1x
        const pool = [];
        valid.forEach((e, i) => {
            const weight = i < 5 ? 3 : i < 15 ? 2 : 1;
            for (let w = 0; w < weight; w++) pool.push(e);
        });
        const pick = pool[Math.floor(Math.random() * pool.length)];

        // Detect language from source_url or default based on forceLang
        let lang = forceLang || 'fr';
        if (pick.source_url) {
            if (pick.source_url.includes('fr.wikisource') || pick.source_url.includes('/fr/')) lang = 'fr';
            else if (pick.source_url.includes('en.wikisource') || pick.source_url.includes('/en/')) lang = 'en';
            else if (pick.source_url.includes('de.wikisource')) lang = 'de';
            else if (pick.source_url.includes('it.wikisource')) lang = 'it';
            else if (pick.source_url.includes('es.wikisource')) lang = 'es';
            else if (pick.source_url.includes('la.wikisource')) lang = 'la';
        }

        // If forceLang is specified and doesn't match, skip (we'll fall back to Wikisource)
        if (forceLang && lang !== forceLang) {
            console.log(`   Picked extrait is ${lang} but need ${forceLang}, trying another…`);
            // Try to find one that matches forceLang
            const langMatches = valid.filter(e => {
                if (!e.source_url) return forceLang === 'fr'; // default assume French
                if (e.source_url.includes(`${forceLang}.wikisource`)) return true;
                if (e.source_url.includes(`/${forceLang}/`)) return true;
                return false;
            });
            if (langMatches.length === 0) {
                console.log(`   No trending extraits for lang=${forceLang}`);
                return null;
            }
            const langPick = langMatches[Math.floor(Math.random() * langMatches.length)];
            return {
                text: langPick.texte.trim(),
                author: langPick.source_author.trim(),
                source: langPick.source_url || `${langPick.source_title}`,
                lang: forceLang,
                fromTrending: true,
            };
        }

        return {
            text: pick.texte.trim(),
            author: pick.source_author.trim(),
            source: pick.source_url || `${pick.source_title}`,
            lang,
            fromTrending: true,
        };

    } catch (err) {
        console.log(`   ⚠️ Supabase trending fetch failed: ${err.message}`);
        return null;
    }
}

// ─── Universal Post Quality Gate ───

/**
 * Vérifie qu'un texte + auteur sont dignes d'être postés.
 * Appliqué à TOUTES les sources (trending ET Wikisource).
 */
function isQuotePostWorthy(text, author) {
    if (!text || !author) return false;
    const t = text.trim();
    const a = author.trim().toLowerCase();

    // ── Rejeter les notices légales / copyright ──
    if (/public domain|domaine public|united states|federal government|17\s*U\.?S\.?C/i.test(t)) return false;
    if (/copyright|©|all rights reserved|creative commons|free documentation license/i.test(t)) return false;
    if (/this work is (in the |)public domain/i.test(t)) return false;

    // ── Rejeter les encyclopédies / dictionnaires ──
    if (/encyclop[aæ]edia|encyclopédie|dictionnaire|dictionary|wörterbuch/i.test(a)) return false;
    if (/^\d{4}\s/i.test(a)) return false; // "1911 Encyclopædia…"
    if (/wikisource|wikipedia|wiki/i.test(a)) return false;

    // ── Rejeter les pages de titre / frontispices (texte très majoritairement en MAJUSCULES) ──
    const upper = (t.match(/[A-ZÀ-Ü]/g) || []).length;
    const lower = (t.match(/[a-zà-ü]/g) || []).length;
    if (upper + lower > 20 && upper / (upper + lower) > 0.55) return false;

    // ── Rejeter le texte avec trop de mots TOUT EN MAJUSCULES ──
    const words = t.split(/\s+/);
    const capsWords = words.filter(w => w.length > 2 && w === w.toUpperCase() && /[A-ZÀ-Ü]/.test(w));
    if (words.length > 5 && capsWords.length / words.length > 0.3) return false;

    // ── Rejeter le texte qui ressemble à des métadonnées éditeur ──
    if (/\b(libraire|imprimeur|éditeur|typograph|imprimerie|chez\s[A-Z])\b/i.test(t) &&
        /\bPARIS\b|\bLONDON\b|\bLYON\b|\bBRUXELLES\b/.test(t)) return false;

    // ── Rejeter les textes trop courts pour un post intéressant ──
    if (t.length < 40) return false;

    // ── Rejeter les problèmes d'encodage (caractères de remplacement) ──
    if (/\uFFFD|ï¿½|Ã©|Ã¨|Ã |â€™|â€œ/.test(t)) return false;

    // ── Rejeter les listes / index (trop de retours à la ligne relatifs au texte) ──
    const lines = t.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 3 && t.length / lines.length < 30) return false;

    // ── Rejeter les textes qui commencent par des formules de catalogue ──
    if (/^(AUGMENT[ÉE]|NOUVELLE [ÉE]DITION|PREMI[ÈE]RE PARTIE|TOME [IVXLCDM]+|VOL\.?\s)/i.test(t.trim())) return false;
    if (/^(FABLES|TABLE DES|SOMMAIRE|CONTENTS|PRÉFACE|PREFACE|INTRODUCTION)\b/i.test(t.trim())) return false;

    return true;
}

// ─── Wikisource Fetching ───

function pickWeightedLang(forceLang) {
    if (forceLang) {
        const ws = WIKISOURCES.find(w => w.lang === forceLang);
        if (ws) return ws;
    }
    const pool = [];
    for (const ws of WIKISOURCES) {
        const w = LANG_WEIGHTS[ws.lang] || 1;
        for (let i = 0; i < w; i++) pool.push(ws);
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

async function searchWikisource(ws) {
    const term = ws.terms[Math.floor(Math.random() * ws.terms.length)];
    const offset = Math.floor(Math.random() * 50);
    const url = `${ws.url}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srlimit=10&sroffset=${offset}&srnamespace=0&format=json&origin=*`;
    const data = await httpGet(url);
    return data?.query?.search || [];
}

async function getRandomPages(ws) {
    const url = `${ws.url}/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=5&format=json&origin=*`;
    const data = await httpGet(url);
    return data?.query?.random || [];
}

async function parsePage(ws, title) {
    const url = `${ws.url}/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text|displaytitle|links&format=json&origin=*&redirects=true`;
    const data = await httpGet(url);
    return data?.parse || null;
}

function extractText(html) {
    if (!html) return '';

    // ── Phase 1 : cibler le contenu principal (comme l'app) ──
    let content = html;
    const prpMatch = html.match(/<div[^>]*class="[^"]*prp-pages-output[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|$)/i);
    const poemMatch = html.match(/<div[^>]*class="[^"]*poem[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const mwMatch = html.match(/<div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*)/i);
    if (prpMatch) content = prpMatch[1];
    else if (poemMatch) content = poemMatch[1];
    else if (mwMatch) content = mwMatch[1];

    // ── Phase 2 : supprimer les blocs non-contenu ──
    let text = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<(sup|sub)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<span[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
        .replace(/<(div|table|ul|section|nav|aside|span)[^>]*class="[^"]*(?:ws-noexport|noprint|navbox|infobox|metadata|hatnote|ambox|toc|catlinks|mw-editsection|headertemplate|ws-header|header|homonymie|bandeau-homonymie|bandeau-portail|titreoeuvre|auteur-oeuvre|redirectMsg|mw-headline|mw-page-title)[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<span[^>]*class="[^"]*(?:page-title|mw-page-title|mw-[a-z]+|ws-[a-z]+)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#\d+;/g, '')
        .replace(/&[a-z]+;/g, '')
        .replace(/\[modifier[^\]]*\]/g, '')
        .replace(/\[\d+\]/g, '')
        .replace(/modifier le wikicode/gi, '')
        .replace(/mw-page-title[^\s]*/gi, '')
        .replace(/Poésies \([^)]+\)/g, '')
        // Nettoyer numéros de vers/lignes (ex: "5555«Quant..." ou "1234 Le roi")
        .replace(/^\d{2,5}\s*/gm, '')
        // Nettoyer numéros de chapitre romains seuls sur une ligne
        .replace(/^\s*[IVXLCDM]{1,10}\s*$/gm, '')
        // Nettoyer marqueurs de chapitre en début de paragraphe ("XVIII ", "CHAPTER XII")
        .replace(/^(?:CHAPTER|CHAPITRE|CANTO|LIVRE|BOOK)\s+[IVXLCDM\d]+\s*/gim, '')
        .replace(/^[IVXLCDM]{2,10}\s+/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // ── Phase 3 : supprimer les en-têtes métadonnées ──
    const lines = text.split('\n');
    let start = 0;
    for (let i = 0; i < Math.min(15, lines.length); i++) {
        const l = lines[i].toLowerCase();
        const line = lines[i].trim();
        if (l.includes('sommaire') || l.includes('édition') || l.includes('navigation') ||
            l.includes('conférence') || l.includes('présenté') || l.includes('siège') ||
            l.includes('présidée par') || l.includes('professeur') || l.includes('faculté') ||
            l.includes('table des matières') || l.includes('contents') ||
            l.includes('texte établi') || l.includes('catégorie') || l.includes('category') ||
            l.includes('voir aussi') || l.includes('see also') || l.includes('modifier') ||
            l.includes('mw-page-title') || l.includes('span class') ||
            line.length < 3 || (line.startsWith('(') && line.endsWith(')'))) {
            start = i + 1;
        } else if (line.length > 40) break;
    }
    text = lines.slice(start).join('\n').trim();

    return text;
}

function detectAuthor(parsed) {
    if (!parsed) return null;

    // 1. Liens "Auteur:XXX" / "Author:XXX" / "Autor:XXX" / "Autore:XXX"
    const links = parsed.links || [];
    for (const link of links) {
        const t = link['*'] || '';
        const match = t.match(/^(?:Auteur|Author|Autor|Autore):(.+)/);
        if (match) return match[1].replace(/_/g, ' ').trim();
    }

    // 2. Classes CSS d'auteur dans le HTML brut
    const html = parsed.text?.['*'] || '';
    const classMatch = html.match(/<[^>]*class="[^"]*(?:ws-author|author|auteur|auteur-oeuvre)[^"]*"[^>]*>([^<]+)/i);
    if (classMatch) {
        const authorText = classMatch[1].trim();
        if (authorText.length > 2 && authorText.length < 50) return authorText;
    }

    // 3. Liens href contenant "Auteur:" dans le HTML brut
    const hrefMatch = html.match(/href="[^"]*(?:Auteur|Author|Autor|Autore):([^"&?#]+)"/i);
    if (hrefMatch) {
        return decodeURIComponent(hrefMatch[1]).replace(/_/g, ' ').trim();
    }

    // 4. Pattern "par XXX" ou "de XXX" dans le texte initial
    const rawText = html.replace(/<[^>]+>/g, ' ').substring(0, 500);
    const parMatch = rawText.match(/(?:^|\n)\s*(?:par|de|by)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+(?:de\s+)?[A-ZÀ-Ü][a-zà-ü\-]+){0,3})\s*(?:\n|$)/m);
    if (parMatch && parMatch[1].length > 3 && parMatch[1].length < 40) {
        return parMatch[1].trim();
    }

    // 5. Titre de la page (souvent "Œuvre/Auteur")
    const title = parsed.displaytitle || parsed.title || '';
    const cleanTitle = title.replace(/<[^>]+>/g, '');
    const slashParts = cleanTitle.split('/');
    if (slashParts.length >= 2) return slashParts[0].trim();

    return null;
}

function isGoodTitle(title) {
    if (!title || title.length < 3 || title.length > 200) return false;
    const t = title.toLowerCase();

    if (/^(catégor|category|kategorie|categoria)/i.test(t)) return false;
    if (/^(help|aide|hilfe|aiuto|ayuda|ajuda|manual|project|projet|image|file|fichier|template|modèle|module|media|special|spécial):/i.test(t)) return false;
    if (/^(auteur|author|autor|autore):/i.test(t)) return false;
    if (/^(discussion|talk|diskussion|discussione):/i.test(t)) return false;
    if (/^(index|page|file|portail|portal|wiki):/i.test(t)) return false;

    if (/^list[ea]?\s+(de|of|di|von)/i.test(t)) return false;
    if (t.startsWith('index ') || t.endsWith(' index')) return false;
    if (t.includes('table des matières') || t.includes('table of contents') || t.includes('inhaltsverzeichnis')) return false;
    if (t.includes('bibliographie') || t.includes('bibliography')) return false;

    if (t.includes('sa vie et son œuvre') || t.includes('sa vie et son oeuvre')) return false;
    if (t.includes('his life and work') || t.includes('sein leben')) return false;
    if (t.includes('étude biographique') || t.includes('étude sur')) return false;
    if (t.includes('biographical study') || t.includes('biography of')) return false;
    if (/\bbiograph/i.test(t) && !t.includes('/')) return false;

    if ((t.includes('œuvres complètes') || t.includes('complete works') ||
        t.includes('gesammelte werke') || t.includes('opere complete')) && !t.includes('/')) return false;

    if (/(sommaire|contents|table des matières)$/i.test(t)) return false;

    return true;
}

// ── Analyse qualité ──
function isContentGoodQuality(text, parsed) {
    if (!text || text.length < 100) return false;
    if (text.length < 200) return false;

    const html = parsed?.text?.['*'] || '';
    if (html.includes('redirectMsg') || html.includes('propose plusieurs éditions') ||
        html.includes('Cette page répertorie')) return false;

    const links = parsed?.links || [];
    const linkCharsEstimate = links.length * 30;
    if (text.length > 0 && linkCharsEstimate / text.length > 0.25) return false;

    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return false;
    const avgLineLength = text.length / lines.length;

    if (avgLineLength < 60) {
        const withPunct = lines.filter(l => /[.!?…:;]$/.test(l.trim())).length;
        const punctRatio = withPunct / lines.length;
        if (punctRatio < 0.3) return false;
    }

    // Détecter le vieux français / texte médiéval illisible
    // Marqueurs: "fant", "comande", "ert", "chevalchier", "oiël", "mult"
    const archaicMarkers = /\b(chevalch|comande|ne·l|oiël|mult\b|\bert\b|\bfant\b|\bço\b|\bki\b|destr|guerpir|chalcier|seignurs|vassal[sz]|\bcuntre\b|\bpuis\b que|\bnuls\b hom)/i;
    const sample = text.substring(0, 500);
    const archaicHits = (sample.match(archaicMarkers) || []).length;
    // Si le texte a des marqueurs archaïques dans les 500 premiers caractères
    if (archaicHits > 0) {
        // Vérifier plus en profondeur: compter les mots archaïques
        const deepMarkers = sample.match(/\b(ert|fant|mult|comand[ea]|chevalch|oiël|guerpir|\bço\b|\bki\b|seignurs)\b/gi);
        if (deepMarkers && deepMarkers.length >= 2) return false;
    }

    return true;
}

function extractBestQuote(text) {
    if (!text || text.length < 80) return null;

    const paragraphs = text.split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 20)
        // Nettoyer : retirer les paragraphes qui commencent par un numéro de chapitre
        .filter(p => !/^\s*[IVXLCDM]{2,10}\b/.test(p))
        .filter(p => !/^\s*(CHAPTER|CHAPITRE|CANTO|LIVRE|BOOK)\s/i.test(p))
        // Retirer les paragraphes qui sont juste un titre/heading
        .filter(p => !(p.length < 60 && /^[A-ZÀ-Ü\s\-']+$/.test(p)))
        // Retirer les paragraphes avec trop de numéros (tables, index)
        .filter(p => (p.match(/\d+/g) || []).length < p.split(' ').length * 0.3);

    if (paragraphs.length === 0) return null;

    // Priorité 1 : taille idéale (100-450 chars)
    const ideal = paragraphs.filter(p => {
        const len = p.trim().length;
        return len >= 100 && len <= 450;
    });
    if (ideal.length > 0) {
        return ideal[Math.floor(Math.random() * ideal.length)].trim();
    }

    // Priorité 2 : acceptable (80-500 chars)
    const good = paragraphs.filter(p => {
        const len = p.trim().length;
        return len >= 80 && len <= 500;
    });
    if (good.length > 0) {
        return good[Math.floor(Math.random() * good.length)].trim();
    }

    // Priorité 3 : couper un paragraphe long
    for (const p of paragraphs) {
        const trimmed = p.trim();
        if (trimmed.length >= 60) {
            if (trimmed.length <= 500) return trimmed;
            const cut = trimmed.substring(0, 500);
            const lastSentence = Math.max(
                cut.lastIndexOf('. '), cut.lastIndexOf('.\n'),
                cut.lastIndexOf('! '), cut.lastIndexOf('? '),
                cut.lastIndexOf('…')
            );
            if (lastSentence > 200) return cut.substring(0, lastSentence + 1);
            const lastSpace = cut.lastIndexOf(' ');
            if (lastSpace > 300) return cut.substring(0, lastSpace) + '…';
            return cut + '…';
        }
    }
    return null;
}

async function fetchQuoteFromWikisource(maxRetries = 8, forceLang = null) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const ws = pickWeightedLang(forceLang);
            console.log(`  Tentative ${attempt + 1}: ${ws.lang}.wikisource.org`);

            const pages = Math.random() < 0.5
                ? await getRandomPages(ws)
                : await searchWikisource(ws);

            if (!pages.length) continue;

            const shuffled = pages.sort(() => Math.random() - 0.5);

            for (const page of shuffled) {
                const title = page.title;
                if (!isGoodTitle(title)) continue;

                console.log(`    Parsing: ${title}`);
                const parsed = await parsePage(ws, title);
                if (!parsed?.text?.['*']) continue;

                const text = extractText(parsed.text['*']);
                if (text.length < 100) continue;

                if (!isContentGoodQuality(text, parsed)) continue;

                const quote = extractBestQuote(text);
                if (!quote) continue;

                const author = detectAuthor(parsed);
                const cleanTitle = (parsed.displaytitle || title).replace(/<[^>]+>/g, '');

                // Ne pas poster sans auteur identifié (sinon on affiche le titre comme auteur)
                if (!author) {
                    console.log(`    ✗ No author found for: ${cleanTitle}`);
                    continue;
                }

                // Vérification qualité universelle (copyright, encyclopédie, page de titre…)
                if (!isQuotePostWorthy(quote, author)) {
                    console.log(`    ✗ Post not worthy: "${quote.substring(0, 50)}…" by ${author}`);
                    continue;
                }

                console.log(`    ✓ Found: "${quote.substring(0, 60)}…" by ${author}`);

                return {
                    text: quote,
                    author: author,
                    title: cleanTitle,
                    lang: ws.lang,
                    source: `${ws.url}/wiki/${encodeURIComponent(title)}`
                };
            }
        } catch (err) {
            console.log(`    ✗ Error: ${err.message}`);
        }
    }
    return null;
}

// ─── Bluesky AT Protocol ───

async function blueskyLogin(identifier, appPassword) {
    return httpPost('bsky.social', '/xrpc/com.atproto.server.createSession', {
        identifier,
        password: appPassword
    });
}

/**
 * Construit les facets (liens cliquables, hashtags) pour Bluesky.
 * Bluesky utilise les "graphèmes" UTF-8 (= octets UTF-8) pour les positions.
 */
function buildFacets(text) {
    const facets = [];
    const encoder = new TextEncoder();

    // Détecter les URLs
    const urlRegex = /https?:\/\/[^\s)]+/g;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        const before = encoder.encode(text.substring(0, match.index));
        const target = encoder.encode(match[0]);
        facets.push({
            index: { byteStart: before.length, byteEnd: before.length + target.length },
            features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }]
        });
    }

    // Détecter les hashtags
    const hashRegex = /#[a-zA-ZÀ-ÿ]\w*/g;
    while ((match = hashRegex.exec(text)) !== null) {
        const before = encoder.encode(text.substring(0, match.index));
        const target = encoder.encode(match[0]);
        facets.push({
            index: { byteStart: before.length, byteEnd: before.length + target.length },
            features: [{ $type: 'app.bsky.richtext.facet#tag', tag: match[0].slice(1) }]
        });
    }

    return facets;
}

async function postToBluesky(session, text, lang) {
    const facets = buildFacets(text);

    const record = {
        $type: 'app.bsky.feed.post',
        text,
        facets,
        createdAt: new Date().toISOString(),
        langs: [lang || 'fr']
    };

    return httpPost('bsky.social', '/xrpc/com.atproto.repo.createRecord', {
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record
    }, {
        'Authorization': `Bearer ${session.accessJwt}`
    });
}

// ─── Hashtags par langue ───

const HASHTAGS = {
    fr: '#littérature #poésie #palimpseste',
    en: '#literature #poetry #palimpseste',
    de: '#literatur #poesie #palimpseste',
    it: '#letteratura #poesia #palimpseste',
    es: '#literatura #poesía #palimpseste',
    la: '#literature #poetry #palimpseste',
};

// ─── Format Post ───

function formatPost(quote) {
    const maxGraphemes = 300;
    const encoder = new TextEncoder();

    const lang = quote.lang || 'fr';
    const authorLink = `\nhttps://palimpseste.vercel.app/#/author/${encodeURIComponent(quote.author)}`;
    const hashtag = `\n${HASHTAGS[lang] || HASHTAGS['en']}`;
    const suffix = `\n\n— ${quote.author}${authorLink}${hashtag}`;
    const suffixLen = encoder.encode(suffix).length;

    let text = quote.text;
    const available = maxGraphemes - suffixLen - 3;

    // Tronquer si besoin (sur les bytes UTF-8)
    let encoded = encoder.encode(text);
    if (encoded.length > available) {
        // Couper au dernier espace avant la limite
        const decoder = new TextDecoder();
        text = decoder.decode(encoded.slice(0, available));
        // Éviter de couper un mot
        const lastSpace = text.lastIndexOf(' ');
        if (lastSpace > text.length * 0.6) {
            text = text.substring(0, lastSpace);
        }
        text += '…';
    }

    return `${text}\n\n— ${quote.author}${authorLink}${hashtag}`;
}

// ─── Main ───

async function main() {
    const identifier = process.env.BLUESKY_IDENTIFIER;
    const appPassword = process.env.BLUESKY_APP_PASSWORD;
    // Paramètre --lang (fr, en, etc.) passé en CLI
    const langArg = process.argv.find(a => a.startsWith('--lang='));
    const forceLang = langArg ? langArg.split('=')[1] : null;

    if (!identifier || !appPassword) {
        console.error('❌ Missing Bluesky credentials in environment variables');
        console.error('   Required: BLUESKY_IDENTIFIER, BLUESKY_APP_PASSWORD');
        process.exit(1);
    }

    let quote = null;

    // 1) Essayer d'abord les tendances Supabase (contenu curé par les utilisateurs)
    console.log(`🔥 Fetching trending quote from Supabase${forceLang ? ` (lang: ${forceLang})` : ''}…`);
    quote = await fetchTrendingQuote(forceLang);

    if (quote) {
        console.log(`   ✅ Got trending quote by ${quote.author} (${quote.lang})`);
    } else {
        // 2) Fallback: Wikisource live
        console.log(`\n🔍 Fallback: fetching from Wikisource${forceLang ? ` (lang: ${forceLang})` : ''}…\n`);
        quote = await fetchQuoteFromWikisource(8, forceLang);
    }

    if (!quote) {
        console.error('❌ Could not find a suitable quote from trending or Wikisource');
        process.exit(1);
    }

    const post = formatPost(quote);
    const encoder = new TextEncoder();

    console.log(`\n📝 Posting to Bluesky (${encoder.encode(post).length} bytes, lang: ${quote.lang}, source: ${quote.fromTrending ? 'TRENDING' : 'WIKISOURCE'}):\n${post}\n`);
    console.log(`📖 Source: ${quote.source}\n`);

    try {
        console.log('🔐 Logging in to Bluesky…');
        const session = await blueskyLogin(identifier, appPassword);
        console.log(`   Logged in as ${session.handle}`);

        const result = await postToBluesky(session, post, quote.lang);
        console.log(`✅ Posted to Bluesky!`);
        console.log(`   https://bsky.app/profile/${session.handle}/post/${result.uri.split('/').pop()}`);
    } catch (err) {
        console.error(`❌ Failed to post: ${err.message}`);
        process.exit(1);
    }
}

main();
