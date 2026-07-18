# 99 AI Games

Demo: https://aidong27.github.io/99-ai-games/

A public archive for observing AI coding-agent progress through playable browser-game experiments.

**The games are playable. The real exhibit is the AI that made them.**

99 AI Games is a long-term AI game-making evolution archive. It uses 99 playable browser-game experiments as observation samples to witness how AI agents improve at design, logic, coding, polish, debugging, controls, accessibility, and creative judgment over time.

The maintainer plans prompts, tests builds, publishes releases, and records provenance. The maintainer does not hand-write or hand-edit game code.

## Maintenance Status

- Active early-stage archive.
- 2 playable observation samples.
- Public demo available via GitHub Pages.
- Validation scripts available.
- No fake screenshots or fake popularity claims.
- Public roadmap and provenance policy.

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

## Device Support Contract

Every game entry declares `deviceSupport` in both `games/manifest.json` and `games/<slug>/game.json`. The launcher uses this machine-readable contract to allow mobile play, show a warning for limited support, or block direct mobile launch for desktop-only entries.

Do not mark mobile as `supported` unless mobile behavior has been implemented and checked. If support is uncertain, mark it `limited` or `unsupported` and document the pending work in `mobileNotes`.

## Launcher Structure

The public launcher is a four-level static archive system:

- `index.html`: title screen and project entry point.
- `library.html`: model-axis observation library with real manifest-backed game cards.
- `observation.html?slug=<game-slug>`: archive record with screenshots, metadata, device support, provenance, variants, and run records.
- `play.html?slug=<game-slug>`: minimalist play gate before entering `games/<slug>/`.

Launcher pages read from `games/manifest.json` and each game's `game.json`. They must not invent games, models, screenshots, popularity, or provenance.

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

The launcher opens the included observation samples from:

```text
games/signal-cartographer/
games/lumen-lattice/
```

## Observation Index

| # | Observation sample | Hall | Slot type | Status | Variants | Runs |
|---|---|---|---|---|---:|---:|
| 001 | Signal Cartographer | Survival Strategy Hall | benchmark | Playable | 1 | 2 |
| 002 | Lumen Lattice | Puzzle Logic Hall | benchmark | Playable | 1 | 3 |

The canonical machine-readable index is [`games/manifest.json`](games/manifest.json). A generated markdown view is in [`docs/generated-index.md`](docs/generated-index.md).

## Screenshots

These screenshots were captured from the local build served at `http://localhost:4173` on 2026-06-01. Do not replace them with mock screenshots or generated images.

### Observation 001 / Game 001: Signal Cartographer

![Signal Cartographer title screen](games/signal-cartographer/assets/images/screenshot-title.png)
![Signal Cartographer gameplay](games/signal-cartographer/assets/images/screenshot-gameplay.png)
![Signal Cartographer upgrade choice](games/signal-cartographer/assets/images/screenshot-upgrades.png)

### Observation 002 / Game 002: Lumen Lattice

![Lumen Lattice title screen](games/lumen-lattice/assets/images/screenshot-title.png)
![Lumen Lattice puzzle in progress](games/lumen-lattice/assets/images/screenshot-puzzle.png)
![Lumen Lattice solved state](games/lumen-lattice/assets/images/screenshot-solved.png)

## Project Structure

```text
.
├── index.html
├── library.html
├── observation.html
├── play.html
├── src/
├── styles/
├── games/
│   ├── manifest.json
│   ├── signal-cartographer/
│       ├── index.html
│       ├── game.json
│       ├── brief.md
│       ├── README.md
│       ├── variants/
│       └── runs/
│   └── lumen-lattice/
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
node --check games/lumen-lattice/src/main.js
```

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Security policy](SECURITY.md)
- [Roadmap](docs/roadmap.md)
- [Codex for Open Source application draft](docs/codex-open-source-application.md)
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
