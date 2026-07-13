# Development Notes

## Local Preview

Use a static server from the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173
```

Avoid relying on `file://` for testing because module loading, fetch calls, and canvas checks can behave differently.

## Metadata Checks

Run the full quality gate before and after structural changes:

```bash
node scripts/check.mjs
git diff --check HEAD
```

Regenerate the markdown index after manifest changes:

```bash
node scripts/generate-index.mjs --write
```

Regenerate promo pages and per-game promo cards after manifest or game metadata changes:

```bash
node scripts/generate-promo-pages.mjs
```

Use `--check` in CI or review mode.

## Launcher Shared Layer

The launcher is still plain static HTML, CSS, and JavaScript. Shared code is split conservatively:

```text
src/app/   constants and route helpers
src/data/  path helpers, view models, and device-support policy
src/ui/    DOM, badge, action, definition-card, layout-state, and document-title helpers
```

`src/archive-data.js` remains the compatibility entry point for existing pages. Prefer adding small helpers under `src/ui/` or `src/data/` before duplicating DOM creation or path logic in a page script.

`src/data/model-families.js` is the single registry for product-family and provider grouping. Keep exact metadata labels unchanged for provenance, then add or adjust a family rule when a newly observed model belongs beside an existing product line. `src/data/view-models.js` owns family aggregation and deduplicates games that appear under multiple exact models in the same family.

Page scripts should remain the place for page orchestration:

- load the data required by the page
- decide empty, loading, error, and selected states
- assemble page-specific sections
- wire page-specific keyboard, hash, and click behavior

Shared UI helpers should stay mechanical and class-preserving. Do not hide business rules or routing behavior inside `src/ui/`.

`src/press.js` renders press cards with DOM helpers instead of large HTML strings. Keep that pattern for future launcher pages unless a literal static string is simpler and safer.

## Launcher CSS Layers

Launcher CSS is split without changing class names:

```text
styles/tokens.css      shared CSS variables and design tokens
styles/base.css        reset, document defaults, focus, hidden, skip links
styles/layout.css      archive shell, topbar, wordmark, dock, theme switcher
styles/components.css  archive buttons, notices, badges, compact badge rows
styles/archive-pages.css  library, record, play, compare, editorial, log, promo rules
styles/archive.css     generated-promo compatibility imports only
styles/pages/home.css  launcher home page hero, featured card, stats, grid, footer
```

Launcher HTML loads `tokens.css`, `base.css`, `layout.css`, `components.css`, then `archive-pages.css`. Only the home page adds `styles/pages/home.css`.

`archive.css` is a small compatibility entry that imports the same five layers because generated promo pages currently load only that file. Do not remove or reorder those imports unless the promo generator and generated pages are updated together.

Theme tokens have one owner: `styles/tokens.css`. `archive-pages.css` is organized once by page family rather than by historical visual pass. Do not restore old styling by appending broad override blocks; change the owning layer and smoke-test every launcher page plus one generated promo page.

The canvas signal-field pipeline was removed because the active CSS hid it while page scripts still initialized it. `src/archive-effects.js` now owns only the small, reduced-motion-aware pointer response used by library cards.

Current launcher presentation contracts:

- Home owns the featured verified-screenshot stage and the complete current observation shelf.
- Library owns the selected-game preview, model filter, responsive observation grid, and compact timeline; initial hash selection must not scroll the page away from its readout.
- Observation records show verified media at its full aspect ratio rather than cropping evidence for decoration.
- Play Gate may reuse a verified screenshot as launch context, but must retain an explicit missing-media state and the device-support warning.
- Inner archive pages use the shared bottom dock; theme controls move above it on narrow screens.

Use [`css-selector-map.md`](css-selector-map.md) as the selector ownership map before moving more rules out of `archive-pages.css`.

## Generated Surfaces

These files are generated from manifest and game metadata:

```text
promo/<slug>/index.html
assets/social/games/<slug>.svg
assets/social/games/<slug>.png
docs/generated-index.md
```

Do not hand-edit generated files without updating the generator and running the relevant `--check`.

Vertical cover artwork lives under `assets/posters/games/<slug>.jpg`. The promo generator uses it in the hero and keeps real repository screenshots in the Evidence section. Posters are presentation assets and must never be labeled as screenshots or gameplay evidence.

`src/i18n.js` owns the English/Chinese interface layer and `src/pwa.js` owns progressive installation. English metadata remains canonical. `service-worker.js` precaches the launcher shell and game metadata, then runtime-caches same-origin assets as they are visited.

Library filter state uses query parameters (`model`, `hall`, `q`, `sort`, `view`) while the selected observation remains in the hash. Family values use the namespaced `family:<id>` form; exact model names remain valid for backward-compatible deep links. Preserve both pieces when changing selection behavior.

## Folder Standard

Each official game slot should live in:

```text
games/<slug>/
```

Minimum structure:

```text
index.html
game.json
brief.md
README.md
src/
styles/
assets/images/
assets/audio/
variants/
runs/
```

Launcher refactors should not include game implementation edits. Keep these out of launcher-only PRs unless the task explicitly targets a game:

```text
games/<slug>/src/**
games/<slug>/styles/**
games/<slug>/index.html
games/<slug>/variants/**
games/<slug>/runs/**
```

## Variant Standard

Model variants live under:

```text
games/<slug>/variants/<variant-id>/
```

Variants do not consume new game numbers. They must record model, agent, date, status, and `humanCodeEdits`.

## Run Standard

Run records live under:

```text
games/<slug>/runs/<run-id>.json
```

A run can describe generation, revision, validation, comparison, benchmark, or release work.

## Verification Checklist

- Launcher loads `games/manifest.json`.
- Launcher card opens the game.
- Game canvas or primary play surface renders nonblank.
- Keyboard controls work when documented.
- Pointer or touch controls work when documented.
- Browser console has no errors.
- Desktop layout has no horizontal overflow.
- 390px mobile layout has no horizontal overflow.
- Metadata matches the real game and source state.
- Hall assignment and run records validate.
