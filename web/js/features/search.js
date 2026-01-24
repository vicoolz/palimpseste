/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 SEARCH FEATURE - Palimpseste
 * Recherche de textes, auteurs et œuvres
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getState, setState } from '../state.js';
import { debounce, escapeHtml, truncateText } from '../utils.js';
import { showToast } from '../components/toast.js';
import { searchTexts as searchWikisource } from './wikisource.js';
import { searchPoems } from './poetrydb.js';
import { searchBooks } from './gutenberg.js';

// 📦 Éléments DOM
let searchInput = null;
let searchResults = null;

// 🔍 État de recherche
let isSearching = false;
let lastQuery = '';

/**
 * 🚀 Initialise la recherche
 */
export function initSearch() {
    console.log('🟡 Initializing search...');
    
    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');
    
    if (!searchInput) {
        console.warn('🟠 Search input not found');
        return;
    }
    
    // Input avec debounce
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        
        if (query.length >= 2) {
            performSearch(query);
        } else {
            hideResults();
        }
    }, 300));
    
    // Focus/blur
    searchInput.addEventListener('focus', () => {
        if (lastQuery && searchResults?.children.length > 0) {
            showResults();
        }
    });
    
    // Clic extérieur pour fermer
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults?.contains(e.target)) {
            hideResults();
        }
    });
    
    // Raccourci clavier
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K pour focus
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Escape pour fermer
        if (e.key === 'Escape') {
            hideResults();
            searchInput.blur();
        }
    });
    
    console.log('🟢 Search initialized');
}

/**
 * 🔎 Effectue une recherche
 * @param {string} query 
 */
async function performSearch(query) {
    if (isSearching || query === lastQuery) return;
    
    isSearching = true;
    lastQuery = query;
    
    console.log('🟡 Searching:', query);
    
    // Afficher le loader
    showResults();
    searchResults.innerHTML = '<div class="search-loader"><div class="loader loader--sm"></div></div>';
    
    try {
        const language = getState('currentLanguage') || 'fr';
        const results = await searchAllSources(query, language);
        
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty__icon">🔍</div>
                    <div class="search-empty__text">Aucun résultat pour "${escapeHtml(query)}"</div>
                </div>
            `;
        } else {
            renderResults(results);
        }
        
    } catch (error) {
        console.error('🔴 Search error:', error);
        searchResults.innerHTML = `
            <div class="search-error">
                <div class="search-error__icon">⚠️</div>
                <div class="search-error__text">Erreur de recherche</div>
            </div>
        `;
    } finally {
        isSearching = false;
    }
}

/**
 * 📚 Recherche dans toutes les sources
 * @param {string} query 
 * @param {string} language 
 * @returns {Promise<Array>}
 */
async function searchAllSources(query, language) {
    const promises = [
        searchWikisource(query, language).catch(() => [])
    ];
    
    // PoetryDB pour l'anglais
    if (language === 'en') {
        promises.push(searchPoems(query).catch(() => []));
    }
    
    // Gutenberg
    promises.push(
        searchBooks(query).then(books => 
            books.map(b => ({
                id: `gutenberg-${b.id}`,
                type: 'book',
                title: b.title,
                author: b.authors?.[0]?.name || 'Inconnu',
                source: 'gutenberg',
                preview: b.subjects?.join(', ') || ''
            }))
        ).catch(() => [])
    );
    
    const allResults = await Promise.all(promises);
    
    // Fusionner et dédupliquer
    return allResults.flat().slice(0, 20);
}

/**
 * 🎨 Rend les résultats
 * @param {Array} results 
 */
function renderResults(results) {
    searchResults.innerHTML = results.map(result => `
        <div class="search-result" data-result-id="${result.id}" data-source="${result.source}">
            <div class="search-result__icon">
                ${getResultIcon(result.type)}
            </div>
            <div class="search-result__content">
                <div class="search-result__title">${escapeHtml(result.title)}</div>
                <div class="search-result__meta">
                    ${escapeHtml(result.author)}
                    ${result.preview ? ` — ${escapeHtml(truncateText(result.preview, 50))}` : ''}
                </div>
            </div>
            <div class="search-result__source">
                ${getSourceLabel(result.source)}
            </div>
        </div>
    `).join('');
    
    // Événements de clic
    searchResults.querySelectorAll('.search-result').forEach(el => {
        el.addEventListener('click', () => {
            selectResult(el.dataset.resultId, el.dataset.source);
        });
    });
}

/**
 * 🎯 Sélectionne un résultat
 * @param {string} resultId 
 * @param {string} source 
 */
function selectResult(resultId, source) {
    console.log('🟡 Selected result:', resultId, source);
    
    hideResults();
    searchInput.value = '';
    lastQuery = '';
    
    // Dispatcher l'événement
    window.dispatchEvent(new CustomEvent('search-select', {
        detail: { resultId, source }
    }));
    
    showToast('Chargement du texte...', 'info');
}

/**
 * 🖼️ Retourne l'icône selon le type
 * @param {string} type 
 * @returns {string}
 */
function getResultIcon(type) {
    const icons = {
        text: '📜',
        poem: '🎭',
        book: '📖',
        author: '✍️'
    };
    return icons[type] || '📄';
}

/**
 * 🏷️ Retourne le label de la source
 * @param {string} source 
 * @returns {string}
 */
function getSourceLabel(source) {
    const labels = {
        wikisource: 'Wikisource',
        poetrydb: 'PoetryDB',
        gutenberg: 'Gutenberg'
    };
    return labels[source] || source;
}

/**
 * 👁️ Affiche les résultats
 */
function showResults() {
    if (!searchResults) {
        searchResults = document.createElement('div');
        searchResults.id = 'search-results';
        searchResults.className = 'search-results';
        searchInput.parentElement.appendChild(searchResults);
    }
    
    searchResults.classList.add('visible');
}

/**
 * 🙈 Cache les résultats
 */
function hideResults() {
    if (searchResults) {
        searchResults.classList.remove('visible');
    }
}

/**
 * 🧹 Efface la recherche
 */
export function clearSearch() {
    if (searchInput) {
        searchInput.value = '';
    }
    lastQuery = '';
    hideResults();
}

/**
 * 🎯 Focus sur la recherche
 */
export function focusSearch() {
    searchInput?.focus();
}

// 🌐 Exposer pour usage global
window.focusSearch = focusSearch;
window.clearSearch = clearSearch;
