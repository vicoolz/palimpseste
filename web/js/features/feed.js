/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📰 FEED FEATURE - Palimpseste
 * Gestion du flux de textes littéraires
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getState, setState, subscribe } from '../state.js';
import { isMobile, debounce, shuffleArray } from '../utils.js';
import { createCard } from '../components/card.js';
import { showToast } from '../components/toast.js';
import { fetchRandomText as fetchWikisource } from './wikisource.js';
import { fetchRandomPoem } from './poetrydb.js';
import { fetchRandomBook } from './gutenberg.js';
import { LANGUAGES } from '../config.js';

// 📦 Pool de textes pré-chargés
let textPool = [];
const POOL_SIZE = 10;
const REFILL_THRESHOLD = 3;

// 🔄 État de chargement
let isLoading = false;
let isFilling = false;

// 📋 Container du feed
let feedContainer = null;

/**
 * 🚀 Initialise le feed
 */
export function initFeed() {
    console.log('🟡 Initializing feed...');
    
    feedContainer = document.getElementById('feed') || document.querySelector('.feed');
    
    if (!feedContainer) {
        console.warn('🟠 Feed container not found');
        return;
    }
    
    // Scroll infini
    setupInfiniteScroll();
    
    // Swipe pour nouveau texte (mobile)
    if (isMobile()) {
        setupSwipeRefresh();
    }
    
    // Écouter les changements de langue
    subscribe('currentLanguage', (lang) => {
        console.log('🟡 Language changed:', lang);
        clearFeed();
        fillPool();
    });
    
    // Écouter les filtres
    subscribe('filters', () => {
        clearFeed();
        loadMoreTexts();
    });
    
    // Remplir le pool initial
    fillPool().then(() => {
        loadMoreTexts(5);
    });
    
    console.log('🟢 Feed initialized');
}

/**
 * 🔄 Remplit le pool de textes
 */
export async function fillPool() {
    if (isFilling || textPool.length >= POOL_SIZE) return;
    
    isFilling = true;
    const language = getState('currentLanguage') || 'fr';
    const textsNeeded = POOL_SIZE - textPool.length;
    
    console.log(`🟡 Filling pool: need ${textsNeeded} texts for ${language}`);
    
    try {
        const promises = [];
        
        for (let i = 0; i < textsNeeded; i++) {
            promises.push(fetchTextForLanguage(language));
        }
        
        const results = await Promise.allSettled(promises);
        
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                textPool.push(result.value);
            }
        });
        
        // Mélanger le pool
        textPool = shuffleArray(textPool);
        
        console.log(`🟢 Pool filled: ${textPool.length} texts`);
    } catch (error) {
        console.error('🔴 Error filling pool:', error);
    } finally {
        isFilling = false;
    }
}

/**
 * 📚 Récupère un texte selon la langue
 * @param {string} language 
 * @returns {Promise<Object|null>}
 */
async function fetchTextForLanguage(language) {
    try {
        // Priorité selon la langue
        const sources = getSourcesForLanguage(language);
        
        // Essayer chaque source
        for (const source of sources) {
            try {
                const text = await source(language);
                if (text) return text;
            } catch (e) {
                console.warn(`🟠 Source failed:`, e.message);
            }
        }
        
        return null;
    } catch (error) {
        console.error('🔴 Fetch text error:', error);
        return null;
    }
}

/**
 * 🎯 Retourne les sources adaptées à la langue
 * @param {string} language 
 * @returns {Array<Function>}
 */
function getSourcesForLanguage(language) {
    const sources = [fetchWikisource];
    
    // PoetryDB pour l'anglais seulement
    if (language === 'en') {
        sources.push(async () => fetchRandomPoem());
    }
    
    // Gutenberg pour anglais et allemand principalement
    if (['en', 'de'].includes(language)) {
        sources.push(async () => {
            const book = await fetchRandomBook();
            return book;
        });
    }
    
    return sources;
}

/**
 * ➕ Charge plus de textes
 * @param {number} count - Nombre de textes à charger
 */
export async function loadMoreTexts(count = 3) {
    if (isLoading) return;
    
    isLoading = true;
    showLoader();
    
    console.log(`🟡 Loading ${count} texts...`);
    
    try {
        // Si le pool est bas, commencer à le remplir
        if (textPool.length < REFILL_THRESHOLD) {
            fillPool();
        }
        
        // Prendre du pool ou attendre de nouveaux textes
        let textsToShow = [];
        
        for (let i = 0; i < count; i++) {
            if (textPool.length > 0) {
                textsToShow.push(textPool.shift());
            } else {
                // Attendre un nouveau texte
                const language = getState('currentLanguage') || 'fr';
                const text = await fetchTextForLanguage(language);
                if (text) textsToShow.push(text);
            }
        }
        
        // Filtrer selon les critères actifs
        textsToShow = applyFilters(textsToShow);
        
        // Afficher les cartes
        textsToShow.forEach(text => {
            if (text) {
                const card = createCard(text);
                feedContainer.appendChild(card);
            }
        });
        
        console.log(`🟢 Loaded ${textsToShow.length} texts`);
        
        // Déclencher un re-remplissage si nécessaire
        if (textPool.length < REFILL_THRESHOLD) {
            fillPool();
        }
    } catch (error) {
        console.error('🔴 Error loading texts:', error);
        showToast('Erreur de chargement', 'error');
    } finally {
        isLoading = false;
        hideLoader();
    }
}

/**
 * 🎚️ Applique les filtres actifs
 * @param {Array} texts 
 * @returns {Array}
 */
function applyFilters(texts) {
    const filters = getState('filters') || {};
    
    return texts.filter(text => {
        if (!text) return false;
        
        // Filtre par genre
        if (filters.genre && text.genre !== filters.genre) {
            return false;
        }
        
        // Filtre par époque
        if (filters.epoque && text.epoque !== filters.epoque) {
            return false;
        }
        
        // Filtre par courant
        if (filters.courant && text.courant !== filters.courant) {
            return false;
        }
        
        // Filtre par ambiance
        if (filters.ambiance && text.ambiance !== filters.ambiance) {
            return false;
        }
        
        return true;
    });
}

/**
 * 🧹 Vide le feed
 */
export function clearFeed() {
    if (feedContainer) {
        feedContainer.innerHTML = '';
    }
    textPool = [];
}

/**
 * 📜 Configure le scroll infini
 */
function setupInfiniteScroll() {
    const scrollElement = isMobile() 
        ? document.querySelector('.main-content') 
        : window;
    
    const handleScroll = debounce(() => {
        const scrollable = isMobile() 
            ? document.querySelector('.main-content')
            : document.documentElement;
        
        const scrollTop = scrollable.scrollTop || window.pageYOffset;
        const scrollHeight = scrollable.scrollHeight;
        const clientHeight = scrollable.clientHeight || window.innerHeight;
        
        // Si proche du bas, charger plus
        if (scrollTop + clientHeight >= scrollHeight - 500) {
            loadMoreTexts();
        }
    }, 200);
    
    scrollElement.addEventListener('scroll', handleScroll);
}

/**
 * 👆 Configure le pull-to-refresh (mobile)
 */
function setupSwipeRefresh() {
    let startY = 0;
    let isPulling = false;
    
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    mainContent.addEventListener('touchstart', (e) => {
        if (mainContent.scrollTop === 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });
    
    mainContent.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        const deltaY = e.touches[0].clientY - startY;
        
        if (deltaY > 0 && deltaY < 150) {
            // Indicateur visuel
            mainContent.style.transform = `translateY(${deltaY * 0.3}px)`;
        }
    }, { passive: true });
    
    mainContent.addEventListener('touchend', (e) => {
        if (!isPulling) return;
        
        isPulling = false;
        mainContent.style.transform = '';
        
        const deltaY = e.changedTouches[0].clientY - startY;
        
        if (deltaY > 80) {
            refreshFeed();
        }
    });
}

/**
 * 🔄 Rafraîchit le feed
 */
export async function refreshFeed() {
    console.log('🟡 Refreshing feed...');
    
    showToast('Nouveaux textes en cours...', 'info');
    clearFeed();
    textPool = [];
    
    await fillPool();
    await loadMoreTexts(5);
    
    showToast('Feed rafraîchi !', 'success');
}

/**
 * ⏳ Affiche le loader
 */
function showLoader() {
    let loader = feedContainer.querySelector('.feed__loader');
    
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'feed__loader';
        loader.innerHTML = '<div class="loader"></div>';
        feedContainer.appendChild(loader);
    }
    
    loader.style.display = 'flex';
}

/**
 * 🙈 Cache le loader
 */
function hideLoader() {
    const loader = feedContainer.querySelector('.feed__loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

/**
 * 📊 Retourne les statistiques du feed
 * @returns {Object}
 */
export function getFeedStats() {
    const cards = feedContainer?.querySelectorAll('.card') || [];
    
    return {
        displayedCount: cards.length,
        poolSize: textPool.length,
        isLoading
    };
}

// 🌐 Exposer pour usage global
window.refreshFeed = refreshFeed;
window.loadMoreTexts = loadMoreTexts;
