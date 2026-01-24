/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏆 ACHIEVEMENTS FEATURE - Palimpseste
 * Système de badges et succès
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getState, setState, subscribe } from '../state.js';
import { ACHIEVEMENTS } from '../config.js';
import { showToast } from '../components/toast.js';
import { saveStorage, loadStorage } from '../utils.js';

// 📦 Clé de stockage
const STORAGE_KEY = 'palimpseste_achievements';

// 🏆 Achievements débloqués localement
let unlockedAchievements = [];

/**
 * 🚀 Initialise le système d'achievements
 */
export function initAchievements() {
    console.log('🟡 Initializing achievements...');
    
    // Charger depuis le storage
    unlockedAchievements = loadStorage(STORAGE_KEY) || [];
    setState('achievements', unlockedAchievements);
    
    // Écouter les actions qui peuvent débloquer des achievements
    setupAchievementTriggers();
    
    // Rendre l'UI
    renderAchievementsPanel();
    
    console.log('🟢 Achievements initialized:', unlockedAchievements.length, 'unlocked');
}

/**
 * 🎯 Configure les déclencheurs d'achievements
 */
function setupAchievementTriggers() {
    // Écouter les likes
    subscribe('likedTexts', (likes) => {
        const count = likes.length;
        
        if (count >= 1) checkAndUnlock('premier_coup_de_coeur');
        if (count >= 10) checkAndUnlock('dix_favoris');
        if (count >= 50) checkAndUnlock('bibliophile');
        if (count >= 100) checkAndUnlock('rat_de_bibliotheque');
    });
    
    // Écouter les textes lus
    subscribe('textsRead', (count) => {
        if (count >= 1) checkAndUnlock('premier_pas');
        if (count >= 10) checkAndUnlock('explorateur');
        if (count >= 100) checkAndUnlock('voyageur_litteraire');
    });
    
    // Écouter les langues explorées
    subscribe('languagesExplored', (languages) => {
        if (languages.length >= 3) checkAndUnlock('polyglotte');
        if (languages.length >= 5) checkAndUnlock('globe_trotter');
    });
    
    // Heure de connexion
    checkTimeBasedAchievements();
}

/**
 * 🌙 Vérifie les achievements basés sur l'heure
 */
function checkTimeBasedAchievements() {
    const hour = new Date().getHours();
    
    // Noctambule: connexion entre minuit et 5h
    if (hour >= 0 && hour < 5) {
        checkAndUnlock('noctambule');
    }
    
    // Lève-tôt: connexion entre 5h et 7h
    if (hour >= 5 && hour < 7) {
        checkAndUnlock('leve_tot');
    }
}

/**
 * 🔓 Vérifie et débloque un achievement
 * @param {string} achievementId 
 * @returns {boolean} - true si nouvellement débloqué
 */
export function checkAndUnlock(achievementId) {
    // Déjà débloqué ?
    if (isUnlocked(achievementId)) {
        return false;
    }
    
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) {
        console.warn('🟠 Unknown achievement:', achievementId);
        return false;
    }
    
    // Débloquer
    unlockedAchievements.push({
        id: achievementId,
        unlockedAt: new Date().toISOString()
    });
    
    // Sauvegarder
    saveStorage(STORAGE_KEY, unlockedAchievements);
    setState('achievements', [...unlockedAchievements]);
    
    // Notification
    showAchievementNotification(achievement);
    
    // Mettre à jour l'UI
    renderAchievementsPanel();
    
    console.log('🟢 Achievement unlocked:', achievementId);
    return true;
}

/**
 * 🎉 Affiche la notification d'achievement
 * @param {Object} achievement 
 */
function showAchievementNotification(achievement) {
    // Toast spécial
    showToast(`🏆 Badge débloqué: ${achievement.icon} ${achievement.name}`, 'success');
    
    // Animation sur le panneau si visible
    const panel = document.getElementById('achievements-panel');
    if (panel) {
        panel.classList.add('celebrate');
        setTimeout(() => panel.classList.remove('celebrate'), 1000);
    }
}

/**
 * ✅ Vérifie si un achievement est débloqué
 * @param {string} achievementId 
 * @returns {boolean}
 */
export function isUnlocked(achievementId) {
    return unlockedAchievements.some(a => a.id === achievementId);
}

/**
 * 📊 Retourne la progression des achievements
 * @returns {Object}
 */
export function getAchievementsProgress() {
    const total = Object.keys(ACHIEVEMENTS).length;
    const unlocked = unlockedAchievements.length;
    
    return {
        total,
        unlocked,
        percentage: Math.round((unlocked / total) * 100),
        remaining: total - unlocked
    };
}

/**
 * 🎨 Rend le panneau d'achievements
 */
function renderAchievementsPanel() {
    const container = document.getElementById('achievements-list');
    if (!container) return;
    
    const progress = getAchievementsProgress();
    
    // Titre avec progression
    const title = container.previousElementSibling;
    if (title) {
        title.innerHTML = `🏆 Badges <span class="badge-count">${progress.unlocked}/${progress.total}</span>`;
    }
    
    // Achievements
    const html = Object.entries(ACHIEVEMENTS).map(([id, achievement]) => {
        const unlocked = isUnlocked(id);
        const unlockedData = unlockedAchievements.find(a => a.id === id);
        
        return `
            <div class="achievement ${unlocked ? 'unlocked' : 'locked'}" 
                 data-achievement="${id}"
                 title="${achievement.description}">
                <div class="achievement__icon">${unlocked ? achievement.icon : '🔒'}</div>
                <div class="achievement__info">
                    <div class="achievement__name">${unlocked ? achievement.name : '???'}</div>
                    ${unlocked ? `
                        <div class="achievement__date">
                            ${new Date(unlockedData.unlockedAt).toLocaleDateString('fr-FR')}
                        </div>
                    ` : `
                        <div class="achievement__hint">${achievement.hint || 'Continuez à explorer...'}</div>
                    `}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

/**
 * 📈 Enregistre une action pour tracking des achievements
 * @param {string} action - Type d'action
 * @param {any} data - Données associées
 */
export function trackAction(action, data = {}) {
    console.log('🟡 Tracking action:', action, data);
    
    switch (action) {
        case 'text_read':
            const textsRead = (getState('textsRead') || 0) + 1;
            setState('textsRead', textsRead);
            break;
            
        case 'language_explored':
            const languages = getState('languagesExplored') || [];
            if (!languages.includes(data.language)) {
                languages.push(data.language);
                setState('languagesExplored', languages);
            }
            break;
            
        case 'share':
            const shares = (getState('shareCount') || 0) + 1;
            setState('shareCount', shares);
            if (shares >= 1) checkAndUnlock('partageur');
            break;
            
        case 'comment':
            const comments = (getState('commentCount') || 0) + 1;
            setState('commentCount', comments);
            if (comments >= 1) checkAndUnlock('critique_litteraire');
            break;
            
        case 'follow':
            const follows = (getState('followCount') || 0) + 1;
            setState('followCount', follows);
            if (follows >= 5) checkAndUnlock('social');
            break;
    }
}

/**
 * 🔄 Reset les achievements (debug)
 */
export function resetAchievements() {
    unlockedAchievements = [];
    saveStorage(STORAGE_KEY, []);
    setState('achievements', []);
    renderAchievementsPanel();
    showToast('Achievements réinitialisés', 'info');
}

// 🌐 Exposer pour debug
window.resetAchievements = resetAchievements;
window.checkAndUnlock = checkAndUnlock;
