# TODO

This repository is now structured as 99 AI Games, but Game 001 is not source-complete yet. Do not mark any game complete until its real source, assets, screenshots, metadata, and local verification are present.

## Collection Setup

- Publish the repository as `aidong27/99-ai-games`.
- Keep the root launcher connected to `games/manifest.json`.
- Add real screenshots for the launcher after the design stabilizes.
- Document the process for adding Game 002.

## Game 001: Star Survivor PX Neon

- Import the real itch.io `index.html` or exported HTML5 build source.
- Add the real JavaScript files, or carefully split a single-file build only after verifying the game still works.
- Add the real CSS used by the published game.
- Add image assets under `games/star-survivor-px-neon/assets/images/`.
- Add audio assets under `games/star-survivor-px-neon/assets/audio/`.
- Confirm all asset paths are relative.
- Confirm the original model name used to create the game, if available.
- Confirm the original AI agent or tool used to create the game, if available.
- Keep `humanCodeEdits: false` accurate.

## Verification

- Run the launcher through a local static server.
- Verify the Game 001 entry opens from the launcher.
- Run the game through a local static server after source import.
- Compare the local build with the itch.io version.
- Check browser console errors.
- Verify desktop controls.
- Verify mobile layout and touch controls, if supported.
- Add screenshots from the real build.

## Documentation

- Replace placeholder feature notes with verified gameplay details.
- Document player controls.
- Document enemy types.
- Document upgrade rules.
- Document asset licensing.
- Keep `games/manifest.json` and each `game.json` synchronized.
