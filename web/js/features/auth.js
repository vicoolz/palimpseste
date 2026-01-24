/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 AUTH SERVICE - Palimpseste
 * Gestion de l'authentification et des sessions
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as api from '../api.js';
import { setState, setUserState, clearUserState, getState } from '../state.js';
import { showToast } from '../components/toast.js';

/**
 * 🚀 Initialise l'authentification au démarrage
 * @returns {Promise<void>}
 */
export async function initAuth() {
    console.log('🟡 Initializing auth...');
    
    try {
        // Vérifier la session existante
        const session = await api.getCurrentSession();
        
        if (session) {
            console.log('🟢 Existing session found');
            await loadUserData(session.user);
        } else {
            console.log('🟡 No existing session');
        }
        
        // Écouter les changements d'auth
        api.onAuthStateChange(handleAuthChange);
        
    } catch (error) {
        console.error('🔴 Auth init error:', error);
    }
}

/**
 * 🔄 Gère les changements d'état d'authentification
 * @param {string} event - Type d'événement
 * @param {Object} session - Session Supabase
 */
async function handleAuthChange(event, session) {
    console.log('🔔 Auth change:', event);
    
    switch (event) {
        case 'SIGNED_IN':
            await loadUserData(session.user);
            showToast('Connexion réussie !', 'success');
            break;
            
        case 'SIGNED_OUT':
            clearUserState();
            showToast('Déconnexion réussie', 'info');
            break;
            
        case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed');
            break;
            
        case 'USER_UPDATED':
            if (session?.user) {
                await loadUserData(session.user);
            }
            break;
    }
    
    // Mettre à jour l'UI
    updateAuthUI();
}

/**
 * 👤 Charge les données utilisateur
 * @param {Object} user - Utilisateur Supabase
 */
async function loadUserData(user) {
    console.log('🟡 Loading user data:', user.id);
    
    try {
        // Récupérer le profil
        let profile = await api.getProfile(user.id);
        
        // Créer le profil s'il n'existe pas
        if (!profile) {
            const username = user.user_metadata?.username || user.email.split('@')[0];
            profile = await api.createProfile(user.id, username, user.email);
        }
        
        // Mettre à jour l'état
        setUserState({
            user,
            session: await api.getCurrentSession(),
            profile
        });
        
        // Charger les follows
        await loadFollowingList(user.id);
        
        // Charger les likes
        await loadUserLikes(user.id);
        
        console.log('🟢 User data loaded:', profile.username);
        
    } catch (error) {
        console.error('🔴 Load user data error:', error);
    }
}

/**
 * 👥 Charge la liste des utilisateurs suivis
 * @param {string} userId - ID utilisateur
 */
async function loadFollowingList(userId) {
    try {
        const following = await api.getFollowing(userId);
        const followingIds = new Set(following.map(f => f.id));
        setState('followingIds', followingIds);
    } catch (error) {
        console.error('🔴 Load following error:', error);
    }
}

/**
 * ❤️ Charge les likes de l'utilisateur
 * @param {string} userId - ID utilisateur
 */
async function loadUserLikes(userId) {
    try {
        const likes = await api.getUserLikes(userId);
        const likedIds = new Set(likes.map(l => l.extrait_id));
        setState('likedTextsIds', likedIds);
    } catch (error) {
        console.error('🔴 Load likes error:', error);
    }
}

/**
 * 📧 Inscription avec email/password
 * @param {string} email 
 * @param {string} password 
 * @param {string} username 
 * @returns {Promise<Object>}
 */
export async function signUp(email, password, username) {
    console.log('🟡 SignUp attempt...');
    setState('isLoading', true);
    
    try {
        const data = await api.signUp(email, password, username);
        
        showToast('Inscription réussie ! Vérifiez votre email.', 'success');
        return data;
        
    } catch (error) {
        console.error('🔴 SignUp error:', error);
        showToast(getErrorMessage(error), 'error');
        throw error;
        
    } finally {
        setState('isLoading', false);
    }
}

/**
 * 🔑 Connexion avec email/password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>}
 */
export async function signIn(email, password) {
    console.log('🟡 SignIn attempt...');
    setState('isLoading', true);
    
    try {
        const data = await api.signIn(email, password);
        return data;
        
    } catch (error) {
        console.error('🔴 SignIn error:', error);
        showToast(getErrorMessage(error), 'error');
        throw error;
        
    } finally {
        setState('isLoading', false);
    }
}

/**
 * 🚪 Déconnexion
 * @returns {Promise<void>}
 */
export async function signOut() {
    console.log('🟡 SignOut...');
    
    try {
        await api.signOut();
        
    } catch (error) {
        console.error('🔴 SignOut error:', error);
        showToast('Erreur lors de la déconnexion', 'error');
    }
}

/**
 * 🔄 Met à jour l'UI en fonction de l'état auth
 */
function updateAuthUI() {
    const user = getState('user');
    const profile = getState('profile');
    const isLoggedIn = !!user;
    
    // Boutons header
    const loginBtn = document.getElementById('login-btn');
    const profileBtn = document.getElementById('profile-btn');
    
    if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'flex';
    if (profileBtn) profileBtn.style.display = isLoggedIn ? 'flex' : 'none';
    
    // Avatar mobile
    const mobileAvatar = document.getElementById('mobile-avatar');
    if (mobileAvatar && profile) {
        mobileAvatar.textContent = profile.avatar_emoji || '📚';
    }
    
    // Drawer profile section
    const drawerProfile = document.querySelector('.drawer__profile');
    if (drawerProfile) {
        updateDrawerProfile(drawerProfile, profile, isLoggedIn);
    }
}

/**
 * 📱 Met à jour la section profil du drawer
 * @param {Element} container - Container du profil
 * @param {Object} profile - Profil utilisateur
 * @param {boolean} isLoggedIn - Est connecté
 */
function updateDrawerProfile(container, profile, isLoggedIn) {
    if (isLoggedIn && profile) {
        container.innerHTML = `
            <div class="drawer__profile-info">
                <div class="drawer__profile-avatar">${profile.avatar_emoji || '📚'}</div>
                <div>
                    <div class="drawer__profile-name">${profile.username}</div>
                    <div class="drawer__profile-email">${profile.email || ''}</div>
                </div>
            </div>
            <div class="drawer__profile-stats">
                <div class="drawer__profile-stat">
                    <div class="drawer__profile-stat-value">${profile.likes_count || 0}</div>
                    <div class="drawer__profile-stat-label">Favoris</div>
                </div>
                <div class="drawer__profile-stat">
                    <div class="drawer__profile-stat-value">${profile.followers_count || 0}</div>
                    <div class="drawer__profile-stat-label">Followers</div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="drawer__login-btn" onclick="window.openAuthModal()">
                🔐 Se connecter
            </button>
        `;
    }
}

/**
 * ❓ Vérifie si l'utilisateur est connecté
 * @returns {boolean}
 */
export function isAuthenticated() {
    return !!getState('user');
}

/**
 * 👤 Récupère l'utilisateur courant
 * @returns {Object|null}
 */
export function getCurrentUser() {
    return getState('user');
}

/**
 * 👤 Récupère le profil courant
 * @returns {Object|null}
 */
export function getCurrentProfile() {
    return getState('profile');
}

/**
 * 🔓 Requiert une authentification
 * @param {Function} callback - Fonction à exécuter si authentifié
 * @returns {boolean} - True si authentifié
 */
export function requireAuth(callback) {
    if (isAuthenticated()) {
        callback?.();
        return true;
    }
    
    showToast('Connectez-vous pour cette action', 'warning');
    // Ouvrir le modal d'auth
    window.openAuthModal?.();
    return false;
}

/**
 * 🚫 Traduit les erreurs Supabase
 * @param {Error} error - Erreur originale
 * @returns {string}
 */
function getErrorMessage(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('invalid login')) return 'Email ou mot de passe incorrect';
    if (message.includes('email not confirmed')) return 'Veuillez confirmer votre email';
    if (message.includes('user already registered')) return 'Un compte existe déjà avec cet email';
    if (message.includes('password')) return 'Mot de passe invalide (min. 6 caractères)';
    if (message.includes('email')) return 'Email invalide';
    
    return 'Une erreur est survenue';
}
