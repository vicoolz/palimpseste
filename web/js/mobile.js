// ═══════════════════════════════════════════════════════════
// 📱 MOBILE - Drawer et Navigation (style Twitter)
// ═══════════════════════════════════════════════════════════

function openMobileDrawer() {
    const drawer = document.querySelector('.stats-panel');
    const overlay = document.getElementById('mobileDrawerOverlay');
    if (drawer) {
        drawer.classList.add('open');
        overlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileDrawer() {
    const drawer = document.querySelector('.stats-panel');
    const overlay = document.getElementById('mobileDrawerOverlay');
    if (drawer) {
        drawer.classList.remove('open');
        overlay?.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Fermer le drawer en cliquant sur le bouton "Fermer" (pseudo-element)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900) {
        const drawer = document.querySelector('.stats-panel');
        if (drawer && drawer.classList.contains('open')) {
            // Vérifier si on clique sur la zone du bouton fermer (haut du drawer)
            const rect = drawer.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            if (clickY < 40 && e.target === drawer) {
                closeMobileDrawer();
            }
        }
    }
});

// Navigation mobile
function mobileNavTo(section) {
    // Mettre à jour l'état actif
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-nav="${section}"]`)?.classList.add('active');
    
    switch(section) {
        case 'feed':
            // Scroll vers le haut du feed
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'search':
            // Focus sur la recherche
            document.getElementById('searchInput')?.focus();
            break;
        case 'social':
            if (typeof openSocialFeed === 'function') openSocialFeed();
            break;
        case 'notifs':
            if (typeof toggleNotifications === 'function') toggleNotifications();
            break;
    }
}

// Mettre à jour l'avatar mobile quand l'utilisateur se connecte
function updateMobileAvatar() {
    const mobileAvatar = document.getElementById('mobileAvatar');
    if (mobileAvatar && currentUser) {
        const profile = currentUser.user_metadata;
        if (profile?.avatar_url) {
            mobileAvatar.innerHTML = `<img src="${profile.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else if (profile?.username) {
            mobileAvatar.textContent = profile.username[0].toUpperCase();
        }
    }
}

// Mettre à jour le badge de notifications mobile
function updateMobileNotifBadge(count) {
    const badge = document.getElementById('mobileNotifBadge');
    if (badge) {
        badge.textContent = count > 0 ? (count > 9 ? '9+' : count) : '';
    }
}

// Swipe pour fermer le drawer
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const drawer = document.querySelector('.stats-panel');
    if (!drawer?.classList.contains('open')) return;
    
    const swipeDistance = touchStartX - touchEndX;
    // Swipe vers la gauche pour fermer
    if (swipeDistance > 80) {
        closeMobileDrawer();
    }
}

// Initialiser les éléments mobile
function initMobile() {
    // Ajouter l'écouteur pour le bouton profil mobile
    const profileBtn = document.getElementById('mobileProfileBtn');
    if (profileBtn) {
        // Supprimer les anciens listeners en clonant
        const newBtn = profileBtn.cloneNode(true);
        profileBtn.parentNode.replaceChild(newBtn, profileBtn);
        
        // Utiliser click pour meilleure compatibilité
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('📱 Profile button clicked');
            openMobileDrawer();
        });
        
        // Fallback touchend pour iOS
        newBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('📱 Profile button touched');
            openMobileDrawer();
        }, { passive: false });
    }
    
    // Ajouter les écouteurs pour le drawer overlay
    const overlay = document.getElementById('mobileDrawerOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeMobileDrawer);
    }
    
    // Synchroniser le sélecteur de langue du drawer avec celui du header
    const drawerLangSelect = document.getElementById('drawerLangSelect');
    const headerLangSelect = document.getElementById('langSelect');
    if (drawerLangSelect && headerLangSelect) {
        drawerLangSelect.value = headerLangSelect.value;
    }
    
    // Mettre à jour l'avatar si connecté
    if (currentUser) {
        updateMobileAvatar();
    }
    
    console.log('📱 Mobile initialisé');
}

// Appeler l'init mobile après le chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initMobile, 100);
});

// Rendre les fonctions accessibles globalement
window.openMobileDrawer = openMobileDrawer;
window.closeMobileDrawer = closeMobileDrawer;
window.mobileNavTo = mobileNavTo;
window.updateMobileAvatar = updateMobileAvatar;
window.updateMobileNotifBadge = updateMobileNotifBadge;
