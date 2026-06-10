# Changelog

All notable project-level changes are recorded here. This archive does not use changelog entries to claim users, downloads, stars, or impact that cannot be verified.

## [Unreleased]

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
