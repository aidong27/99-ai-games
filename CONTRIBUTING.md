# Contributing to 99 AI Games

99 AI Games is a public archive for observing AI coding-agent progress through playable browser-game experiments. The games are playable samples, but the project goal is the long-term record of what AI agents could design, implement, test, and document at specific points in time.

This repository is intentionally provenance-first. Do not add fake screenshots, fake popularity claims, fake verification records, fake model sources, or placeholder game slots that do not contain real work.

## Maintainer Role

The maintainer can plan prompts, write briefs, run tests, publish releases, document provenance, open issues, and maintain repository metadata. The maintainer must not hand-write or hand-edit AI-generated game code.

Human-written changes are acceptable for documentation, metadata, validation scripts, repository structure, and review notes. Changes to game source code should come from an AI coding agent unless the change is a narrow bug fix. Any exception must be documented in the relevant run record or changelog entry.

## Adding a Game Slot

A game slot is one official observation sample in the archive. It is not just an idea and it is not a blank placeholder.

To add a game slot:

1. Create or update a brief under `games/<slug>/brief.md`.
2. Generate the playable implementation with an AI coding agent.
3. Add the game folder under `games/<slug>/`.
4. Add `games/<slug>/game.json` with provenance, slot type, hall, variant, and run paths.
5. Add `deviceSupport` in both `game.json` and `games/manifest.json` so the launcher can decide mobile play, warnings, and desktop-only blocks.
6. Add at least one variant under `games/<slug>/variants/<variant-id>/`.
7. Add at least one run record under `games/<slug>/runs/`.
8. Update `games/manifest.json`.
9. Regenerate `docs/generated-index.md`.
10. Run the local validation commands before opening a PR.

Do not fill future slots with empty folders or metadata-only stubs.

## Adding a Variant

A variant is another AI-generated version of an existing game concept. It belongs under the same game slot and does not consume a new game number.

To add a variant:

1. Create `games/<slug>/variants/<variant-id>/`.
2. Add `variant.json` with model, agent/tool, date, status, source path, and human edit status.
3. Add or reference the variant source according to the local game structure.
4. Add a run record explaining the generation or comparison context.
5. Update `games/<slug>/game.json` and `games/manifest.json`.
6. Regenerate the index and run validation.

## Adding a Run Record

A run record documents one generation, revision, validation, comparison, or review attempt. Use run records to preserve what happened, not to make the project look more complete than it is.

Run records should include:

- Date.
- Game and variant.
- Model and agent/tool.
- Prompt or brief reference, when public.
- What was generated or changed.
- Validation commands run.
- Known issues.
- Whether any human code edits occurred.

Private prompts, account details, tokens, and non-public credentials must not be included.

## Local Validation

Run these checks before a PR:

```bash
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/validate-launcher.mjs
node scripts/generate-index.mjs --check
node --check src/main.js
node --check games/signal-cartographer/src/main.js
node --check games/lumen-lattice/src/main.js
git diff --check
```

Use a local static server for browser checks:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Pull Request Requirements

PRs that add or update a playable observation sample must include:

- Updated `games/manifest.json`.
- Updated `games/<slug>/game.json`.
- Updated `deviceSupport` metadata for desktop/mobile support, minimum viewport, inputs, notes, and launcher policy.
- Updated variant metadata when variants change.
- Updated run records for generation, validation, or comparison work.
- Updated `docs/generated-index.md` after running `node scripts/generate-index.mjs --write`.
- Validation results in the PR body.
- Clear statement of whether game source code changed.

PRs should be small enough to review. Do not bundle unrelated formatting churn, unrelated game changes, or mass placeholder slot creation with a real archive update.

## Good Issue Ideas

- Report a broken game or launcher link.
- Suggest a future game concept or benchmark brief.
- Request a model variant comparison for an existing game.
- Point out missing provenance, unclear metadata, or stale documentation.
- Report accessibility or mobile usability problems.
