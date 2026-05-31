# Game Lifecycle

## 1. Choose A Slot

Pick a game number, hall, and slot type. Do not add many empty slots in advance.

## 2. Write A Brief

Create `games/<slug>/brief.md` with:

- concept
- hall fit
- target controls
- acceptance criteria
- model/agent expectations

## 3. Generate The Game

Ask an AI agent to build the game in `games/<slug>/`. Preserve the no-human-code-edits rule.

## 4. Record A Variant

Create a model variant under:

```text
games/<slug>/variants/<variant-id>/
```

If the game root is the canonical implementation, the variant can point to the root through `implementationPath`.

## 5. Record Runs

Create run records under:

```text
games/<slug>/runs/<run-id>.json
```

Runs can describe generation, revision, validation, comparison, benchmark, or release work.

## 6. Validate

Run:

```bash
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/generate-index.mjs --check
```

## 7. Verify In Browser

Use a local static server. Check the launcher, game page, controls, console, and mobile layout.

## 8. Publish

Commit only after metadata, validation, and browser checks match the real project state.
