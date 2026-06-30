# Changelog

All notable project-level changes are recorded here. This archive does not use changelog entries to claim users, downloads, stars, or impact that cannot be verified.

## [Unreleased]

- Add public-surface validation so README stats, press fallback stats, social card counts, share kit promo URLs, generated promo pages, and per-game promo cards stay aligned with the real manifest.

- Add adaptive Apple-style light/dark theming for launcher/editorial pages, generated per-game promo pages under `promo/<slug>/`, and a clearer GitHub README/docs entry surface. Generated promo assets are labeled promotional, not gameplay evidence; no game implementation files are changed.

- Calm the observation library to match Claude's flat, quiet feel: neutralize the dark-era pointer-driven 3D card tilt and perspective, remove the sweeping scan line on the active card, and drop the looping model-axis pulse glow — keeping a simple soft hover/active lift. CSS-only (the effect JS is untouched; its tilt vars become inert). Cache-busting bumped to `2026-06-14-claude7`.

- Cross-page consistency sweep: fix the top navigation on the title and compare pages (it was still rendering as dark-theme mono chips because main.css overrode the Claude link style) to plain Claude text links; switch the title footer to sans; and standardize all surfaces (shell, editorial, compare, front hall) to one calm content column (max 1360px, consistent gutters) instead of the previous four different widths. Override-only; cache-busting bumped to `2026-06-14-claude6`.

- Bring the press kit and project log pages to the editorial Claude standard: larger serif lede at a readable measure, refined timeline entry typography (mono dates, serif headings, calm body), accent text links, and soft pill link tiles. The existing timeline rail is preserved. Override-only; cache-busting bumped to `2026-06-14-claude5`. This completes the Claude.ai theme across all seven launcher pages.

- Bring the observation record and play gate pages up to the same calm Claude standard as the front hall: rounded soft cover/cards, larger editorial headings with tighter tracking, more readable description type, soft-rounded screenshot frames, and a generous centered play gate. Override-only; cache-busting bumped to `2026-06-14-claude4`.

- Add a real brand favicon (inline SVG terracotta rounded-square "99") across all launcher pages, replacing the blank icon. Refine the Claude front-hall typography: a lighter, more editorial hero wordmark and position line, roomier section spacing, and an observation shelf with soft accent-chip number plates, sans metadata, and calmer cards. Override-only; cache-busting bumped to `2026-06-14-claude3`.

- Polish the Claude.ai light theme into a native feel: replace the inverted-dark "specimen terminal" decorations with calm Claude conventions — fully rounded pill buttons in humanist sans (no uppercase/mono), plain-text top navigation, soft sans labels at readable warm-ink contrast (instead of low-contrast spaced terracotta), softer cards with gentle hover lift, a floating pill dock, removal of the global registration frame and card corner ticks, a quieter ambient signal field, and antialiased body type. Override-only in `styles/archive.css`; no DOM contract or structure change. Cache-busting bumped to `2026-06-13-claude2`.

- Reskin the entire launcher to a **Claude.ai-style light theme**: warm cream ground (`#f5f4ef`), white surfaces, dark warm-ink text, and the signature Anthropic terracotta (`#d97757`) as the accent, with softer rounded radii, calm soft shadows in place of hard offsets, white text on the accent, a quieted signal field (multiply blend), and neutralized dark-mode vignettes. Implemented as a palette/token inversion in the shared `styles/archive.css` (+ `styles/main.css`) so all seven launcher pages flip together; no renderer DOM contract changed and no game file touched. Cache-busting bumped to `2026-06-13-claude`.

- Unify the entire launcher under one **Archive Terminal** design system in the shared `styles/archive.css`, so all seven pages (title, library, observation record, play gate, press, log, compare) share one cohesive instrument-panel language: a fixed viewport frame with registration ticks on every page, a stronger ruled topbar with a divider and a terminal-rail bottom dock, one ledger-panel treatment with corner ticks and hard-offset hover applied consistently to observation cards, definition/run cards, the library readout, the record, the play gate, and editorial sections, accent-ruled section headings, and tightened type/spacing. All selector names and renderer DOM contracts are preserved; cache-busting bumped to `2026-06-12-terminal`.

- Rebuild the title page from a splash screen into a data-driven **Observatory Front Hall**: the page now renders the actual archive — an observation shelf listing every real playable sample (number plate, hall, model/tool, device badges, Record/Play actions), a nine-hall floor plan with covered/open states, and a model-axis strip — entirely from `games/manifest.json` and `halls/halls.json`. Open halls render as open; nothing is mocked. `src/main.js` was rewritten as the front-hall renderer and `styles/main.css` as the front-hall layout; the signal-field effect, archive-seed stats, share panel, and keyboard entry are preserved. Cache-busting bumped to `2026-06-12-fronthall`.

- Redesign the launcher art direction as a "specimen ledger": warmer near-black/ivory tokens, sharper radii, film-grain and vignette texture pass, ruled kickers, corner-bracket buttons with hard offset shadows, uppercase mono badges, a hollow-stroke AI line in the title wordmark, an italic serif position line, a ledger status card with corner registration ticks, and a static meta rule. All selectors, DOM hooks, and dynamic-page structures are unchanged; cache-busting bumped to `2026-06-11-atelier` across the launcher and validator.

- Add `compare.html`, a model-axis capability matrix that renders, from real manifest data only, which AI models and tools have produced playable observations in which game halls, plus per-model totals and hall coverage. Every cell links to a real observation record; empty halls are shown as empty, never as placeholder games. Brought under `validate-launcher`.
- Speed up cross-page launcher navigation: `archive-data.js` now caches manifest and `game.json` fetches per session (keyed by the deployed asset version) so moving between title, library, compare, observation, and play no longer refetches every record. Add `modulepreload` hints for the data layer and `decoding="async"` on launcher images.

- Make the archive's integrity machine-enforced: add `scripts/check.mjs` (one command that runs syntax checks, every validator, the generated-index freshness check, and per-game completability proofs) and a CI workflow (`.github/workflows/ci.yml`) that runs it on every push and pull request.
- Add `scripts/validate-provenance.mjs`, an executable honesty gate that asserts `humanCodeEdits: false` across all metadata, real model/agent labels, at least one verified run record per game, and **no fabricated popularity/traffic metrics** anywhere — turning the project's written rules into enforced checks. Documented in `docs/quality-gate.md`.
- Add Observation 005 / Game 005 **Gravity Atlas**, the first Physics Experiment Hall benchmark: a PC-first deterministic physics puzzle with six gravity plates, shot budgets, and par scoring. Its physics engine is a pure module shared by the page and a committed verifier (`scripts/verify-gravity-atlas.mjs`) that replays embedded reference launch vectors to prove every plate completable; interactive browser smoke and real screenshots are pending and not claimed.
- Add public sharing infrastructure: Open Graph/Twitter social preview metadata, brand social assets, a press page, project log, title-screen copy actions, and a reusable share kit.
- Normalize Codex-authored provenance labels to the single maintainer-declared model `GPT-5.5 xhigh` with `Codex` as the tool/agent.
- Clean up Neon Pulse Courier source internals without changing gameplay: remove unused helpers, clarify vector/heading logic, and fix particle lifetime fading.
- Add Observation 004 / Game 004 **Ninefold Draft**, the first Card Strategy Hall benchmark: a PC-first card strategy game with deterministic drafting, an engine-builder, Energy/Focus/Integrity trade-offs, and a telegraphed hazard track. Logic and balance were verified by a standalone rules simulation (win and loss both reachable); interactive browser smoke and real screenshots are pending and not claimed.
- Add Observation 003 / Game 003: Neon Pulse Courier, the first Arcade Reaction Hall benchmark sample.
- Add a PC-first arcade reaction loop with pulse barriers, data parcels, combo scoring, dash timing, failure/completion states, QA hooks, and real local screenshot slots.
- Shift the launcher polish target to PC-first desktop showcase layouts while keeping mobile as a no-overflow baseline.
- Add restrained desktop signal-field effects, pointer tilt, active-card scan, model-axis pulse, and animation lifecycle hardening.
- Elevate the model-axis / observation-track visual hierarchy for larger desktop viewports.
- Polish archive record and play gate presentation for stronger desktop launcher ritual without changing game entry data.
- Extend launcher validation to cover cache-busted assets and shared effect files.
- Harden deployed multi-level launcher paths and deep links for GitHub Pages subpath routing.
- Add `scripts/validate-launcher.mjs` to check launcher files, HTML asset references, manifest paths, media paths, deviceSupport readiness, and reserved-slot truthfulness.
- Improve library hash selection, model filtering, card focus, timeline selection, and back-link behavior.
- Refine observation record and play gate interaction details for device-aware CTAs, missing slugs, and manifest fallback links.
- Polish the multi-level launcher with stronger title-screen hierarchy, archive seed status, and refined cache-busted assets.
- Refine the model-axis observation library with richer model/agent nodes, complete card facts, reserved future-slot treatment, and reduced-motion-aware selection scrolling.
- Refine observation records with core facts, clearer device support/provenance sections, and layered run-record details.
- Refine the play gate with clearer device support messaging and Enter/Escape keyboard handling.
- Improve responsive and accessibility details across launcher pages.
- Redesign the public launcher as a four-level archive flow: title screen, model-axis observation library, observation record, and minimalist play gate.
- Add a model-axis observation selector backed by real manifest and game metadata, with real screenshots or explicit no-screenshot fallbacks.
- Add `observation.html` records for device support, provenance, variants, controls, and run records.
- Add `play.html` as a final device-aware Start Observation gate before entering a game.
- Add a machine-readable mobile device support contract for game metadata and launcher policy.
- Redesign the launcher as a mobile-first AI Games Observatory library with real screenshot thumbnails, filters, and device-aware CTAs.
- Repair Signal Cartographer mobile controls with a joystick-style control surface, Beacon state, Pause, Restart, and input cleanup.
- Repair Lumen Lattice mobile layout with a square tap-first canvas and a compact Hint / Undo / Reset toolbar near the play surface.
- Improve validation so game metadata must declare device support consistently in `games/manifest.json` and `game.json`.
- Add standard open-source maintenance files for contribution, security, roadmap, changelog, and application drafting.
- Add verified local gameplay screenshots for Observation 001 and Observation 002.
- Fix a Lumen Lattice menu-state render-loop bug discovered during screenshot capture.
- Add GitHub Pages deployment workflow and verified public demo link.

## [0.2.0] - 2026-06-01

- Added Observation 002 / Game 002: Lumen Lattice.
- Expanded the launcher to represent two playable observation samples.
- Kept the archive framing focused on provenance, model variants, run records, and honest source status.

## [0.1.0] - 2026-05-31

- Created the initial archive structure for 99 AI Games.
- Added Observation 001 / Game 001: Signal Cartographer.
- Added the AI Observatory launcher, game metadata, hall structure, schemas, templates, validation scripts, and generated observation index.
