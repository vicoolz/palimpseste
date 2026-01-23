# 📜 PALIMPSESTE
### *Le labyrinthe des textes oubliés*

> Une application de découverte d'auteurs mystiques via un graphe de connaissances et des énigmes littéraires.

---

## 🎯 Concept

**Palimpseste** est un jeu éducatif où vous naviguez dans un graphe de connaissances reliant des auteurs mystiques de toutes époques et traditions :

- 🏛️ **Moyen Âge occidental** : Maître Eckhart, Hildegarde de Bingen, Marguerite Porete...
- 🕌 **Soufisme persan** : Rûmî, Attar, Ibn Arabi...
- 🕉️ **Traditions indiennes** : Kabîr, Mirabai, Lalla Ded...
- ✡️ **Kabbale** : Isaac Louria, Moïse de León...
- 📚 **Contemporains** : Simone Weil, René Daumal...

**Résolvez des énigmes** pour débloquer de nouveaux auteurs et découvrir les connexions cachées entre les traditions.

---

## 🗂️ Structure du projet

```
Palimpseste/
├── src/
│   ├── models.py            # Modèles de données (Author, Enigma, Connection)
│   ├── wikidata_extractor.py # Extraction d'auteurs depuis Wikidata
│   ├── graph_builder.py      # Construction du graphe NetworkX
│   └── enigma_generator.py   # Génération d'énigmes via LLM
├── data/
│   ├── authors.json         # Base d'auteurs (généré)
│   ├── graph.json           # Graphe complet (généré)
│   ├── graph_d3.json        # Export pour visualisation D3.js
│   └── enigmas.json         # Énigmes (généré)
├── requirements.txt
├── .env.example
└── README.md
```

---

## 🚀 Installation

### 1. Cloner et créer l'environnement

```bash
cd Palimpseste
python -m venv venv
venv\Scripts\activate  # Windows
# ou: source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
```

### 2. Configuration (optionnel)

```bash
cp .env.example .env
# Éditer .env avec vos clés API si nécessaire
```

---

## 📊 Utilisation

### Étape 1 : Extraire les auteurs de Wikidata

```bash
python src/wikidata_extractor.py
```

Génère `data/authors.json` avec des centaines d'auteurs mystiques.

### Étape 2 : Construire le graphe

```bash
python src/graph_builder.py
```

- Génère les connexions automatiques (même tradition, même époque, thèmes communs)
- Calcule les scores d'obscurité (PageRank inversé)
- Exporte pour D3.js

### Étape 3 : Générer les énigmes

```bash
python src/enigma_generator.py
```

- Utilise des énigmes pré-générées (fallback)
- Peut générer via Ollama si installé

---

## 🧠 Algorithmes de graphe utilisés

| Algorithme | Usage |
|------------|-------|
| **PageRank** | Identifier les auteurs "centraux" vs obscurs |
| **Betweenness Centrality** | Trouver les "ponts" entre traditions |
| **Louvain Clustering** | Détecter les communautés (traditions, époques) |
| **Shortest Path** | "Quel chemin de Kabîr à Simone Weil ?" |

### Trouver les "pépites cachées"

```python
from graph_builder import KnowledgeGraph

kg = KnowledgeGraph()
kg.load_authors("data/authors.json")
kg.generate_automatic_connections()

# Auteurs obscurs mais très connectés
gems = kg.find_hidden_gems(10)
```

---

## 🎮 Gameplay prévu

```
┌─────────────────────────────────────────────────────────┐
│  NIVEAU 1 : Le Vestibule                               │
│  → Énigme basée sur Rûmî (connu)                       │
│  → Récompense : accès à 3 auteurs adjacents            │
│                                                         │
│  NIVEAU 5 : La Bibliothèque Brûlée                     │
│  → Reconstituer un fragment de Marguerite Porete       │
│  → Récompense : débloquer la branche "hérésies"        │
│                                                         │
│  NIVEAU ∞ : Tu deviens contributeur                    │
│  → Proposer des liens entre auteurs                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack technique

| Composant | Technologie | Coût |
|-----------|-------------|------|
| Données | Wikidata SPARQL | Gratuit |
| Graphe | NetworkX (Python) | Gratuit |
| LLM | Ollama (local) ou Groq | Gratuit |
| Visualisation | D3.js / Cytoscape.js | Gratuit |
| Hébergement | Vercel / GitHub Pages | Gratuit |

---

## 📚 Sources de données

- **Wikidata** : métadonnées structurées sur les auteurs
- **Project Gutenberg** : textes libres de droits
- **Wikisource** : transcriptions de manuscrits
- **GRETIL** : textes sanskrits
- **Perseus Digital Library** : classiques grecs/latins

---

## 🤝 Contribuer

1. Ajouter des auteurs dans `MANUAL_AUTHORS` (wikidata_extractor.py)
2. Créer des énigmes dans `FALLBACK_ENIGMAS` (enigma_generator.py)
3. Proposer des connexions entre auteurs

---

## 📜 Licence

MIT - Utilisez, modifiez, partagez librement.

---

## 🔮 Prochaines étapes

- [ ] Frontend web avec visualisation du graphe
- [ ] Système de progression utilisateur
- [ ] Intégration de textes complets (Gutenberg)
- [ ] Mode multijoueur (courses d'énigmes)
- [ ] Export PDF "Anthologie de mes découvertes"

---

*"L'Ami demanda à l'Aimé : 'Qu'est-ce que l'amour ?' L'Aimé répondit : 'L'amour est ce qui met les cœurs libres en servitude et libère ceux qui sont esclaves.'"*  
— Raymond Lulle, *Le Livre de l'Ami et de l'Aimé*
