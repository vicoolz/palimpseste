/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📚 WIKISOURCE SERVICE - Palimpseste
 * Récupération de textes depuis Wikisource (multi-langues)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { API_CONFIG, GENRES, DEFAULT_SETTINGS } from '../config.js';
import { shuffleArray, randomItem, stripHtml, truncateText, generateId } from '../utils.js';
import { getState } from '../state.js';

// 📚 Auteurs par langue pour Wikisource
const AUTHORS_BY_LANG = {
    fr: [
        { name: 'Victor Hugo', category: 'Auteur:Victor Hugo', genres: ['poésie', 'roman', 'théâtre'] },
        { name: 'Charles Baudelaire', category: 'Auteur:Charles Baudelaire', genres: ['poésie'] },
        { name: 'Arthur Rimbaud', category: 'Auteur:Arthur Rimbaud', genres: ['poésie'] },
        { name: 'Paul Verlaine', category: 'Auteur:Paul Verlaine', genres: ['poésie'] },
        { name: 'Stéphane Mallarmé', category: 'Auteur:Stéphane Mallarmé', genres: ['poésie'] },
        { name: 'Jean de La Fontaine', category: 'Auteur:Jean de La Fontaine', genres: ['fable', 'poésie'] },
        { name: 'Molière', category: 'Auteur:Molière', genres: ['théâtre'] },
        { name: 'Jean Racine', category: 'Auteur:Jean Racine', genres: ['théâtre'] },
        { name: 'Pierre Corneille', category: 'Auteur:Pierre Corneille', genres: ['théâtre'] },
        { name: 'Voltaire', category: 'Auteur:Voltaire', genres: ['conte', 'philosophie'] },
        { name: 'Denis Diderot', category: 'Auteur:Denis Diderot', genres: ['philosophie', 'roman'] },
        { name: 'Jean-Jacques Rousseau', category: 'Auteur:Jean-Jacques Rousseau', genres: ['philosophie'] },
        { name: 'Honoré de Balzac', category: 'Auteur:Honoré de Balzac', genres: ['roman', 'nouvelle'] },
        { name: 'Gustave Flaubert', category: 'Auteur:Gustave Flaubert', genres: ['roman'] },
        { name: 'Émile Zola', category: 'Auteur:Émile Zola', genres: ['roman'] },
        { name: 'Guy de Maupassant', category: 'Auteur:Guy de Maupassant', genres: ['nouvelle', 'conte'] },
        { name: 'Marcel Proust', category: 'Auteur:Marcel Proust', genres: ['roman'] },
        { name: 'Albert Camus', category: 'Auteur:Albert Camus', genres: ['roman', 'philosophie'] },
        { name: 'Gérard de Nerval', category: 'Auteur:Gérard de Nerval', genres: ['poésie', 'nouvelle'] },
        { name: 'Alfred de Musset', category: 'Auteur:Alfred de Musset', genres: ['poésie', 'théâtre'] },
        { name: 'Alphonse de Lamartine', category: 'Auteur:Alphonse de Lamartine', genres: ['poésie'] },
        { name: 'François Rabelais', category: 'Auteur:François Rabelais', genres: ['roman'] },
        { name: 'Michel de Montaigne', category: 'Auteur:Michel de Montaigne', genres: ['philosophie'] },
        { name: 'Blaise Pascal', category: 'Auteur:Blaise Pascal', genres: ['philosophie', 'mystique'] },
        { name: 'Charles Perrault', category: 'Auteur:Charles Perrault', genres: ['conte'] }
    ],
    en: [
        { name: 'William Shakespeare', category: 'Author:William Shakespeare', genres: ['theatre', 'poetry'] },
        { name: 'John Keats', category: 'Author:John Keats', genres: ['poetry'] },
        { name: 'Percy Shelley', category: 'Author:Percy Bysshe Shelley', genres: ['poetry'] },
        { name: 'Lord Byron', category: 'Author:George Gordon Byron', genres: ['poetry'] },
        { name: 'William Wordsworth', category: 'Author:William Wordsworth', genres: ['poetry'] },
        { name: 'Samuel Coleridge', category: 'Author:Samuel Taylor Coleridge', genres: ['poetry'] },
        { name: 'Edgar Allan Poe', category: 'Author:Edgar Allan Poe', genres: ['poetry', 'story'] },
        { name: 'Walt Whitman', category: 'Author:Walt Whitman', genres: ['poetry'] },
        { name: 'Emily Dickinson', category: 'Author:Emily Dickinson', genres: ['poetry'] },
        { name: 'Oscar Wilde', category: 'Author:Oscar Wilde', genres: ['theatre', 'story'] },
        { name: 'Jane Austen', category: 'Author:Jane Austen', genres: ['novel'] },
        { name: 'Charles Dickens', category: 'Author:Charles Dickens', genres: ['novel'] }
    ],
    de: [
        { name: 'Johann Wolfgang von Goethe', category: 'Autor:Johann Wolfgang von Goethe', genres: ['poésie', 'théâtre'] },
        { name: 'Friedrich Schiller', category: 'Autor:Friedrich Schiller', genres: ['poésie', 'théâtre'] },
        { name: 'Heinrich Heine', category: 'Autor:Heinrich Heine', genres: ['poésie'] },
        { name: 'Rainer Maria Rilke', category: 'Autor:Rainer Maria Rilke', genres: ['poésie'] },
        { name: 'Friedrich Nietzsche', category: 'Autor:Friedrich Nietzsche', genres: ['philosophie'] }
    ],
    es: [
        { name: 'Miguel de Cervantes', category: 'Autor:Miguel de Cervantes', genres: ['roman'] },
        { name: 'Federico García Lorca', category: 'Autor:Federico García Lorca', genres: ['poésie', 'théâtre'] },
        { name: 'Pablo Neruda', category: 'Autor:Pablo Neruda', genres: ['poésie'] }
    ],
    it: [
        { name: 'Dante Alighieri', category: 'Autore:Dante Alighieri', genres: ['poésie'] },
        { name: 'Francesco Petrarca', category: 'Autore:Francesco Petrarca', genres: ['poésie'] },
        { name: 'Giovanni Boccaccio', category: 'Autore:Giovanni Boccaccio', genres: ['nouvelle'] },
        { name: 'Giacomo Leopardi', category: 'Autore:Giacomo Leopardi', genres: ['poésie', 'philosophie'] }
    ],
    la: [
        { name: 'Virgile', category: 'Scriptor:Publius Vergilius Maro', genres: ['poésie'] },
        { name: 'Ovide', category: 'Scriptor:Publius Ovidius Naso', genres: ['poésie'] },
        { name: 'Horace', category: 'Scriptor:Quintus Horatius Flaccus', genres: ['poésie'] }
    ]
};

/**
 * 🌐 Construit l'URL de l'API Wikisource
 * @param {string} lang - Code langue
 * @param {Object} params - Paramètres de l'API
 * @returns {string}
 */
function buildWikisourceUrl(lang, params) {
    const baseUrl = API_CONFIG.wikisource.baseUrl.replace('{lang}', lang);
    const searchParams = new URLSearchParams({
        ...API_CONFIG.wikisource.defaultParams,
        ...params
    });
    return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * 📄 Récupère les pages d'une catégorie d'auteur
 * @param {string} lang - Code langue
 * @param {string} category - Catégorie auteur
 * @returns {Promise<Array>}
 */
async function getCategoryPages(lang, category) {
    const url = buildWikisourceUrl(lang, {
        action: 'query',
        list: 'categorymembers',
        cmtitle: `Category:${category}`,
        cmtype: 'page',
        cmlimit: 50
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.query?.categorymembers || [];
}

/**
 * 📖 Récupère le contenu d'une page Wikisource
 * @param {string} lang - Code langue
 * @param {string} pageTitle - Titre de la page
 * @returns {Promise<string>}
 */
async function getPageContent(lang, pageTitle) {
    const url = buildWikisourceUrl(lang, {
        action: 'query',
        titles: pageTitle,
        prop: 'extracts',
        explaintext: true,
        exlimit: 1
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    const pages = data.query?.pages;
    if (!pages) return '';
    
    const pageId = Object.keys(pages)[0];
    return pages[pageId]?.extract || '';
}

/**
 * 🧹 Nettoie et formate le texte extrait
 * @param {string} text - Texte brut
 * @returns {string}
 */
function cleanExtractedText(text) {
    if (!text) return '';
    
    return text
        // Supprimer les lignes de métadonnées Wikisource
        .replace(/^.*?\n.*?publié.*?\n/im, '')
        .replace(/^\s*\d+\s*$/gm, '') // Numéros de page
        .replace(/\[.*?\]/g, '') // Références entre crochets
        .replace(/\n{3,}/g, '\n\n') // Multiples sauts de ligne
        .trim();
}

/**
 * ✂️ Extrait un passage intéressant d'un texte long
 * @param {string} fullText - Texte complet
 * @param {number} maxLength - Longueur max du teaser
 * @returns {Object} - { teaser, remainingText, hasMore }
 */
function extractPassage(fullText, maxLength = DEFAULT_SETTINGS.teaserLength) {
    if (!fullText || fullText.length <= maxLength) {
        return { teaser: fullText, remainingText: '', hasMore: false };
    }
    
    // Chercher une fin de phrase ou de paragraphe
    const searchZone = fullText.slice(0, maxLength + 100);
    
    // Priorité : fin de strophe (double saut de ligne)
    let cutIndex = searchZone.lastIndexOf('\n\n', maxLength);
    
    // Sinon fin de phrase
    if (cutIndex === -1 || cutIndex < maxLength * 0.5) {
        const sentenceEnd = searchZone.match(/[.!?]["»]?\s/g);
        if (sentenceEnd) {
            cutIndex = searchZone.lastIndexOf(sentenceEnd[sentenceEnd.length - 1]) + 1;
        }
    }
    
    // Fallback : couper au mot
    if (cutIndex === -1 || cutIndex < maxLength * 0.3) {
        cutIndex = searchZone.lastIndexOf(' ', maxLength);
    }
    
    const teaser = fullText.slice(0, cutIndex).trim();
    const remainingText = fullText.slice(cutIndex).trim();
    
    return {
        teaser,
        remainingText,
        hasMore: remainingText.length > 50
    };
}

/**
 * 🎯 Détermine le genre littéraire depuis le titre/contenu
 * @param {string} title - Titre de l'œuvre
 * @param {Array} authorGenres - Genres connus de l'auteur
 * @returns {string}
 */
function detectGenre(title, authorGenres) {
    const titleLower = title.toLowerCase();
    
    if (/fable|fables/i.test(titleLower)) return 'fable';
    if (/conte|contes|fairy/i.test(titleLower)) return 'conte';
    if (/poème|poésie|poem|sonnet|ode/i.test(titleLower)) return 'poésie';
    if (/acte|scène|comédie|tragédie|act|scene/i.test(titleLower)) return 'théâtre';
    if (/nouvelle|nouvelles|story|stories/i.test(titleLower)) return 'nouvelle';
    if (/roman|chapter|chapitre/i.test(titleLower)) return 'roman';
    
    // Fallback sur les genres de l'auteur
    return authorGenres?.[0] || 'texte';
}

/**
 * 🔍 Récupère un texte aléatoire depuis Wikisource
 * @param {string} lang - Code langue (défaut: état actuel)
 * @returns {Promise<Object|null>}
 */
export async function fetchRandomText(lang = null) {
    const language = lang || getState('language') || 'fr';
    const authors = AUTHORS_BY_LANG[language] || AUTHORS_BY_LANG.fr;
    
    console.log(`🟡 Fetching random text from Wikisource (${language})...`);
    
    // Sélectionner un auteur aléatoire
    const author = randomItem(authors);
    
    try {
        // Récupérer les pages de l'auteur
        const pages = await getCategoryPages(language, author.category);
        
        if (!pages.length) {
            console.log('🟠 No pages found for author:', author.name);
            return null;
        }
        
        // Filtrer les pages valides (exclure index, auteur, etc.)
        const validPages = pages.filter(p => {
            const title = p.title.toLowerCase();
            return !title.includes('index') && 
                   !title.includes('auteur:') &&
                   !title.includes('author:') &&
                   !title.startsWith('catégorie:') &&
                   !title.startsWith('category:');
        });
        
        if (!validPages.length) {
            console.log('🟠 No valid pages for author:', author.name);
            return null;
        }
        
        // Sélectionner une page aléatoire
        const page = randomItem(validPages);
        
        // Récupérer le contenu
        const rawContent = await getPageContent(language, page.title);
        
        if (!rawContent || rawContent.length < 100) {
            console.log('🟠 Content too short for:', page.title);
            return null;
        }
        
        // Nettoyer et extraire
        const cleanedContent = cleanExtractedText(rawContent);
        const { teaser, remainingText, hasMore } = extractPassage(cleanedContent);
        
        if (teaser.length < 50) {
            console.log('🟠 Teaser too short for:', page.title);
            return null;
        }
        
        // Construire l'objet texte
        const textData = {
            id: `ws_${language}_${generateId()}`,
            author: author.name,
            work: page.title,
            genre: detectGenre(page.title, author.genres),
            language: language,
            teaser: teaser,
            fullText: cleanedContent,
            remainingText: remainingText,
            hasMore: hasMore,
            sourceUrl: `https://${language}.wikisource.org/wiki/${encodeURIComponent(page.title)}`,
            source: 'wikisource',
            fetchedAt: new Date().toISOString()
        };
        
        console.log('🟢 Text fetched:', textData.author, '-', truncateText(textData.work, 30));
        return textData;
        
    } catch (error) {
        console.error('🔴 Wikisource fetch error:', error);
        return null;
    }
}

/**
 * 📚 Remplit le pool de textes
 * @param {number} count - Nombre de textes à récupérer
 * @returns {Promise<Array>}
 */
export async function fillPool(count = DEFAULT_SETTINGS.poolSize) {
    console.log(`🟡 Filling pool with ${count} texts...`);
    
    const texts = [];
    const attempts = count * 3; // Plus de tentatives car certaines échouent
    
    for (let i = 0; i < attempts && texts.length < count; i++) {
        const text = await fetchRandomText();
        if (text) {
            texts.push(text);
        }
    }
    
    console.log(`🟢 Pool filled with ${texts.length} texts`);
    return texts;
}

/**
 * 🔍 Recherche un texte par auteur/titre
 * @param {string} query - Terme de recherche
 * @param {string} lang - Code langue
 * @returns {Promise<Array>}
 */
export async function searchTexts(query, lang = 'fr') {
    console.log(`🟡 Searching Wikisource for: ${query}`);
    
    const url = buildWikisourceUrl(lang, {
        action: 'query',
        list: 'search',
        srsearch: query,
        srlimit: 20
    });
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const results = data.query?.search || [];
        
        console.log(`🟢 Found ${results.length} results`);
        return results.map(r => ({
            title: r.title,
            snippet: stripHtml(r.snippet),
            pageId: r.pageid
        }));
        
    } catch (error) {
        console.error('🔴 Search error:', error);
        return [];
    }
}

/**
 * 📄 Récupère un texte spécifique par titre
 * @param {string} title - Titre exact
 * @param {string} lang - Code langue
 * @returns {Promise<Object|null>}
 */
export async function getTextByTitle(title, lang = 'fr') {
    console.log(`🟡 Fetching specific text: ${title}`);
    
    try {
        const rawContent = await getPageContent(lang, title);
        
        if (!rawContent) return null;
        
        const cleanedContent = cleanExtractedText(rawContent);
        const { teaser, remainingText, hasMore } = extractPassage(cleanedContent);
        
        return {
            id: `ws_${lang}_${generateId()}`,
            author: 'Inconnu', // À déterminer depuis le titre
            work: title,
            genre: 'texte',
            language: lang,
            teaser,
            fullText: cleanedContent,
            remainingText,
            hasMore,
            sourceUrl: `https://${lang}.wikisource.org/wiki/${encodeURIComponent(title)}`,
            source: 'wikisource',
            fetchedAt: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('🔴 Error fetching specific text:', error);
        return null;
    }
}

/**
 * 📋 Retourne la liste des auteurs disponibles pour une langue
 * @param {string} lang - Code langue
 * @returns {Array}
 */
export function getAuthorsForLanguage(lang) {
    return AUTHORS_BY_LANG[lang] || [];
}
