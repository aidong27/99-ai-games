# CSS Selector Ownership Map

This map records the current launcher CSS owners after the visual-system consolidation. It is a guard against rebuilding the old pattern of appending a new design layer after every previous one.

## Loading Order

Launcher pages load:

```text
styles/tokens.css
styles/base.css
styles/layout.css
styles/components.css
styles/archive-pages.css
styles/pages/home.css    index.html only
```

Generated pages under `promo/<slug>/` still explicitly load only:

```text
styles/archive.css
```

`archive.css` imports tokens, base, layout, components, and archive-pages in that order. This keeps generated promo output compatible without hand-editing it while launcher HTML loads each maintained layer directly.

## Layer Ownership

### Tokens

`styles/tokens.css` is the only owner of:

- `:root`
- `html[data-theme="dark"]`
- `html[data-theme="light"]`
- colors, surfaces, borders, type families, spacing, radii, shadows, focus rings, and transition values

Do not redefine root theme values in page sheets.

### Base

`styles/base.css` owns:

- box sizing and document defaults
- body background texture
- link, image, button, and heading defaults
- focus-visible and selection treatment
- `.hidden`, `.visually-hidden`, and `.skip-link`
- global reduced-motion behavior

### Shared Layout

`styles/layout.css` owns:

- `.archive-page`, `.compare-page`, `.play-gate-page`
- `.archive-shell`, `.editorial-shell`, `.compare-stage`
- `.archive-topbar`, `.title-header`, `.title-footer`
- `.wordmark`, `.page-title`, `.archive-kicker`, `.topbar-status`
- `.archive-dock`
- `.theme-switcher`, `.theme-choice`, `.theme-glyph`

### Shared Components

`styles/components.css` owns:

- `.archive-button` and its tone/size modifiers
- `.archive-notice`
- `.archive-badge` and its tone modifiers
- `.compact-badges`

### Home Page

`styles/pages/home.css` owns:

- `.launcher-screen`, `.launcher-header`, `.launcher-main`, `.launcher-footer`
- `.launcher-mark*`, launcher navigation, hero copy, actions, and readout
- `.featured-observation`, `.featured-media`, `.featured-meta`, `.featured-links`
- `.launcher-stats`, `.launcher-systems`, `.launcher-library`
- `.game-grid`, `.game-card*`
- `.share-actions`, `.share-status`, `.share-fallback`
- home-only reveal and card-entry animations

### Archive Pages

`styles/archive-pages.css` owns the remaining page families.

Library:

- `.library-layout`, `.model-axis-panel`, `.model-axis*`, `.axis-*`
- `.library-stage`, `.library-readout`, `.readout-*`
- `.observation-track`, `.observation-card`, `.card-*`
- `.reserved-card`, `.observation-timeline`, `.timeline-node`

Observation record:

- `.record-root`, `.record`, `.record-hero`, `.record-cover`, `.record-copy`
- `.record-section`, `.record-list-grid`, `.media-grid`
- `.definition-grid`, `.definition-card`, `.list-block`
- `.run-list`, `.run-card`, `.run-alerts`
- `.core-facts`, `.device-support`, `.provenance-panel`

Play gate:

- `.play-gate-page`, `.play-gate`, `.play-gate-content`
- `.gate-description`, `.gate-philosophy`, `.gate-support`, `.gate-actions`

Compare:

- `.compare-intro`, `.compare-stats`, `.compare-section`, `.compare-note`
- `.matrix*`, `.model-grid`, `.model-card*`
- `.hall-coverage`, `.hall-row`, `.hall-*`

Press and log:

- `.editorial-layout`, `.editorial-hero`, `.editorial-lede`, `.editorial-list`
- `.press-observation-grid`, `.press-observation`, `.hall-grid`, `.hall-card`, `.link-grid`
- `.archive-timeline` and its descendants

Promo compatibility:

- `.promo-hero`, `.promo-copy`, `.promo-lede`, `.promo-actions`, `.promo-media`
- `.promo-grid`, `.promo-panel`, `.promo-facts`, `.promo-gallery`
- `.promo-links`, `.promo-link-card`, `.promo-evidence-note`

## Interaction Effects

CSS owns page fades, section reveals, and hover elevation. `src/archive-effects.js` only owns the subtle pointer tilt for library observation cards and respects reduced-motion and pointer capability checks.

The old signal-field canvas and precision backdrop are retired. Do not restore their HTML nodes or `createSignalField` initialization without a measured reason and an explicit performance review.

## Safe Change Order

1. Change tokens for archive-wide color or spacing decisions.
2. Change base/layout/components only for selectors shared by at least two page families.
3. Change `styles/pages/home.css` for home-only work.
4. Change one section of `styles/archive-pages.css` for a single page family.
5. Run `node scripts/check.mjs` and `git diff --check HEAD` after each group.
6. Smoke-test home, library, record, play, compare, press, log, and at least one generated promo page in both themes and mobile/desktop widths.

## Do Not

- Do not append a second `:root` theme system outside `styles/tokens.css`.
- Do not add broad end-of-file overrides that restyle unrelated page families.
- Do not rename classes during CSS cleanup.
- Do not make generated promo pages depend on page-only CSS.
- Do not hand-edit generated promo or social output.
- Do not mix launcher styling work with `games/<slug>/styles/**` changes.
