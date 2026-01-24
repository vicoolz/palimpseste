# 📜 PALIMPSESTE

> *Laissez-vous dériver dans la littérature mondiale*

Une application web de découverte littéraire aléatoire. Explorez des textes de Wikisource, PoetryDB et Project Gutenberg dans 12 langues.

🔗 **[Essayer l'app](https://labrunevictor-glitch.github.io/palimpseste/web/)**

---

## 🏗️ Architecture (v2 - Modulaire)

### Structure des fichiers

```
web/
├── index.html              # Point d'entrée (version legacy)
├── index-new.html          # Point d'entrée (version modulaire)
├── css/
│   ├── main.css            # Entry point CSS (imports)
│   ├── variables.css       # Variables CSS (couleurs, spacing, z-index)
│   ├── base.css            # Reset, typographie, utilities
│   ├── components/
│   │   ├── buttons.css     # Boutons (.btn, .btn--primary, etc.)
│   │   ├── forms.css       # Inputs, selects, textareas
│   │   ├── card.css        # Cartes de textes littéraires
│   │   ├── header.css      # Header fixe
│   │   ├── sidebar.css     # Sidebar desktop (stats, badges)
│   │   ├── drawer.css      # Drawer mobile (z-index: 250)
│   │   ├── modals.css      # Fenêtres modales
│   │   ├── exploration.css # Filtres ambiances/époques/courants
│   │   ├── social.css      # Feed social, posts, comments
│   │   ├── trending.css    # Panneau tendances
│   │   ├── mobile-nav.css  # Navigation mobile bottom
│   │   ├── toast.css       # Notifications toast
│   │   └── loader.css      # Spinners, skeletons
│   └── layout/
│       ├── desktop.css     # Layout desktop (≥900px)
│       └── mobile.css      # Layout mobile (<900px)
├── js/
│   ├── main.js             # Entry point JS (ES Module)
│   ├── config.js           # Configuration, constantes
│   ├── utils.js            # Fonctions utilitaires
│   ├── state.js            # Gestion d'état centralisée
│   ├── api.js              # Client Supabase, API calls
│   ├── components/
│   │   ├── toast.js        # Notifications
│   │   ├── drawer.js       # Drawer mobile avec swipe
│   │   ├── card.js         # Carte de texte
│   │   └── modal.js        # Modales génériques
│   └── features/
│       ├── auth.js         # Authentification
│       ├── feed.js         # Flux de textes
│       ├── social.js       # Interactions sociales
│       ├── exploration.js  # Filtres et navigation
│       ├── search.js       # Recherche
│       ├── achievements.js # Badges et succès
│       ├── wikisource.js   # API Wikisource
│       ├── poetrydb.js     # API PoetryDB
│       └── gutenberg.js    # API Gutenberg
└── app.js                  # Version legacy (monolithique)
```

### Design System

- **Theme**: Pixel art rétro avec ombres pixelisées
- **Couleurs**: Fond sombre (#0d0d0d), accents or (#f4d03f)
- **Breakpoint mobile**: 900px
- **Z-index layers**:
  - Drawer: 250
  - Mobile nav: 200
  - Overlay: 199
  - Header: 100
  - Modals: 1000

### Debug (préfixes emoji)
- 🟡 Démarrage d'opération
- 🟢 Succès
- 🔴 Erreur
- 🟠 Warning

---

## ✨ Fonctionnalités

### 📚 Sources multiples
- **Wikisource** (12 langues) : Français, Anglais, Allemand, Italien, Espagnol, Portugais, Russe, Latin, Chinois, Japonais, Arabe, Grec
- **PoetryDB** : Poésie anglaise classique (Shakespeare, Dickinson, Keats...)
- **Project Gutenberg** : 31 œuvres classiques (Austen, Dostoïevski, Hugo...)

### 🎲 Dérive littéraire
- Textes aléatoires pour découvrir des auteurs inconnus
- Navigation par genre (poésie, philosophie, roman, théâtre...)
- Exploration par branches thématiques (courants, époques, auteurs)

### 📊 Statistiques de lecture
- Temps de lecture et mots lus
- Streak de jours consécutifs
- Graphique hebdomadaire
- Badges et achievements

### 🐦 Fonctionnalités sociales
- Créer un compte et se connecter
- Partager des extraits avec la communauté
- Liker les extraits des autres
- Feed social (récents, populaires, mes extraits)

###  Favoris
- Sauvegarder ses textes préférés
- Galerie de favoris

---

##  Installation locale

### Prérequis
- Python 3.x (pour le serveur local)
- Un navigateur moderne

### Lancer l'app

```bash
cd web
python -m http.server 8080
```

Puis ouvrir http://127.0.0.1:8080

---

##  Configuration Supabase (fonctionnalités sociales)

Les fonctionnalités sociales nécessitent un backend Supabase (gratuit).

### 1. Créer un projet Supabase
- Aller sur [supabase.com](https://supabase.com)
- Créer un nouveau projet

### 2. Créer les tables
Exécuter le contenu de `supabase_setup.sql` dans l'éditeur SQL de Supabase.

### 3. Configurer l'app
Dans `web/index.html`, remplacer :
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

---

##  Structure

```
Palimpseste/
 web/
    index.html      # Application complète (HTML + CSS + JS)
 supabase_setup.sql  # Script SQL pour créer les tables
 README.md
```

---

##  Technologies

- **Frontend** : HTML, CSS, JavaScript vanilla
- **APIs** : Wikisource, PoetryDB, Project Gutenberg
- **Backend** : Supabase (PostgreSQL + Auth)
- **Hébergement** : GitHub Pages

---

##  License

MIT

---

##  Auteur

[@labrunevictor-glitch](https://github.com/labrunevictor-glitch)
