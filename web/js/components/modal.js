/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🪟 MODAL COMPONENT - Palimpseste
 * Fenêtres modales génériques
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { setState, getState, subscribe } from '../state.js';

// 📦 Stack des modales ouvertes
const modalStack = [];

/**
 * 📂 Ouvre une modale
 * @param {string} modalId - ID de la modale
 * @param {Object} data - Données à passer à la modale
 */
export function openModal(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`🟠 Modal not found: ${modalId}`);
        return;
    }
    
    console.log('🟡 Opening modal:', modalId);
    
    // Fermer la modale précédente si différente
    const currentModal = getState('activeModal');
    if (currentModal && currentModal !== modalId) {
        closeModal(currentModal);
    }
    
    // Stocker les données sur l'élément
    modal._data = data;
    
    // Ouvrir
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    
    // Focus trap
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length) {
        focusableElements[0].focus();
    }
    
    // Mettre à jour l'état
    setState('activeModal', modalId);
    modalStack.push(modalId);
    
    // Event de fermeture sur clic extérieur
    modal.addEventListener('click', handleOutsideClick);
    
    // Event de fermeture sur Escape
    document.addEventListener('keydown', handleEscapeKey);
    
    // Dispatch event pour les listeners
    window.dispatchEvent(new CustomEvent('modal-opened', { 
        detail: { modalId, data } 
    }));
}

/**
 * 📁 Ferme une modale
 * @param {string} modalId - ID de la modale (optionnel, ferme la courante)
 */
export function closeModal(modalId = null) {
    const targetId = modalId || getState('activeModal');
    if (!targetId) return;
    
    const modal = document.getElementById(targetId);
    if (!modal) return;
    
    console.log('🟡 Closing modal:', targetId);
    
    // Fermer
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    
    // Retirer de la stack
    const index = modalStack.indexOf(targetId);
    if (index > -1) {
        modalStack.splice(index, 1);
    }
    
    // Nettoyer
    modal.removeEventListener('click', handleOutsideClick);
    
    // Si plus de modales, restaurer le scroll
    if (modalStack.length === 0) {
        document.body.classList.remove('no-scroll');
        document.removeEventListener('keydown', handleEscapeKey);
        setState('activeModal', null);
    } else {
        // Sinon, activer la modale précédente
        setState('activeModal', modalStack[modalStack.length - 1]);
    }
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('modal-closed', { 
        detail: { modalId: targetId } 
    }));
}

/**
 * 🔄 Toggle une modale
 * @param {string} modalId 
 * @param {Object} data 
 */
export function toggleModal(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (modal.classList.contains('open')) {
        closeModal(modalId);
    } else {
        openModal(modalId, data);
    }
}

/**
 * 👆 Gère le clic extérieur
 * @param {Event} e 
 */
function handleOutsideClick(e) {
    const modal = e.currentTarget;
    const content = modal.querySelector('.modal__content');
    
    // Si clic sur l'overlay (pas le contenu)
    if (!content.contains(e.target)) {
        closeModal(modal.id);
    }
}

/**
 * ⌨️ Gère la touche Escape
 * @param {KeyboardEvent} e 
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
}

/**
 * 📋 Récupère les données d'une modale
 * @param {string} modalId 
 * @returns {Object}
 */
export function getModalData(modalId) {
    const modal = document.getElementById(modalId);
    return modal?._data || {};
}

/**
 * ✏️ Met à jour le contenu d'une modale
 * @param {string} modalId 
 * @param {string} content - HTML content
 */
export function setModalContent(modalId, content) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const body = modal.querySelector('.modal__body');
    if (body) {
        body.innerHTML = content;
    }
}

/**
 * 🏭 Crée une modale dynamiquement
 * @param {Object} options 
 * @returns {HTMLElement}
 */
export function createModal(options) {
    const {
        id,
        title,
        content,
        footer = '',
        size = 'md' // sm, md, lg, fullscreen
    } = options;
    
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
        <div class="modal__content modal__content--${size}">
            <div class="modal__header">
                <h2 class="modal__title">${title}</h2>
                <button class="modal__close" aria-label="Fermer">×</button>
            </div>
            <div class="modal__body">
                ${content}
            </div>
            ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
        </div>
    `;
    
    // Bouton fermer
    const closeBtn = modal.querySelector('.modal__close');
    closeBtn.addEventListener('click', () => closeModal(id));
    
    // Ajouter au DOM
    document.body.appendChild(modal);
    
    return modal;
}

/**
 * 🗑️ Supprime une modale dynamique
 * @param {string} modalId 
 */
export function destroyModal(modalId) {
    closeModal(modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

/**
 * 🚀 Initialise les modales existantes
 */
export function initModals() {
    console.log('🟡 Initializing modals...');
    
    // Attacher les boutons de fermeture
    document.querySelectorAll('.modal__close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    console.log('🟢 Modals initialized');
}

// 🌐 Exposer pour usage global
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleModal = toggleModal;
