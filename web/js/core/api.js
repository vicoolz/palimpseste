/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔌 API.JS - Couche d'abstraction Supabase
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Abstraction complète des appels Supabase avec :
 * - Retry automatique sur erreurs réseau
 * - Cache intelligent avec TTL
 * - Gestion centralisée des erreurs
 * - Optimistic updates
 * - Rate limiting
 * 
 * @version 2.0.0
 * @date 2026-01-26
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const API_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000,      // ms entre retries
    cacheTTL: 60000,       // 1 minute par défaut
    rateLimitMs: 100,      // Min ms entre requêtes
    timeout: 10000         // Timeout requêtes
};

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 CLASSE API PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════

class PalimpseteAPI {
    #client = null;
    #cache = new Map();
    #lastRequestTime = 0;
    #pendingRequests = new Map();

    /**
     * Initialise l'API avec le client Supabase
     * @param {Object} supabaseClient - Instance Supabase
     */
    init(supabaseClient) {
        this.#client = supabaseClient;
        console.log('✅ PalimpseteAPI initialisée');
    }

    /**
     * Vérifie si l'API est prête
     */
    isReady() {
        return this.#client !== null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 👤 AUTHENTIFICATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Connexion avec email/password
     */
    async login(email, password) {
        return this.#execute('login', async () => {
            const { data, error } = await this.#client.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw new APIError('AUTH_ERROR', error.message);
            return data;
        });
    }

    /**
     * Inscription
     */
    async register(email, password, username) {
        return this.#execute('register', async () => {
            const { data, error } = await this.#client.auth.signUp({
                email,
                password,
                options: {
                    data: { username }
                }
            });
            if (error) throw new APIError('AUTH_ERROR', error.message);
            return data;
        });
    }

    /**
     * Déconnexion
     */
    async logout() {
        return this.#execute('logout', async () => {
            const { error } = await this.#client.auth.signOut();
            if (error) throw new APIError('AUTH_ERROR', error.message);
            this.clearCache();
            return true;
        });
    }

    /**
     * Récupère la session courante
     */
    async getSession() {
        return this.#execute('getSession', async () => {
            const { data, error } = await this.#client.auth.getSession();
            if (error) throw new APIError('AUTH_ERROR', error.message);
            return data.session;
        });
    }

    /**
     * Reset mot de passe
     */
    async resetPassword(email) {
        return this.#execute('resetPassword', async () => {
            const { error } = await this.#client.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });
            if (error) throw new APIError('AUTH_ERROR', error.message);
            return true;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📝 EXTRAITS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Récupère les extraits avec pagination
     * @param {Object} options - { limit, offset, orderBy, userId, withProfiles }
     */
    async getExtraits(options = {}) {
        const {
            limit = 50,
            offset = 0,
            orderBy = 'created_at',
            orderAsc = false,
            userId = null,
            withProfiles = true
        } = options;

        const cacheKey = `extraits:${JSON.stringify(options)}`;

        return this.#fetchWithCache(cacheKey, async () => {
            let query = this.#client
                .from('extraits')
                .select(withProfiles ? '*, profiles(username)' : '*')
                .order(orderBy, { ascending: orderAsc })
                .range(offset, offset + limit - 1);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;
            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data;
        }, API_CONFIG.cacheTTL);
    }

    /**
     * Récupère un extrait par ID
     */
    async getExtrait(id) {
        const cacheKey = `extrait:${id}`;

        return this.#fetchWithCache(cacheKey, async () => {
            const { data, error } = await this.#client
                .from('extraits')
                .select('*, profiles(username)')
                .eq('id', id)
                .single();

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data;
        }, API_CONFIG.cacheTTL * 5); // Cache plus long pour un seul extrait
    }

    /**
     * Crée un nouvel extrait
     */
    async createExtrait(extrait) {
        return this.#execute('createExtrait', async () => {
            const { data, error } = await this.#client
                .from('extraits')
                .insert(extrait)
                .select()
                .single();

            if (error) throw new APIError('CREATE_ERROR', error.message);
            
            // Invalider le cache des extraits
            this.#invalidateCache('extraits:');
            
            return data;
        });
    }

    /**
     * Supprime un extrait
     */
    async deleteExtrait(id) {
        return this.#execute('deleteExtrait', async () => {
            const { error } = await this.#client
                .from('extraits')
                .delete()
                .eq('id', id);

            if (error) throw new APIError('DELETE_ERROR', error.message);
            
            this.#invalidateCache('extraits:');
            this.#invalidateCache(`extrait:${id}`);
            
            return true;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ❤️ LIKES
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Récupère tous les likes d'un utilisateur
     */
    async getUserLikes(userId) {
        const cacheKey = `likes:${userId}`;

        return this.#fetchWithCache(cacheKey, async () => {
            const { data, error } = await this.#client
                .from('likes')
                .select('extrait_id')
                .eq('user_id', userId);

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data.map(l => l.extrait_id);
        }, API_CONFIG.cacheTTL);
    }

    /**
     * Like un extrait (optimistic update)
     */
    async likeExtrait(userId, extraitId) {
        // Optimistic update
        if (window.Store) {
            window.Store.dispatch('LIKE_ADD', { extraitId });
        }

        return this.#execute('likeExtrait', async () => {
            const { error } = await this.#client
                .from('likes')
                .insert({ user_id: userId, extrait_id: extraitId });

            if (error) {
                // Rollback optimistic update
                if (window.Store) {
                    window.Store.dispatch('LIKE_REMOVE', { extraitId });
                }
                throw new APIError('LIKE_ERROR', error.message);
            }

            // Incrémenter le compteur
            await this.#client.rpc('increment_likes', { extrait_id: extraitId });
            
            this.#invalidateCache(`likes:${userId}`);
            return true;
        });
    }

    /**
     * Unlike un extrait (optimistic update)
     */
    async unlikeExtrait(userId, extraitId) {
        // Optimistic update
        if (window.Store) {
            window.Store.dispatch('LIKE_REMOVE', { extraitId });
        }

        return this.#execute('unlikeExtrait', async () => {
            const { error } = await this.#client
                .from('likes')
                .delete()
                .eq('user_id', userId)
                .eq('extrait_id', extraitId);

            if (error) {
                // Rollback
                if (window.Store) {
                    window.Store.dispatch('LIKE_ADD', { extraitId });
                }
                throw new APIError('UNLIKE_ERROR', error.message);
            }

            await this.#client.rpc('decrement_likes', { extrait_id: extraitId });
            
            this.#invalidateCache(`likes:${userId}`);
            return true;
        });
    }

    /**
     * Compte les likes pour plusieurs extraits
     */
    async getLikesCounts(extraitIds) {
        if (!extraitIds?.length) return {};

        return this.#execute('getLikesCounts', async () => {
            const { data, error } = await this.#client
                .from('likes')
                .select('extrait_id')
                .in('extrait_id', extraitIds);

            if (error) throw new APIError('FETCH_ERROR', error.message);

            const counts = {};
            extraitIds.forEach(id => counts[id] = 0);
            data.forEach(l => counts[l.extrait_id]++);
            return counts;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 👥 FOLLOWS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Suivre un utilisateur
     */
    async follow(followerId, followingId) {
        return this.#execute('follow', async () => {
            const { error } = await this.#client
                .from('follows')
                .insert({ follower_id: followerId, following_id: followingId });

            if (error) throw new APIError('FOLLOW_ERROR', error.message);
            return true;
        });
    }

    /**
     * Ne plus suivre
     */
    async unfollow(followerId, followingId) {
        return this.#execute('unfollow', async () => {
            const { error } = await this.#client
                .from('follows')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', followingId);

            if (error) throw new APIError('UNFOLLOW_ERROR', error.message);
            return true;
        });
    }

    /**
     * Vérifie si un utilisateur en suit un autre
     */
    async isFollowing(followerId, followingId) {
        const cacheKey = `following:${followerId}:${followingId}`;

        return this.#fetchWithCache(cacheKey, async () => {
            const { data, error } = await this.#client
                .from('follows')
                .select('id')
                .eq('follower_id', followerId)
                .eq('following_id', followingId)
                .maybeSingle();

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return !!data;
        }, API_CONFIG.cacheTTL);
    }

    /**
     * Récupère les followers d'un utilisateur
     */
    async getFollowers(userId, limit = 50) {
        return this.#execute('getFollowers', async () => {
            const { data, error } = await this.#client
                .from('follows')
                .select('follower_id, profiles!follows_follower_id_fkey(username)')
                .eq('following_id', userId)
                .limit(limit);

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data;
        });
    }

    /**
     * Récupère les abonnements d'un utilisateur
     */
    async getFollowing(userId, limit = 50) {
        return this.#execute('getFollowing', async () => {
            const { data, error } = await this.#client
                .from('follows')
                .select('following_id, profiles!follows_following_id_fkey(username)')
                .eq('follower_id', userId)
                .limit(limit);

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 💬 COMMENTAIRES
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Récupère les commentaires d'un extrait
     */
    async getComments(extraitId) {
        const cacheKey = `comments:${extraitId}`;

        return this.#fetchWithCache(cacheKey, async () => {
            const { data, error } = await this.#client
                .from('comments')
                .select('*, profiles(username)')
                .eq('extrait_id', extraitId)
                .order('created_at', { ascending: true });

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data;
        }, API_CONFIG.cacheTTL / 2); // Cache plus court pour les commentaires
    }

    /**
     * Ajoute un commentaire
     */
    async addComment(extraitId, userId, content) {
        return this.#execute('addComment', async () => {
            const { data, error } = await this.#client
                .from('comments')
                .insert({
                    extrait_id: extraitId,
                    user_id: userId,
                    content
                })
                .select('*, profiles(username)')
                .single();

            if (error) throw new APIError('CREATE_ERROR', error.message);
            
            this.#invalidateCache(`comments:${extraitId}`);
            return data;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ✉️ MESSAGES
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Envoie un message privé
     */
    async sendMessage(senderId, receiverId, content) {
        return this.#execute('sendMessage', async () => {
            const { data, error } = await this.#client
                .from('messages')
                .insert({
                    sender_id: senderId,
                    receiver_id: receiverId,
                    content
                })
                .select()
                .single();

            if (error) throw new APIError('SEND_ERROR', error.message);
            return data;
        });
    }

    /**
     * Récupère les messages d'une conversation
     */
    async getMessages(userId, otherUserId) {
        return this.#execute('getMessages', async () => {
            const { data, error } = await this.#client
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
                .order('created_at', { ascending: true });

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 👤 PROFILS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Récupère un profil utilisateur
     */
    async getProfile(userId) {
        const cacheKey = `profile:${userId}`;

        return this.#fetchWithCache(cacheKey, async () => {
            const { data, error } = await this.#client
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data;
        }, API_CONFIG.cacheTTL * 5);
    }

    /**
     * Met à jour le profil
     */
    async updateProfile(userId, updates) {
        return this.#execute('updateProfile', async () => {
            const { data, error } = await this.#client
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw new APIError('UPDATE_ERROR', error.message);
            
            this.#invalidateCache(`profile:${userId}`);
            return data;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 RECHERCHE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Recherche d'extraits
     */
    async searchExtraits(query, limit = 20) {
        return this.#execute('searchExtraits', async () => {
            const { data, error } = await this.#client
                .from('extraits')
                .select('*, profiles(username)')
                .or(`texte.ilike.%${query}%,source_author.ilike.%${query}%,source_title.ilike.%${query}%`)
                .limit(limit);

            if (error) throw new APIError('SEARCH_ERROR', error.message);
            return data;
        });
    }

    /**
     * Recherche d'utilisateurs
     */
    async searchUsers(query, limit = 20) {
        return this.#execute('searchUsers', async () => {
            const { data, error } = await this.#client
                .from('profiles')
                .select('*')
                .ilike('username', `%${query}%`)
                .limit(limit);

            if (error) throw new APIError('SEARCH_ERROR', error.message);
            return data;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔥 TRENDING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Récupère les extraits tendance
     */
    async getTrending(limit = 20) {
        const cacheKey = `trending:${limit}`;

        return this.#fetchWithCache(cacheKey, async () => {
            const { data, error } = await this.#client
                .from('extraits')
                .select('*, profiles(username)')
                .order('likes_count', { ascending: false })
                .limit(limit);

            if (error) throw new APIError('FETCH_ERROR', error.message);
            return data;
        }, API_CONFIG.cacheTTL * 2); // Cache plus long pour trending
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🛠️ MÉTHODES INTERNES
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Exécute une requête avec retry automatique
     */
    async #execute(name, fn, retries = API_CONFIG.maxRetries) {
        if (!this.#client) {
            throw new APIError('NOT_INITIALIZED', 'API non initialisée');
        }

        // Rate limiting
        await this.#rateLimit();

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await this.#withTimeout(fn(), API_CONFIG.timeout);
            } catch (error) {
                const isLastAttempt = attempt === retries;
                const isRetryable = this.#isRetryableError(error);

                if (isLastAttempt || !isRetryable) {
                    console.error(`❌ ${name} failed:`, error.message);
                    throw error;
                }

                console.warn(`⚠️ ${name} attempt ${attempt} failed, retrying...`);
                await this.#delay(API_CONFIG.retryDelay * attempt);
            }
        }
    }

    /**
     * Fetch avec cache
     */
    async #fetchWithCache(key, fetcher, ttl = API_CONFIG.cacheTTL) {
        // Vérifier le cache
        const cached = this.#cache.get(key);
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }

        // Éviter les requêtes dupliquées
        if (this.#pendingRequests.has(key)) {
            return this.#pendingRequests.get(key);
        }

        const promise = this.#execute(key, fetcher).then(data => {
            this.#cache.set(key, { data, timestamp: Date.now() });
            this.#pendingRequests.delete(key);
            return data;
        }).catch(error => {
            this.#pendingRequests.delete(key);
            throw error;
        });

        this.#pendingRequests.set(key, promise);
        return promise;
    }

    /**
     * Rate limiting
     */
    async #rateLimit() {
        const now = Date.now();
        const elapsed = now - this.#lastRequestTime;
        
        if (elapsed < API_CONFIG.rateLimitMs) {
            await this.#delay(API_CONFIG.rateLimitMs - elapsed);
        }
        
        this.#lastRequestTime = Date.now();
    }

    /**
     * Timeout wrapper
     */
    async #withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new APIError('TIMEOUT', 'Request timeout')), ms)
            )
        ]);
    }

    /**
     * Vérifie si une erreur est retryable
     */
    #isRetryableError(error) {
        const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', '503', '502', '504'];
        return retryableCodes.some(code => 
            error.code?.includes(code) || error.message?.includes(code)
        );
    }

    /**
     * Délai async
     */
    #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Invalide le cache par préfixe
     */
    #invalidateCache(prefix) {
        for (const key of this.#cache.keys()) {
            if (key.startsWith(prefix)) {
                this.#cache.delete(key);
            }
        }
    }

    /**
     * Vide tout le cache
     */
    clearCache() {
        this.#cache.clear();
        this.#pendingRequests.clear();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ❌ CLASSE D'ERREUR CUSTOM
// ═══════════════════════════════════════════════════════════════════════════

class APIError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            timestamp: this.timestamp
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌍 INSTANCE GLOBALE
// ═══════════════════════════════════════════════════════════════════════════

const API = new PalimpseteAPI();

// Exposer globalement
window.API = API;
window.APIError = APIError;

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, APIError, PalimpseteAPI };
}
