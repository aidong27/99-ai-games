# Development Notes

## Local Preview

Use a local static server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

Avoid relying on `file://` for development checks. Browser modules, assets, and canvas-related tests can behave differently from a normal HTTP preview.

## Source Import Notes

If the current itch.io build is a single `index.html`, import it first without a large rewrite. After the game is confirmed to run locally, split code into modules gradually:

- `src/main.js`
- `src/game.js`
- `src/player.js`
- `src/enemies.js`
- `src/upgrades.js`
- `src/utils.js`

Each split should be tested before continuing.

## Suggested Verification Checklist

- Page loads without console errors.
- Main menu or start state appears.
- Game can start.
- Player controls respond.
- Enemies spawn as expected.
- Upgrades or progression work as expected.
- Game-over or restart flow works.
- Layout remains usable on a narrow mobile viewport.

## Documentation Rules

- Do not claim features that are not in the source.
- Keep screenshots aligned with the actual build.
- Record asset licenses before accepting new assets.
- Keep README status current when the real source is imported.
