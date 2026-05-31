# TODO

Keep this TODO honest and based on real missing work.

## Framework

- Keep `games/manifest.json`, `halls/halls.json`, and per-game metadata synchronized.
- Run validation before every release.
- Push `.github/workflows/validate.yml` after GitHub credentials have `workflow` scope.
- Decide whether `scripts/new-game.mjs` should eventually update manifest and halls automatically.
- Decide whether future variants should duplicate full source or reference a canonical implementation path.
- Add generated hall pages if the catalog grows.

## Game 001: Signal Cartographer

- Capture real screenshots from the playable local build.
- Tune damage, beacon count, and sector pacing after playtesting.
- Add optional audio only if it is generated or licensed for this repository.
- Add asset credits if any external assets are introduced later.
- Keep `game.json`, variant metadata, and run records synchronized with real game behavior.

## Verification

- Run the launcher through a local static server.
- Verify the Game 001 entry opens from the launcher.
- Check browser console errors.
- Verify keyboard controls.
- Verify pointer controls.
- Verify touch controls at mobile width.
- Check for horizontal overflow at desktop and 390px mobile width.
- Run `node scripts/validate-halls.mjs`.
- Run `node scripts/validate-games.mjs`.
- Run `node scripts/generate-index.mjs --check`.

## Documentation

- Keep `README.md`, `AGENTS.md`, `ROADMAP.md`, and `OPENAI_OSS_APPLICATION.md` aligned with the real project state.
- Add release notes when GitHub Pages or another public host is configured.
- Document how model labels are declared and verified.
- Add postmortems only after real testing.
