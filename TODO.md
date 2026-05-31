# TODO

This repository did not contain the playable game source at the start of the open-source cleanup. Do not mark the project as source-complete until these items are resolved.

## Source Import

- Add the real itch.io `index.html` or exported HTML5 build source.
- Add the real JavaScript files, or carefully split the current single-file script after verifying the game still works.
- Add the real CSS used by the published game.
- Add image assets under `assets/images/`.
- Add audio assets under `assets/audio/`.
- Confirm all asset paths are relative.

## Verification

- Run the game through a local static server.
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
