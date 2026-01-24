// ═══════════════════════════════════════════════════════════
// 📤 PARTAGE D'EXTRAITS
// ═══════════════════════════════════════════════════════════

var pendingShare = null;
var shareTooltip = null;

function openShareModal(text, author, title, sourceUrl) {
    if (!currentUser) {
        if (typeof openAuthModal === 'function') openAuthModal('login');
        toast('📝 Connectez-vous pour partager');
        return;
    }
    
    pendingShare = { text, author, title, sourceUrl };
    
    document.getElementById('sharePreviewText').textContent = text.length > 300 
        ? text.substring(0, 300) + '...' 
        : text;
    document.getElementById('sharePreviewSource').textContent = `— ${author}, ${title}`;
    document.getElementById('shareCommentary').value = '';
    document.getElementById('shareModal').classList.add('open');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('open');
    pendingShare = null;
}

async function publishExtrait() {
    if (!supabaseClient || !currentUser || !pendingShare) {
        toast('⚠️ Impossible de publier');
        return;
    }
    
    document.getElementById('publishBtn').disabled = true;
    
    const commentary = document.getElementById('shareCommentary').value.trim();
    
    const { data, error } = await supabaseClient.from('extraits').insert({
        user_id: currentUser.id,
        texte: pendingShare.text.substring(0, 1000), // Limite 1000 chars
        source_title: pendingShare.title,
        source_author: pendingShare.author,
        source_url: pendingShare.sourceUrl || '',
        commentary: commentary || null,
        likes_count: 0,
        created_at: new Date().toISOString()
    });
    
    document.getElementById('publishBtn').disabled = false;
    
    if (error) {
        toast('❌ Erreur: ' + error.message);
    } else {
        closeShareModal();
        toast('🐦 Extrait publié !');
        if (typeof loadUserStats === 'function') loadUserStats();
    }
}

// Fonction pour ajouter un bouton de partage sur la sélection
function setupTextSelection(cardElement, author, title, sourceUrl) {
    const textElement = cardElement.querySelector('.card-body');
    if (!textElement) return;
    
    textElement.classList.add('text-selectable');
    
    textElement.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length >= 20 && selectedText.length <= 1000) {
            // Montrer un tooltip ou bouton flottant
            showShareTooltip(selectedText, author, title, sourceUrl);
        }
    });
}

function showShareTooltip(text, author, title, sourceUrl) {
    hideShareTooltip();
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    shareTooltip = document.createElement('div');
    shareTooltip.className = 'share-tooltip';
    shareTooltip.innerHTML = `<button onclick="openShareModal('${text.replace(/'/g, "\\'")}', '${author}', '${title}', '${sourceUrl}')">🐦 Partager</button>`;
    shareTooltip.style.cssText = `
        position: fixed;
        top: ${rect.top - 40}px;
        left: ${rect.left + rect.width/2 - 50}px;
        background: var(--accent-tertiary);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        z-index: 1000;
        cursor: pointer;
        font-size: 0.85rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(shareTooltip);
    
    // Auto-hide après 5s
    setTimeout(hideShareTooltip, 5000);
}

function hideShareTooltip() {
    if (shareTooltip) {
        shareTooltip.remove();
        shareTooltip = null;
    }
}

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.share-tooltip')) {
        hideShareTooltip();
    }
});

// Rendre les fonctions accessibles globalement
window.openShareModal = openShareModal;
window.closeShareModal = closeShareModal;
window.publishExtrait = publishExtrait;
window.setupTextSelection = setupTextSelection;
window.showShareTooltip = showShareTooltip;
window.hideShareTooltip = hideShareTooltip;
