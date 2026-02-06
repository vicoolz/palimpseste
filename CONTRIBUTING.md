# Contributing to Palimpseste

Thank you for your interest in contributing to Palimpseste! This project aims to make world literature accessible through an engaging infinite scroll experience.

## Ways to Contribute

### For Everyone

- **Report bugs** — Found something broken? Open an issue with steps to reproduce.
- **Suggest features** — Have an idea? We'd love to hear it.
- **Spread the word** — Share the project with literature lovers.
- **Translate** — Help make Palimpseste accessible in more languages.

### For Developers

- **Fix bugs** — Check open issues labeled `bug`.
- **Add features** — Look for issues labeled `enhancement` or `help wanted`.
- **Improve documentation** — Clearer docs help everyone.
- **Add literary sources** — Know a public domain library we could integrate?

### Good First Issues

New to the project? Look for issues labeled `good first issue`. These are simpler tasks ideal for getting familiar with the codebase.

---

## Getting Started

### Prerequisites

- Git
- A modern web browser
- Python 3 or Node.js (for local server)
- (Optional) Supabase account for social features

### Local Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/palimpseste.git
cd palimpseste/web

# Start local server
python -m http.server 8080
# or
npx serve

# Open http://localhost:8080
```

### Project Structure

```
palimpseste/
├── web/
│   ├── index.html       # Main HTML
│   ├── css/             # Styles (variables, base, styles, mobile)
│   └── js/
│       ├── app.js       # Core application logic
│       ├── sources.js   # Literary source integrations
│       ├── exploration.js # Filter system
│       ├── social.js    # Social features
│       ├── i18n.js      # Internationalization
│       └── ...
├── api/                 # Serverless CORS proxies
└── supabase_setup.sql   # Database schema
```

---

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Code Style

- **No framework** — This project uses vanilla JS intentionally.
- **Keep it simple** — Readable code over clever code.
- **Comment when needed** — Especially for non-obvious logic.
- **Test your changes** — Check both desktop and mobile views.

### 3. Commit Messages

Use clear, descriptive commit messages:

```
feat: add German language support
fix: correct scroll position on mobile
docs: update installation instructions
refactor: simplify filter logic
```

### 4. Submit a Pull Request

1. Push your branch to your fork
2. Open a PR against `main`
3. Describe what you changed and why
4. Link any related issues

---

## Adding a New Literary Source

Want to integrate a new public domain library? Here's how:

1. Create a new function in `web/js/sources.js`
2. Follow the existing patterns (see `fetchWikisource`, `fetchGutenberg`)
3. Ensure the source returns texts in the expected format
4. Add the source to the exploration options in `exploration.js`
5. Update the README with the new source

---

## Adding Translations

The app supports multiple interface languages via `web/js/i18n.js`.

To add a new language:
1. Add a new language object following the existing structure
2. Translate all keys
3. Add the language option in the settings UI

---

## Questions?

- Open an issue for project-related questions
- Check existing issues — your question might already be answered

---

## Code of Conduct

Be respectful and constructive. This is a passion project built around literature and learning. Let's keep the community welcoming for everyone.

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
