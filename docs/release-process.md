# Release Process

## Before Commit

Run:

```bash
node --check src/main.js
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/generate-index.mjs --check
git diff --check
```

For changed games, also run:

```bash
node --check games/<slug>/src/main.js
```

## Browser Check

Start:

```bash
python3 -m http.server 4173
```

Check:

- root launcher loads
- game opens from launcher
- primary game surface is visible
- controls work
- console is clean
- desktop layout has no horizontal overflow
- 390px mobile layout has no horizontal overflow

## Release Notes

Release notes should say what actually changed. Do not claim public users, popularity, screenshots, hosting, or verification that does not exist.
