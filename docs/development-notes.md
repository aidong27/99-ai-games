# Development Notes

## Runtime Shape

The public site remains framework-free static HTML, CSS, and ES modules. The
minimal Node package exists for Playwright verification, generators, and
validation; Entry and Legacy game runtimes do not use npm packages.

```bash
npm ci
npm run dev
```

The default preview is `http://127.0.0.1:4173/`. Avoid `file://`; module and
fetch behavior differs.

## Public Information Architecture

Protocol 99:

```text
index.html          Home and honest project status
challenge.html      Locked prompt and test contract
entries.html        001–099 Entry registry
entry.html?id=...   one Entry and its Runs/evidence
compare.html        same-version, same-hash Raw comparison
methodology.html    method and limitations
```

Legacy:

```text
library.html
observation.html?slug=...
play.html?slug=...
promo/<slug>/
games/<slug>/
press.html
log.html
```

Do not route Hall-based data back into the primary benchmark comparison.

## JavaScript Boundaries

```text
src/app/              constants and route helpers
src/data/             path, model-family, evidence, and view-model helpers
src/ui/               mechanical DOM/layout/meta/benchmark components
src/benchmark-data.js public benchmark loading
src/archive-data.js   Legacy compatibility entry
src/<page>.js         page orchestration and interaction
```

`src/ui/` must not absorb page-specific business rules. Page modules own
routing, filter state, loading/error/empty state decisions, and event wiring.
`archive-data.js` remains compatible with Legacy pages.

`src/data/model-families.js` is the single product-family registry. Keep exact
provenance labels while grouping related versions, such as GPT-5.5 and GPT-5.6
under ChatGPT/OpenAI.

## CSS Boundaries

All launcher pages load:

```text
styles/tokens.css
styles/base.css
styles/layout.css
styles/components.css
```

Protocol 99 pages then load `styles/benchmark.css`. Legacy pages load
`styles/archive-pages.css`. Generated Legacy promo pages explicitly load only
`styles/archive.css`, whose ordered imports provide all Legacy layers.

Theme variables belong in `tokens.css`. Do not append another root theme,
rename classes during cleanup, or make generated promo pages depend on a page
sheet. See [`css-selector-map.md`](css-selector-map.md).

## Generated Outputs

Do not hand-edit:

```text
entries/manifest.json
data/benchmark.json
benchmark-pages/
docs/generated-benchmark-index.md
promo/<slug>/
assets/social/entries/
assets/social/games/
docs/generated-index.md
sitemap.xml
404.html
```

Use `npm run generate`, then verify a second run creates no drift.

## PWA Retirement

The fixed-cache PWA was retired because stale service-worker modules could hide
launcher deployments. `src/pwa.js` unregisters old workers and clears
`99ag-shell-*` caches. `service-worker.js` is a one-time self-retiring
compatibility worker and must not regain a `fetch` handler.

## Game Boundaries

Protocol 99 participants work only inside their active Work Order. Launcher or
automation refactors must not edit benchmark game implementations or:

```text
games/<slug>/src/**
games/<slug>/styles/**
games/<slug>/index.html
games/<slug>/variants/**
games/<slug>/runs/**
```

Legacy metadata and Hall tools remain only for preserving the Pre-Benchmark Era.

## Verification

```bash
node scripts/check.mjs
npm run build:site
git diff --check HEAD
```

Browser acceptance covers Protocol and Legacy pages at 1440 x 900 and 390 x
700, both themes, query/hash routes, no overflow, no console errors, and one
generated promo. Stop the local server after testing.
