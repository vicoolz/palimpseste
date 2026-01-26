# 🏗️ Architecture Palimpseste v2.0

## Vue d'ensemble

```
web/js/
├── core/                    # 🧠 Noyau de l'application
│   ├── state.js            # Store centralisé (état global)
│   ├── api.js              # Couche d'abstraction Supabase
│   ├── events.js           # Event Bus (communication)
│   └── init.js             # Orchestration initialisation
│
├── features/               # 📦 Modules fonctionnels
│   ├── auth.js             # Authentification
│   ├── social.js           # Feed social
│   ├── messaging.js        # Messagerie privée
│   ├── comments.js         # Commentaires
│   ├── followers.js        # Système de follow
│   ├── gamification.js     # Badges & achievements
│   ├── exploration.js      # Filtres & découverte
│   ├── trending.js         # Tendances
│   └── search.js           # Recherche
│
├── config.js               # ⚙️ Configuration centralisée
├── utils.js                # 🔧 Fonctions utilitaires
├── mobile.js               # 📱 Spécificités mobile
├── sources.js              # 📚 Sources Wikisource
└── app.js                  # 🚀 Point d'entrée principal
```

## 🧠 Store (state.js)

### Utilisation

```javascript
// Récupérer l'état complet
const state = Store.getState();

// Récupérer une partie (dot notation)
const theme = Store.select('ui.theme');
const likes = Store.select('likes');

// Mettre à jour l'état
Store.setState({ readCount: 10 });

// Mettre à jour avec fonction (accès à l'état précédent)
Store.setState(prev => ({
    readCount: prev.readCount + 1
}));

// Dispatch une action prédéfinie
Store.dispatch('LIKE_ADD', { extraitId: '123' });
Store.dispatch('AUTH_LOGOUT');

// S'abonner aux changements
const unsubscribe = Store.subscribe((newState, prevState) => {
    console.log('État mis à jour !');
});

// S'abonner à une partie spécifique
Store.subscribe(
    (likes) => updateLikesUI(likes),
    state => state.likes  // Selector
);

// Se désabonner
unsubscribe();
```

### Actions disponibles

| Action | Payload | Description |
|--------|---------|-------------|
| `AUTH_LOGIN` | `user` | Connexion utilisateur |
| `AUTH_LOGOUT` | - | Déconnexion |
| `LIKE_ADD` | `{ extraitId }` | Ajouter un like |
| `LIKE_REMOVE` | `{ extraitId }` | Retirer un like |
| `LIKES_SET` | `[ids]` | Définir tous les likes |
| `READ_INCREMENT` | - | +1 texte lu |
| `ACHIEVEMENT_UNLOCK` | `{ id }` | Débloquer un badge |
| `UI_SET_LOADING` | `boolean` | Toggle loading |
| `UI_SET_THEME` | `'dark'|'light'` | Changer thème |
| `CACHE_SET` | `{ key, data }` | Mettre en cache |
| `CACHE_CLEAR` | - | Vider le cache |

## 🔌 API (api.js)

### Avantages
- ✅ Retry automatique (3 tentatives)
- ✅ Cache intelligent avec TTL
- ✅ Optimistic updates (likes)
- ✅ Rate limiting
- ✅ Gestion centralisée des erreurs

### Utilisation

```javascript
// Les extraits
const extraits = await API.getExtraits({ limit: 20, orderBy: 'created_at' });
const extrait = await API.getExtrait('uuid-123');
await API.createExtrait({ texte, source_title, ... });

// Les likes (avec optimistic update)
await API.likeExtrait(userId, extraitId);   // UI mise à jour immédiatement
await API.unlikeExtrait(userId, extraitId);
const userLikes = await API.getUserLikes(userId);

// Les follows
await API.follow(followerId, followingId);
await API.unfollow(followerId, followingId);
const isFollowing = await API.isFollowing(myId, userId);

// Recherche
const results = await API.searchExtraits('Baudelaire');
const users = await API.searchUsers('alice');

// Cache
API.clearCache(); // Vider le cache manuellement
```

## 📡 Events (events.js)

### Pourquoi un Event Bus ?
- Découplage des modules (pas de dépendances croisées)
- Ajout de fonctionnalités sans modifier l'existant
- Debug facile avec historique

### Utilisation

```javascript
// S'abonner à un événement
Events.on(EventTypes.EXTRAIT_LIKED, (payload) => {
    console.log('Extrait liké:', payload.extraitId);
});

// S'abonner une seule fois
Events.once(EventTypes.AUTH_LOGIN, (user) => {
    console.log('Première connexion !');
});

// Émettre un événement
Events.emit(EventTypes.TOAST_SHOW, '✅ Sauvegardé !');

// Se désabonner
const unsub = Events.on(EventTypes.FEED_REFRESHED, handler);
unsub(); // Plus tard...

// Debug
Events.debug(); // Affiche l'état du bus
Events.getHistory(); // Historique des événements
```

### Événements disponibles

```javascript
// Auth
EventTypes.AUTH_LOGIN
EventTypes.AUTH_LOGOUT

// Extraits
EventTypes.EXTRAIT_CREATED
EventTypes.EXTRAIT_LIKED
EventTypes.EXTRAIT_UNLIKED

// Social
EventTypes.USER_FOLLOWED
EventTypes.MESSAGE_RECEIVED

// Gamification
EventTypes.ACHIEVEMENT_UNLOCKED
EventTypes.TEXT_READ

// UI
EventTypes.TOAST_SHOW
EventTypes.THEME_CHANGED
EventTypes.LOADING_START / LOADING_END

// Navigation
EventTypes.VIEW_CHANGED
EventTypes.MODAL_OPENED / MODAL_CLOSED
```

## 🔄 Migration progressive

Le nouveau système est **100% rétrocompatible**. Les anciennes variables globales fonctionnent toujours :

```javascript
// Ancien code (fonctionne toujours)
currentUser
supabaseClient
state.likes

// Nouveau code (recommandé)
Store.select('user')
API.getExtraits()
Store.select('likes')
```

### Helpers de migration

```javascript
// Toast (nouveau)
showToast('Message');  // Utilise EventBus

// Action (nouveau)
dispatchAction('LIKE_ADD', { extraitId });

// Sélecteur (nouveau)
const theme = selectState('ui.theme');
```

## 📊 Debug

```javascript
// Activer le debug du Store
// Dans js/core/state.js, ligne ~280 : debug: true

// Activer le debug des Events
Events.enableDebug();

// Voir l'état actuel
console.log(Store.getState());

// Voir l'historique des actions
console.log(Store.getHistory());

// Voir l'état de l'EventBus
Events.debug();
```

## 🚀 Prochaines étapes

1. **Migrer auth.js** pour utiliser `API.login()` au lieu de `supabaseClient.auth.signInWithPassword()`
2. **Migrer social.js** pour utiliser `API.getExtraits()` au lieu d'appels directs
3. **Ajouter des tests** avec le nouveau système
4. **TypeScript** (optionnel) pour le typage fort
