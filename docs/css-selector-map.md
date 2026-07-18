# CSS Selector Usage Map

This map is a pre-split reference for future CSS work. It documents where selectors are currently used so `styles/archive.css` can be reduced later without breaking launcher pages or generated promo pages.

## Current Loading Order

Launcher HTML pages load CSS in this order:

```text
styles/tokens.css
styles/base.css
styles/layout.css
styles/components.css
styles/archive.css
styles/main.css          index.html and compare.html only
styles/pages/home.css    index.html only
```

Generated promo pages under `promo/<slug>/` still explicitly load only:

```text
styles/archive.css
```

`archive.css` imports `tokens.css`, `base.css`, `layout.css`, and `components.css` at the top so generated promo pages receive the shared launcher layers without requiring generated HTML churn.

## Why Archive CSS Still Remains

`styles/archive.css` is still the compatibility layer for archive pages and generated promo pages. It should not be aggressively split yet because:

- generated promo pages depend on `archive.css` as their only explicit stylesheet
- library, observation, play, compare, press, and log selectors still cross-reference shared card, record, action, and media classes
- older cascade patches and theme overrides are order-sensitive
- selectors such as `.card-*`, `.record-*`, `.hall-*`, `.link-grid`, `.definition-*`, and `.archive-button` are shared by multiple pages
- theme overrides target broad groups across launcher and promo surfaces

## Selector Groups

These groups list representative selectors, not every selector in the file.

### Common Archive Page Structure

- `.archive-page`
- `.archive-shell`
- `.archive-topbar`
- `.archive-mark`
- `.archive-nav a`
- `.archive-bottom-dock`
- `.archive-dock`
- `.page-title h1`
- `.topbar-status`
- `.wordmark span`
- `.title-header`
- `.title-footer`

### Library Related

- `.library-layout`
- `.model-axis-panel`
- `.model-axis`
- `.model-axis-item`
- `.axis-heading`
- `.axis-icon`
- `.axis-copy`
- `.axis-agent`
- `.axis-count`
- `.library-stage`
- `.library-readout`
- `.readout-grid`
- `.readout-actions`
- `.observation-track`
- `.observation-card`
- `.card-image`
- `.card-meta`
- `.card-facts`
- `.reserved-card`
- `.observation-timeline`
- `.timeline-node`
- `.reserved-slot`

### Observation And Record Related

- `.record-root`
- `.record`
- `.record-hero`
- `.record-cover`
- `.record-copy`
- `.record-description`
- `.record-device-note`
- `.record-section`
- `.record-list-grid`
- `.media-grid`
- `.definition-grid`
- `.definition-card`
- `.list-block`
- `.run-list`
- `.run-card`
- `.run-alerts`
- `.badge-row`
- `.core-facts`
- `.device-support`
- `.provenance-panel`

### Play Related

- `.play-gate-page`
- `.play-gate`
- `.play-gate-content`
- `.gate-description`
- `.gate-philosophy`
- `.gate-support`
- `.gate-actions`
- `.gate-device-note`

### Compare Related

- `.compare-page`
- `.compare-stage`
- `.compare-intro`
- `.compare-lede`
- `.compare-stats`
- `.compare-section`
- `.compare-section-title`
- `.compare-note`
- `.matrix-scroll`
- `.matrix`
- `.matrix-corner`
- `.matrix-rowhead`
- `.matrix-agent`
- `.matrix-cell`
- `.matrix-chip`
- `.model-card`
- `.model-card-name`
- `.model-card-meta`
- `.model-card-games`
- `.model-card-hall`
- `.hall-coverage`
- `.hall-row`
- `.hall-dot`
- `.hall-name`
- `.hall-games`
- `.hall-open-label`
- `.hall-cell`
- `.model-node`

### Press Related

- `.editorial-shell`
- `.editorial-layout`
- `.editorial-hero`
- `.editorial-lede`
- `.editorial-list`
- `.press-observation-grid`
- `.press-observation`
- `.hall-grid`
- `.hall-card`
- `.link-grid`
- `.record-section.wide-section`

### Log Related

- `.log-page`
- `.log-layout`
- `.log-signal`
- `.archive-timeline`
- `.archive-timeline li`
- `.archive-timeline time`
- `.archive-timeline h2`
- `.archive-timeline p`
- `.status-note`

### Promo Related

- `.promo-page .archive-shell`
- `.promo-hero`
- `.promo-copy h1`
- `.promo-lede`
- `.promo-actions`
- `.promo-links`
- `.promo-media`
- `.promo-media img`
- `.promo-visual-placeholder`
- `.promo-grid`
- `.promo-panel`
- `.promo-facts`
- `.promo-gallery`
- `.promo-evidence-note`
- `.promo-link-card`

### Theme Override

- `:root`
- `html[data-theme="dark"]`
- `html[data-theme="light"]`
- `html[data-theme] body`
- `html[data-theme] .archive-page`
- `html[data-theme] .compare-page`
- `html[data-theme] .play-gate-page`
- `html[data-theme] .title-header`
- `html[data-theme] .archive-topbar`
- `html[data-theme] .editorial-header`
- `html[data-theme] .archive-dock`
- `html[data-theme] .archive-bottom-dock`
- `html[data-theme] .theme-switcher`
- `html[data-theme] .promo-hero`
- `html[data-theme] .promo-panel`
- `html[data-theme] .promo-media`
- `html[data-theme] .promo-link-card`
- `.theme-switcher`
- `.theme-choice`
- `.theme-choice.active`
- `.theme-glyph`

### Legacy Or Uncertain

- broad restyle groups combining `.library-layout`, `.record-section`, `.compare-section`, `.editorial-hero`, `.play-gate-content`, `.link-grid a`, `.press-observation`, `.hall-card`, `.promo-*`
- historical responsive overrides under repeated `@media (max-width: 900px)`, `@media (max-width: 820px)`, `@media (max-width: 720px)`, and `@media (max-width: 520px)`
- duplicated-looking theme patches that apply to both dark/light token eras
- shared image surface selectors such as `.card-image`, `.record-cover`, `.media-grid figure`, and `.promo-media`
- shared action selectors such as `.archive-button`, `.record-actions .archive-button`, `.readout-actions .archive-button`, and `.gate-actions .archive-button`

Treat this group as protected until an actual page-by-page grep and browser smoke pass proves a narrower owner.

## Recommended Split Order

1. Split only single-page styles that are not used by generated promo pages.
2. Split library styles after confirming `library.html`, `library.html#memory-bloom`, and the generated promo pages still render correctly.
3. Split press and log editorial styles after confirming `.link-grid`, `.hall-card`, and `.record-section` are not needed by promo pages.
4. Leave promo selectors and broad theme overrides until the promo generator and generated pages are updated together.
5. Move one selector group at a time, then run `node scripts/check.mjs`, `git diff --check HEAD`, and browser smoke tests for launcher plus promo pages.

## Do Not

- Do not delete uncertain selectors.
- Do not rename classes during CSS splitting.
- Do not move theme overrides without visual comparison in light, dark, and auto modes.
- Do not make generated promo pages depend on non-generated page CSS.
- Do not split or edit game implementation styles under `games/<slug>/styles/**` as part of launcher CSS work.
