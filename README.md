# Star Survivor PX Neon

Star Survivor PX Neon is a pixel/neon style browser survival game by [aidong27](https://github.com/aidong27). The public playable version is hosted on itch.io:

[Play Star Survivor PX Neon on itch.io](https://aidong27.itch.io/star-survivor-px-neon)

This repository is being prepared as the open-source home for the game. The current repository cleanup adds the project structure, documentation, contribution process, and maintenance plan. The playable itch.io source still needs to be imported before this repository can be treated as the canonical game source.

## Current Status

- Repository structure: ready for open-source maintenance.
- Published game source: not yet present in this checkout.
- Local page: runs as a source-import status page.
- Main next step: add the real `index.html`, JavaScript, CSS, image, and audio assets used by the itch.io build.

## Screenshots

Screenshots are not included yet. After the real game source is imported, add:

- `assets/images/screenshot-title.png`
- `assets/images/screenshot-gameplay.png`
- `assets/images/screenshot-upgrades.png`

Please use screenshots from the actual current build, not mockups.

## Features

The published game is intended to be documented here as the source is imported. Known project direction:

- Single-page HTML5 browser game.
- Pixel/neon visual style.
- Roguelike survival gameplay direction.
- Keyboard or pointer controls, depending on the current itch.io build.
- Upgrade and enemy systems planned for separate source modules.

Items above should be verified against the real imported source before being marked complete.

## Tech Stack

- HTML
- CSS
- JavaScript
- Static web hosting
- itch.io HTML5 distribution

No package manager or build step is required for the current repository skeleton.

## Local Development

Run the project through a local static server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

Opening `index.html` directly through `file://` is not recommended for browser-game development because module loading, assets, and canvas testing can behave differently from the hosted version.

## Project Goals

- Preserve the source of the itch.io game in a public, understandable repository.
- Keep the project friendly to beginner contributors.
- Improve gameplay polish, mobile support, accessibility, and documentation over time.
- Keep changes small and reviewable so the game remains easy to maintain.

## Open-Source Maintenance Plan

- Use GitHub Issues for bugs, feature requests, and beginner-friendly tasks.
- Keep pull requests focused on one change at a time.
- Document gameplay systems before making large rewrites.
- Avoid accepting generated spam, unrelated rewrites, or untested feature dumps.
- Track work in `ROADMAP.md` and project notes in `docs/`.

## How Codex Can Help

Codex can help this project by:

- Organizing the source into small JavaScript modules.
- Writing and maintaining documentation.
- Reviewing pull requests for regressions and unsafe changes.
- Creating simple browser smoke tests after the real game source is imported.
- Improving accessibility, mobile controls, and code readability.
- Turning rough ideas into issues, roadmap items, and small implementation plans.

Codex should not invent gameplay features that are not present in the source. When the source is incomplete, it should create TODOs and ask for the missing build files.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
