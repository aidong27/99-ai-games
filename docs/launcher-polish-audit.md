# Launcher Polish Audit

Date: 2026-06-03

## Current Four-Level Structure

- Level 1: `index.html` title screen for the archive entry.
- Level 2: `library.html` model-axis observation library.
- Level 3: `observation.html?slug=<slug>` observation record.
- Level 4: `play.html?slug=<slug>` minimalist play gate.
- Final play surface: `games/<slug>/`.

## Visual Issues Found

- Title screen has the right direction but the status panel can read like a small stats widget instead of a live archive signal.
- Library cards need stronger cover hierarchy and should expose agent/status details without becoming noisy.
- The model axis has a timeline line, but the active node can be more deliberate.
- Observation records are readable, but core facts, provenance, device support, and run records need clearer editorial hierarchy.
- Play gate is minimal, but the device state can be more ritualized and less like a generic notice.

## Interaction Issues Found

- Library arrow-key selection works, but scroll behavior should respect `prefers-reduced-motion`.
- Library card click opens records, but reserved future capacity is only shown in the timeline and not in the card rail.
- Play gate lacks Enter/Escape keyboard handling.
- Timeline and readout should keep selected state stable when loading from `library.html#slug`.

## Mobile Issues Found

- The existing mobile layout avoids page-level horizontal overflow, but card/readout spacing can be tightened.
- The model axis becomes horizontal on mobile, but node styling can be clearer as compact chips.
- Record run sections can become long on narrow screens and need better grouping.

## Data, Path, and Error-Handling Risks

- All launcher data should continue to come from `games/manifest.json`, `games/<slug>/game.json`, and listed run records.
- Missing screenshots must remain explicit fallbacks, not generated substitutes.
- Missing or invalid slugs should produce clear errors.
- Run record fetch failures should be isolated to the affected run card.
- GitHub Pages cache-busting query strings need to change with CSS/JS edits.

## Scope for This Polish Pass

- Refine existing Level 1 through Level 4 launcher UI without changing architecture.
- Improve model-axis, observation-card, timeline, record, and play-gate hierarchy.
- Add restrained reserved future-slot treatment without pretending those slots are games.
- Improve responsive behavior, keyboard handling, and accessible focus states.
- Update `CHANGELOG.md` and keep README changes minimal.

## PC-First Refinement Note

- Primary visual target is now desktop showcase viewports from 1280px through 2560px wide.
- The launcher should read as a game title screen, model-axis selector, and cinematic archive interface before it reads as a mobile app.
- Mobile remains a baseline requirement for no horizontal overflow, stable paths, and usable controls, but it is not the main visual optimization target for this pass.
- Desktop effects are limited to low-density canvas signal fields, pointer-only card tilt, active selection scan/pulse states, and graceful reduced-motion fallbacks.
- The same truth constraints remain: no new games, no Game 003, no fake screenshots, no fake finished slots, and no physical phone QA claims.

## Explicitly Not Doing

- No new games.
- No Game 003.
- No fake slots presented as playable entries.
- No fake screenshots.
- No fake users, downloads, ratings, popularity, or provenance.
- No existing game gameplay changes.
- No new run records for game code, because this pass only changes launcher and documentation.
- No claim of real physical phone QA; only local browser viewport smoke is planned.
