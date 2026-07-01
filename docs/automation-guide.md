# Automation Guide

The project intentionally avoids a heavy build system. Automation should stay plain Node.js where possible.

## Validation

```bash
node scripts/check.mjs
git diff --check HEAD
```

This repository intentionally has no `package.json`, npm install step, or framework build. Do not invent npm commands unless a future change adds them deliberately.

## Generate Markdown Index

```bash
node scripts/generate-index.mjs --write
```

## Generate Promo Pages

```bash
node scripts/generate-promo-pages.mjs
```

This updates generated per-game promo pages under `promo/<slug>/` and game social cards under `assets/social/games/`.

## Launcher Helper Boundaries

Use `src/ui/dom.js`, `badges.js`, `buttons.js`, `cards.js`, `layout.js`, and `meta.js` for repeated mechanical UI creation only. Page scripts should still own data loading, routing, selection state, and page-specific layout decisions.

Launcher CSS is split into shared static layers: `styles/tokens.css`, `styles/base.css`, `styles/layout.css`, and `styles/components.css`. Launcher pages should load them before `styles/archive.css`; page-specific CSS should load after `archive.css`.

The home launcher page uses `styles/pages/home.css` for page-specific layout and keeps `styles/main.css` as a compatibility token layer because `compare.html` still loads it. `scripts/validate-launcher.mjs` checks that these CSS files exist, launcher HTML keeps the shared CSS order, `index.html` loads `main.css` before `pages/home.css`, and `styles/archive.css` imports the shared layers for generated promo-page compatibility. Keep this validation lightweight and dependency-free.

Use `docs/css-selector-map.md` before moving more selectors out of `styles/archive.css`. Generated promo pages should continue to load only `styles/archive.css` unless the generator and generated output are updated together.

Do not update generated promo pages or social cards by hand. Update the generator or source metadata, then run the generator and validation.

## Scaffold A Planned Game

```bash
node scripts/new-game.mjs --number=2 --slug=my-game --title="My Game" --hall=puzzle-logic --slot-type=normal
```

After scaffolding, update:

- `games/manifest.json`
- `halls/halls.json`
- game brief

## Scaffold A Variant

```bash
node scripts/new-variant.mjs --game=signal-cartographer --variant-id=model-name-date --model="Model" --agent="Agent"
```

After scaffolding, update:

- game `variants` list
- manifest `variants` list
- run records after generation starts

## GitHub Workflow

The active workflows are:

- `.github/workflows/ci.yml`: runs `node scripts/check.mjs` and `git diff --check HEAD`.
- `.github/workflows/pages.yml`: deploys the static repository to GitHub Pages.

CI does not replace browser playtesting. Use a local static server for launcher and game smoke checks.

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```
