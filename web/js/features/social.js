/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎭 SOCIAL FEATURE - Palimpseste
 * Interactions sociales: feed, comments, follows
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getState, setState, subscribe } from '../state.js';
import { escapeHtml, formatRelativeTime, truncateText } from '../utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import * as api from '../api.js';

// 📦 État local
let socialFeedContainer = null;
let commentsContainer = null;

/**
 * 🚀 Initialise les fonctionnalités sociales
 */
export function initSocial() {
    console.log('🟡 Initializing social features...');
    
    socialFeedContainer = document.getElementById('social-feed');
    
    // Écouter les événements
    window.addEventListener('open-comments', (e) => {
        openCommentsModal(e.detail.textData);
    });
    
    window.addEventListener('open-share', (e) => {
        openShareModal(e.detail.textData);
    });
    
    // Bouton feed social
    const socialBtn = document.querySelector('[data-action="social-feed"]');
    if (socialBtn) {
        socialBtn.addEventListener('click', toggleSocialFeed);
    }
    
    console.log('🟢 Social features initialized');
}

/**
 * 🔄 Toggle le feed social
 */
export function toggleSocialFeed() {
    const user = getState('user');
    
    if (!user) {
        showToast('Connectez-vous pour voir le feed social', 'warning');
        window.openAuthModal?.();
        return;
    }
    
    const overlay = document.getElementById('social-feed-overlay');
    
    if (overlay?.classList.contains('open')) {
        closeSocialFeed();
    } else {
        openSocialFeed();
    }
}

/**
 * 📂 Ouvre le feed social
 */
export async function openSocialFeed() {
    console.log('🟡 Opening social feed...');
    
    const overlay = document.getElementById('social-feed-overlay');
    if (!overlay) return;
    
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
    
    // Charger les posts
    await loadSocialPosts();
}

/**
 * 📁 Ferme le feed social
 */
export function closeSocialFeed() {
    const overlay = document.getElementById('social-feed-overlay');
    if (!overlay) return;
    
    overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
}

/**
 * 📰 Charge les posts du feed social
 */
async function loadSocialPosts() {
    const container = document.getElementById('social-feed-posts');
    if (!container) return;
    
    container.innerHTML = '<div class="loader"></div>';
    
    try {
        const posts = await api.getSocialFeed();
        
        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon">📭</div>
                    <div class="empty-state__text">Aucune activité récente</div>
                    <div class="empty-state__hint">Suivez des lecteurs pour voir leur activité !</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = posts.map(post => renderSocialPost(post)).join('');
        
        // Attacher les événements
        attachSocialPostEvents(container);
        
    } catch (error) {
        console.error('🔴 Error loading social posts:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-state__icon">⚠️</div>
                <div class="error-state__text">Erreur de chargement</div>
            </div>
        `;
    }
}

/**
 * 🎨 Rend un post social
 * @param {Object} post 
 * @returns {string}
 */
function renderSocialPost(post) {
    const { profile, text, type, created_at } = post;
    
    const actionText = type === 'like' ? 'a aimé' : 'a commenté';
    const actionIcon = type === 'like' ? '❤️' : '💬';
    
    return `
        <div class="social-post" data-post-id="${post.id}">
            <div class="social-post__header">
                <div class="social-post__avatar">${profile.avatar_emoji || '📚'}</div>
                <div class="social-post__info">
                    <span class="social-post__username">${escapeHtml(profile.username)}</span>
                    <span class="social-post__action">${actionIcon} ${actionText}</span>
                </div>
                <div class="social-post__time">${formatRelativeTime(created_at)}</div>
            </div>
            
            <div class="social-post__content">
                <div class="social-post__text-preview">
                    "${truncateText(text.content, 150)}"
                </div>
                <div class="social-post__text-meta">
                    — ${escapeHtml(text.author)}, <em>${escapeHtml(text.work)}</em>
                </div>
            </div>
            
            ${type === 'comment' && post.comment ? `
                <div class="social-post__comment">
                    💬 "${escapeHtml(post.comment)}"
                </div>
            ` : ''}
            
            <div class="social-post__actions">
                <button class="btn btn--ghost btn--sm" data-action="view-text">
                    📖 Lire
                </button>
                <button class="btn btn--ghost btn--sm" data-action="view-profile">
                    👤 Profil
                </button>
            </div>
        </div>
    `;
}

/**
 * 🔗 Attache les événements aux posts
 * @param {HTMLElement} container 
 */
function attachSocialPostEvents(container) {
    container.querySelectorAll('.social-post').forEach(post => {
        post.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            
            if (action === 'view-text') {
                // TODO: Afficher le texte complet
            } else if (action === 'view-profile') {
                // TODO: Ouvrir le profil
            }
        });
    });
}

/**
 * 💬 Ouvre la modale de commentaires
 * @param {Object} textData 
 */
export async function openCommentsModal(textData) {
    console.log('🟡 Opening comments for:', textData.id);
    
    openModal('comments-modal', { textData });
    
    const modal = document.getElementById('comments-modal');
    if (!modal) return;
    
    const body = modal.querySelector('.modal__body');
    body.innerHTML = '<div class="loader"></div>';
    
    try {
        const comments = await api.getComments(textData.id);
        
        body.innerHTML = `
            <div class="comments-list">
                ${comments.length === 0 
                    ? '<div class="comments-empty">Aucun commentaire. Soyez le premier !</div>'
                    : comments.map(c => renderComment(c)).join('')
                }
            </div>
            
            <form class="comment-form" id="comment-form">
                <textarea class="textarea" placeholder="Votre commentaire..." required></textarea>
                <button type="submit" class="btn btn--primary">💬 Commenter</button>
            </form>
        `;
        
        // Form submit
        const form = body.querySelector('#comment-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitComment(textData, form.querySelector('textarea').value);
        });
        
    } catch (error) {
        console.error('🔴 Error loading comments:', error);
        body.innerHTML = '<div class="error-state">Erreur de chargement</div>';
    }
}

/**
 * 🎨 Rend un commentaire
 * @param {Object} comment 
 * @returns {string}
 */
function renderComment(comment) {
    return `
        <div class="comment" data-comment-id="${comment.id}">
            <div class="comment__header">
                <div class="comment__avatar">${comment.profile?.avatar_emoji || '📚'}</div>
                <span class="comment__username">${escapeHtml(comment.profile?.username || 'Anonyme')}</span>
                <span class="comment__time">${formatRelativeTime(comment.created_at)}</span>
            </div>
            <div class="comment__content">${escapeHtml(comment.content)}</div>
        </div>
    `;
}

/**
 * 📝 Soumet un commentaire
 * @param {Object} textData 
 * @param {string} content 
 */
async function submitComment(textData, content) {
    if (!content.trim()) return;
    
    const user = getState('user');
    if (!user) {
        showToast('Connectez-vous pour commenter', 'warning');
        return;
    }
    
    try {
        await api.addComment(user.id, textData.id, content, textData);
        showToast('Commentaire ajouté !', 'success');
        
        // Recharger les commentaires
        openCommentsModal(textData);
        
    } catch (error) {
        console.error('🔴 Error submitting comment:', error);
        showToast('Erreur lors de l\'envoi', 'error');
    }
}

/**
 * 📤 Ouvre la modale de partage
 * @param {Object} textData 
 */
export function openShareModal(textData) {
    console.log('🟡 Opening share modal');
    
    openModal('share-modal', { textData });
    
    const modal = document.getElementById('share-modal');
    if (!modal) return;
    
    const body = modal.querySelector('.modal__body');
    
    const shareText = `"${truncateText(textData.teaser, 200)}"\n— ${textData.author}`;
    const shareUrl = window.location.href;
    
    body.innerHTML = `
        <div class="share-preview">
            <blockquote>"${escapeHtml(truncateText(textData.teaser, 150))}"</blockquote>
            <cite>— ${escapeHtml(textData.author)}, <em>${escapeHtml(textData.work)}</em></cite>
        </div>
        
        <div class="share-buttons">
            <button class="btn btn--primary share-btn" data-share="twitter">
                🐦 Twitter
            </button>
            <button class="btn btn--primary share-btn" data-share="facebook">
                📘 Facebook
            </button>
            <button class="btn btn--primary share-btn" data-share="copy">
                📋 Copier
            </button>
        </div>
    `;
    
    // Boutons de partage
    body.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.share;
            handleShare(platform, shareText, shareUrl);
        });
    });
}

/**
 * 📤 Gère le partage
 * @param {string} platform 
 * @param {string} text 
 * @param {string} url 
 */
function handleShare(platform, text, url) {
    switch (platform) {
        case 'twitter':
            window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                '_blank'
            );
            break;
            
        case 'facebook':
            window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                '_blank'
            );
            break;
            
        case 'copy':
            navigator.clipboard.writeText(`${text}\n\n${url}`).then(() => {
                showToast('Copié dans le presse-papiers !', 'success');
            }).catch(() => {
                showToast('Erreur de copie', 'error');
            });
            break;
    }
    
    closeModal('share-modal');
}

/**
 * 👤 Affiche le profil d'un utilisateur
 * @param {string} userId 
 */
export async function showUserProfile(userId) {
    console.log('🟡 Showing profile:', userId);
    
    openModal('profile-modal', { userId });
    
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    
    const body = modal.querySelector('.modal__body');
    body.innerHTML = '<div class="loader"></div>';
    
    try {
        const profile = await api.getProfile(userId);
        const currentUser = getState('user');
        const isOwnProfile = currentUser?.id === userId;
        
        const followers = await api.getFollowers(userId);
        const following = await api.getFollowing(userId);
        
        body.innerHTML = renderProfileContent(profile, followers, following, isOwnProfile);
        
        // Bouton follow
        if (!isOwnProfile && currentUser) {
            const followBtn = body.querySelector('[data-action="follow"]');
            if (followBtn) {
                followBtn.addEventListener('click', () => toggleFollow(userId, followBtn));
            }
        }
        
    } catch (error) {
        console.error('🔴 Error loading profile:', error);
        body.innerHTML = '<div class="error-state">Profil introuvable</div>';
    }
}

/**
 * 🎨 Rend le contenu du profil
 * @param {Object} profile 
 * @param {Array} followers 
 * @param {Array} following 
 * @param {boolean} isOwnProfile 
 * @returns {string}
 */
function renderProfileContent(profile, followers, following, isOwnProfile) {
    return `
        <div class="profile-header">
            <div class="profile-avatar">${profile.avatar_emoji || '📚'}</div>
            <h3 class="profile-username">${escapeHtml(profile.username)}</h3>
            ${profile.bio ? `<p class="profile-bio">${escapeHtml(profile.bio)}</p>` : ''}
        </div>
        
        <div class="profile-stats">
            <div class="profile-stat">
                <div class="profile-stat__value">${profile.likes_count || 0}</div>
                <div class="profile-stat__label">Favoris</div>
            </div>
            <div class="profile-stat">
                <div class="profile-stat__value">${followers.length}</div>
                <div class="profile-stat__label">Followers</div>
            </div>
            <div class="profile-stat">
                <div class="profile-stat__value">${following.length}</div>
                <div class="profile-stat__label">Suivis</div>
            </div>
        </div>
        
        ${!isOwnProfile ? `
            <button class="btn btn--primary btn--follow" data-action="follow">
                Suivre
            </button>
        ` : ''}
    `;
}

/**
 * 👥 Toggle follow
 * @param {string} userId 
 * @param {HTMLElement} btn 
 */
async function toggleFollow(userId, btn) {
    const currentUser = getState('user');
    if (!currentUser) return;
    
    const isFollowing = btn.classList.contains('following');
    
    try {
        if (isFollowing) {
            await api.unfollowUser(currentUser.id, userId);
            btn.classList.remove('following');
            btn.textContent = 'Suivre';
            showToast('Vous ne suivez plus cet utilisateur', 'info');
        } else {
            await api.followUser(currentUser.id, userId);
            btn.classList.add('following');
            btn.textContent = 'Suivi ✓';
            showToast('Vous suivez maintenant cet utilisateur !', 'success');
        }
    } catch (error) {
        console.error('🔴 Follow error:', error);
        showToast('Erreur', 'error');
    }
}

// 🌐 Exposer pour usage global
window.toggleSocialFeed = toggleSocialFeed;
window.closeSocialFeed = closeSocialFeed;
