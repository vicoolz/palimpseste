#  PALIMPSESTE

> *Laissez-vous dériver dans la littérature mondiale*

Une application web de découverte littéraire aléatoire. Explorez des textes de Wikisource, PoetryDB et Project Gutenberg dans 12 langues.

 **[Essayer l'app](https://labrunevictor-glitch.github.io/palimpseste/web/)**

---

##  Fonctionnalités

###  Sources multiples
- **Wikisource** (12 langues) : Français, Anglais, Allemand, Italien, Espagnol, Portugais, Russe, Latin, Chinois, Japonais, Arabe, Grec
- **PoetryDB** : Poésie anglaise classique (Shakespeare, Dickinson, Keats...)
- **Project Gutenberg** : 31 œuvres classiques (Austen, Dostoïevski, Hugo...)

###  Dérive littéraire
- Textes aléatoires pour découvrir des auteurs inconnus
- Navigation par genre (poésie, philosophie, roman, théâtre...)
- Exploration par branches thématiques (courants, époques, auteurs)

###  Statistiques de lecture
- Temps de lecture et mots lus
- Streak de jours consécutifs
- Graphique hebdomadaire
- Badges et achievements

###  Fonctionnalités sociales
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
