# CSS Selector Ownership Map

## Loading Order

Protocol 99 launcher pages:

```text
styles/tokens.css
styles/base.css
styles/layout.css
styles/components.css
styles/benchmark.css
```

Legacy launcher pages:

```text
styles/tokens.css
styles/base.css
styles/layout.css
styles/components.css
styles/archive-pages.css
```

Generated `promo/<slug>/` pages load only `styles/archive.css`. That file imports
tokens, base, layout, components, and archive-pages in the same order.

## Shared Layers

`tokens.css` owns root light/dark colors, type, spacing, radii, shadows, focus,
and motion values.

`base.css` owns reset, document defaults, links, buttons, media, focus-visible,
skip links, hidden utilities, and global reduced-motion behavior.

`layout.css` owns common archive shell, topbar, dock, wordmark, and shared theme
controls.

`components.css` owns shared buttons, notices, badges, and compact metadata rows.

## Protocol 99 Layer

`benchmark.css` owns:

- `.benchmark-page`, `.benchmark-header`, `.benchmark-brand`, `.benchmark-nav`;
- `.benchmark-shell`, `.benchmark-hero`, `.benchmark-section`, `.page-intro`;
- protocol console, count/readout, slot grid, filters, Entry cards and states;
- compare selectors, frame controls, mobile tabs, Blind Compare;
- Entry Detail evidence, score, Run, metadata, and sandbox frame layouts;
- Challenge prompt and Methodology layouts;
- `.benchmark-footer`;
- benchmark-only reveal and interaction animation.

Do not move these selectors into Legacy sheets. Keep motion under
`prefers-reduced-motion: no-preference`.

## Legacy Layer

`archive-pages.css` retains cross-page Legacy cascade:

Library:

- `.library-*`, `.model-axis*`, `.axis-*`;
- `.observation-*`, `.card-*`, `.readout-*`;
- `.timeline-*`, filters, grid/list states.

Observation and records:

- `.record-*`, `.definition-*`, `.run-*`;
- `.core-facts`, `.device-support`, `.provenance-panel`;
- media/evidence blocks.

Play:

- `.play-gate*`, `.gate-*`.

Legacy compare remnants:

- `.matrix*`, `.model-card*`, `.hall-*`.

Editorial:

- `.editorial-*`, `.press-*`, `.link-grid`;
- `.archive-timeline`.

Generated promo:

- `.promo-*`.

## Why Legacy Remains Consolidated

Generated promo compatibility, Library/Observation/Play/Press/Log selector
sharing, old media-query cascade, theme overrides, and cross-page `.card-*`,
`.record-*`, `.hall-*`, and `.link-grid` rules make a blind split risky. Do not
delete an uncertain selector merely because one HTML file does not contain it;
JavaScript and generated pages may create it.

## Safe Change Order

1. Change tokens only for global theme decisions.
2. Change base/layout/components only for truly shared behavior.
3. Change `benchmark.css` for Protocol pages.
4. Move one proven single-page Legacy selector group at a time.
5. Regenerate promos if their generator or compatibility sheet changes.
6. Run the quality gate.
7. Smoke-test all launcher pages plus one promo at desktop/mobile in both themes.

## Do Not

- Do not rename classes as part of CSS cleanup.
- Do not move theme overrides without screenshot comparison.
- Do not make promo pages depend on undeployed page-only CSS.
- Do not restore a service-worker cache for CSS.
- Do not touch `games/<slug>/styles/**` during launcher work.
- Do not delete uncertain Legacy selectors.
