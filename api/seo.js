/**
 * Vercel Serverless Function — SEO Pre-rendering
 * 
 * Sert du HTML statique aux bots (Googlebot, Twitter, Facebook, etc.)
 * et redirige les humains vers la SPA.
 * 
 * Routes gérées :
 *   /author/:name  → page auteur
 *   /explore/:theme → page thème/forme
 *   /trending       → page trending
 */

const BOT_UA = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|applebot|pinterestbot|redditbot|embedly|quora|outbrain|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|ia_archiver|archive\.org_bot/i;

// Auteurs avec descriptions SEO (longue traîne)
const AUTHORS = {
    'baudelaire': { name: 'Charles Baudelaire', period: '1821–1867', desc: 'Poète français, auteur des Fleurs du mal. Précurseur du symbolisme, il explore la beauté dans le spleen et l\'idéal.', lang: 'fr' },
    'victor-hugo': { name: 'Victor Hugo', period: '1802–1885', desc: 'Figure majeure du romantisme français. Poète, dramaturge et romancier (Les Misérables, Notre-Dame de Paris).', lang: 'fr' },
    'rimbaud': { name: 'Arthur Rimbaud', period: '1854–1891', desc: 'Poète prodige, révolutionnaire de la poésie française. Auteur d\'Une Saison en enfer et des Illuminations.', lang: 'fr' },
    'verlaine': { name: 'Paul Verlaine', period: '1844–1896', desc: 'Poète symboliste français, maître de la musicalité du vers. Auteur des Romances sans paroles et Sagesse.', lang: 'fr' },
    'shakespeare': { name: 'William Shakespeare', period: '1564–1616', desc: 'Dramaturge et poète anglais. Auteur d\'Hamlet, Romeo et Juliette, Le Songe d\'une nuit d\'été.', lang: 'en' },
    'platon': { name: 'Platon', period: '428–348 av. J.-C.', desc: 'Philosophe grec, fondateur de l\'Académie. Auteur de La République, du Banquet et du Phèdre.', lang: 'el' },
    'goethe': { name: 'Johann Wolfgang von Goethe', period: '1749–1832', desc: 'Écrivain et penseur allemand. Auteur de Faust, Les Souffrances du jeune Werther.', lang: 'de' },
    'dante': { name: 'Dante Alighieri', period: '1265–1321', desc: 'Poète italien, père de la langue italienne littéraire. Auteur de la Divine Comédie.', lang: 'it' },
    'moliere': { name: 'Molière', period: '1622–1673', desc: 'Dramaturge et comédien français. Auteur du Misanthrope, Tartuffe, Le Malade imaginaire.', lang: 'fr' },
    'voltaire': { name: 'Voltaire', period: '1694–1778', desc: 'Philosophe des Lumières, écrivain prolifique. Auteur de Candide et du Dictionnaire philosophique.', lang: 'fr' },
    'lamartine': { name: 'Alphonse de Lamartine', period: '1790–1869', desc: 'Poète romantique français. Auteur des Méditations poétiques, premier grand recueil romantique français.', lang: 'fr' },
    'musset': { name: 'Alfred de Musset', period: '1810–1857', desc: 'Poète et dramaturge romantique. Auteur de Les Nuits, Lorenzaccio, On ne badine pas avec l\'amour.', lang: 'fr' },
    'nerval': { name: 'Gérard de Nerval', period: '1808–1855', desc: 'Poète et écrivain romantique français. Auteur des Chimères et d\'Aurélia.', lang: 'fr' },
    'mallarme': { name: 'Stéphane Mallarmé', period: '1842–1898', desc: 'Poète symboliste français, maître de l\'hermétisme poétique. Auteur de L\'Après-midi d\'un faune.', lang: 'fr' },
    'la-fontaine': { name: 'Jean de La Fontaine', period: '1621–1695', desc: 'Fabuliste français, auteur des Fables. Le Corbeau et le Renard, La Cigale et la Fourmi.', lang: 'fr' },
    'racine': { name: 'Jean Racine', period: '1639–1699', desc: 'Dramaturge classique français, maître de la tragédie. Auteur de Phèdre, Andromaque, Britannicus.', lang: 'fr' },
    'corneille': { name: 'Pierre Corneille', period: '1606–1684', desc: 'Dramaturge classique français. Auteur du Cid, Horace, Cinna. Figure majeure du théâtre du XVIIe siècle.', lang: 'fr' },
    'montaigne': { name: 'Michel de Montaigne', period: '1533–1592', desc: 'Philosophe et moraliste français, inventeur de l\'essai. Auteur des Essais.', lang: 'fr' },
    'rousseau': { name: 'Jean-Jacques Rousseau', period: '1712–1778', desc: 'Philosophe des Lumières. Auteur du Contrat social, des Confessions et d\'Émile.', lang: 'fr' },
    'chateaubriand': { name: 'François-René de Chateaubriand', period: '1768–1848', desc: 'Écrivain romantique français. Auteur de René, Atala et des Mémoires d\'outre-tombe.', lang: 'fr' },
    'balzac': { name: 'Honoré de Balzac', period: '1799–1850', desc: 'Romancier français, auteur de La Comédie humaine. Le Père Goriot, Eugénie Grandet, Illusions perdues.', lang: 'fr' },
    'flaubert': { name: 'Gustave Flaubert', period: '1821–1880', desc: 'Romancier français, maître du réalisme. Auteur de Madame Bovary et L\'Éducation sentimentale.', lang: 'fr' },
    'zola': { name: 'Émile Zola', period: '1840–1902', desc: 'Écrivain naturaliste français. Auteur de Germinal, L\'Assommoir et de la série des Rougon-Macquart.', lang: 'fr' },
    'proust': { name: 'Marcel Proust', period: '1871–1922', desc: 'Romancier français, auteur d\'À la recherche du temps perdu. Chef-d\'œuvre de la littérature du XXe siècle.', lang: 'fr' },
    'homere': { name: 'Homère', period: 'VIIIe siècle av. J.-C.', desc: 'Poète grec légendaire, auteur de l\'Iliade et de l\'Odyssée, fondements de la littérature occidentale.', lang: 'el' },
    'virgile': { name: 'Virgile', period: '70–19 av. J.-C.', desc: 'Poète latin, auteur de l\'Énéide, des Bucoliques et des Géorgiques.', lang: 'la' },
    'ovide': { name: 'Ovide', period: '43 av. J.-C. – 17', desc: 'Poète latin, auteur des Métamorphoses et de L\'Art d\'aimer.', lang: 'la' },
    'ronsard': { name: 'Pierre de Ronsard', period: '1524–1585', desc: 'Poète de la Pléiade, prince des poètes. Auteur des Odes, des Amours et des Sonnets pour Hélène.', lang: 'fr' },
    'villon': { name: 'François Villon', period: '1431–1463?', desc: 'Poète médiéval français, auteur de la Ballade des pendus et du Testament.', lang: 'fr' },
    'rabelais': { name: 'François Rabelais', period: '1494–1553', desc: 'Écrivain humaniste français. Auteur de Gargantua et Pantagruel, satire joyeuse de la société.', lang: 'fr' },
    'stendhal': { name: 'Stendhal', period: '1783–1842', desc: 'Romancier français. Auteur du Rouge et le Noir et de La Chartreuse de Parme.', lang: 'fr' },
    'maupassant': { name: 'Guy de Maupassant', period: '1850–1893', desc: 'Écrivain naturaliste français, maître de la nouvelle. Auteur de Bel-Ami et de 300 nouvelles.', lang: 'fr' },
    'dumas': { name: 'Alexandre Dumas', period: '1802–1870', desc: 'Romancier français. Auteur des Trois Mousquetaires, du Comte de Monte-Cristo.', lang: 'fr' },
    'sand': { name: 'George Sand', period: '1804–1876', desc: 'Romancière française, pionnière du féminisme littéraire. Auteur d\'Indiana, La Mare au diable.', lang: 'fr' },
    'apollinaire': { name: 'Guillaume Apollinaire', period: '1880–1918', desc: 'Poète français, précurseur du surréalisme. Auteur d\'Alcools et Calligrammes.', lang: 'fr' },
    'valery': { name: 'Paul Valéry', period: '1871–1945', desc: 'Poète et penseur français. Auteur du Cimetière marin et des Cahiers.', lang: 'fr' },
    'poe': { name: 'Edgar Allan Poe', period: '1809–1849', desc: 'Écrivain américain, maître du récit fantastique et du policier. Le Corbeau, Les Histoires extraordinaires.', lang: 'en' },
    'dostoievski': { name: 'Fiodor Dostoïevski', period: '1821–1881', desc: 'Romancier russe. Auteur de Crime et châtiment, Les Frères Karamazov, L\'Idiot.', lang: 'ru' },
    'tolstoi': { name: 'Léon Tolstoï', period: '1828–1910', desc: 'Romancier russe. Auteur de Guerre et Paix, Anna Karénine.', lang: 'ru' },
    'kafka': { name: 'Franz Kafka', period: '1883–1924', desc: 'Écrivain pragois de langue allemande. Auteur de La Métamorphose, Le Procès, Le Château.', lang: 'de' },
    'borges': { name: 'Jorge Luis Borges', period: '1899–1986', desc: 'Écrivain argentin, maître de la nouvelle fantastique. Auteur de Fictions et L\'Aleph.', lang: 'es' },
    'cervantes': { name: 'Miguel de Cervantes', period: '1547–1616', desc: 'Écrivain espagnol, auteur de Don Quichotte de la Manche, premier roman moderne.', lang: 'es' },
    'neruda': { name: 'Pablo Neruda', period: '1904–1973', desc: 'Poète chilien, prix Nobel de littérature. Auteur de Vingt poèmes d\'amour et Chant général.', lang: 'es' },
    'pessoa': { name: 'Fernando Pessoa', period: '1888–1935', desc: 'Poète portugais aux multiples hétéronymes. Auteur du Livre de l\'intranquillité.', lang: 'pt' },
    'tagore': { name: 'Rabindranath Tagore', period: '1861–1941', desc: 'Poète indien, prix Nobel de littérature. Auteur de Gitanjali (L\'Offrande lyrique).', lang: 'en' },
    'rumi': { name: 'Djalâl ad-Dîn Rûmî', period: '1207–1273', desc: 'Poète mystique persan, figure majeure du soufisme. Auteur du Mathnawî.', lang: 'fa' },
    'omar-khayyam': { name: 'Omar Khayyam', period: '1048–1131', desc: 'Poète et mathématicien persan. Auteur des Rubáiyát, célèbres quatrains.', lang: 'fa' }
};

// Thèmes d'exploration avec descriptions SEO
const THEMES = {
    'poesie': { title: 'Poésie', desc: 'Explorez des siècles de poésie mondiale : sonnets, odes, élégies, ballades, hymnes. De l\'Antiquité au XXe siècle.' },
    'philosophie': { title: 'Philosophie', desc: 'Plongez dans la pensée philosophique : essais, maximes, aphorismes. De Platon à Nietzsche.' },
    'theatre': { title: 'Théâtre', desc: 'Découvrez le théâtre classique et moderne : tragédies, comédies, drames. De Sophocle à Tchekhov.' },
    'roman': { title: 'Roman', desc: 'Parcourez les grands romans de la littérature universelle : réalisme, romantisme, naturalisme.' },
    'nouvelle': { title: 'Nouvelle', desc: 'L\'art du récit court : nouvelles et courts récits des plus grands auteurs.' },
    'conte': { title: 'Conte', desc: 'Contes et récits merveilleux du monde entier : fées, enchantements, légendes.' },
    'fable': { title: 'Fable', desc: 'Fables et moralités : de La Fontaine à Ésope, la sagesse à travers les animaux.' },
    'essai': { title: 'Essai', desc: 'Essais et prose d\'idées : réflexions, méditations, pensées des grands esprits.' },
    'antiquite': { title: 'Antiquité', desc: 'Littérature de l\'Antiquité grecque et romaine : épopées, tragédies, philosophie.' },
    'moyen-age': { title: 'Moyen Âge', desc: 'Littérature médiévale : romans de chevalerie, poésie courtoise, chansons de geste.' },
    'renaissance': { title: 'Renaissance', desc: 'Littérature de la Renaissance : humanisme, Pléiade, redécouverte de l\'Antiquité.' },
    'classicisme': { title: 'Classicisme', desc: 'Le Grand Siècle français : Molière, Racine, La Fontaine, Corneille.' },
    'lumieres': { title: 'Lumières', desc: 'Philosophie des Lumières : Voltaire, Rousseau, Diderot, Montesquieu.' },
    'romantisme': { title: 'Romantisme', desc: 'Le mouvement romantique : Hugo, Lamartine, Musset, Byron. Passion et mélancolie.' },
    'symbolisme': { title: 'Symbolisme', desc: 'Poésie symboliste : Baudelaire, Mallarmé, Verlaine, Rimbaud. La musique avant toute chose.' },
    'realisme': { title: 'Réalisme & Naturalisme', desc: 'Le roman réaliste et naturaliste : Balzac, Flaubert, Zola, Maupassant.' }
};

// Pages de landing par mot-clé (FR)
const LANDING_FR = {
    'lire-wikisource': {
        title: 'Lire Wikisource autrement — Palimpseste',
        h1: 'Wikisource en mode flux',
        desc: 'Palimpseste agrège Wikisource, Gutenberg et 4 autres sources en un flux infini de littérature. Découvrez la poésie, le théâtre et les romans du domaine public dans une expérience de lecture immersive.',
        keywords: 'wikisource, lire wikisource, wikisource français, textes libres, domaine public'
    },
    'alternative-gutenberg': {
        title: 'Alternative à Project Gutenberg — Palimpseste',
        h1: 'Project Gutenberg, Wikisource et plus encore',
        desc: 'Palimpseste combine Project Gutenberg, Wikisource, PoetryDB, Internet Archive et d\'autres sources en un flux littéraire infini. Lisez 6 sources en 12 langues.',
        keywords: 'project gutenberg, gutenberg alternative, ebook gratuit, livre domaine public'
    },
    'poesie-classique-en-ligne': {
        title: 'Poésie classique en ligne — Lire gratuitement',
        h1: 'Poésie classique en ligne',
        desc: 'Lisez de la poésie classique gratuitement : Baudelaire, Rimbaud, Hugo, Verlaine, Shakespeare, Goethe. Des milliers de poèmes du domaine public en flux infini.',
        keywords: 'poésie classique, lire poésie en ligne, poèmes gratuits, poésie française'
    },
    'litterature-gratuite': {
        title: 'Littérature gratuite en ligne — Palimpseste',
        h1: 'Littérature gratuite et libre',
        desc: 'Accédez gratuitement à des milliers d\'œuvres littéraires du domaine public. Romans, poésie, théâtre, philosophie. De l\'Antiquité au XXe siècle, 12 langues.',
        keywords: 'littérature gratuite, livre gratuit en ligne, ebook gratuit, lire gratuitement'
    },
    'textes-domaine-public': {
        title: 'Textes du domaine public — Lire en ligne',
        h1: 'Le domaine public littéraire',
        desc: 'Explorez le patrimoine littéraire mondial en domaine public. 7 bibliothèques numériques, 12 langues, de Homère à Kafka. Flux de lecture infini, gratuit et open source.',
        keywords: 'domaine public, texte libre de droit, œuvre domaine public, littérature libre'
    }
};

// Multilingual landing pages
const LANDING_EN = {
    'read-classic-literature-online': {
        title: 'Read Classic Literature Online Free — Palimpseste',
        h1: 'Read Classic Literature Online',
        desc: 'Palimpseste is a free, infinite scroll of classic literature from 6 digital libraries including Wikisource, Project Gutenberg, and more. Poetry, novels, philosophy in 12 languages.',
        keywords: 'read classic literature online, free classic books, public domain literature, wikisource reader'
    },
    'wikisource-reader': {
        title: 'Wikisource Reader — Infinite Literary Feed',
        h1: 'A Better Way to Read Wikisource',
        desc: 'Palimpseste combines Wikisource, Project Gutenberg, PoetryDB, Internet Archive and more into one infinite literary feed. Discover poetry, theatre, novels from antiquity to the 20th century.',
        keywords: 'wikisource reader, wikisource app, read wikisource, public domain reader'
    },
    'free-poetry-online': {
        title: 'Free Poetry Online — Classic Poems to Read',
        h1: 'Free Poetry Online',
        desc: 'Read classic poetry for free: Shakespeare, Baudelaire, Rimbaud, Goethe, Dante, Poe, Neruda, Tagore. Thousands of public domain poems in an infinite scroll.',
        keywords: 'free poetry online, classic poems, read poetry, public domain poetry'
    }
};

const LANDING_ES = {
    'leer-literatura-clasica-gratis': {
        title: 'Leer literatura clásica gratis — Palimpseste',
        h1: 'Literatura clásica gratis',
        desc: 'Palimpseste es un flujo infinito de literatura clásica de 6 bibliotecas digitales: Wikisource, Gutenberg y más. Poesía, novela, filosofía en 12 idiomas. Gratuito y de código abierto.',
        keywords: 'literatura clásica gratis, leer libros gratis, dominio público, wikisource español'
    },
    'poesia-clasica-online': {
        title: 'Poesía clásica online — Leer gratis',
        h1: 'Poesía clásica online',
        desc: 'Lea poesía clásica gratuitamente: Neruda, Borges, Cervantes, García Lorca, Baudelaire, Shakespeare. Miles de poemas de dominio público en un flujo infinito.',
        keywords: 'poesía clásica, leer poesía gratis, poemas clásicos, poesía en español'
    }
};

const LANDING_DE = {
    'klassische-literatur-online-lesen': {
        title: 'Klassische Literatur online lesen — Palimpseste',
        h1: 'Klassische Literatur online',
        desc: 'Palimpseste ist ein endloser Strom klassischer Literatur aus 6 digitalen Bibliotheken: Wikisource, Gutenberg und mehr. Poesie, Romane, Philosophie in 12 Sprachen. Kostenlos und Open Source.',
        keywords: 'klassische Literatur online, kostenlose Bücher, Gutenberg lesen, Wikisource deutsch'
    }
};

const LANDING_IT = {
    'letteratura-classica-online': {
        title: 'Letteratura classica online gratis — Palimpseste',
        h1: 'Letteratura classica online',
        desc: 'Palimpseste è un flusso infinito di letteratura classica da 6 biblioteche digitali: Wikisource, Gutenberg e altro. Poesia, romanzi, filosofia in 12 lingue. Gratuito e open source.',
        keywords: 'letteratura classica online, leggere libri gratis, dominio pubblico, wikisource italiano'
    }
};

const LANDING_PT = {
    'literatura-classica-online': {
        title: 'Literatura clássica online grátis — Palimpseste',
        h1: 'Literatura clássica online',
        desc: 'Palimpseste é um fluxo infinito de literatura clássica de 6 bibliotecas digitais: Wikisource, Gutenberg e mais. Poesia, romances, filosofia em 12 idiomas. Gratuito e open source.',
        keywords: 'literatura clássica online, ler livros grátis, domínio público, wikisource português'
    }
};

const LANDING_LANGS = {
    fr: { pages: LANDING_FR, lang: 'fr', cta: 'Commencer à lire →', home: 'Accueil' },
    en: { pages: LANDING_EN, lang: 'en', cta: 'Start reading →', home: 'Home' },
    es: { pages: LANDING_ES, lang: 'es', cta: 'Empezar a leer →', home: 'Inicio' },
    de: { pages: LANDING_DE, lang: 'de', cta: 'Jetzt lesen →', home: 'Startseite' },
    it: { pages: LANDING_IT, lang: 'it', cta: 'Inizia a leggere →', home: 'Home' },
    pt: { pages: LANDING_PT, lang: 'pt', cta: 'Começar a ler →', home: 'Início' }
};

const BASE_URL = 'https://palimpseste.vercel.app';

function isBot(userAgent) {
    return BOT_UA.test(userAgent || '');
}

function buildHTML({ title, description, url, lang = 'fr', type = 'website', extraHead = '', bodyContent = '' }) {
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="Palimpseste">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${BASE_URL}/icons/icon-512.svg">
    <meta property="og:locale" content="fr_FR">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${BASE_URL}/icons/icon-512.svg">
    
    <link rel="canonical" href="${url}">
    ${extraHead}
    
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "${title}",
        "description": "${description}",
        "url": "${url}",
        "isPartOf": {
            "@type": "WebSite",
            "name": "Palimpseste",
            "url": "${BASE_URL}"
        }
    }
    </script>
    
    <style>
        body { font-family: Georgia, 'Times New Roman', serif; max-width: 700px; margin: 2rem auto; padding: 0 1.5rem; color: #d4c5a9; background: #1a1a2e; line-height: 1.7; }
        h1 { color: #e8dcc8; font-size: 1.8rem; margin-bottom: 0.25rem; }
        .subtitle { color: #8a7a6a; font-size: 1rem; margin-bottom: 1.5rem; }
        p { font-size: 1.05rem; }
        a { color: #5a7a8a; }
        .cta { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #5a7a8a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 1rem; }
        .cta:hover { background: #6a8a9a; }
        nav { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #333; font-size: 0.9rem; }
        nav a { margin-right: 1rem; }
    </style>
</head>
<body>
    ${bodyContent}
    <nav>
        <a href="${BASE_URL}">Accueil</a>
        <a href="${BASE_URL}/explore/poesie">Poésie</a>
        <a href="${BASE_URL}/explore/philosophie">Philosophie</a>
        <a href="${BASE_URL}/explore/theatre">Théâtre</a>
        <a href="${BASE_URL}/explore/roman">Roman</a>
        <a href="${BASE_URL}/trending">Tendances</a>
    </nav>
</body>
</html>`;
}

module.exports = async (req, res) => {
    const ua = req.headers['user-agent'] || '';
    const path = req.url.split('?')[0].replace(/\/$/, '');

    // Le CDN doit cacher séparément bots et humains
    res.setHeader('Vary', 'User-Agent');

    // Déterminer le type de page
    let match;

    // /author/:slug
    if ((match = path.match(/^\/author\/(.+)$/i))) {
        const slug = decodeURIComponent(match[1]).toLowerCase().replace(/\s+/g, '-');
        const author = AUTHORS[slug];

        if (!author) {
            // Auteur inconnu — redirige vers la SPA qui cherchera
            const displayName = decodeURIComponent(match[1]).replace(/-/g, ' ');
            if (!isBot(ua)) {
                res.writeHead(302, { Location: `${BASE_URL}/#/author/${encodeURIComponent(displayName)}` });
                return res.end();
            }
            // Bot : page générique
            const title = `${displayName} — Lire sur Palimpseste`;
            const description = `Découvrez les textes de ${displayName} dans le flux littéraire infini de Palimpseste.`;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end(buildHTML({
                title, description,
                url: `${BASE_URL}/author/${encodeURIComponent(slug)}`,
                bodyContent: `
                    <h1>${displayName}</h1>
                    <p>${description}</p>
                    <a class="cta" href="${BASE_URL}/#/author/${encodeURIComponent(displayName)}">Lire les textes de ${displayName} →</a>
                `
            }));
        }

        // Auteur connu
        if (!isBot(ua)) {
            res.writeHead(302, { Location: `${BASE_URL}/#/author/${encodeURIComponent(author.name)}` });
            return res.end();
        }

        const title = `${author.name} (${author.period}) — Lire sur Palimpseste`;
        const description = `${author.desc} Lisez des extraits de ${author.name} sur Palimpseste, le flux infini de littérature mondiale.`;
        const extraHead = `
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "${author.name}",
                "description": "${author.desc}"
            }
            </script>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
        return res.end(buildHTML({
            title, description,
            url: `${BASE_URL}/author/${slug}`,
            extraHead,
            bodyContent: `
                <h1>${author.name}</h1>
                <p class="subtitle">${author.period}</p>
                <p>${author.desc}</p>
                <p>Lisez des extraits de ${author.name} dans le flux littéraire infini de Palimpseste — 7 sources, 12 langues, domaine public.</p>
                <a class="cta" href="${BASE_URL}/#/author/${encodeURIComponent(author.name)}">Lire ${author.name} →</a>
            `
        }));
    }

    // /explore/:theme
    if ((match = path.match(/^\/explore\/(.+)$/i))) {
        const slug = decodeURIComponent(match[1]).toLowerCase().replace(/\s+/g, '-');
        const theme = THEMES[slug];

        if (!isBot(ua)) {
            const hashPath = theme ? slug : decodeURIComponent(match[1]);
            res.writeHead(302, { Location: `${BASE_URL}/#/explore/${hashPath}` });
            return res.end();
        }

        const title = theme
            ? `${theme.title} — Explorer sur Palimpseste`
            : `${decodeURIComponent(match[1])} — Explorer sur Palimpseste`;
        const description = theme
            ? `${theme.desc} Explorez sur Palimpseste, le flux infini de littérature mondiale.`
            : `Explorez ${decodeURIComponent(match[1])} dans le flux littéraire de Palimpseste.`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
        return res.end(buildHTML({
            title, description,
            url: `${BASE_URL}/explore/${slug}`,
            bodyContent: `
                <h1>${theme ? theme.title : decodeURIComponent(match[1])}</h1>
                <p>${theme ? theme.desc : `Explorez ce thème dans le flux littéraire de Palimpseste.`}</p>
                <a class="cta" href="${BASE_URL}/#/explore/${slug}">Explorer →</a>
            `
        }));
    }

    // /trending
    if (path === '/trending') {
        if (!isBot(ua)) {
            res.writeHead(302, { Location: `${BASE_URL}/#/trending` });
            return res.end();
        }

        const title = 'Tendances — Palimpseste';
        const description = 'Découvrez les extraits littéraires les plus partagés et aimés du moment sur Palimpseste.';

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200');
        return res.end(buildHTML({
            title, description,
            url: `${BASE_URL}/trending`,
            bodyContent: `
                <h1>Tendances</h1>
                <p>${description}</p>
                <a class="cta" href="${BASE_URL}/#/trending">Voir les tendances →</a>
            `
        }));
    }

    // /lire/:slug (FR keyword landing)
    if ((match = path.match(/^\/lire\/(.+)$/i))) {
        const slug = decodeURIComponent(match[1]).toLowerCase();
        const page = LANDING_FR[slug];
        if (page) {
            if (!isBot(ua)) {
                res.writeHead(302, { Location: BASE_URL });
                return res.end();
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
            return res.end(buildHTML({
                title: page.title, description: page.desc,
                url: `${BASE_URL}/lire/${slug}`,
                extraHead: `<meta name="keywords" content="${page.keywords}">`,
                bodyContent: `
                    <h1>${page.h1}</h1>
                    <p>${page.desc}</p>
                    <p><strong>Sources :</strong> Wikisource, Project Gutenberg, PoetryDB, Internet Archive, Perseus, Sacred Texts.</p>
                    <a class="cta" href="${BASE_URL}">Commencer à lire →</a>
                `
            }));
        }
    }

    // /read/:slug (EN), /leer/:slug (ES), /lesen/:slug (DE), /leggere/:slug (IT), /ler/:slug (PT)
    const langRoutes = [
        { prefix: '/read/', langKey: 'en' },
        { prefix: '/leer/', langKey: 'es' },
        { prefix: '/lesen/', langKey: 'de' },
        { prefix: '/leggere/', langKey: 'it' },
        { prefix: '/ler/', langKey: 'pt' }
    ];
    for (const route of langRoutes) {
        if (path.toLowerCase().startsWith(route.prefix)) {
            const slug = path.slice(route.prefix.length).toLowerCase();
            const langConf = LANDING_LANGS[route.langKey];
            const page = langConf?.pages[slug];
            if (page) {
                if (!isBot(ua)) {
                    res.writeHead(302, { Location: BASE_URL });
                    return res.end();
                }
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
                return res.end(buildHTML({
                    title: page.title, description: page.desc,
                    url: `${BASE_URL}${route.prefix}${slug}`,
                    lang: langConf.lang,
                    extraHead: `<meta name="keywords" content="${page.keywords}">`,
                    bodyContent: `
                        <h1>${page.h1}</h1>
                        <p>${page.desc}</p>
                        <p><strong>Sources:</strong> Wikisource, Project Gutenberg, PoetryDB, Internet Archive, Perseus, Sacred Texts.</p>
                        <a class="cta" href="${BASE_URL}">${langConf.cta}</a>
                    `
                }));
            }
        }
    }

    // Fallback — redirige vers l'accueil
    res.writeHead(302, { Location: BASE_URL });
    res.end();
};
