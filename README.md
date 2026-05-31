# 99 AI Games

99 AI Games is a long-term browser game collection by [aidong27](https://github.com/aidong27). The goal is to collect 99 small HTML/CSS/JavaScript games made by Codex or other AI agents, while tracking how AI-made games improve over time.

The maintainer's role is to set direction, test the results, publish the work, and keep clear records. The maintainer does not hand-edit the game code.

## Current Status

- Collection status: open-source structure in progress.
- Game 001: **Star Survivor PX Neon**.
- Game 001 live page: [Play on itch.io](https://aidong27.itch.io/star-survivor-px-neon).
- Game 001 source status: the real playable itch.io source is not yet imported into this repository.
- Human code edits policy: `humanCodeEdits: false` for game entries.

This repository currently contains a launcher UI, metadata structure, documentation, and placeholders. It should not claim that Star Survivor PX Neon is source-complete until the real build files are added and verified.

## Why This Exists

This is not meant to be a fast content dump of 99 games. The long-term purpose is to watch AI agents grow as creative coding partners:

- How do different models design game loops?
- How do they handle polish, bugs, controls, and accessibility?
- How does code quality change across time?
- What kinds of games become possible with better agents?

Each game should record which model and agent/tool produced it, when it was made, and whether any human code edits were made.

## Project Plan

The detailed project plan is in [`docs/project-plan.md`](docs/project-plan.md). It defines the long-term vision, milestones, game lifecycle, provenance rules, risks, and next actions.

## Game List

| # | Game | Status | AI provenance | Play |
|---|---|---|---|---|
| 001 | Star Survivor PX Neon | Source pending | Model pending confirmation, agent pending confirmation, no human code edits | [itch.io](https://aidong27.itch.io/star-survivor-px-neon) |

The canonical machine-readable index is [`games/manifest.json`](games/manifest.json).

## Screenshots

Screenshots are not included yet. After the real game source is imported, add screenshots from the actual build, not mockups:

- `games/star-survivor-px-neon/assets/images/screenshot-title.png`
- `games/star-survivor-px-neon/assets/images/screenshot-gameplay.png`
- `games/star-survivor-px-neon/assets/images/screenshot-upgrades.png`

## Project Structure

```text
.
├── index.html
├── src/
│   └── main.js
├── styles/
│   └── main.css
├── games/
│   ├── manifest.json
│   └── star-survivor-px-neon/
│       ├── index.html
│       ├── game.json
│       ├── src/
│       ├── styles/
│       └── assets/
├── docs/
├── AGENTS.md
├── README.md
├── ROADMAP.md
└── TODO.md
```

## Tech Stack

- HTML
- CSS
- JavaScript
- Static web hosting
- itch.io HTML5 distribution for individual games

No package manager or build step is required for the current repository skeleton.

## Local Development

Run the collection through a local static server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

Opening files directly through `file://` is not recommended for browser-game development because modules, assets, and canvas testing can behave differently from the hosted version.

## Open-Source Maintenance Plan

- Keep every game in `games/<slug>/`.
- Keep every game entry paired with a `game.json` provenance file.
- Do not mark a game as source-complete until the real source, assets, screenshots, and local verification are present.
- Use GitHub Issues for ideas, bugs, accessibility feedback, and release notes.
- Treat ordinary external code PRs as out of scope unless the maintainer explicitly changes the policy.

## How Codex Can Help

Codex and other AI agents can help by:

- Creating new games from prompts.
- Building the shared launcher UI.
- Refactoring AI-generated code without human hand-editing.
- Writing metadata, release notes, and documentation.
- Running browser smoke checks.
- Comparing newer games against older ones to document AI progress.

Agents must stay honest about missing source, missing screenshots, and unknown model provenance.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
