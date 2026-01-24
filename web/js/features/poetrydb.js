/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎭 POETRYDB SERVICE - Palimpseste
 * Récupération de poésie anglaise depuis PoetryDB
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { API_CONFIG, DEFAULT_SETTINGS } from '../config.js';
import { randomItem, generateId, truncateText } from '../utils.js';

// 📚 Poètes populaires sur PoetryDB
const POPULAR_POETS = [
    'William Shakespeare',
    'Emily Dickinson',
    'Edgar Allan Poe',
    'William Wordsworth',
    'John Keats',
    'Percy Bysshe Shelley',
    'Lord Byron',
    'William Blake',
    'Robert Frost',
    'Walt Whitman',
    'John Donne',
    'T. S. Eliot',
    'Robert Burns',
    'Alfred Lord Tennyson',
    'Samuel Taylor Coleridge',
    'Christina Rossetti',
    'Elizabeth Barrett Browning',
    'Rudyard Kipling',
    'Oscar Wilde',
    'W. B. Yeats'
];

/**
 * 🌐 Appel à l'API PoetryDB
 * @param {string} endpoint - Endpoint de l'API
 * @returns {Promise<Array|Object>}
 */
async function fetchFromPoetryDB(endpoint) {
    const url = `${API_CONFIG.poetrydb.baseUrl}${endpoint}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`PoetryDB error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // PoetryDB retourne un objet avec "status" si pas de résultat
    if (data.status && data.status !== 200) {
        return [];
    }
    
    return Array.isArray(data) ? data : [data];
}

/**
 * 🎲 Récupère un poème aléatoire
 * @returns {Promise<Object|null>}
 */
export async function fetchRandomPoem() {
    console.log('🟡 Fetching random poem from PoetryDB...');
    
    try {
        const poems = await fetchFromPoetryDB('/random');
        
        if (!poems.length) {
            console.log('🟠 No random poem found');
            return null;
        }
        
        return formatPoem(poems[0]);
        
    } catch (error) {
        console.error('🔴 PoetryDB random error:', error);
        return null;
    }
}

/**
 * 🔍 Récupère des poèmes par auteur
 * @param {string} author - Nom de l'auteur
 * @returns {Promise<Array>}
 */
export async function fetchPoemsByAuthor(author) {
    console.log(`🟡 Fetching poems by ${author}...`);
    
    try {
        const poems = await fetchFromPoetryDB(`/author/${encodeURIComponent(author)}`);
        
        console.log(`🟢 Found ${poems.length} poems by ${author}`);
        return poems.map(formatPoem);
        
    } catch (error) {
        console.error('🔴 PoetryDB author error:', error);
        return [];
    }
}

/**
 * 🔍 Récupère un poème par titre
 * @param {string} title - Titre du poème
 * @returns {Promise<Object|null>}
 */
export async function fetchPoemByTitle(title) {
    console.log(`🟡 Fetching poem: ${title}...`);
    
    try {
        const poems = await fetchFromPoetryDB(`/title/${encodeURIComponent(title)}`);
        
        if (!poems.length) {
            return null;
        }
        
        return formatPoem(poems[0]);
        
    } catch (error) {
        console.error('🔴 PoetryDB title error:', error);
        return null;
    }
}

/**
 * 📚 Récupère un poème d'un poète populaire aléatoire
 * @returns {Promise<Object|null>}
 */
export async function fetchFromPopularPoet() {
    const poet = randomItem(POPULAR_POETS);
    console.log(`🟡 Fetching from popular poet: ${poet}...`);
    
    try {
        const poems = await fetchPoemsByAuthor(poet);
        
        if (!poems.length) {
            console.log('🟠 No poems found for poet');
            return null;
        }
        
        return randomItem(poems);
        
    } catch (error) {
        console.error('🔴 Popular poet error:', error);
        return null;
    }
}

/**
 * 🔍 Recherche des poèmes par texte
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>}
 */
export async function searchPoems(query) {
    console.log(`🟡 Searching PoetryDB for: ${query}...`);
    
    try {
        // PoetryDB ne supporte pas vraiment la recherche textuelle
        // On essaie par titre
        const poems = await fetchFromPoetryDB(`/title/${encodeURIComponent(query)}`);
        
        console.log(`🟢 Found ${poems.length} poems`);
        return poems.map(formatPoem);
        
    } catch (error) {
        console.error('🔴 PoetryDB search error:', error);
        return [];
    }
}

/**
 * 📋 Liste tous les auteurs disponibles
 * @returns {Promise<Array>}
 */
export async function getAllAuthors() {
    console.log('🟡 Fetching all PoetryDB authors...');
    
    try {
        const authors = await fetchFromPoetryDB('/author');
        
        console.log(`🟢 Found ${authors.authors?.length || 0} authors`);
        return authors.authors || [];
        
    } catch (error) {
        console.error('🔴 PoetryDB authors error:', error);
        return POPULAR_POETS; // Fallback
    }
}

/**
 * 📋 Liste tous les titres disponibles
 * @returns {Promise<Array>}
 */
export async function getAllTitles() {
    console.log('🟡 Fetching all PoetryDB titles...');
    
    try {
        const titles = await fetchFromPoetryDB('/title');
        
        console.log(`🟢 Found ${titles.titles?.length || 0} titles`);
        return titles.titles || [];
        
    } catch (error) {
        console.error('🔴 PoetryDB titles error:', error);
        return [];
    }
}

/**
 * 🎨 Formate un poème PoetryDB vers notre format standard
 * @param {Object} poem - Poème brut de PoetryDB
 * @returns {Object}
 */
function formatPoem(poem) {
    if (!poem) return null;
    
    const lines = poem.lines || [];
    const fullText = lines.join('\n');
    
    // Extraire un teaser (premières lignes)
    const teaserLines = lines.slice(0, Math.min(8, Math.ceil(lines.length / 2)));
    const teaser = teaserLines.join('\n');
    const remainingText = lines.slice(teaserLines.length).join('\n');
    
    return {
        id: `pdb_${generateId()}`,
        author: poem.author || 'Unknown',
        work: poem.title || 'Untitled',
        genre: 'poetry',
        language: 'en',
        teaser: teaser,
        fullText: fullText,
        remainingText: remainingText,
        hasMore: remainingText.length > 0,
        lineCount: poem.linecount || lines.length,
        sourceUrl: `https://poetrydb.org/author,title/${encodeURIComponent(poem.author)};${encodeURIComponent(poem.title)}`,
        source: 'poetrydb',
        fetchedAt: new Date().toISOString()
    };
}

/**
 * 📚 Remplit un pool avec des poèmes PoetryDB
 * @param {number} count - Nombre de poèmes à récupérer
 * @returns {Promise<Array>}
 */
export async function fillPoolWithPoems(count = 5) {
    console.log(`🟡 Filling pool with ${count} poems...`);
    
    const poems = [];
    
    for (let i = 0; i < count; i++) {
        // Alterner entre random et popular poets
        const poem = i % 2 === 0 
            ? await fetchRandomPoem() 
            : await fetchFromPopularPoet();
        
        if (poem) {
            poems.push(poem);
        }
    }
    
    console.log(`🟢 Pool filled with ${poems.length} poems`);
    return poems;
}
