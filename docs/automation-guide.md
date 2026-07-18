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
Each manifest entry must also have a vertical promotional cover at `assets/posters/games/<slug>.jpg`; the launcher validator checks that one exists before a release can pass.

## Launcher Helper Boundaries

Use `src/ui/dom.js`, `badges.js`, `buttons.js`, `cards.js`, `layout.js`, and `meta.js` for repeated mechanical UI creation only. Page scripts should still own data loading, routing, selection state, and page-specific layout decisions.

Launcher CSS is split into shared static layers: `styles/tokens.css`, `styles/base.css`, `styles/layout.css`, and `styles/components.css`. Launcher pages load them before `styles/archive-pages.css`; page-specific CSS follows that page-family sheet.

The home launcher page uses `styles/pages/home.css` for page-specific layout. `scripts/validate-launcher.mjs` checks that CSS files exist, each launcher page loads a stylesheet only once, shared CSS stays in order, theme tokens remain centralized, CSS blocks are balanced, canonical and Open Graph URLs identify the correct launcher page, each launcher entry loads its matching page module, and literal DOM id hooks used by that module exist without duplicate ids. The small `styles/archive.css` compatibility entry imports all maintained layers for generated promo pages. Validation also protects against restoring the retired canvas signal-field path.

Use `docs/css-selector-map.md` before moving selectors out of `styles/archive-pages.css`. Generated promo pages should continue to load only `styles/archive.css` unless the generator and generated output are updated together.

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
