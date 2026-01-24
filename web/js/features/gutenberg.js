/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📖 GUTENBERG SERVICE - Palimpseste
 * Récupération de textes depuis Project Gutenberg
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { API_CONFIG } from '../config.js';
import { randomItem, generateId, truncateText, stripHtml } from '../utils.js';

// 📚 Sujets populaires sur Gutenberg
const POPULAR_SUBJECTS = [
    'Poetry',
    'Short stories',
    'Drama',
    'Fiction',
    'French literature',
    'English literature',
    'German literature',
    'Classical literature'
];

// 📚 Auteurs populaires
const POPULAR_AUTHORS = [
    'Shakespeare, William',
    'Twain, Mark',
    'Austen, Jane',
    'Dickens, Charles',
    'Poe, Edgar Allan',
    'Wilde, Oscar',
    'Doyle, Arthur Conan',
    'Shelley, Mary Wollstonecraft',
    'Stevenson, Robert Louis',
    'Wells, H. G.',
    'Hugo, Victor',
    'Verne, Jules',
    'Tolstoy, Leo',
    'Dostoevsky, Fyodor'
];

/**
 * 🌐 Appel à l'API Gutendex
 * @param {string} endpoint - Endpoint de l'API
 * @param {Object} params - Paramètres de requête
 * @returns {Promise<Object>}
 */
async function fetchFromGutenberg(endpoint, params = {}) {
    const url = new URL(`${API_CONFIG.gutenberg.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
        throw new Error(`Gutenberg error: ${response.status}`);
    }
    
    return response.json();
}

/**
 * 📚 Recherche des livres
 * @param {Object} options - Options de recherche
 * @returns {Promise<Array>}
 */
export async function searchBooks(options = {}) {
    const {
        search = '',
        author = '',
        topic = '',
        languages = 'en',
        page = 1
    } = options;
    
    console.log('🟡 Searching Gutenberg books...', options);
    
    try {
        const params = { page };
        
        if (search) params.search = search;
        if (author) params.author = author;
        if (topic) params.topic = topic;
        if (languages) params.languages = languages;
        
        const data = await fetchFromGutenberg('/books', params);
        
        console.log(`🟢 Found ${data.count} books`);
        return {
            count: data.count,
            next: data.next,
            previous: data.previous,
            books: data.results.map(formatBook)
        };
        
    } catch (error) {
        console.error('🔴 Gutenberg search error:', error);
        return { count: 0, books: [] };
    }
}

/**
 * 📖 Récupère un livre par ID
 * @param {number} bookId - ID Gutenberg
 * @returns {Promise<Object|null>}
 */
export async function getBookById(bookId) {
    console.log(`🟡 Fetching book #${bookId}...`);
    
    try {
        const data = await fetchFromGutenberg(`/books/${bookId}`);
        return formatBook(data);
        
    } catch (error) {
        console.error('🔴 Gutenberg book error:', error);
        return null;
    }
}

/**
 * 🎲 Récupère un livre aléatoire
 * @param {string} language - Langue souhaitée
 * @returns {Promise<Object|null>}
 */
export async function fetchRandomBook(language = 'en') {
    console.log(`🟡 Fetching random Gutenberg book (${language})...`);
    
    try {
        // Sélectionner un sujet ou auteur aléatoire
        const useAuthor = Math.random() > 0.5;
        
        const params = {
            languages: language,
            page: Math.floor(Math.random() * 10) + 1 // Page aléatoire
        };
        
        if (useAuthor) {
            params.author = randomItem(POPULAR_AUTHORS);
        } else {
            params.topic = randomItem(POPULAR_SUBJECTS);
        }
        
        const data = await fetchFromGutenberg('/books', params);
        
        if (!data.results.length) {
            console.log('🟠 No books found');
            return null;
        }
        
        const book = randomItem(data.results);
        return formatBook(book);
        
    } catch (error) {
        console.error('🔴 Gutenberg random error:', error);
        return null;
    }
}

/**
 * 📄 Récupère un extrait de texte d'un livre
 * @param {Object} book - Livre formaté
 * @param {number} maxLength - Longueur max
 * @returns {Promise<string>}
 */
export async function fetchBookText(book, maxLength = 2000) {
    if (!book || !book.textUrl) {
        console.log('🟠 No text URL for book');
        return null;
    }
    
    console.log(`🟡 Fetching text for: ${book.title}...`);
    
    try {
        // Utiliser un proxy CORS ou le texte direct
        const response = await fetch(book.textUrl);
        
        if (!response.ok) {
            throw new Error(`Text fetch error: ${response.status}`);
        }
        
        let text = await response.text();
        
        // Nettoyer le texte Gutenberg
        text = cleanGutenbergText(text);
        
        // Tronquer si nécessaire
        if (text.length > maxLength) {
            // Trouver une fin de paragraphe
            const cutIndex = text.lastIndexOf('\n\n', maxLength);
            if (cutIndex > maxLength * 0.5) {
                text = text.slice(0, cutIndex);
            } else {
                text = text.slice(0, maxLength) + '…';
            }
        }
        
        console.log(`🟢 Text fetched: ${text.length} chars`);
        return text;
        
    } catch (error) {
        console.error('🔴 Text fetch error:', error);
        return null;
    }
}

/**
 * 🧹 Nettoie le texte brut Gutenberg
 * @param {string} text - Texte brut
 * @returns {string}
 */
function cleanGutenbergText(text) {
    if (!text) return '';
    
    // Supprimer le header Gutenberg
    const startMarkers = [
        '*** START OF THIS PROJECT GUTENBERG',
        '*** START OF THE PROJECT GUTENBERG',
        '*END*THE SMALL PRINT'
    ];
    
    let startIndex = 0;
    for (const marker of startMarkers) {
        const idx = text.indexOf(marker);
        if (idx !== -1) {
            startIndex = text.indexOf('\n', idx) + 1;
            break;
        }
    }
    
    // Supprimer le footer Gutenberg
    const endMarkers = [
        '*** END OF THIS PROJECT GUTENBERG',
        '*** END OF THE PROJECT GUTENBERG',
        'End of the Project Gutenberg'
    ];
    
    let endIndex = text.length;
    for (const marker of endMarkers) {
        const idx = text.indexOf(marker);
        if (idx !== -1) {
            endIndex = idx;
            break;
        }
    }
    
    return text
        .slice(startIndex, endIndex)
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * 🎨 Formate un livre Gutendex vers notre format standard
 * @param {Object} book - Livre brut de Gutendex
 * @returns {Object}
 */
function formatBook(book) {
    if (!book) return null;
    
    // Extraire l'auteur principal
    const author = book.authors?.[0]?.name || 'Unknown';
    
    // Trouver l'URL du texte
    let textUrl = null;
    if (book.formats) {
        textUrl = book.formats['text/plain; charset=utf-8'] ||
                  book.formats['text/plain'] ||
                  book.formats['text/plain; charset=us-ascii'];
    }
    
    // Déterminer le genre depuis les sujets
    const subjects = book.subjects || [];
    let genre = 'texte';
    
    if (subjects.some(s => /poetry|poem/i.test(s))) genre = 'poésie';
    else if (subjects.some(s => /drama|play/i.test(s))) genre = 'théâtre';
    else if (subjects.some(s => /short stor/i.test(s))) genre = 'nouvelle';
    else if (subjects.some(s => /fiction|novel/i.test(s))) genre = 'roman';
    else if (subjects.some(s => /fable/i.test(s))) genre = 'fable';
    
    // Déterminer la langue
    const languages = book.languages || ['en'];
    
    return {
        id: `gb_${book.id}`,
        gutenbergId: book.id,
        author: author.replace(/,.*$/, '').trim(), // "Twain, Mark" -> "Twain"
        authorFull: author,
        work: book.title || 'Untitled',
        genre: genre,
        language: languages[0],
        subjects: subjects,
        downloadCount: book.download_count || 0,
        textUrl: textUrl,
        coverUrl: book.formats?.['image/jpeg'],
        sourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
        source: 'gutenberg'
    };
}

/**
 * 📚 Récupère les livres les plus téléchargés
 * @param {number} limit - Nombre de livres
 * @returns {Promise<Array>}
 */
export async function getPopularBooks(limit = 10) {
    console.log(`🟡 Fetching top ${limit} popular books...`);
    
    try {
        const data = await fetchFromGutenberg('/books', { 
            sort: 'popular',
            page: 1 
        });
        
        const books = data.results.slice(0, limit).map(formatBook);
        
        console.log(`🟢 Got ${books.length} popular books`);
        return books;
        
    } catch (error) {
        console.error('🔴 Popular books error:', error);
        return [];
    }
}

/**
 * 📋 Récupère des livres par auteur
 * @param {string} authorName - Nom de l'auteur
 * @returns {Promise<Array>}
 */
export async function getBooksByAuthor(authorName) {
    const result = await searchBooks({ author: authorName });
    return result.books;
}

/**
 * 📋 Récupère des livres par sujet
 * @param {string} topic - Sujet
 * @returns {Promise<Array>}
 */
export async function getBooksByTopic(topic) {
    const result = await searchBooks({ topic: topic });
    return result.books;
}
