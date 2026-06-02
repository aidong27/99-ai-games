# Changelog

All notable project-level changes are recorded here. This archive does not use changelog entries to claim users, downloads, stars, or impact that cannot be verified.

## [Unreleased]

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
