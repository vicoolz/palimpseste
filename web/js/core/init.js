/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 INIT.JS - Initialisation centralisée Palimpseste
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Point d'entrée unique qui orchestre l'initialisation de tous les modules.
 * Ordre de chargement garanti et gestion des erreurs centralisée.
 * 
 * @version 2.0.0
 * @date 2026-01-26
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION D'INITIALISATION
// ═══════════════════════════════════════════════════════════════════════════

const InitConfig = {
    debug: false, // Mettre true pour logs détaillés
    supabase: {
        url: 'https://cqoepdrqifilqxnvflyy.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2VwZHJxaWZpbHF4bnZmbHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzQxMTksImV4cCI6MjA4NDc1MDExOX0.e7dJmzUEgzDIix12ca38HvBmF7Cgp_fTZPT6gZ6Xy5s'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 CLASSE D'INITIALISATION
// ═══════════════════════════════════════════════════════════════════════════

class AppInitializer {
    #initialized = false;
    #initPromise = null;
    #modules = [];

    /**
     * Enregistre un module à initialiser
     * @param {string} name - Nom du module
     * @param {Function} initFn - Fonction d'initialisation (async)
     * @param {number} priority - Priorité (plus haut = exécuté en premier)
     */
    register(name, initFn, priority = 0) {
        this.#modules.push({ name, initFn, priority });
        // Trier par priorité
        this.#modules.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Lance l'initialisation de tous les modules
     */
    async init() {
        // Éviter double initialisation
        if (this.#initPromise) {
            return this.#initPromise;
        }

        this.#initPromise = this.#doInit();
        return this.#initPromise;
    }

    async #doInit() {
        const startTime = performance.now();
        console.log('🚀 Palimpseste - Initialisation...');

        try {
            // 1. Initialiser le Core (Store, Events, API)
            await this.#initCore();

            // 2. Initialiser les modules enregistrés
            for (const module of this.#modules) {
                try {
                    if (InitConfig.debug) {
                        console.log(`  📦 ${module.name}...`);
                    }
                    await module.initFn();
                } catch (error) {
                    console.error(`❌ Erreur init ${module.name}:`, error);
                    // Continuer avec les autres modules
                }
            }

            // 3. Connecter Store et Events
            if (window.Store && window.Events) {
                this.#connectStoreEvents();
            }

            // 4. Setup des listeners globaux
            this.#setupGlobalListeners();

            this.#initialized = true;
            const duration = (performance.now() - startTime).toFixed(0);
            console.log(`✅ Palimpseste initialisé en ${duration}ms`);

            // Émettre l'événement d'initialisation complète
            if (window.Events) {
                window.Events.emit('app:initialized', { duration });
            }

            return true;
        } catch (error) {
            console.error('❌ Erreur critique d\'initialisation:', error);
            this.#showInitError(error);
            return false;
        }
    }

    /**
     * Initialise les modules core
     */
    async #initCore() {
        // Vérifier que le Store est chargé
        if (!window.Store) {
            throw new Error('Store non chargé');
        }

        // Vérifier que l'EventBus est chargé
        if (!window.Events) {
            throw new Error('EventBus non chargé');
        }

        // Activer le debug si configuré
        if (InitConfig.debug) {
            window.Events.enableDebug();
        }

        // Initialiser Supabase
        await this.#initSupabase();

        // Initialiser l'API avec le client Supabase
        if (window.API && window.supabaseClient) {
            window.API.init(window.supabaseClient);
        }
    }

    /**
     * Initialise Supabase
     */
    async #initSupabase() {
        // Attendre que le SDK soit chargé
        if (typeof window.supabase === 'undefined') {
            console.log('⏳ Attente du SDK Supabase...');
            await this.#waitFor(() => typeof window.supabase !== 'undefined', 5000);
        }

        // Créer le client
        window.supabaseClient = window.supabase.createClient(
            InitConfig.supabase.url,
            InitConfig.supabase.anonKey
        );

        // Écouter les changements d'auth
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                window.currentUser = session.user;
                window.Store.dispatch('AUTH_LOGIN', session.user);
                window.Events.emit(window.EventTypes.AUTH_LOGIN, session.user);
            } else {
                window.currentUser = null;
                window.Store.dispatch('AUTH_LOGOUT');
                window.Events.emit(window.EventTypes.AUTH_LOGOUT);
            }
        });

        // Vérifier session existante
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session?.user) {
            window.currentUser = session.user;
            window.Store.dispatch('AUTH_LOGIN', session.user);
        }

        console.log('  ✅ Supabase initialisé');
    }

    /**
     * Connecte Store et Events pour synchronisation
     */
    #connectStoreEvents() {
        const store = window.Store;
        const events = window.Events;
        const types = window.EventTypes;

        // Store → Events : propager les changements d'état
        store.subscribe((newState, prevState) => {
            // Theme
            if (newState.ui?.theme !== prevState.ui?.theme) {
                events.emit(types.THEME_CHANGED, newState.ui.theme);
            }

            // Loading
            if (newState.ui?.loading !== prevState.ui?.loading) {
                events.emit(
                    newState.ui.loading ? types.LOADING_START : types.LOADING_END
                );
            }

            // Achievements
            if (newState.achievements?.length > (prevState.achievements?.length || 0)) {
                const newAchievement = newState.achievements[newState.achievements.length - 1];
                events.emit(types.ACHIEVEMENT_UNLOCKED, newAchievement);
            }
        });

        // Events → Store : réagir aux événements
        events.on(types.TEXT_READ, () => {
            store.dispatch('READ_INCREMENT');
        });

        console.log('  ✅ Store ↔ Events connectés');
    }

    /**
     * Setup des listeners globaux
     */
    #setupGlobalListeners() {
        // Toast global
        if (window.Events) {
            window.Events.on(window.EventTypes.TOAST_SHOW, (message) => {
                if (typeof toast === 'function') {
                    toast(message);
                }
            });

            // Achievement notification
            window.Events.on(window.EventTypes.ACHIEVEMENT_UNLOCKED, (achievement) => {
                if (typeof showAchievementNotification === 'function') {
                    showAchievementNotification(achievement);
                } else if (typeof toast === 'function') {
                    toast(`🏆 Badge débloqué : ${achievement}`);
                }
            });
        }

        // Gestion erreurs globales
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (window.Events) {
                window.Events.emit(window.EventTypes.ERROR_API, {
                    message: event.reason?.message || 'Erreur inconnue'
                });
            }
        });

        // Visibilité page (pause/resume)
        document.addEventListener('visibilitychange', () => {
            if (window.Events) {
                window.Events.emit(
                    document.hidden ? 'app:background' : 'app:foreground'
                );
            }
        });

        // Online/Offline
        window.addEventListener('online', () => {
            if (window.Events) {
                window.Events.emit('network:online');
                window.Events.emit(window.EventTypes.TOAST_SHOW, '✅ Connexion rétablie');
            }
        });

        window.addEventListener('offline', () => {
            if (window.Events) {
                window.Events.emit('network:offline');
                window.Events.emit(window.EventTypes.TOAST_SHOW, '⚠️ Hors ligne');
            }
        });
    }

    /**
     * Attend qu'une condition soit vraie
     */
    #waitFor(condition, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                if (condition()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    /**
     * Affiche une erreur d'initialisation
     */
    #showInitError(error) {
        const container = document.getElementById('feed') || document.body;
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text);">
                <h2 style="color: var(--accent-tertiary);">⚠️ Erreur d'initialisation</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: var(--accent);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Recharger</button>
            </div>
        `;
    }

    /**
     * Vérifie si l'app est initialisée
     */
    isInitialized() {
        return this.#initialized;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌍 INSTANCE GLOBALE
// ═══════════════════════════════════════════════════════════════════════════

const AppInit = new AppInitializer();

// Exposer globalement
window.AppInit = AppInit;

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 HELPERS DE MIGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Helpers pour faciliter la migration du code existant
 * Ces fonctions wrappent le nouveau système pour compatibilité
 */

// Toast via EventBus
window.showToast = function(message) {
    if (window.Events) {
        window.Events.emit(window.EventTypes.TOAST_SHOW, message);
    } else if (typeof toast === 'function') {
        toast(message);
    }
};

// Dispatch action via Store
window.dispatchAction = function(type, payload) {
    if (window.Store) {
        window.Store.dispatch(type, payload);
    }
};

// Sélecteur d'état
window.selectState = function(path) {
    if (window.Store) {
        return window.Store.select(path);
    }
    return null;
};

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppInit, InitConfig };
}
