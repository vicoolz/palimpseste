/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📱 DRAWER COMPONENT - Palimpseste
 * Menu latéral mobile avec gestion swipe
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { setState, getState, subscribe } from '../state.js';
import { isMobile } from '../utils.js';

// 📦 Éléments DOM
let drawer = null;
let overlay = null;

// 👆 Gestion du swipe
let touchStartX = 0;
let touchCurrentX = 0;
let isSwiping = false;
const SWIPE_THRESHOLD = 100; // Pixels minimum pour fermer

/**
 * 🚀 Initialise le drawer
 */
export function initDrawer() {
    drawer = document.getElementById('mobile-drawer');
    overlay = document.getElementById('drawer-overlay');
    
    if (!drawer || !overlay) {
        console.warn('🟠 Drawer elements not found');
        return;
    }
    
    console.log('🟡 Initializing drawer...');
    
    // Bouton avatar pour ouvrir
    const avatarBtn = document.getElementById('mobile-avatar');
    if (avatarBtn) {
        avatarBtn.addEventListener('click', openDrawer);
    }
    
    // Bouton fermer
    const closeBtn = drawer.querySelector('.drawer__close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDrawer);
    }
    
    // Clic sur overlay pour fermer
    overlay.addEventListener('click', closeDrawer);
    
    // Swipe pour fermer
    setupSwipeGestures();
    
    // Écouter les changements d'état
    subscribe('drawerOpen', (isOpen) => {
        if (isOpen) {
            showDrawer();
        } else {
            hideDrawer();
        }
    });
    
    console.log('🟢 Drawer initialized');
}

/**
 * 📂 Ouvre le drawer
 */
export function openDrawer() {
    if (!isMobile()) return;
    
    console.log('🟡 Opening drawer...');
    setState('drawerOpen', true);
}

/**
 * 📁 Ferme le drawer
 */
export function closeDrawer() {
    console.log('🟡 Closing drawer...');
    setState('drawerOpen', false);
}

/**
 * 🔄 Toggle le drawer
 */
export function toggleDrawer() {
    const isOpen = getState('drawerOpen');
    if (isOpen) {
        closeDrawer();
    } else {
        openDrawer();
    }
}

/**
 * 👁️ Affiche visuellement le drawer
 */
function showDrawer() {
    if (!drawer || !overlay) return;
    
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
    
    // Focus trap
    drawer.setAttribute('aria-hidden', 'false');
    
    // Annoncer pour accessibilité
    drawer.focus();
}

/**
 * 🙈 Cache visuellement le drawer
 */
function hideDrawer() {
    if (!drawer || !overlay) return;
    
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
    
    drawer.setAttribute('aria-hidden', 'true');
    
    // Reset la position (si swipe partiel)
    drawer.style.transform = '';
}

/**
 * 👆 Configure les gestes de swipe
 */
function setupSwipeGestures() {
    if (!drawer) return;
    
    // Touch start
    drawer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        isSwiping = true;
        drawer.style.transition = 'none';
    }, { passive: true });
    
    // Touch move
    drawer.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        
        touchCurrentX = e.touches[0].clientX;
        const deltaX = touchCurrentX - touchStartX;
        
        // Seulement vers la gauche (fermeture)
        if (deltaX < 0) {
            const translateX = Math.max(deltaX, -drawer.offsetWidth);
            drawer.style.transform = `translateX(${translateX}px)`;
            
            // Opacité de l'overlay proportionnelle
            const progress = Math.abs(deltaX) / drawer.offsetWidth;
            overlay.style.opacity = 1 - progress;
        }
    }, { passive: true });
    
    // Touch end
    drawer.addEventListener('touchend', () => {
        if (!isSwiping) return;
        
        isSwiping = false;
        drawer.style.transition = '';
        overlay.style.opacity = '';
        
        const deltaX = touchCurrentX - touchStartX;
        
        // Si swipe suffisant, fermer
        if (deltaX < -SWIPE_THRESHOLD) {
            closeDrawer();
        } else {
            // Sinon, réinitialiser la position
            drawer.style.transform = '';
        }
        
        touchStartX = 0;
        touchCurrentX = 0;
    });
    
    // Touch cancel
    drawer.addEventListener('touchcancel', () => {
        isSwiping = false;
        drawer.style.transition = '';
        drawer.style.transform = '';
        overlay.style.opacity = '';
    });
}

/**
 * 📲 Gère l'ouverture depuis le bord gauche de l'écran
 * @param {TouchEvent} e 
 */
export function handleEdgeSwipe(e) {
    if (getState('drawerOpen')) return;
    
    const touch = e.touches[0];
    
    // Si le touch commence près du bord gauche
    if (touch.clientX < 20) {
        openDrawer();
    }
}

/**
 * 🔄 Met à jour le contenu du drawer
 * @param {Object} data - Données à afficher
 */
export function updateDrawerContent(data) {
    if (!drawer) return;
    
    // Mettre à jour le profil si connecté
    const profileSection = drawer.querySelector('.drawer__profile');
    if (profileSection && data.profile) {
        profileSection.innerHTML = renderProfileSection(data.profile);
    }
    
    // Mettre à jour les badges de notification
    const notifBadge = drawer.querySelector('.drawer__nav-badge');
    if (notifBadge && data.notifications !== undefined) {
        notifBadge.textContent = data.notifications;
        notifBadge.style.display = data.notifications > 0 ? 'flex' : 'none';
    }
}

/**
 * 🎨 Rend la section profil
 * @param {Object} profile 
 * @returns {string}
 */
function renderProfileSection(profile) {
    return `
        <div class="drawer__profile-info">
            <div class="drawer__profile-avatar">${profile.avatar_emoji || '📚'}</div>
            <div>
                <div class="drawer__profile-name">${profile.username || 'Utilisateur'}</div>
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
}

// 🌐 Exposer pour usage global
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.toggleDrawer = toggleDrawer;
