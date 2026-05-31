# Project Summary

Star Survivor PX Neon is planned as the public source repository for the itch.io game by aidong27:

https://aidong27.itch.io/star-survivor-px-neon

The project is a small HTML/CSS/JavaScript browser game with a pixel/neon roguelike survival direction. This repository should become the long-term home for source code, issue tracking, documentation, and beginner-friendly contributions.

## Repository Audit

Initial cleanup date: 2026-05-31

Before this cleanup, the repository directory did not contain:

- `index.html`
- JavaScript game source
- CSS source
- image assets
- audio assets
- Git metadata

Because the playable source was missing, this cleanup does not invent gameplay implementation. It creates the public maintenance structure and records the source-import TODOs.

## Intended Structure

- `index.html` for the browser entry point.
- `src/` for JavaScript modules.
- `styles/` for CSS.
- `assets/images/` for screenshots, sprites, and visual assets.
- `assets/audio/` for music and sound effects.
- `docs/` for project notes.
- `.github/` for issue and pull request templates.

## Current Risk

The main risk is that the repository skeleton could be confused with the actual playable game. To avoid that, the current page and documentation explicitly state that the real itch.io source still needs to be imported and verified.
