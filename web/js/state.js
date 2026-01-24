/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📦 STATE - Palimpseste
 * Gestion centralisée de l'état de l'application
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DEFAULT_SETTINGS } from './config.js';
import { loadFromStorage, saveToStorage } from './utils.js';

/**
 * 🏪 État global de l'application
 */
const state = {
    // 👤 Utilisateur
    user: null,
    session: null,
    profile: null,
    
    // 📚 Textes
    pool: [],               // Pool de textes pré-chargés
    currentText: null,      // Texte actuellement affiché
    displayedTexts: [],     // Historique des textes affichés
    
    // 🔍 Filtres
    language: DEFAULT_SETTINGS.language,
    ambiance: 'toutes',
    epoque: 'toutes',
    courant: 'tous',
    searchQuery: '',
    
    // 📱 UI
    isLoading: false,
    drawerOpen: false,
    activeModal: null,
    activeOverlay: null,
    
    // 📊 Stats session
    textsRead: 0,
    likesGiven: 0,
    languagesDiscovered: new Set(),
    
    // 🔔 Notifications
    unreadNotifications: 0,
    unreadMessages: 0,
    
    // 💾 Cache
    likedTextsIds: new Set(),
    followingIds: new Set(),
    achievementsUnlocked: new Set()
};

/**
 * 👂 Listeners pour les changements d'état
 */
const listeners = new Map();

/**
 * 📢 Notifie les listeners d'un changement
 * @param {string} key - Clé modifiée
 * @param {*} value - Nouvelle valeur
 */
function notifyListeners(key, value) {
    const keyListeners = listeners.get(key) || [];
    keyListeners.forEach(callback => callback(value, key));
    
    // Notifier aussi les listeners globaux (*)
    const globalListeners = listeners.get('*') || [];
    globalListeners.forEach(callback => callback(value, key));
}

/**
 * 📖 Getter - Récupère une valeur de l'état
 * @param {string} key - Clé à récupérer
 * @returns {*}
 */
export function getState(key) {
    return state[key];
}

/**
 * ✏️ Setter - Modifie une valeur de l'état
 * @param {string} key - Clé à modifier
 * @param {*} value - Nouvelle valeur
 */
export function setState(key, value) {
    const oldValue = state[key];
    state[key] = value;
    
    console.log(`🟢 State update: ${key}`, value);
    notifyListeners(key, value);
    
    // Persistance automatique de certaines clés
    const persistentKeys = ['language', 'ambiance', 'epoque', 'courant'];
    if (persistentKeys.includes(key)) {
        saveToStorage(`palimpseste_${key}`, value);
    }
}

/**
 * 🔄 Update partiel - Met à jour plusieurs clés
 * @param {Object} updates - Objet avec les mises à jour
 */
export function updateState(updates) {
    Object.entries(updates).forEach(([key, value]) => {
        setState(key, value);
    });
}

/**
 * 👂 Subscribe - S'abonne aux changements d'une clé
 * @param {string} key - Clé à surveiller (* pour tout)
 * @param {Function} callback - Fonction appelée lors d'un changement
 * @returns {Function} - Fonction pour se désabonner
 */
export function subscribe(key, callback) {
    if (!listeners.has(key)) {
        listeners.set(key, []);
    }
    listeners.get(key).push(callback);
    
    // Retourne une fonction pour se désabonner
    return () => {
        const keyListeners = listeners.get(key);
        const index = keyListeners.indexOf(callback);
        if (index > -1) {
            keyListeners.splice(index, 1);
        }
    };
}

/**
 * 💾 Initialise l'état depuis le localStorage
 */
export function initStateFromStorage() {
    console.log('🟡 Init state from storage...');
    
    state.language = loadFromStorage('palimpseste_language', DEFAULT_SETTINGS.language);
    state.ambiance = loadFromStorage('palimpseste_ambiance', 'toutes');
    state.epoque = loadFromStorage('palimpseste_epoque', 'toutes');
    state.courant = loadFromStorage('palimpseste_courant', 'tous');
    
    // Charger les likes cachés
    const cachedLikes = loadFromStorage('palimpseste_likes', []);
    state.likedTextsIds = new Set(cachedLikes);
    
    // Charger les achievements débloqués
    const cachedAchievements = loadFromStorage('palimpseste_achievements', []);
    state.achievementsUnlocked = new Set(cachedAchievements);
    
    console.log('🟢 State initialized:', {
        language: state.language,
        ambiance: state.ambiance,
        likedCount: state.likedTextsIds.size
    });
}

/**
 * 👤 Met à jour l'état utilisateur (après login)
 * @param {Object} userData - Données utilisateur de Supabase
 */
export function setUserState(userData) {
    setState('user', userData.user);
    setState('session', userData.session);
    
    if (userData.profile) {
        setState('profile', userData.profile);
    }
}

/**
 * 🚪 Réinitialise l'état utilisateur (après logout)
 */
export function clearUserState() {
    setState('user', null);
    setState('session', null);
    setState('profile', null);
    setState('followingIds', new Set());
}

/**
 * ❤️ Ajoute un like au cache local
 * @param {string} textId - ID du texte liké
 */
export function addLikeToCache(textId) {
    state.likedTextsIds.add(textId);
    state.likesGiven++;
    saveToStorage('palimpseste_likes', Array.from(state.likedTextsIds));
    notifyListeners('likedTextsIds', state.likedTextsIds);
}

/**
 * 💔 Retire un like du cache local
 * @param {string} textId - ID du texte unliké
 */
export function removeLikeFromCache(textId) {
    state.likedTextsIds.delete(textId);
    saveToStorage('palimpseste_likes', Array.from(state.likedTextsIds));
    notifyListeners('likedTextsIds', state.likedTextsIds);
}

/**
 * ❤️ Vérifie si un texte est liké
 * @param {string} textId - ID du texte
 * @returns {boolean}
 */
export function isTextLiked(textId) {
    return state.likedTextsIds.has(textId);
}

/**
 * 🏆 Débloque un achievement
 * @param {string} achievementId - ID de l'achievement
 */
export function unlockAchievement(achievementId) {
    if (!state.achievementsUnlocked.has(achievementId)) {
        state.achievementsUnlocked.add(achievementId);
        saveToStorage('palimpseste_achievements', Array.from(state.achievementsUnlocked));
        notifyListeners('achievementsUnlocked', state.achievementsUnlocked);
        return true; // Nouveau débloqué
    }
    return false; // Déjà débloqué
}

/**
 * 📊 Récupère les stats de session
 * @returns {Object}
 */
export function getSessionStats() {
    return {
        textsRead: state.textsRead,
        likesGiven: state.likesGiven,
        languagesDiscovered: state.languagesDiscovered.size
    };
}

/**
 * 🔄 Reset l'état des filtres
 */
export function resetFilters() {
    setState('ambiance', 'toutes');
    setState('epoque', 'toutes');
    setState('courant', 'tous');
    setState('searchQuery', '');
}

// Export de l'état complet pour debug
export function getFullState() {
    return { ...state };
}
