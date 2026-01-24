/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📇 CARD COMPONENT - Palimpseste
 * Carte de texte littéraire avec interactions
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getState, isTextLiked, addLikeToCache, removeLikeFromCache } from '../state.js';
import { escapeHtml, truncateText, formatRelativeTime } from '../utils.js';
import { addLike, removeLike } from '../api.js';
import { showToast } from './toast.js';
import { GENRES } from '../config.js';

// 🕐 Double-tap detection
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 300;

/**
 * 🎨 Crée une carte de texte
 * @param {Object} textData - Données du texte
 * @returns {HTMLElement}
 */
export function createCard(textData) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.textId = textData.id;
    
    const isLiked = isTextLiked(textData.id);
    const genreInfo = GENRES[textData.genre] || GENRES.texte;
    
    card.innerHTML = `
        <div class="card-head">
            <div class="card-head__info">
                <div class="author">
                    ${escapeHtml(textData.author)}
                    ${textData.language !== 'fr' ? `<span class="lang-badge">${textData.language.toUpperCase()}</span>` : ''}
                </div>
                <div class="work">${escapeHtml(textData.work)}</div>
            </div>
            <span class="tag ${textData.genre}" title="Genre: ${genreInfo.name}">
                ${genreInfo.icon} ${genreInfo.name}
            </span>
        </div>
        
        <div class="card-body" data-text-id="${textData.id}">
            <div class="text-teaser">${escapeHtml(textData.teaser)}</div>
            ${textData.hasMore ? `
                <div class="text-full"></div>
                <button class="btn-suite" data-action="read-more">
                    Lire la suite <span class="arrow">→</span>
                </button>
            ` : ''}
            <div class="like-heart-overlay">❤️</div>
        </div>
        
        <div class="card-foot">
            <div class="actions">
                <button class="btn btn--ghost btn--like ${isLiked ? 'active' : ''}" 
                        data-action="like" 
                        aria-label="${isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                    ${isLiked ? '❤️' : '🤍'} <span class="like-count">${textData.likesCount || ''}</span>
                </button>
                <button class="btn btn--ghost" data-action="comment" aria-label="Commenter">
                    💬 <span class="comment-count">${textData.commentsCount || ''}</span>
                </button>
                <button class="btn btn--ghost btn-share" data-action="share" aria-label="Partager">
                    📤 Partager
                </button>
                <button class="btn btn--ghost" data-action="source" aria-label="Voir la source">
                    🔗 Source
                </button>
            </div>
        </div>
    `;
    
    // Stocker les données complètes sur l'élément
    card._textData = textData;
    
    // Attacher les événements
    attachCardEvents(card, textData);
    
    // Animation d'apparition
    requestAnimationFrame(() => {
        card.classList.add('show');
    });
    
    return card;
}

/**
 * 🔗 Attache les événements à une carte
 * @param {HTMLElement} card - Élément carte
 * @param {Object} textData - Données du texte
 */
function attachCardEvents(card, textData) {
    // Double-tap pour liker
    const cardBody = card.querySelector('.card-body');
    cardBody.addEventListener('click', (e) => {
        const now = Date.now();
        if (now - lastTapTime < DOUBLE_TAP_DELAY) {
            handleDoubleTap(card, textData);
        }
        lastTapTime = now;
    });
    
    // Boutons d'action
    card.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        
        switch (action) {
            case 'like':
                handleLikeClick(card, textData);
                break;
            case 'comment':
                handleCommentClick(textData);
                break;
            case 'share':
                handleShareClick(textData);
                break;
            case 'source':
                handleSourceClick(textData);
                break;
            case 'read-more':
                handleReadMore(card, textData);
                break;
        }
    });
    
    // Clic sur le genre pour filtrer
    const genreTag = card.querySelector('.tag');
    genreTag.addEventListener('click', () => {
        // Dispatch event pour filtrer par genre
        window.dispatchEvent(new CustomEvent('filter-genre', { 
            detail: { genre: textData.genre } 
        }));
    });
    
    // Clic sur l'auteur pour explorer
    const authorEl = card.querySelector('.author');
    authorEl.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('explore-author', { 
            detail: { author: textData.author } 
        }));
    });
}

/**
 * 👆👆 Gère le double-tap (like)
 * @param {HTMLElement} card 
 * @param {Object} textData 
 */
function handleDoubleTap(card, textData) {
    const heartOverlay = card.querySelector('.like-heart-overlay');
    
    // Animation du cœur
    heartOverlay.classList.add('animate');
    setTimeout(() => heartOverlay.classList.remove('animate'), 800);
    
    // Liker si pas déjà liké
    if (!isTextLiked(textData.id)) {
        handleLikeClick(card, textData);
    }
}

/**
 * ❤️ Gère le clic sur le bouton like
 * @param {HTMLElement} card 
 * @param {Object} textData 
 */
async function handleLikeClick(card, textData) {
    const user = getState('user');
    const likeBtn = card.querySelector('[data-action="like"]');
    const isCurrentlyLiked = isTextLiked(textData.id);
    
    // Mise à jour optimiste de l'UI
    if (isCurrentlyLiked) {
        likeBtn.classList.remove('active');
        likeBtn.innerHTML = '🤍 <span class="like-count"></span>';
        removeLikeFromCache(textData.id);
    } else {
        likeBtn.classList.add('active');
        likeBtn.innerHTML = '❤️ <span class="like-count"></span>';
        addLikeToCache(textData.id);
    }
    
    // Si connecté, synchroniser avec la BDD
    if (user) {
        try {
            if (isCurrentlyLiked) {
                await removeLike(user.id, textData.id);
            } else {
                await addLike(user.id, textData);
            }
        } catch (error) {
            console.error('🔴 Like sync error:', error);
            // Rollback de l'UI
            if (isCurrentlyLiked) {
                likeBtn.classList.add('active');
                likeBtn.innerHTML = '❤️ <span class="like-count"></span>';
                addLikeToCache(textData.id);
            } else {
                likeBtn.classList.remove('active');
                likeBtn.innerHTML = '🤍 <span class="like-count"></span>';
                removeLikeFromCache(textData.id);
            }
        }
    }
}

/**
 * 💬 Gère le clic sur commenter
 * @param {Object} textData 
 */
function handleCommentClick(textData) {
    const user = getState('user');
    
    if (!user) {
        showToast('Connectez-vous pour commenter', 'warning');
        window.openAuthModal?.();
        return;
    }
    
    window.dispatchEvent(new CustomEvent('open-comments', { 
        detail: { textData } 
    }));
}

/**
 * 📤 Gère le clic sur partager
 * @param {Object} textData 
 */
function handleShareClick(textData) {
    window.dispatchEvent(new CustomEvent('open-share', { 
        detail: { textData } 
    }));
}

/**
 * 🔗 Gère le clic sur la source
 * @param {Object} textData 
 */
function handleSourceClick(textData) {
    if (textData.sourceUrl) {
        window.open(textData.sourceUrl, '_blank', 'noopener');
    } else {
        showToast('Source non disponible', 'info');
    }
}

/**
 * 📖 Gère "Lire la suite"
 * @param {HTMLElement} card 
 * @param {Object} textData 
 */
function handleReadMore(card, textData) {
    const textFull = card.querySelector('.text-full');
    const btnSuite = card.querySelector('.btn-suite');
    
    if (!textFull || !textData.remainingText) {
        btnSuite.classList.add('exhausted');
        btnSuite.innerHTML = 'Fin du texte ✓';
        return;
    }
    
    // Afficher le texte restant par chunks
    const chunks = splitIntoChunks(textData.remainingText, 800);
    let currentChunk = 0;
    
    const showNextChunk = () => {
        if (currentChunk >= chunks.length) {
            btnSuite.classList.add('exhausted');
            btnSuite.innerHTML = 'Fin du texte ✓';
            return;
        }
        
        const chunkEl = document.createElement('div');
        chunkEl.className = 'text-chunk';
        chunkEl.textContent = chunks[currentChunk];
        textFull.appendChild(chunkEl);
        textFull.classList.add('visible');
        
        currentChunk++;
        
        if (currentChunk >= chunks.length) {
            btnSuite.classList.add('exhausted');
            btnSuite.innerHTML = 'Fin du texte ✓';
        }
    };
    
    showNextChunk();
    
    // Remplacer le handler pour les prochains clics
    btnSuite.onclick = (e) => {
        e.stopPropagation();
        showNextChunk();
    };
}

/**
 * ✂️ Découpe le texte en chunks
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {Array<string>}
 */
function splitIntoChunks(text, maxLength) {
    const chunks = [];
    let remaining = text;
    
    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }
        
        // Trouver une bonne coupure
        let cutIndex = remaining.lastIndexOf('\n\n', maxLength);
        if (cutIndex === -1 || cutIndex < maxLength * 0.5) {
            cutIndex = remaining.lastIndexOf('. ', maxLength);
        }
        if (cutIndex === -1 || cutIndex < maxLength * 0.3) {
            cutIndex = remaining.lastIndexOf(' ', maxLength);
        }
        if (cutIndex === -1) {
            cutIndex = maxLength;
        }
        
        chunks.push(remaining.slice(0, cutIndex + 1).trim());
        remaining = remaining.slice(cutIndex + 1).trim();
    }
    
    return chunks;
}

/**
 * 🔄 Met à jour l'état like d'une carte
 * @param {string} textId 
 * @param {boolean} isLiked 
 */
export function updateCardLikeState(textId, isLiked) {
    const card = document.querySelector(`[data-text-id="${textId}"]`);
    if (!card) return;
    
    const likeBtn = card.querySelector('[data-action="like"]');
    if (!likeBtn) return;
    
    if (isLiked) {
        likeBtn.classList.add('active');
        likeBtn.innerHTML = '❤️ <span class="like-count"></span>';
    } else {
        likeBtn.classList.remove('active');
        likeBtn.innerHTML = '🤍 <span class="like-count"></span>';
    }
}
