# 99 AI Games

99 AI Games is a long-term open-source collection of small browser games made by Codex and other AI agents. The goal is to build 99 playable HTML/CSS/JavaScript games over time while recording which model and agent made each entry.

The maintainer's role is to plan prompts, test builds, publish releases, and keep provenance honest. The maintainer does not hand-write or hand-edit game code.

## Current Status

- Collection status: independent open-source project.
- Launcher theme: **AI Observatory**.
- Game 001: **Signal Cartographer**.
- Game 001 status: playable local source included.
- Model label: `GPT-5.5 xhigh` as declared by the maintainer for this entry.
- Agent/tool: `Codex`.
- Human code edits: `false`.

There is no external platform dependency or missing outside source history in the current project state.

## Play Locally

Run a local static server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

The launcher opens Game 001 from:

```text
games/signal-cartographer/
```

An online public demo is not configured in this repository yet. When GitHub Pages or another static host is enabled, this README should link to that verified deployment.

## Game List

| # | Game | Status | Model | Agent | Human code edits |
|---|---|---|---|---|---|
| 001 | Signal Cartographer | Playable | GPT-5.5 xhigh | Codex | false |

The canonical machine-readable index is [`games/manifest.json`](games/manifest.json).

## Screenshots

Screenshots are still TODO. Add verified screenshots from the local build when they are captured:

- `games/signal-cartographer/assets/images/screenshot-title.png`
- `games/signal-cartographer/assets/images/screenshot-gameplay.png`
- `games/signal-cartographer/assets/images/screenshot-upgrades.png`

Do not add mock screenshots as if they were real gameplay captures.

## Features

- AI Observatory launcher with collection telemetry and game cards.
- Per-game metadata for model, agent, date, source status, and edit policy.
- Game 001: Canvas-based navigation survival game.
- Keyboard, pointer, and touch-friendly controls for Game 001.
- No external runtime dependencies.
- Static-file friendly structure for GitHub Pages or any simple web host.

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
│   └── signal-cartographer/
│       ├── index.html
│       ├── game.json
│       ├── src/
│       ├── styles/
│       └── assets/
├── docs/
├── AGENTS.md
├── ROADMAP.md
├── TODO.md
└── OPENAI_OSS_APPLICATION.md
```

## Tech Stack

- HTML
- CSS
- JavaScript
- Canvas 2D
- Static web hosting

No package manager or build step is required.

## Project Goal

This is not a rushed attempt to ship 99 games at once. The project is meant to preserve a visible timeline of AI game-making ability:

- How do AI agents design mechanics?
- How do controls, polish, accessibility, and code quality improve?
- What changes as models and tools evolve?
- How can an open-source project stay honest about AI-generated work?

## Open-Source Maintenance Plan

- Keep each game in `games/<slug>/`.
- Keep every game paired with a `game.json` file.
- Keep the launcher synchronized with `games/manifest.json`.
- Use GitHub Issues for bugs, ideas, accessibility feedback, and metadata corrections.
- Treat ordinary human-written game-code PRs as out of scope unless the maintainer changes the policy.

## How Codex Helps

Codex can help this project by:

- Creating new games from prompts.
- Refactoring AI-generated code.
- Maintaining the launcher and metadata.
- Writing documentation and release notes.
- Running static and browser smoke checks.
- Comparing newer games against older ones to document AI progress.

Agents must not invent fake popularity, fake users, fake download numbers, or fake source completeness.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
