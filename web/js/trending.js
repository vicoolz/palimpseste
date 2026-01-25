// ═══════════════════════════════════════════════════════════
// 🔥 TENDANCES - Feed doom scrolling des textes populaires
// ═══════════════════════════════════════════════════════════

function openTrendingFeed() {
    document.getElementById('trendingOverlay').classList.add('open');
    loadTrendingFeed();
}

function closeTrendingFeed() {
    document.getElementById('trendingOverlay').classList.remove('open');
}

async function loadTrendingFeed() {
    const container = document.getElementById('trendingFeed');
    container.innerHTML = '<div class="trending-loading">🔥 Chargement des tendances...</div>';
    
    if (!supabaseClient) {
        container.innerHTML = '<div class="trending-empty"><div class="trending-empty-icon">🔌</div><p>Connexion requise pour voir les tendances</p></div>';
        return;
    }
    
    try {
        // Charger les extraits les plus likés et commentés récemment
        const { data: extraits, error } = await supabaseClient
            .from('extraits')
            .select(`
                *,
                profiles:user_id (username, avatar_url)
            `)
            .order('likes_count', { ascending: false })
            .order('comments_count', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(30);
        
        if (error) throw error;
        
        if (!extraits || extraits.length === 0) {
            container.innerHTML = `
                <div class="trending-empty">
                    <div class="trending-empty-icon">📭</div>
                    <p>Aucun texte populaire pour le moment</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem;">Soyez le premier à partager un extrait !</p>
                </div>
            `;
            return;
        }
        
        // Vérifier les likes de l'utilisateur actuel (utiliser le cache global)
        const userId = currentUser?.id;
        let userLikes = new Set();
        if (userId) {
            // Utiliser le cache global s'il est chargé
            if (typeof likesLoaded !== 'undefined' && likesLoaded && typeof userLikesCache !== 'undefined') {
                userLikes = userLikesCache;
            } else {
                // Sinon charger depuis la DB
                const { data: likes } = await supabaseClient
                    .from('likes')
                    .select('extrait_id')
                    .eq('user_id', userId);
                userLikes = new Set((likes || []).map(l => l.extrait_id));
            }
        }
        
        container.innerHTML = extraits.map((extrait, index) => {
            const username = extrait.profiles?.username || 'Anonyme';
            const avatar = extrait.profiles?.avatar_url || getAvatarSymbol(username);
            const isLiked = userLikes.has(extrait.id);
            const likesCount = extrait.likes_count || 0;
            const commentsCount = extrait.comments_count || 0;
            const isHot = likesCount >= 5 || commentsCount >= 3;
            const timeAgo = formatTimeAgo(new Date(extrait.created_at));
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
            
            return `
                <div class="trending-card" data-extrait-id="${extrait.id}">
                    <div class="trending-card-header">
                        <div class="trending-card-author" onclick="openUserProfile('${extrait.user_id}')">
                            <div class="trending-avatar">${avatar.startsWith('http') ? `<img src="${avatar}" style="width:100%;height:100%;border-radius:50%;">` : avatar}</div>
                            <div>
                                <div class="trending-username">${escapeHtml(username)}</div>
                                <div class="trending-time">${timeAgo}</div>
                            </div>
                        </div>
                        <div class="trending-rank">${rankEmoji}</div>
                    </div>
                    <div class="trending-card-body">
                        <div class="trending-text">${escapeHtml(extrait.texte)}</div>
                        ${extrait.source_author || extrait.source_title ? `
                            <div class="trending-source">
                                <strong>${escapeHtml(extrait.source_author || '')}</strong>
                                ${extrait.source_title ? ` — ${escapeHtml(extrait.source_title)}` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="trending-card-footer">
                        <div class="trending-stats">
                            <div class="trending-stat ${isHot ? 'hot' : ''}">
                                <span>${isHot ? '🔥' : '❤️'}</span>
                                <span>${likesCount}</span>
                            </div>
                            <div class="trending-stat">
                                <span>💬</span>
                                <span>${commentsCount}</span>
                            </div>
                        </div>
                        <div class="trending-actions">
                            <button class="trending-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikeTrending('${extrait.id}', this)">
                                ${isLiked ? '❤️' : '🤍'} Like
                            </button>
                            <button class="trending-action-btn" onclick="viewTrendingComments('${extrait.id}')">
                                💬 Commenter
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Erreur chargement tendances:', err);
        container.innerHTML = '<div class="trending-empty"><div class="trending-empty-icon">⚠️</div><p>Erreur de chargement</p></div>';
    }
}

async function toggleLikeTrending(extraitId, btn) {
    if (!currentUser) {
        toast('🔐 Connectez-vous pour liker');
        return;
    }
    
    // Utiliser le cache global si disponible
    const wasLiked = typeof isExtraitLiked === 'function' ? isExtraitLiked(extraitId) : btn.classList.contains('liked');
    
    // Mise à jour optimiste de l'UI
    const card = btn.closest('.trending-card');
    const statEl = card?.querySelector('.trending-stat');
    const countEl = statEl?.querySelector('span:last-child');
    const currentCount = parseInt(countEl?.textContent) || 0;
    
    // Mettre à jour l'UI immédiatement
    if (wasLiked) {
        btn.classList.remove('liked');
        btn.innerHTML = '🤍 Like';
        if (countEl) countEl.textContent = Math.max(0, currentCount - 1);
    } else {
        btn.classList.add('liked');
        btn.innerHTML = '❤️ Like';
        if (countEl) countEl.textContent = currentCount + 1;
    }
    
    // Animation
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = 'scale(1)', 150);
    
    // Mettre à jour le cache global
    if (typeof userLikesCache !== 'undefined') {
        if (wasLiked) {
            userLikesCache.delete(extraitId);
        } else {
            userLikesCache.add(extraitId);
        }
    }
    if (typeof likesCountCache !== 'undefined') {
        likesCountCache[extraitId] = wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
    }
    
    try {
        if (wasLiked) {
            await supabaseClient
                .from('likes')
                .delete()
                .eq('extrait_id', extraitId)
                .eq('user_id', currentUser.id);
            
            // Décrémenter le compteur likes_count
            await supabaseClient.rpc('decrement_likes', { extrait_id: extraitId });
        } else {
            await supabaseClient
                .from('likes')
                .insert({ extrait_id: extraitId, user_id: currentUser.id });
            
            // Incrémenter le compteur likes_count
            await supabaseClient.rpc('increment_likes', { extrait_id: extraitId });
        }
        
        // Mettre à jour les stats utilisateur
        if (typeof loadUserStats === 'function') loadUserStats();
        
    } catch (err) {
        console.error('Erreur like trending:', err);
        // Rollback en cas d'erreur
        if (wasLiked) {
            btn.classList.add('liked');
            btn.innerHTML = '❤️ Like';
            if (countEl) countEl.textContent = currentCount;
            if (typeof userLikesCache !== 'undefined') userLikesCache.add(extraitId);
        } else {
            btn.classList.remove('liked');
            btn.innerHTML = '🤍 Like';
            if (countEl) countEl.textContent = currentCount;
            if (typeof userLikesCache !== 'undefined') userLikesCache.delete(extraitId);
        }
        if (typeof likesCountCache !== 'undefined') likesCountCache[extraitId] = currentCount;
        toast('❌ Erreur');
    }
}

function viewTrendingComments(extraitId) {
    // Fermer le trending et ouvrir le social feed sur cet extrait
    closeTrendingFeed();
    if (typeof openSocialFeed === 'function') openSocialFeed();
    // Scroll to the extrait after a short delay
    setTimeout(() => {
        const card = document.querySelector(`[data-extrait-id="${extraitId}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof toggleComments === 'function') toggleComments(extraitId);
        }
    }, 500);
}

// Rendre les fonctions accessibles globalement
window.openTrendingFeed = openTrendingFeed;
window.closeTrendingFeed = closeTrendingFeed;
window.toggleLikeTrending = toggleLikeTrending;
window.viewTrendingComments = viewTrendingComments;
