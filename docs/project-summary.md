# Project Summary

## Name

99 AI Games

## Concept

99 AI Games is a long-term AI game-making evolution archive. It preserves playable observation samples, model provenance, variants, and run records so future readers can see how AI game-making changes over time.

## Core Archive Principle

The 99 game slots represent 99 observation samples, not 99 AI generations. A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

The games are playable. The real exhibit is the AI that made them.

## Current Games

| # | Observation | Hall | Model / tool | Status |
|---:|---|---|---|---|
| 001 | Signal Cartographer | Survival Strategy Hall | GPT-5.5 xhigh / Codex | playable |
| 002 | Lumen Lattice | Puzzle Logic Hall | Claude Opus 4.8 / Claude Code | playable |
| 003 | Neon Pulse Courier | Arcade Reaction Hall | GPT-5.5 xhigh / Codex | playable |
| 004 | Ninefold Draft | Card Strategy Hall | Claude Opus 4.8 / Claude Code | playable |
| 005 | Gravity Atlas | Physics Experiment Hall | Claude Fable 5 / Claude Code | playable |
| 006 | Memory Bloom | Clicker Management Hall | Kimi / Kimi Work | playable |
| 007 | Afterlight Dispatch | Text Adventure Hall | GPT-5.6 sol ultra / Codex | playable |
| 008 | Orbit Cadence | Rhythm Audio Hall | Grok 4.5 / Grok Build | playable |

The canonical variant, run-record paths, device policy, and full provenance for every entry live in `games/manifest.json` and `games/<slug>/game.json`. All current entries declare `humanCodeEdits: false`.

## Framework Pieces

- `games/manifest.json`: collection index
- `halls/halls.json`: hall structure
- `schemas/`: metadata shapes
- `scripts/`: validation and scaffolding
- `templates/`: game, variant, run, and prompt templates
- `docs/`: policies and process docs

## Current Limitations

- Public hosting is configured through GitHub Pages: `https://aidong27.github.io/99-ai-games/`.
- Screenshot evidence varies by observation and is only claimed when the corresponding metadata marks a real repository capture as current.
- Orbit Cadence has no verified gameplay screenshot yet; its cover poster is promotional artwork only.
- Physical handset QA is not claimed for the current PC-first archive.
- Future model comparisons should be added only when real variants exist.
