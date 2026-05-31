# Development Notes

## Local Preview

Use a static server from the repository root:

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173
```

Avoid relying on `file://` for testing because module loading, fetch calls, and canvas checks can behave differently.

## Metadata Checks

Run:

```bash
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/generate-index.mjs --check
```

Regenerate the markdown index after manifest changes:

```bash
node scripts/generate-index.mjs --write
```

## Folder Standard

Each official game slot should live in:

```text
games/<slug>/
```

Minimum structure:

```text
index.html
game.json
brief.md
README.md
src/
styles/
assets/images/
assets/audio/
variants/
runs/
```

## Variant Standard

Model variants live under:

```text
games/<slug>/variants/<variant-id>/
```

Variants do not consume new game numbers. They must record model, agent, date, status, and `humanCodeEdits`.

## Run Standard

Run records live under:

```text
games/<slug>/runs/<run-id>.json
```

A run can describe generation, revision, validation, comparison, benchmark, or release work.

## Verification Checklist

- Launcher loads `games/manifest.json`.
- Launcher card opens the game.
- Game canvas or primary play surface renders nonblank.
- Keyboard controls work when documented.
- Pointer or touch controls work when documented.
- Browser console has no errors.
- Desktop layout has no horizontal overflow.
- 390px mobile layout has no horizontal overflow.
- Metadata matches the real game and source state.
- Hall assignment and run records validate.
