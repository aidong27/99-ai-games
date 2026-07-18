# 99 AI Games

**A playable archive for observing AI coding-agent progress through browser-game experiments.**

[Enter the live archive](https://aidong27.github.io/99-ai-games/) · [Press kit](https://aidong27.github.io/99-ai-games/press.html) · [Project log](https://aidong27.github.io/99-ai-games/log.html) · [Share kit](docs/share-kit.md) · [Provenance policy](docs/provenance-policy.md)

> The games are playable. The real exhibit is the AI that made them.

99 AI Games is a long-term AI game-making evolution archive. It preserves playable browser games as observation samples so future readers can inspect how AI agents handle mechanics, controls, interaction feedback, visual polish, debugging, documentation, accessibility, and provenance over time.

The name is a target archive capacity, not a completion claim: **99 means 99 observation slots, not filled capacity and not 99 generations.** A single slot can contain multiple model variants and many run records.

![99 AI Games social preview brand card](assets/social/og-cover.png)

The image above is a brand/social preview asset, not a screenshot and not evidence of additional playable games.

## Current Archive Signal

| Metric | Current value |
|---|---:|
| Target observation slots | 99 |
| Playable observations | 5 |
| Game halls | 9 |
| Model variants | 7 |
| Run records | 11 |

The maintainer curates prompts, tests builds, publishes releases, and records provenance. The maintainer does not hand-write or hand-edit game code. Game code provenance uses `humanCodeEdits: false` unless a future exception is explicitly documented.

No fake screenshots, fake users, fake downloads, fake ratings, fake popularity, or hidden provenance are used to make the archive look more complete than it is.

## What You Can Inspect

- Play the static launcher on GitHub Pages: <https://aidong27.github.io/99-ai-games/>.
- Read the public project explainer: <https://aidong27.github.io/99-ai-games/press.html>.
- Follow the project timeline: <https://aidong27.github.io/99-ai-games/log.html>.
- Browse the model-axis observation library and each observation record.
- Open every game's `game.json`, variants, run records, controls, and device-support metadata.
- Review the hall taxonomy, schemas, validation scripts, and generated index.
- Compare playable output against the recorded model/tool labels and verification notes.

## Playable Observations

| # | Observation | Hall | Model / tool | Archive role | Device support | Record |
|---:|---|---|---|---|---|---|
| 001 | Signal Cartographer | Survival Strategy Hall | GPT-5.5 xhigh / Codex | First playable observation sample; current canonical Deep Field remake | Desktop supported; mobile limited | [Record](https://aidong27.github.io/99-ai-games/observation.html?slug=signal-cartographer) |
| 002 | Lumen Lattice | Puzzle Logic Hall | Claude Opus 4.8 / Claude Code | First Puzzle Logic Hall benchmark; current canonical Prism Archive remake | Desktop supported; mobile limited | [Record](https://aidong27.github.io/99-ai-games/observation.html?slug=lumen-lattice) |
| 003 | Neon Pulse Courier | Arcade Reaction Hall | GPT-5.5 xhigh / Codex | First Arcade Reaction Hall benchmark | Desktop supported; mobile limited | [Record](https://aidong27.github.io/99-ai-games/observation.html?slug=neon-pulse-courier) |
| 004 | Ninefold Draft | Card Strategy Hall | Claude Opus 4.8 / Claude Code | First Card Strategy Hall benchmark | Desktop supported; mobile limited | [Record](https://aidong27.github.io/99-ai-games/observation.html?slug=ninefold-draft) |
| 005 | Gravity Atlas | Physics Experiment Hall | Claude Fable 5 / Claude Code | First Physics Experiment Hall benchmark | Desktop supported; mobile limited | [Record](https://aidong27.github.io/99-ai-games/observation.html?slug=gravity-atlas) |

The canonical machine-readable source is [`games/manifest.json`](games/manifest.json). The generated markdown view is [`docs/generated-index.md`](docs/generated-index.md).

## Screenshots

Screenshots shown here are real repository files. Do not replace them with mockups, generated images, or screenshots that were not captured from a local build.

### Observation 001 / Game 001: Signal Cartographer

![Signal Cartographer title screen](games/signal-cartographer/assets/images/screenshot-title.png)
![Signal Cartographer gameplay](games/signal-cartographer/assets/images/screenshot-gameplay.png)
![Signal Cartographer upgrade choice](games/signal-cartographer/assets/images/screenshot-upgrades.png)

### Observation 002 / Game 002: Lumen Lattice

These screenshots are historical. They predate the current Prism Archive remake and are kept as archive evidence, not as a claim that they reflect the latest canonical build.

![Lumen Lattice title screen](games/lumen-lattice/assets/images/screenshot-title.png)
![Lumen Lattice puzzle in progress](games/lumen-lattice/assets/images/screenshot-puzzle.png)
![Lumen Lattice solved state](games/lumen-lattice/assets/images/screenshot-solved.png)

### Observation 003 / Game 003: Neon Pulse Courier

![Neon Pulse Courier title screen](games/neon-pulse-courier/assets/images/screenshot-title.png)
![Neon Pulse Courier gameplay](games/neon-pulse-courier/assets/images/screenshot-gameplay.png)
![Neon Pulse Courier completion screen](games/neon-pulse-courier/assets/images/screenshot-complete.png)

### Observation 004 / Game 004: Ninefold Draft

Real screenshots are pending. The game is playable in source, but this README does not claim screenshot evidence until verified image files exist.

### Observation 005 / Game 005: Gravity Atlas

Real screenshots are pending. The game is playable in source and its completability is machine-verified (`node scripts/verify-gravity-atlas.mjs`), but this README does not claim screenshot evidence until verified image files exist.

## Archive Model

The project is organized around observation value, not raw output volume.

- **Game slot / observation sample**: one official playable experiment in the archive.
- **Model variant**: a version of the same game concept made by a specific model or agent. Variants do not consume additional game numbers.
- **Run record**: one generation, revision, validation, comparison, or maintenance attempt.
- **Game hall**: one of nine capability categories used to compare AI game-making behavior over time.

The halls are: Arcade Reaction, Puzzle Logic, Survival Strategy, Card Strategy, Text Adventure, Clicker Management, Physics Experiment, Rhythm Audio, and AI Meme. Each hall can eventually hold 11 observation samples. Empty future slots are not represented as fake games.

## Device Support

Every game declares `deviceSupport` in both `games/manifest.json` and `games/<slug>/game.json`. The launcher uses this metadata to decide whether to allow direct play, warn before launch, or recommend desktop.

The current archive is PC-first. All five playable observations are marked desktop supported and mobile limited. Mobile support means a no-overflow baseline unless a game explicitly records stronger mobile QA; no physical handset QA is claimed here.

## Launcher Structure

The public launcher is a static four-level archive system:

- `index.html`: title screen and project entry point.
- `library.html`: model-axis observation library backed by real manifest data.
- `observation.html?slug=<game-slug>`: archive record with screenshots, metadata, device support, provenance, variants, controls, and run records.
- `play.html?slug=<game-slug>`: device-aware play gate before entering `games/<slug>/`.

Launcher pages read from `games/manifest.json` and each game's `game.json`. They must not invent games, models, screenshots, popularity, or provenance.

## Run Locally

No package manager, framework, or build step is required.

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Validate

```bash
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/validate-launcher.mjs
node scripts/generate-index.mjs --check
node scripts/verify-gravity-atlas.mjs
git diff --check
```

Useful syntax checks:

```bash
node --check src/main.js
node --check src/archive-data.js
node --check src/library.js
node --check src/observation.js
node --check src/play.js
```

Game source checks can be run directly, for example:

```bash
node --check games/signal-cartographer/src/main.js
node --check games/lumen-lattice/src/main.js
node --check games/neon-pulse-courier/src/main.js
node --check games/ninefold-draft/src/main.js
```

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Security policy](SECURITY.md)
- [Roadmap](docs/roadmap.md)
- [Share kit](docs/share-kit.md)
- [Game halls](docs/game-halls.md)
- [Provenance policy](docs/provenance-policy.md)
- [Game lifecycle](docs/game-lifecycle.md)
- [Model variants and runs](docs/model-variants-and-runs.md)
- [Benchmark method](docs/benchmark-method.md)
- [Automation guide](docs/automation-guide.md)
- [Prompt library](docs/prompt-library.md)
- [Release process](docs/release-process.md)

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
