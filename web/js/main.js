/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📱 MAIN.JS - Palimpseste
 * Point d'entrée principal de l'application (nouveau module ES6)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// 📦 Imports - Config et utilitaires
import { SUPABASE_CONFIG, LANGUAGES, DEFAULT_SETTINGS, BREAKPOINTS } from './config.js';
import { isMobile, isTouchDevice, saveStorage, loadStorage } from './utils.js';
import { initStateFromStorage, setState, getState, subscribe } from './state.js';
import { initSupabase, onAuthStateChange } from './api.js';

// 📦 Imports - Composants
import { showToast, showError } from './components/toast.js';
import { initDrawer, openDrawer, closeDrawer } from './components/drawer.js';
import { initModals, openModal, closeModal } from './components/modal.js';

// 📦 Imports - Features
import { initAuth, handleAuthChange } from './features/auth.js';
import { initFeed, refreshFeed, loadMoreTexts } from './features/feed.js';
import { initSocial } from './features/social.js';
import { initExploration } from './features/exploration.js';
import { initSearch } from './features/search.js';
import { initAchievements, trackAction } from './features/achievements.js';

/**
 * 🚀 Initialisation principale
 */
async function initApp() {
    console.log('═══════════════════════════════════════════');
    console.log('🟡 Palimpseste - Initializing...');
    console.log('═══════════════════════════════════════════');
    
    try {
        // 1️⃣ État initial
        initStateFromStorage();
        
        // 2️⃣ Supabase
        await initSupabase();
        
        // 3️⃣ Auth
        initAuth();
        
        // 4️⃣ UI Components
        initModals();
        initDrawer();
        
        // 5️⃣ Features
        initFeed();
        initSearch();
        initExploration();
        initSocial();
        initAchievements();
        
        // 6️⃣ Event listeners
        setupGlobalEvents();
        
        // 7️⃣ Responsive
        setupResponsive();
        
        // 8️⃣ Langue initiale
        initLanguageSelector();
        
        console.log('═══════════════════════════════════════════');
        console.log('🟢 Palimpseste - Ready!');
        console.log('═══════════════════════════════════════════');
        
        // Message de bienvenue
        showToast('Bienvenue sur Palimpseste 📚', 'success');
        
    } catch (error) {
        console.error('🔴 Init error:', error);
        showError('Erreur de chargement. Veuillez rafraîchir.');
    }
}

/**
 * 🌐 Configure les événements globaux
 */
function setupGlobalEvents() {
    // Bouton rafraîchir
    document.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
        refreshFeed();
    });
    
    // Bouton aléatoire
    document.querySelector('[data-action="random"]')?.addEventListener('click', () => {
        loadMoreTexts(1);
        showToast('Nouveau texte chargé !', 'info');
    });
    
    // Boutons auth
    document.querySelector('[data-action="login"]')?.addEventListener('click', () => {
        openModal('auth-modal');
    });
    
    document.querySelector('[data-action="signup"]')?.addEventListener('click', () => {
        openModal('auth-modal', { tab: 'signup' });
    });
    
    // Bouton profil (desktop)
    document.querySelector('[data-action="profile"]')?.addEventListener('click', () => {
        const user = getState('user');
        if (user) {
            openModal('profile-modal', { userId: user.id });
        } else {
            openModal('auth-modal');
        }
    });
    
    // Avatar mobile -> drawer
    document.getElementById('mobile-avatar')?.addEventListener('click', () => {
        openDrawer();
    });
    
    // Navigation mobile
    setupMobileNavigation();
    
    // Raccourcis clavier
    setupKeyboardShortcuts();
    
    // Gestion du resize
    window.addEventListener('resize', handleResize);
    
    // Gestion du scroll
    window.addEventListener('scroll', handleScroll);
    
    // Service worker (PWA)
    registerServiceWorker();
}

/**
 * 📱 Configure la navigation mobile
 */
function setupMobileNavigation() {
    const mobileNav = document.querySelector('.mobile-nav');
    if (!mobileNav) return;
    
    mobileNav.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.nav;
            
            // Retirer la classe active des autres
            mobileNav.querySelectorAll('[data-nav]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            switch (action) {
                case 'home':
                    scrollToTop();
                    break;
                case 'explore':
                    document.querySelector('.exploration-section')?.scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'random':
                    loadMoreTexts(1);
                    break;
                case 'social':
                    window.toggleSocialFeed?.();
                    break;
            }
        });
    });
}

/**
 * ⌨️ Configure les raccourcis clavier
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignorer si dans un input
        if (e.target.matches('input, textarea')) return;
        
        // Ctrl/Cmd + K: Focus recherche
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            window.focusSearch?.();
        }
        
        // R: Rafraîchir le feed
        if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
            refreshFeed();
        }
        
        // N: Nouveau texte
        if (e.key === 'n') {
            loadMoreTexts(1);
        }
        
        // Escape: Fermer modales/drawer
        if (e.key === 'Escape') {
            closeModal();
            closeDrawer();
        }
    });
}

/**
 * 📐 Configure le responsive
 */
function setupResponsive() {
    const handleViewport = () => {
        const isMobileView = window.innerWidth < BREAKPOINTS.mobile;
        document.body.classList.toggle('is-mobile', isMobileView);
        document.body.classList.toggle('is-touch', isTouchDevice());
        
        // Fermer le drawer si on passe en desktop
        if (!isMobileView && getState('drawerOpen')) {
            closeDrawer();
        }
    };
    
    handleViewport();
    window.addEventListener('resize', handleViewport);
}

/**
 * 📏 Gère le resize
 */
function handleResize() {
    // Recalculer les layouts si nécessaire
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

/**
 * 📜 Gère le scroll
 */
let lastScrollY = 0;

function handleScroll() {
    const currentScrollY = window.scrollY;
    const header = document.querySelector('.header');
    
    // Header hide/show on scroll
    if (header && isMobile()) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
    }
    
    lastScrollY = currentScrollY;
}

/**
 * 🌍 Initialise le sélecteur de langue
 */
function initLanguageSelector() {
    const selector = document.getElementById('language-selector');
    if (!selector) return;
    
    // Remplir les options
    selector.innerHTML = Object.entries(LANGUAGES).map(([code, lang]) => `
        <option value="${code}">${lang.flag} ${lang.name}</option>
    `).join('');
    
    // Valeur initiale
    const currentLang = getState('currentLanguage') || DEFAULT_SETTINGS.language;
    selector.value = currentLang;
    
    // Changement
    selector.addEventListener('change', (e) => {
        const newLang = e.target.value;
        setState('currentLanguage', newLang);
        saveStorage('palimpseste_language', newLang);
        
        trackAction('language_explored', { language: newLang });
        
        const langInfo = LANGUAGES[newLang];
        showToast(`${langInfo.flag} Langue: ${langInfo.name}`, 'info');
    });
}

/**
 * 📲 Service Worker pour PWA
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // await navigator.serviceWorker.register('/sw.js');
            // console.log('🟢 Service Worker registered');
        } catch (error) {
            console.warn('🟠 Service Worker registration failed:', error);
        }
    }
}

/**
 * ⬆️ Scroll vers le haut
 */
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 🚀 Démarrage
document.addEventListener('DOMContentLoaded', initApp);

// 🌐 Exposer les fonctions globales
window.initApp = initApp;
window.scrollToTop = scrollToTop;
