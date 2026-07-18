# 99 AI Games

**The games are playable. The real exhibit is the AI that made them.**

99 AI Games is a long-term AI game-making evolution archive. It uses 99 playable browser-game experiments as observation samples to witness how AI agents improve at design, logic, coding, polish, debugging, controls, accessibility, and creative judgment over time.

The maintainer plans prompts, tests builds, publishes releases, and records provenance. The maintainer does not hand-write or hand-edit game code.

## The Real Goal

The real goal is not to mass-produce 99 games. The real goal is to preserve a public, playable record of AI agent capability growth.

Each game is evidence. It shows what an AI agent could design, implement, debug, and package at a specific moment, with a specific model label, tool, prompt context, and verification record.

## What Does "99 Games" Mean?

The 99 game slots represent 99 observation samples, not 99 AI generations.

A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

- **Game Slot / Observation Sample**: one official playable experiment in the archive.
- **Model Variant**: a version of the same concept made by a specific model or agent.
- **Run Record**: one generation, revision, validation, or comparison attempt.

## Games as Evidence

The games are playable because playability makes the AI's work inspectable. A reader can open a game, feel the controls, inspect the source, read the metadata, and compare it with future variants.

Game quality matters, but the archive subject is AI progress. A flawed game can still be valuable evidence if it honestly reveals a model's limitations.

## Current Status

- Archive status: independent open-source project.
- Launcher theme: **AI Observatory**.
- Observation 001 / Game 001: **Signal Cartographer**.
- Hall: Survival Strategy Hall.
- Slot type: benchmark.
- Archive role: First playable observation sample.
- Status: playable local source included.
- Canonical variant: `codex-gpt-5-5-xhigh-2026-05-31`.
- Model label: `GPT-5.5 xhigh` as declared by the maintainer for this entry.
- Agent/tool: `Codex`.
- Human code edits: `false`.

Observation 002 / Game 002: **Lumen Lattice**.

- Hall: Puzzle Logic Hall.
- Slot type: benchmark.
- Archive role: First Puzzle Logic Hall observation sample.
- Status: playable local source included.
- Canonical variant: `claude-opus-4-8-2026-05-31`.
- Model label: `Claude Opus 4.8` as declared by the maintainer for this entry.
- Agent/tool: `Claude Code`.
- Human code edits: `false`.

There is no external platform dependency or missing outside source history in the current project state.

## Game Halls

The archive has 9 halls. Each hall is an AI capability observation category, not just a genre bucket. Each hall can eventually contain 11 official observation samples, for 99 total game slots.

| Hall | What it observes |
|---|---|
| Arcade Reaction Hall | AI ability in feedback, timing, input feel, difficulty curves, and short-loop clarity |
| Puzzle Logic Hall | AI ability in rules, constraints, state logic, solvability, and puzzle communication |
| Survival Strategy Hall | AI ability in resource pressure, route planning, risk feedback, and tactical systems |
| Card Strategy Hall | AI ability in probabilistic decisions, drafting, turn structure, and readable strategy |
| Text Adventure Hall | AI ability in branching narrative, state memory, tone, and meaningful choices |
| Clicker Management Hall | AI ability in economies, automation loops, scaling, and player motivation |
| Physics Experiment Hall | AI ability in simulation feel, spatial reasoning, cause/effect, and sandbox tuning |
| Rhythm Audio Hall | AI ability in timing windows, pattern memory, audio feedback, and input precision |
| AI Meme Hall | AI ability in self-reference, humor, weird failure modes, and playful systems |

Each hall should eventually contain 3 benchmark observation samples, 6 normal observation samples, 1 failed/weird observation sample, and 1 future remake observation sample. Do not fill all 99 slots with placeholders.

## Play Locally

Run a local static server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

The launcher opens Observation 001 / Game 001 from:

```text
games/signal-cartographer/
```

## Observation Index

| # | Observation sample | Hall | Slot type | Status | Variants | Runs |
|---|---|---|---|---|---:|---:|
| 001 | Signal Cartographer | Survival Strategy Hall | benchmark | Playable | 1 | 1 |
| 002 | Lumen Lattice | Puzzle Logic Hall | benchmark | Playable | 1 | 1 |

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

Agents should optimize for honest provenance, comparison value, and archival usefulness, not mass production. They must not invent fake popularity, fake users, fake star counts, fake download numbers, fake screenshots, fake provenance, or fake verification.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
