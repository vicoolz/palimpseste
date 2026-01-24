/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚙️ CONFIG - Palimpseste
 * Configuration globale de l'application
 * ═══════════════════════════════════════════════════════════════════════════
 */

// 🔧 Configuration Supabase
export const SUPABASE_CONFIG = {
    url: 'https://cqoepdrqifilqxnvflyy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2VwZHJxaWZpbHF4bnZmbHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3ODI4MzksImV4cCI6MjA2MjM1ODgzOX0.gZBKv9VZMaXmWeKYAMp0BnP1pwsHAyWz7yP-VJGru0U'
};

// 📚 Configuration des APIs littéraires
export const API_CONFIG = {
    wikisource: {
        baseUrl: 'https://{lang}.wikisource.org/w/api.php',
        defaultParams: {
            format: 'json',
            origin: '*'
        }
    },
    poetrydb: {
        baseUrl: 'https://poetrydb.org'
    },
    gutenberg: {
        baseUrl: 'https://gutendex.com'
    }
};

// 🌍 Langues disponibles pour Wikisource
export const LANGUAGES = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'la', name: 'Latina', flag: '🏛️' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' }
];

// 📖 Genres littéraires
export const GENRES = {
    poesie: { name: 'Poésie', icon: '📜', color: '#bf5af2' },
    fable: { name: 'Fable', icon: '🦊', color: '#30d158' },
    conte: { name: 'Conte', icon: '🏰', color: '#ff9f0a' },
    nouvelle: { name: 'Nouvelle', icon: '📕', color: '#ff453a' },
    theatre: { name: 'Théâtre', icon: '🎭', color: '#64d2ff' },
    texte: { name: 'Texte', icon: '📄', color: '#6e6e73' },
    mystique: { name: 'Mystique', icon: '✨', color: '#ffd60a' },
    philosophie: { name: 'Philosophie', icon: '🤔', color: '#ac8e68' },
    roman: { name: 'Roman', icon: '📚', color: '#ff6482' }
};

// 🎭 Ambiances / Dérives
export const AMBIANCES = [
    { id: 'toutes', name: 'Toutes', icon: '🌍', description: 'Tous les textes sans filtre' },
    { id: 'melancolie', name: 'Mélancolie', icon: '🌧️', description: 'Tristesse douce et contemplative' },
    { id: 'amour', name: 'Amour', icon: '💘', description: 'Passion et sentiments amoureux' },
    { id: 'nature', name: 'Nature', icon: '🌿', description: 'Paysages et éléments naturels' },
    { id: 'mort', name: 'Mort', icon: '💀', description: 'Finitude et au-delà' },
    { id: 'voyage', name: 'Voyage', icon: '🚢', description: 'Exploration et découverte' },
    { id: 'nuit', name: 'Nuit', icon: '🌙', description: 'Ombres et mystères nocturnes' },
    { id: 'revolte', name: 'Révolte', icon: '⚔️', description: 'Contestation et résistance' },
    { id: 'enfance', name: 'Enfance', icon: '🧸', description: 'Souvenirs et innocence' },
    { id: 'solitude', name: 'Solitude', icon: '🏚️', description: 'Isolement et introspection' },
    { id: 'reve', name: 'Rêve', icon: '💭', description: 'Onirisme et imaginaire' },
    { id: 'spiritualite', name: 'Spiritualité', icon: '🕯️', description: 'Quête intérieure et foi' }
];

// 📅 Époques littéraires
export const EPOQUES = [
    { id: 'toutes', name: 'Toutes', icon: '📚', color: '#e63946', start: null, end: null },
    { id: 'medieval', name: 'Médiéval', icon: '⚔️', color: '#8b4513', start: 500, end: 1500 },
    { id: 'renaissance', name: 'Renaissance', icon: '🎨', color: '#daa520', start: 1450, end: 1600 },
    { id: 'classique', name: 'Classique', icon: '🏛️', color: '#4169e1', start: 1600, end: 1715 },
    { id: 'lumieres', name: 'Lumières', icon: '💡', color: '#ffd700', start: 1715, end: 1789 },
    { id: 'romantisme', name: 'Romantisme', icon: '🌹', color: '#9b5de5', start: 1789, end: 1850 },
    { id: 'realisme', name: 'Réalisme', icon: '🔬', color: '#6c757d', start: 1850, end: 1890 },
    { id: 'moderne', name: 'Moderne', icon: '🎭', color: '#e63946', start: 1890, end: 1950 },
    { id: 'contemporain', name: 'Contemporain', icon: '🌐', color: '#00d4ff', start: 1950, end: 2024 }
];

// 📖 Courants littéraires
export const COURANTS = [
    { id: 'tous', name: 'Tous', icon: '📚' },
    { id: 'symbolisme', name: 'Symbolisme', icon: '🦋' },
    { id: 'surrealisme', name: 'Surréalisme', icon: '👁️' },
    { id: 'naturalisme', name: 'Naturalisme', icon: '🌾' },
    { id: 'parnasse', name: 'Parnasse', icon: '💎' },
    { id: 'existentialisme', name: 'Existentialisme', icon: '🤔' },
    { id: 'absurde', name: 'Absurde', icon: '🎪' },
    { id: 'baroque', name: 'Baroque', icon: '🎭' },
    { id: 'preciosite', name: 'Préciosité', icon: '💐' },
    { id: 'pleiade', name: 'Pléiade', icon: '⭐' }
];

// 🏆 Achievements / Badges
export const ACHIEVEMENTS = [
    { id: 'first_like', name: 'Premier coup de cœur', icon: '💖', description: 'Liker votre premier texte', condition: { likes: 1 } },
    { id: 'bibliophile', name: 'Bibliophile', icon: '📚', description: 'Liker 10 textes', condition: { likes: 10 } },
    { id: 'lecteur_vorace', name: 'Lecteur vorace', icon: '🔥', description: 'Liker 50 textes', condition: { likes: 50 } },
    { id: 'explorateur', name: 'Explorateur', icon: '🗺️', description: 'Découvrir 5 langues différentes', condition: { languages: 5 } },
    { id: 'polyglotte', name: 'Polyglotte', icon: '🌍', description: 'Découvrir 10 langues différentes', condition: { languages: 10 } },
    { id: 'social_butterfly', name: 'Social butterfly', icon: '🦋', description: 'Suivre 10 utilisateurs', condition: { following: 10 } },
    { id: 'influenceur', name: 'Influenceur', icon: '⭐', description: 'Avoir 10 followers', condition: { followers: 10 } },
    { id: 'commentateur', name: 'Commentateur', icon: '💬', description: 'Écrire 10 commentaires', condition: { comments: 10 } },
    { id: 'night_owl', name: 'Night owl', icon: '🦉', description: 'Lire après minuit', condition: { special: 'night_reading' } },
    { id: 'early_bird', name: 'Early bird', icon: '🐦', description: 'Lire avant 6h', condition: { special: 'early_reading' } }
];

// 🔧 Paramètres par défaut
export const DEFAULT_SETTINGS = {
    language: 'fr',
    poolSize: 5,
    textMaxLength: 2000,
    teaserLength: 500,
    chunkSize: 800,
    autoRefreshInterval: 30000, // 30 secondes
    notificationCheckInterval: 60000 // 1 minute
};

// 📱 Breakpoints (sync avec CSS)
export const BREAKPOINTS = {
    sm: 480,
    md: 768,
    lg: 900,
    xl: 1200
};

// 🎨 Emojis pour les avatars
export const AVATAR_EMOJIS = [
    '📚', '📖', '✍️', '🖋️', '📜', '🎭', '🦋', '🌹', 
    '🌙', '⭐', '🔮', '🎨', '🎵', '🦉', '🐦', '🌿'
];
