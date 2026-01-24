/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔌 API - Palimpseste
 * Client Supabase et appels API externes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { SUPABASE_CONFIG, API_CONFIG } from './config.js';

// 🔧 Initialisation du client Supabase
let supabase = null;

/**
 * 🚀 Initialise le client Supabase
 * @returns {Object} Client Supabase
 */
export function initSupabase() {
    if (supabase) return supabase;
    
    if (typeof window.supabase === 'undefined') {
        console.error('🔴 Supabase SDK not loaded');
        return null;
    }
    
    supabase = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
    );
    
    console.log('🟢 Supabase initialized');
    return supabase;
}

/**
 * 📤 Retourne le client Supabase
 * @returns {Object}
 */
export function getSupabase() {
    return supabase || initSupabase();
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📧 Inscription avec email/password
 * @param {string} email 
 * @param {string} password 
 * @param {string} username 
 * @returns {Promise<Object>}
 */
export async function signUp(email, password, username) {
    console.log('🟡 SignUp attempt:', email);
    
    const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
            data: { username }
        }
    });
    
    if (error) throw error;
    
    // Créer le profil
    if (data.user) {
        await createProfile(data.user.id, username, email);
    }
    
    console.log('🟢 SignUp success');
    return data;
}

/**
 * 🔑 Connexion avec email/password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>}
 */
export async function signIn(email, password) {
    console.log('🟡 SignIn attempt:', email);
    
    const { data, error } = await getSupabase().auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    
    console.log('🟢 SignIn success');
    return data;
}

/**
 * 🚪 Déconnexion
 * @returns {Promise<void>}
 */
export async function signOut() {
    console.log('🟡 SignOut...');
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
    console.log('🟢 SignOut success');
}

/**
 * 👤 Récupère la session courante
 * @returns {Promise<Object|null>}
 */
export async function getCurrentSession() {
    const { data: { session } } = await getSupabase().auth.getSession();
    return session;
}

/**
 * 👤 Récupère l'utilisateur courant
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
    const { data: { user } } = await getSupabase().auth.getUser();
    return user;
}

/**
 * 👂 Écoute les changements d'auth
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
        (event, session) => {
            console.log('🔔 Auth state change:', event);
            callback(event, session);
        }
    );
    return () => subscription.unsubscribe();
}

// ═══════════════════════════════════════════════════════════════════════════
// 👤 PROFILS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ➕ Crée un profil utilisateur
 * @param {string} userId 
 * @param {string} username 
 * @param {string} email 
 * @returns {Promise<Object>}
 */
export async function createProfile(userId, username, email) {
    console.log('🟡 Creating profile for:', userId);
    
    const { data, error } = await getSupabase()
        .from('profiles')
        .insert({
            id: userId,
            username: username,
            email: email,
            avatar_emoji: '📚',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * 📖 Récupère un profil par ID
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export async function getProfile(userId) {
    const { data, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * ✏️ Met à jour un profil
 * @param {string} userId 
 * @param {Object} updates 
 * @returns {Promise<Object>}
 */
export async function updateProfile(userId, updates) {
    const { data, error } = await getSupabase()
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// ❤️ LIKES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ❤️ Ajoute un like
 * @param {string} userId 
 * @param {Object} textData 
 * @returns {Promise<Object>}
 */
export async function addLike(userId, textData) {
    console.log('🟡 Adding like:', textData.id);
    
    const { data, error } = await getSupabase()
        .from('extraits')
        .upsert({
            id: textData.id,
            auteur: textData.author,
            oeuvre: textData.work,
            extrait: textData.teaser,
            genre: textData.genre,
            langue: textData.language,
            url: textData.sourceUrl,
            full_text: textData.fullText
        }, { onConflict: 'id' })
        .select()
        .single();
    
    if (error) throw error;
    
    // Ajouter le like
    const { error: likeError } = await getSupabase()
        .from('likes')
        .insert({
            user_id: userId,
            extrait_id: textData.id
        });
    
    if (likeError && !likeError.message.includes('duplicate')) {
        throw likeError;
    }
    
    console.log('🟢 Like added');
    return data;
}

/**
 * 💔 Retire un like
 * @param {string} userId 
 * @param {string} textId 
 * @returns {Promise<void>}
 */
export async function removeLike(userId, textId) {
    console.log('🟡 Removing like:', textId);
    
    const { error } = await getSupabase()
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('extrait_id', textId);
    
    if (error) throw error;
    console.log('🟢 Like removed');
}

/**
 * 📋 Récupère les likes d'un utilisateur
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getUserLikes(userId) {
    const { data, error } = await getSupabase()
        .from('likes')
        .select(`
            extrait_id,
            created_at,
            extraits (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

/**
 * ❤️ Vérifie si un texte est liké par l'utilisateur
 * @param {string} userId 
 * @param {string} textId 
 * @returns {Promise<boolean>}
 */
export async function isLiked(userId, textId) {
    const { data, error } = await getSupabase()
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('extrait_id', textId)
        .maybeSingle();
    
    if (error) throw error;
    return !!data;
}

// ═══════════════════════════════════════════════════════════════════════════
// 👥 FOLLOWS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ➕ Suivre un utilisateur
 * @param {string} followerId 
 * @param {string} followingId 
 * @returns {Promise<void>}
 */
export async function followUser(followerId, followingId) {
    console.log('🟡 Following user:', followingId);
    
    const { error } = await getSupabase()
        .from('follows')
        .insert({
            follower_id: followerId,
            following_id: followingId
        });
    
    if (error) throw error;
    console.log('🟢 Follow success');
}

/**
 * ➖ Ne plus suivre un utilisateur
 * @param {string} followerId 
 * @param {string} followingId 
 * @returns {Promise<void>}
 */
export async function unfollowUser(followerId, followingId) {
    console.log('🟡 Unfollowing user:', followingId);
    
    const { error } = await getSupabase()
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
    
    if (error) throw error;
    console.log('🟢 Unfollow success');
}

/**
 * 📋 Récupère les followers d'un utilisateur
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getFollowers(userId) {
    const { data, error } = await getSupabase()
        .from('follows')
        .select(`
            follower_id,
            follower:profiles!follows_follower_id_fkey (*)
        `)
        .eq('following_id', userId);
    
    if (error) throw error;
    return data.map(f => f.follower);
}

/**
 * 📋 Récupère les utilisateurs suivis
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getFollowing(userId) {
    const { data, error } = await getSupabase()
        .from('follows')
        .select(`
            following_id,
            following:profiles!follows_following_id_fkey (*)
        `)
        .eq('follower_id', userId);
    
    if (error) throw error;
    return data.map(f => f.following);
}

// ═══════════════════════════════════════════════════════════════════════════
// 💬 COMMENTAIRES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ➕ Ajoute un commentaire
 * @param {string} userId 
 * @param {string} extraitId 
 * @param {string} content 
 * @returns {Promise<Object>}
 */
export async function addComment(userId, extraitId, content) {
    const { data, error } = await getSupabase()
        .from('comments')
        .insert({
            user_id: userId,
            extrait_id: extraitId,
            content: content
        })
        .select(`
            *,
            profiles (username, avatar_emoji)
        `)
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * 📋 Récupère les commentaires d'un extrait
 * @param {string} extraitId 
 * @returns {Promise<Array>}
 */
export async function getComments(extraitId) {
    const { data, error } = await getSupabase()
        .from('comments')
        .select(`
            *,
            profiles (username, avatar_emoji)
        `)
        .eq('extrait_id', extraitId)
        .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔔 NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📋 Récupère les notifications d'un utilisateur
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getNotifications(userId) {
    const { data, error } = await getSupabase()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
    
    if (error) throw error;
    return data;
}

/**
 * ✅ Marque les notifications comme lues
 * @param {string} userId 
 * @returns {Promise<void>}
 */
export async function markNotificationsRead(userId) {
    const { error } = await getSupabase()
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
    
    if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// 💬 MESSAGERIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📤 Envoie un message
 * @param {string} senderId 
 * @param {string} recipientId 
 * @param {string} content 
 * @returns {Promise<Object>}
 */
export async function sendMessage(senderId, recipientId, content) {
    const { data, error } = await getSupabase()
        .from('messages')
        .insert({
            sender_id: senderId,
            recipient_id: recipientId,
            content: content
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * 📋 Récupère les conversations d'un utilisateur
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getConversations(userId) {
    const { data, error } = await getSupabase()
        .from('messages')
        .select(`
            *,
            sender:profiles!messages_sender_id_fkey (*),
            recipient:profiles!messages_recipient_id_fkey (*)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

/**
 * 📋 Récupère les messages d'une conversation
 * @param {string} userId 
 * @param {string} otherUserId 
 * @returns {Promise<Array>}
 */
export async function getMessages(userId, otherUserId) {
    const { data, error } = await getSupabase()
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 TRENDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📊 Récupère les extraits trending
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export async function getTrending(limit = 10) {
    const { data, error } = await getSupabase()
        .from('extraits')
        .select(`
            *,
            likes_count:likes(count)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data;
}

/**
 * 📰 Récupère le feed social (activité des follows)
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getSocialFeed(userId) {
    // Récupérer les IDs suivis
    const following = await getFollowing(userId);
    const followingIds = following.map(f => f.id);
    
    if (followingIds.length === 0) return [];
    
    // Récupérer leurs likes récents
    const { data, error } = await getSupabase()
        .from('likes')
        .select(`
            *,
            profiles (*),
            extraits (*)
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(50);
    
    if (error) throw error;
    return data;
}
