# 99 AI Games

99 AI Games is a long-term open-source archive of small browser games made by Codex and other AI agents. The purpose is to observe and preserve how AI agents improve at game-making over time.

The maintainer plans prompts, tests builds, publishes releases, and records provenance. The maintainer does not hand-write or hand-edit game code.

## Core Archive Rule

The 99 game slots represent 99 game concepts, not 99 AI generations.

A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

- **Game Slot**: one official game concept in the 99-game archive.
- **Model Variant**: a version of the same concept made by a specific model or agent.
- **Run Record**: one generation, revision, validation, or comparison attempt.

## Current Status

- Collection status: independent open-source project.
- Launcher theme: **AI Observatory**.
- Game 001: **Signal Cartographer**.
- Hall: Survival Strategy Hall.
- Slot type: benchmark.
- Game 001 status: playable local source included.
- Canonical variant: `codex-gpt-5-5-xhigh-2026-05-31`.
- Model label: `GPT-5.5 xhigh` as declared by the maintainer for this entry.
- Agent/tool: `Codex`.
- Human code edits: `false`.

There is no external platform dependency or missing outside source history in the current project state.

## Game Halls

The archive has 9 halls. Each hall can eventually contain 11 official game concepts, for 99 total game slots.

| Hall | Focus |
|---|---|
| Arcade Reaction Hall | Fast reaction games, dodging, jumping, score chasing, short-loop arcade games |
| Puzzle Logic Hall | Puzzles, logic gates, mazes, sequencing, deduction, constrained movement |
| Survival Strategy Hall | Survival loops, resource pressure, route planning, hostile environments, tactical movement |
| Card Strategy Hall | Card games, dice games, turn-based battles, drafting, roguelite decisions |
| Text Adventure Hall | Interactive fiction, branching stories, terminal games, RPG-style text systems |
| Clicker Management Hall | Incremental games, business sims, resource management, automation loops |
| Physics Experiment Hall | Physics toys, gravity games, projectiles, magnets, bouncing, sandbox mechanics |
| Rhythm Audio Hall | Rhythm games, music memory, beat timing, audio-reactive games |
| AI Meme Hall | AI jokes, agent failures, prompt chaos, token bills, model battles |

Each hall should eventually contain 3 benchmark concepts, 6 normal concepts, 1 failed/weird experiment, and 1 future remake concept. Do not fill all 99 slots with placeholders.

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

## Game Index

| # | Game | Hall | Slot type | Status | Variants | Runs |
|---|---|---|---|---|---:|---:|
| 001 | Signal Cartographer | Survival Strategy Hall | benchmark | Playable | 1 | 1 |

The canonical machine-readable index is [`games/manifest.json`](games/manifest.json). A generated markdown view is in [`docs/generated-index.md`](docs/generated-index.md).

## Screenshots

Screenshots are still TODO. Add verified screenshots from the local build when they are captured:

- `games/signal-cartographer/assets/images/screenshot-title.png`
- `games/signal-cartographer/assets/images/screenshot-gameplay.png`
- `games/signal-cartographer/assets/images/screenshot-upgrades.png`

Do not add mock screenshots as if they were real gameplay captures.

## Project Structure

```text
.
├── index.html
├── src/
├── styles/
├── games/
│   ├── manifest.json
│   └── signal-cartographer/
│       ├── index.html
│       ├── game.json
│       ├── brief.md
│       ├── README.md
│       ├── variants/
│       └── runs/
├── halls/
├── schemas/
├── scripts/
├── templates/
└── docs/
```

## Automation

No package manager or build step is required. Validation uses plain Node.js scripts:

```bash
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/generate-index.mjs --check
```

Syntax checks:

```bash
node --check src/main.js
node --check games/signal-cartographer/src/main.js
```

## Documentation

- [Project plan](docs/project-plan.md)
- [Game halls](docs/game-halls.md)
- [Provenance policy](docs/provenance-policy.md)
- [Game lifecycle](docs/game-lifecycle.md)
- [Model variants and runs](docs/model-variants-and-runs.md)
- [Benchmark method](docs/benchmark-method.md)
- [Automation guide](docs/automation-guide.md)
- [Prompt library](docs/prompt-library.md)
- [Release process](docs/release-process.md)

## How Codex Helps

Codex can help this project by creating new games, creating model variants, maintaining metadata, writing run records, checking local builds, and comparing newer results against older ones.

Agents must not invent fake popularity, fake users, fake star counts, fake download numbers, fake screenshots, fake provenance, or fake verification.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
