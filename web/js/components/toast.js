/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🍞 TOAST COMPONENT - Palimpseste
 * Notifications temporaires
 * ═══════════════════════════════════════════════════════════════════════════
 */

// 📦 Container des toasts
let toastContainer = null;

// ⏱️ Durée par défaut
const DEFAULT_DURATION = 4000;

// 🎨 Icônes par type
const TOAST_ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
};

/**
 * 🚀 Initialise le container de toasts
 */
function initToastContainer() {
    if (toastContainer) return;
    
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
}

/**
 * 🍞 Affiche un toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Durée en ms
 * @returns {HTMLElement} - Élément toast créé
 */
export function showToast(message, type = 'info', duration = DEFAULT_DURATION) {
    initToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    toast.innerHTML = `
        <span class="toast__icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
        <div class="toast__content">
            <div class="toast__message">${message}</div>
        </div>
        <button class="toast__close" aria-label="Fermer">×</button>
    `;
    
    // Bouton fermer
    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => hideToast(toast));
    
    // Ajouter au container
    toastContainer.appendChild(toast);
    
    // Auto-hide après durée
    setTimeout(() => hideToast(toast), duration);
    
    console.log(`🍞 Toast (${type}):`, message);
    return toast;
}

/**
 * 🙈 Cache un toast
 * @param {HTMLElement} toast - Élément toast
 */
function hideToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.add('hiding');
    
    setTimeout(() => {
        toast.remove();
    }, 300);
}

/**
 * ✅ Raccourci toast succès
 * @param {string} message 
 */
export function showSuccess(message) {
    return showToast(message, 'success');
}

/**
 * ❌ Raccourci toast erreur
 * @param {string} message 
 */
export function showError(message) {
    return showToast(message, 'error');
}

/**
 * ⚠️ Raccourci toast warning
 * @param {string} message 
 */
export function showWarning(message) {
    return showToast(message, 'warning');
}

/**
 * ℹ️ Raccourci toast info
 * @param {string} message 
 */
export function showInfo(message) {
    return showToast(message, 'info');
}

/**
 * 🧹 Supprime tous les toasts
 */
export function clearAllToasts() {
    if (!toastContainer) return;
    
    const toasts = toastContainer.querySelectorAll('.toast');
    toasts.forEach(toast => hideToast(toast));
}
