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

## Game Folder Standard

Each game should live in:

```text
games/<slug>/
```

Minimum structure:

```text
index.html
game.json
src/
styles/
assets/images/
assets/audio/
```

## Metadata Standard

Each game must record:

- `number`
- `title`
- `slug`
- `status`
- `createdDate`
- `modelName`
- `agentName`
- `humanCodeEdits`
- `sourceCompleteness`
- any notes about uncertainty or maintainer-declared labels

The root `games/manifest.json` should stay synchronized with each game's `game.json`.

## Verification Checklist

Before marking a game playable:

- Launcher loads `games/manifest.json`.
- Launcher card opens the game.
- Game canvas or primary play surface renders nonblank.
- Keyboard controls work when documented.
- Pointer or touch controls work when documented.
- Browser console has no errors.
- Desktop layout has no horizontal overflow.
- 390px mobile layout has no horizontal overflow.
- Metadata matches the real game and source state.

## Current Game 001 Notes

Signal Cartographer is a local self-contained Canvas game with no external assets or runtime dependencies.

Known next work:

- Capture real screenshots.
- Tune difficulty after playtesting.
- Consider reduced-motion handling if the signal effects feel too intense.
- Add a short postmortem after the first public release.
