/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛠️ UTILS - Palimpseste
 * Fonctions utilitaires génériques
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * 🕐 Debounce - Limite les appels fréquents d'une fonction
 * @param {Function} func - Fonction à debouncer
 * @param {number} wait - Délai en ms
 * @returns {Function}
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 🕐 Throttle - Limite la fréquence d'appel d'une fonction
 * @param {Function} func - Fonction à throttler
 * @param {number} limit - Intervalle minimum en ms
 * @returns {Function}
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 📅 Formate une date relative (il y a X...)
 * @param {Date|string} date - Date à formater
 * @returns {string}
 */
export function formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return 'à l\'instant';
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
    
    return then.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * 🔢 Formate un nombre (1000 -> 1k)
 * @param {number} num - Nombre à formater
 * @returns {string}
 */
export function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

/**
 * ✂️ Tronque un texte avec ellipse
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur max
 * @returns {string}
 */
export function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '…';
}

/**
 * 🧹 Nettoie le HTML d'un texte
 * @param {string} html - HTML à nettoyer
 * @returns {string}
 */
export function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * 🔀 Mélange aléatoirement un tableau (Fisher-Yates)
 * @param {Array} array - Tableau à mélanger
 * @returns {Array}
 */
export function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * 🎲 Retourne un élément aléatoire d'un tableau
 * @param {Array} array - Tableau source
 * @returns {*}
 */
export function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * 🆔 Génère un ID unique simple
 * @returns {string}
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * ⏳ Attend un délai (promesse)
 * @param {number} ms - Délai en ms
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 📱 Détecte si on est sur mobile
 * @returns {boolean}
 */
export function isMobile() {
    return window.innerWidth <= 900;
}

/**
 * 📱 Détecte si c'est un appareil tactile
 * @returns {boolean}
 */
export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 📋 Copie du texte dans le presse-papier
 * @param {string} text - Texte à copier
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('🔴 Erreur copie:', err);
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    }
}

/**
 * 🔗 Parse les paramètres URL
 * @returns {URLSearchParams}
 */
export function getUrlParams() {
    return new URLSearchParams(window.location.search);
}

/**
 * 💾 Sauvegarde dans localStorage
 * @param {string} key - Clé
 * @param {*} value - Valeur (sera JSON.stringify)
 */
export function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.error('🔴 Erreur localStorage save:', err);
    }
}

/**
 * 📂 Récupère depuis localStorage
 * @param {string} key - Clé
 * @param {*} defaultValue - Valeur par défaut
 * @returns {*}
 */
export function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (err) {
        console.error('🔴 Erreur localStorage load:', err);
        return defaultValue;
    }
}

/**
 * 🗑️ Supprime du localStorage
 * @param {string} key - Clé
 */
export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (err) {
        console.error('🔴 Erreur localStorage remove:', err);
    }
}

/**
 * 📜 Scroll fluide vers un élément
 * @param {Element|string} target - Élément ou sélecteur
 * @param {number} offset - Offset en px
 */
export function scrollToElement(target, offset = 0) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;
    
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * 🎯 Crée un élément DOM depuis un template string
 * @param {string} html - HTML string
 * @returns {Element}
 */
export function createElementFromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

/**
 * 🔐 Échappe les caractères HTML spéciaux
 * @param {string} str - Chaîne à échapper
 * @returns {string}
 */
export function escapeHtml(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 🌙 Vérifie si c'est la nuit (pour achievements)
 * @returns {boolean}
 */
export function isNightTime() {
    const hour = new Date().getHours();
    return hour >= 0 && hour < 6;
}

/**
 * 🌅 Vérifie si c'est tôt le matin (pour achievements)
 * @returns {boolean}
 */
export function isEarlyMorning() {
    const hour = new Date().getHours();
    return hour >= 4 && hour < 6;
}

/**
 * 📏 Calcule la hauteur du viewport sans la barre d'adresse mobile
 * @returns {string} - Valeur CSS
 */
export function getRealViewportHeight() {
    return `${window.innerHeight}px`;
}

/**
 * 🎨 Génère une couleur aléatoire parmi les accents
 * @returns {string}
 */
export function getRandomAccentColor() {
    const colors = ['#e63946', '#f4a261', '#2a9d8f', '#9b5de5', '#00d4ff'];
    return randomItem(colors);
}
