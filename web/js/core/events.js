/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📡 EVENTS.JS - Event Bus Palimpseste
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Bus d'événements centralisé pour communication entre modules.
 * Permet le découplage total des composants.
 * 
 * Avantages :
 * - Modules indépendants (pas de dépendances croisées)
 * - Ajout de fonctionnalités sans modifier l'existant
 * - Tests unitaires facilités
 * - Debug avec historique des événements
 * 
 * @version 2.0.0
 * @date 2026-01-26
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 TYPES D'ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Catalogue de tous les événements de l'application
 * Permet l'autocomplétion et évite les typos
 */
const EventTypes = {
    // Auth
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_SESSION_EXPIRED: 'auth:session_expired',
    
    // User
    USER_PROFILE_UPDATED: 'user:profile_updated',
    USER_STATS_UPDATED: 'user:stats_updated',
    
    // Extraits
    EXTRAIT_CREATED: 'extrait:created',
    EXTRAIT_DELETED: 'extrait:deleted',
    EXTRAIT_LIKED: 'extrait:liked',
    EXTRAIT_UNLIKED: 'extrait:unliked',
    EXTRAIT_SHARED: 'extrait:shared',
    EXTRAIT_VIEWED: 'extrait:viewed',
    
    // Comments
    COMMENT_ADDED: 'comment:added',
    COMMENT_DELETED: 'comment:deleted',
    
    // Social
    USER_FOLLOWED: 'social:followed',
    USER_UNFOLLOWED: 'social:unfollowed',
    MESSAGE_RECEIVED: 'social:message_received',
    MESSAGE_SENT: 'social:message_sent',
    
    // Reading
    TEXT_READ: 'reading:text_read',
    TEXT_SKIPPED: 'reading:text_skipped',
    READING_STREAK_UPDATED: 'reading:streak_updated',
    
    // Gamification
    ACHIEVEMENT_UNLOCKED: 'gamification:achievement_unlocked',
    LEVEL_UP: 'gamification:level_up',
    BADGE_EARNED: 'gamification:badge_earned',
    
    // Navigation
    VIEW_CHANGED: 'nav:view_changed',
    MODAL_OPENED: 'nav:modal_opened',
    MODAL_CLOSED: 'nav:modal_closed',
    
    // UI
    TOAST_SHOW: 'ui:toast_show',
    THEME_CHANGED: 'ui:theme_changed',
    LOADING_START: 'ui:loading_start',
    LOADING_END: 'ui:loading_end',
    
    // Feed
    FEED_REFRESHED: 'feed:refreshed',
    FEED_NEW_CONTENT: 'feed:new_content',
    FEED_SCROLL_TOP: 'feed:scroll_top',
    
    // Exploration
    FILTER_CHANGED: 'exploration:filter_changed',
    RANDOM_JUMP: 'exploration:random_jump',
    AUTHOR_EXPLORED: 'exploration:author_explored',
    
    // Errors
    ERROR_NETWORK: 'error:network',
    ERROR_API: 'error:api',
    ERROR_AUTH: 'error:auth',
    
    // Realtime
    REALTIME_CONNECTED: 'realtime:connected',
    REALTIME_DISCONNECTED: 'realtime:disconnected',
    REALTIME_UPDATE: 'realtime:update'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 CLASSE EVENT BUS
// ═══════════════════════════════════════════════════════════════════════════

class EventBus {
    #listeners = new Map();
    #history = [];
    #maxHistory = 100;
    #debug = false;

    /**
     * Active le mode debug
     */
    enableDebug() {
        this.#debug = true;
        console.log('📡 EventBus debug mode enabled');
    }

    /**
     * Désactive le mode debug
     */
    disableDebug() {
        this.#debug = false;
    }

    /**
     * S'abonner à un événement
     * @param {string} event - Type d'événement
     * @param {Function} callback - Fonction appelée (payload) => void
     * @param {Object} options - { once: boolean, priority: number }
     * @returns {Function} Fonction de désabonnement
     */
    on(event, callback, options = {}) {
        const { once = false, priority = 0 } = options;

        if (!this.#listeners.has(event)) {
            this.#listeners.set(event, []);
        }

        const listener = {
            callback,
            once,
            priority,
            id: this.#generateId()
        };

        const listeners = this.#listeners.get(event);
        listeners.push(listener);
        
        // Trier par priorité (plus haute = exécutée en premier)
        listeners.sort((a, b) => b.priority - a.priority);

        // Retourner la fonction de désabonnement
        return () => this.off(event, listener.id);
    }

    /**
     * S'abonner à un événement une seule fois
     */
    once(event, callback) {
        return this.on(event, callback, { once: true });
    }

    /**
     * Se désabonner d'un événement
     * @param {string} event - Type d'événement
     * @param {string|Function} idOrCallback - ID du listener ou callback
     */
    off(event, idOrCallback) {
        if (!this.#listeners.has(event)) return;

        const listeners = this.#listeners.get(event);
        const index = listeners.findIndex(l => 
            l.id === idOrCallback || l.callback === idOrCallback
        );

        if (index > -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.#listeners.delete(event);
        }
    }

    /**
     * Émettre un événement
     * @param {string} event - Type d'événement
     * @param {any} payload - Données de l'événement
     */
    emit(event, payload = null) {
        const entry = {
            event,
            payload,
            timestamp: Date.now(),
            listenersCount: 0
        };

        if (this.#debug) {
            console.log(`📡 ${event}`, payload);
        }

        if (this.#listeners.has(event)) {
            const listeners = this.#listeners.get(event);
            entry.listenersCount = listeners.length;

            // Copie pour éviter les problèmes si un listener se désabonne
            const listenersCopy = [...listeners];
            
            for (const listener of listenersCopy) {
                try {
                    listener.callback(payload);
                } catch (error) {
                    console.error(`Erreur listener ${event}:`, error);
                }

                if (listener.once) {
                    this.off(event, listener.id);
                }
            }
        }

        // Historique
        this.#history.push(entry);
        if (this.#history.length > this.#maxHistory) {
            this.#history.shift();
        }
    }

    /**
     * Émettre un événement avec attente (async)
     * Attend que tous les listeners async soient terminés
     */
    async emitAsync(event, payload = null) {
        if (!this.#listeners.has(event)) return [];

        const listeners = this.#listeners.get(event);
        const results = [];

        for (const listener of [...listeners]) {
            try {
                const result = await listener.callback(payload);
                results.push(result);
            } catch (error) {
                console.error(`Erreur listener async ${event}:`, error);
                results.push(error);
            }

            if (listener.once) {
                this.off(event, listener.id);
            }
        }

        return results;
    }

    /**
     * Vérifier si un événement a des listeners
     */
    hasListeners(event) {
        return this.#listeners.has(event) && this.#listeners.get(event).length > 0;
    }

    /**
     * Compter les listeners pour un événement
     */
    listenerCount(event) {
        return this.#listeners.has(event) ? this.#listeners.get(event).length : 0;
    }

    /**
     * Supprimer tous les listeners d'un événement
     */
    removeAllListeners(event = null) {
        if (event) {
            this.#listeners.delete(event);
        } else {
            this.#listeners.clear();
        }
    }

    /**
     * Récupérer l'historique des événements
     */
    getHistory(filter = null) {
        if (!filter) return [...this.#history];
        
        return this.#history.filter(entry => 
            entry.event.includes(filter) || 
            entry.event.startsWith(filter)
        );
    }

    /**
     * Générer un ID unique
     */
    #generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Debug: lister tous les événements avec leurs listeners
     */
    debug() {
        console.group('📡 EventBus State');
        console.log('Registered events:', this.#listeners.size);
        
        for (const [event, listeners] of this.#listeners) {
            console.log(`  ${event}: ${listeners.length} listeners`);
        }
        
        console.log('History:', this.#history.length, 'events');
        console.log('Last 5 events:', this.#history.slice(-5));
        console.groupEnd();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎭 HELPERS - Intégration avec le Store
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Connecte l'EventBus avec le Store pour synchronisation automatique
 */
function connectStoreToEvents(store, eventBus) {
    // Écouter les changements de Store et émettre des événements
    store.subscribe((newState, prevState) => {
        // Auth changes
        if (newState.isAuthenticated !== prevState.isAuthenticated) {
            eventBus.emit(
                newState.isAuthenticated ? EventTypes.AUTH_LOGIN : EventTypes.AUTH_LOGOUT,
                newState.user
            );
        }

        // Theme changes
        if (newState.ui?.theme !== prevState.ui?.theme) {
            eventBus.emit(EventTypes.THEME_CHANGED, newState.ui.theme);
        }

        // Likes changes
        if (newState.likes?.size !== prevState.likes?.size) {
            eventBus.emit(EventTypes.USER_STATS_UPDATED, {
                likes: newState.likes.size
            });
        }

        // Achievements
        if (newState.achievements?.length !== prevState.achievements?.length) {
            const newAchievement = newState.achievements[newState.achievements.length - 1];
            eventBus.emit(EventTypes.ACHIEVEMENT_UNLOCKED, newAchievement);
        }
    });

    // Écouter les événements et mettre à jour le Store
    eventBus.on(EventTypes.EXTRAIT_LIKED, ({ extraitId }) => {
        store.dispatch('LIKE_ADD', { extraitId });
    });

    eventBus.on(EventTypes.EXTRAIT_UNLIKED, ({ extraitId }) => {
        store.dispatch('LIKE_REMOVE', { extraitId });
    });

    eventBus.on(EventTypes.TEXT_READ, () => {
        store.dispatch('READ_INCREMENT');
    });

    console.log('✅ Store connecté à EventBus');
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌍 INSTANCE GLOBALE
// ═══════════════════════════════════════════════════════════════════════════

const Events = new EventBus();

// Exposer globalement
window.Events = Events;
window.EventTypes = EventTypes;

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Events, EventTypes, EventBus, connectStoreToEvents };
}
