# 99 AI Games Agent Instructions

This repository is a long-term collection of 99 small browser games made by Codex or other AI agents.

## Project Mission

The goal is to witness AI agent growth over time, not to produce 99 games as quickly as possible.

The 99 game slots represent 99 game concepts, not 99 AI generations. A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

## Terms

- **Game Slot**: one official concept in the 99-game archive.
- **Model Variant**: a version of the same game concept made by a specific model or agent.
- **Run Record**: one generation, revision, validation, or comparison attempt.
- **Game Hall**: one of the 9 category halls, each with capacity for 11 game concepts.

## Non-Negotiable Rule

The maintainer does not hand-write or hand-edit game code.

For game entries, variants, and runs, keep:

```json
{
  "humanCodeEdits": false
}
```

If a human-edited exception is ever introduced, it must be documented clearly and should not be hidden.

## Honesty Rules

- Do not replace or delete Game 001.
- Do not break the existing launcher.
- Do not invent missing source files.
- Do not invent model provenance.
- Do not claim a game is complete until its source, metadata, and local verification are present.
- If a model label is maintainer-declared, say so in metadata.
- Do not create fake screenshots.
- Do not exaggerate users, stars, downloads, popularity, or community size.
- Do not claim verification unless the exact checks were actually run.

## Repository Conventions

- Root launcher: `index.html`, `src/`, `styles/`.
- Game index: `games/manifest.json`.
- Hall index: `halls/halls.json`.
- Game folders: `games/<slug>/`.
- Per-game metadata: `games/<slug>/game.json`.
- Per-game brief: `games/<slug>/brief.md`.
- Variants: `games/<slug>/variants/<variant-id>/`.
- Run records: `games/<slug>/runs/<run-id>.json`.

Every playable game should include:

- `index.html`
- `game.json`
- `brief.md`
- `README.md`
- `src/`
- `styles/`
- `assets/images/`
- `assets/audio/`
- `variants/`
- `runs/`

## Game Halls

There are 9 halls. Each hall eventually contains 11 official concepts:

- Arcade Reaction Hall
- Puzzle Logic Hall
- Survival Strategy Hall
- Card Strategy Hall
- Text Adventure Hall
- Clicker Management Hall
- Physics Experiment Hall
- Rhythm Audio Hall
- AI Meme Hall

Each hall should eventually contain 3 benchmark concepts, 6 normal concepts, 1 failed/weird experiment, and 1 future remake concept.

Do not fill empty slots with fake games.

## Development Workflow

Use a local static server for checks:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

Run metadata validation:

```bash
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/generate-index.mjs --check
```

Avoid relying on `file://` for browser-game verification.

## Current Game 001 Status

Game 001 is **Signal Cartographer**.

Current repository status:

- Local playable source is included.
- Hall is Survival Strategy Hall.
- Slot type is benchmark.
- Canonical variant is `codex-gpt-5-5-xhigh-2026-05-31`.
- Model label is `GPT-5.5 xhigh`, declared by the maintainer for this entry.
- Agent/tool is `Codex`.
- `humanCodeEdits` is `false`.
- Real screenshots still need to be captured from the local build.
