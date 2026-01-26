/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧠 STATE.JS - Store centralisé Palimpseste
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Pattern Redux-like simplifié pour une gestion d'état prévisible.
 * Avantages :
 * - Source unique de vérité
 * - État immutable (évite les bugs de mutation)
 * - Abonnements réactifs (UI se met à jour automatiquement)
 * - Historique des actions (debug facile)
 * - Persistance localStorage intégrée
 * 
 * @version 2.0.0
 * @date 2026-01-26
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY - Création du store
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Crée un store avec état immutable et abonnements
 * @param {Object} initialState - État initial
 * @param {Object} options - Options (persist, name, debug)
 * @returns {Object} Store avec getState, setState, subscribe, dispatch
 */
function createStore(initialState, options = {}) {
    const {
        persist = false,
        name = 'palimpseste',
        debug = false
    } = options;

    // Charger l'état persisté si disponible
    let state = persist ? loadPersistedState(name, initialState) : initialState;
    
    // Abonnés aux changements
    const listeners = new Set();
    
    // Historique des actions (pour debug)
    const history = [];
    const MAX_HISTORY = 50;

    /**
     * Récupère l'état actuel (copie pour immutabilité)
     */
    function getState() {
        return { ...state };
    }

    /**
     * Récupère une partie spécifique de l'état
     * @param {string} path - Chemin dot-notation (ex: 'user.likes')
     */
    function select(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], state);
    }

    /**
     * Met à jour l'état (merge partiel)
     * @param {Object|Function} partial - Nouvel état partiel ou fonction (prevState) => newPartial
     * @param {string} action - Nom de l'action (pour debug)
     */
    function setState(partial, action = 'SET_STATE') {
        const prevState = state;
        const updates = typeof partial === 'function' ? partial(state) : partial;
        
        // Merge immutable
        state = deepMerge(state, updates);
        
        // Log pour debug
        if (debug) {
            console.group(`🔄 ${action}`);
            console.log('Prev:', prevState);
            console.log('Updates:', updates);
            console.log('Next:', state);
            console.groupEnd();
        }
        
        // Historique
        history.push({ action, updates, timestamp: Date.now() });
        if (history.length > MAX_HISTORY) history.shift();
        
        // Notifier les abonnés
        listeners.forEach(listener => {
            try {
                listener(state, prevState);
            } catch (e) {
                console.error('Erreur listener:', e);
            }
        });
        
        // Persister si activé
        if (persist) {
            persistState(name, state);
        }
    }

    /**
     * S'abonner aux changements d'état
     * @param {Function} listener - Callback (newState, prevState) => void
     * @param {Function} selector - Optionnel: ne notifier que si cette partie change
     * @returns {Function} Fonction de désabonnement
     */
    function subscribe(listener, selector = null) {
        let wrappedListener = listener;
        
        if (selector) {
            let prevSelected = selector(state);
            wrappedListener = (newState, prevState) => {
                const newSelected = selector(newState);
                if (!shallowEqual(newSelected, prevSelected)) {
                    prevSelected = newSelected;
                    listener(newSelected, selector(prevState));
                }
            };
        }
        
        listeners.add(wrappedListener);
        
        // Retourne la fonction de désabonnement
        return () => listeners.delete(wrappedListener);
    }

    /**
     * Dispatch une action avec payload
     * @param {string} type - Type d'action
     * @param {any} payload - Données de l'action
     */
    function dispatch(type, payload) {
        const actionHandlers = {
            // Auth
            'AUTH_LOGIN': (p) => ({ user: p, isAuthenticated: true }),
            'AUTH_LOGOUT': () => ({ user: null, isAuthenticated: false, likes: new Set() }),
            
            // Likes
            'LIKE_ADD': (p) => {
                const newLikes = new Set(state.likes);
                newLikes.add(p.extraitId);
                return { likes: newLikes };
            },
            'LIKE_REMOVE': (p) => {
                const newLikes = new Set(state.likes);
                newLikes.delete(p.extraitId);
                return { likes: newLikes };
            },
            'LIKES_SET': (p) => ({ likes: new Set(p) }),
            
            // Reading
            'READ_INCREMENT': () => ({ readCount: state.readCount + 1 }),
            'READING_STATS_UPDATE': (p) => ({ readingStats: { ...state.readingStats, ...p } }),
            
            // Achievements
            'ACHIEVEMENT_UNLOCK': (p) => ({
                achievements: [...state.achievements, p.id]
            }),
            
            // UI
            'UI_SET_LOADING': (p) => ({ ui: { ...state.ui, loading: p } }),
            'UI_SET_THEME': (p) => ({ ui: { ...state.ui, theme: p } }),
            'UI_TOAST': (p) => ({ ui: { ...state.ui, toast: p } }),
            
            // Cache
            'CACHE_SET': (p) => {
                const newCache = new Map(state.cache);
                newCache.set(p.key, { data: p.data, timestamp: Date.now() });
                return { cache: newCache };
            },
            'CACHE_CLEAR': () => ({ cache: new Map() }),
        };
        
        const handler = actionHandlers[type];
        if (handler) {
            setState(handler(payload), type);
        } else if (debug) {
            console.warn(`Action inconnue: ${type}`);
        }
    }

    /**
     * Reset l'état à sa valeur initiale
     */
    function reset() {
        state = initialState;
        listeners.forEach(l => l(state, state));
        if (persist) {
            localStorage.removeItem(`${name}_state`);
        }
    }

    /**
     * Récupère l'historique des actions (debug)
     */
    function getHistory() {
        return [...history];
    }

    return {
        getState,
        select,
        setState,
        subscribe,
        dispatch,
        reset,
        getHistory
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deep merge de deux objets (immutable)
 */
function deepMerge(target, source) {
    const output = { ...target };
    
    for (const key in source) {
        if (source[key] instanceof Map) {
            output[key] = new Map(source[key]);
        } else if (source[key] instanceof Set) {
            output[key] = new Set(source[key]);
        } else if (
            source[key] !== null &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key])
        ) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    }
    
    return output;
}

/**
 * Comparaison shallow de deux valeurs
 */
function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (typeof a !== 'object') return a === b;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => a[key] === b[key]);
}

/**
 * Charge l'état persisté depuis localStorage
 */
function loadPersistedState(name, defaultState) {
    try {
        const saved = localStorage.getItem(`${name}_state`);
        if (!saved) return defaultState;
        
        const parsed = JSON.parse(saved, (key, value) => {
            // Restaurer les Sets
            if (value && value.__type === 'Set') {
                return new Set(value.values);
            }
            // Restaurer les Maps
            if (value && value.__type === 'Map') {
                return new Map(value.entries);
            }
            return value;
        });
        
        // Merge avec defaultState pour avoir les nouvelles propriétés
        return deepMerge(defaultState, parsed);
    } catch (e) {
        console.error('Erreur chargement état persisté:', e);
        return defaultState;
    }
}

/**
 * Persiste l'état dans localStorage
 */
function persistState(name, state) {
    try {
        const serialized = JSON.stringify(state, (key, value) => {
            // Sérialiser les Sets
            if (value instanceof Set) {
                return { __type: 'Set', values: [...value] };
            }
            // Sérialiser les Maps
            if (value instanceof Map) {
                return { __type: 'Map', entries: [...value.entries()] };
            }
            return value;
        });
        localStorage.setItem(`${name}_state`, serialized);
    } catch (e) {
        console.error('Erreur persistance état:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌍 STORE GLOBAL PALIMPSESTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * État initial de l'application
 */
const INITIAL_STATE = {
    // Authentification
    user: null,
    isAuthenticated: false,
    
    // Lecture
    likes: new Set(),
    readCount: 0,
    shownPages: new Set(),
    
    // Statistiques utilisateur
    authorStats: {},
    genreStats: {},
    likedGenreStats: {},
    likedAuthorStats: {},
    likedAuthors: new Set(),
    discoveredConnections: new Set(),
    
    // Gamification
    achievements: [],
    readingPath: [],
    readingStats: {
        totalWordsRead: 0,
        totalReadingTime: 0,
        streak: 0,
        lastReadDate: null,
        sessionsToday: 0,
        bestStreak: 0,
        dailyWords: {}
    },
    
    // Cache
    cache: new Map(),
    
    // UI
    ui: {
        loading: false,
        theme: 'dark',
        toast: null,
        currentView: 'feed',
        sidebarOpen: false
    },
    
    // Filtres d'exploration
    filters: {
        forme: ['all'],
        epoque: ['all'],
        ton: ['all'],
        pensee: ['all'],
        lang: 'fr'
    },
    
    // Pool de textes
    textPool: [],
    cardIndex: 0
};

/**
 * Store global de l'application
 * Utilisation :
 *   Store.getState()              - Récupérer l'état
 *   Store.select('user.likes')    - Récupérer une partie
 *   Store.setState({ loading: true })  - Mettre à jour
 *   Store.dispatch('LIKE_ADD', { extraitId: '123' }) - Action
 *   Store.subscribe(callback)     - S'abonner aux changements
 */
const Store = createStore(INITIAL_STATE, {
    persist: true,
    name: 'palimpseste',
    debug: false  // Mettre true pour voir les logs en dev
});

// Exposer globalement pour compatibilité avec le code existant
window.Store = Store;

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Store, createStore };
}
