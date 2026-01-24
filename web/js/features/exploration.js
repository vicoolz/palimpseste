/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧭 EXPLORATION FEATURE - Palimpseste
 * Filtres par ambiance, époque et courant littéraire
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getState, setState, subscribe } from '../state.js';
import { AMBIANCES, EPOQUES, COURANTS } from '../config.js';
import { showToast } from '../components/toast.js';

// 📦 État local
let activeTab = 'ambiances';
let activeFilters = {
    ambiance: null,
    epoque: null,
    courant: null
};

/**
 * 🚀 Initialise l'exploration
 */
export function initExploration() {
    console.log('🟡 Initializing exploration...');
    
    // Tabs
    const tabs = document.querySelectorAll('.exploration-tabs__tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setActiveTab(tab.dataset.tab);
        });
    });
    
    // Rendre les barres initiales
    renderAmbiancesBar();
    renderEpoquesBar();
    renderCourantsBar();
    
    // Écouter les changements d'état
    subscribe('filters', (filters) => {
        updateFilterUI(filters);
    });
    
    console.log('🟢 Exploration initialized');
}

/**
 * 📑 Change l'onglet actif
 * @param {string} tabName 
 */
function setActiveTab(tabName) {
    activeTab = tabName;
    
    // UI tabs
    document.querySelectorAll('.exploration-tabs__tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // UI content
    document.querySelectorAll('.exploration-bar').forEach(bar => {
        bar.classList.toggle('active', bar.id === `${tabName}-bar`);
    });
}

/**
 * 🎨 Rend la barre des ambiances
 */
function renderAmbiancesBar() {
    const container = document.getElementById('ambiances-bar');
    if (!container) return;
    
    container.innerHTML = Object.entries(AMBIANCES).map(([key, ambiance]) => `
        <button class="ambiance-chip" 
                data-ambiance="${key}"
                title="${ambiance.description}"
                style="--ambiance-color: ${ambiance.color}">
            ${ambiance.icon} ${ambiance.name}
        </button>
    `).join('');
    
    // Événements
    container.querySelectorAll('.ambiance-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            toggleFilter('ambiance', chip.dataset.ambiance);
        });
    });
}

/**
 * 📅 Rend la barre des époques
 */
function renderEpoquesBar() {
    const container = document.getElementById('epoques-bar');
    if (!container) return;
    
    container.innerHTML = Object.entries(EPOQUES).map(([key, epoque]) => `
        <button class="epoque-chip" 
                data-epoque="${key}"
                title="${epoque.years}">
            ${epoque.icon} ${epoque.name}
        </button>
    `).join('');
    
    // Événements
    container.querySelectorAll('.epoque-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            toggleFilter('epoque', chip.dataset.epoque);
        });
    });
}

/**
 * 🌊 Rend la barre des courants
 */
function renderCourantsBar() {
    const container = document.getElementById('courants-bar');
    if (!container) return;
    
    container.innerHTML = Object.entries(COURANTS).map(([key, courant]) => `
        <button class="courant-chip" 
                data-courant="${key}"
                title="${courant.description}"
                style="--courant-color: ${courant.color}">
            ${courant.icon} ${courant.name}
        </button>
    `).join('');
    
    // Événements
    container.querySelectorAll('.courant-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            toggleFilter('courant', chip.dataset.courant);
        });
    });
}

/**
 * 🔄 Toggle un filtre
 * @param {string} type - 'ambiance', 'epoque', 'courant'
 * @param {string} value 
 */
export function toggleFilter(type, value) {
    const currentFilters = getState('filters') || {};
    
    // Toggle: si déjà actif, désactiver
    if (currentFilters[type] === value) {
        currentFilters[type] = null;
        showToast(`Filtre ${type} désactivé`, 'info');
    } else {
        currentFilters[type] = value;
        
        // Message selon le type
        const configs = { ambiance: AMBIANCES, epoque: EPOQUES, courant: COURANTS };
        const item = configs[type]?.[value];
        
        if (item) {
            showToast(`${item.icon} Filtre: ${item.name}`, 'success');
        }
    }
    
    setState('filters', { ...currentFilters });
    activeFilters = { ...currentFilters };
}

/**
 * 🎯 Active un filtre spécifique
 * @param {string} type 
 * @param {string} value 
 */
export function setFilter(type, value) {
    const currentFilters = getState('filters') || {};
    currentFilters[type] = value;
    setState('filters', { ...currentFilters });
    activeFilters = { ...currentFilters };
}

/**
 * 🧹 Efface tous les filtres
 */
export function clearFilters() {
    setState('filters', {
        ambiance: null,
        epoque: null,
        courant: null
    });
    
    activeFilters = {
        ambiance: null,
        epoque: null,
        courant: null
    };
    
    showToast('Filtres réinitialisés', 'info');
}

/**
 * 🖌️ Met à jour l'UI des filtres
 * @param {Object} filters 
 */
function updateFilterUI(filters) {
    // Ambiances
    document.querySelectorAll('.ambiance-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.ambiance === filters.ambiance);
    });
    
    // Époques
    document.querySelectorAll('.epoque-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.epoque === filters.epoque);
    });
    
    // Courants
    document.querySelectorAll('.courant-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.courant === filters.courant);
    });
    
    // Indicateur de filtres actifs
    updateActiveFiltersIndicator(filters);
}

/**
 * 📍 Met à jour l'indicateur de filtres actifs
 * @param {Object} filters 
 */
function updateActiveFiltersIndicator(filters) {
    const indicator = document.getElementById('active-filters');
    if (!indicator) return;
    
    const activeCount = Object.values(filters).filter(v => v !== null).length;
    
    if (activeCount === 0) {
        indicator.innerHTML = '';
        indicator.style.display = 'none';
        return;
    }
    
    indicator.style.display = 'flex';
    
    const chips = [];
    
    if (filters.ambiance && AMBIANCES[filters.ambiance]) {
        const a = AMBIANCES[filters.ambiance];
        chips.push(`<span class="filter-tag" data-clear="ambiance">${a.icon} ${a.name} ×</span>`);
    }
    
    if (filters.epoque && EPOQUES[filters.epoque]) {
        const e = EPOQUES[filters.epoque];
        chips.push(`<span class="filter-tag" data-clear="epoque">${e.icon} ${e.name} ×</span>`);
    }
    
    if (filters.courant && COURANTS[filters.courant]) {
        const c = COURANTS[filters.courant];
        chips.push(`<span class="filter-tag" data-clear="courant">${c.icon} ${c.name} ×</span>`);
    }
    
    indicator.innerHTML = chips.join('') + 
        `<button class="btn btn--ghost btn--sm" data-action="clear-all">Tout effacer</button>`;
    
    // Événements de suppression
    indicator.querySelectorAll('[data-clear]').forEach(tag => {
        tag.addEventListener('click', () => {
            const type = tag.dataset.clear;
            if (type === 'all') {
                clearFilters();
            } else {
                toggleFilter(type, getState('filters')?.[type]);
            }
        });
    });
    
    indicator.querySelector('[data-action="clear-all"]')?.addEventListener('click', clearFilters);
}

/**
 * 📊 Récupère les filtres actifs
 * @returns {Object}
 */
export function getActiveFilters() {
    return { ...activeFilters };
}

/**
 * 🎲 Retourne une ambiance aléatoire
 * @returns {string}
 */
export function getRandomAmbiance() {
    const keys = Object.keys(AMBIANCES);
    return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * 🎲 Retourne une époque aléatoire
 * @returns {string}
 */
export function getRandomEpoque() {
    const keys = Object.keys(EPOQUES);
    return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * 🎲 Retourne un courant aléatoire
 * @returns {string}
 */
export function getRandomCourant() {
    const keys = Object.keys(COURANTS);
    return keys[Math.floor(Math.random() * keys.length)];
}

// 🌐 Exposer pour usage global
window.toggleFilter = toggleFilter;
window.clearFilters = clearFilters;
