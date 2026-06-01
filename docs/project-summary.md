# Project Summary

## Name

99 AI Games

## Concept

99 AI Games is a long-term AI game-making evolution archive. It preserves playable observation samples, model provenance, variants, and run records so future readers can see how AI game-making changes over time.

## Core Archive Principle

The 99 game slots represent 99 observation samples, not 99 AI generations. A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

The games are playable. The real exhibit is the AI that made them.

## Current Games

Observation 001 / Game 001 is **Signal Cartographer**.

- Hall: Survival Strategy Hall
- Slot type: benchmark
- Archive role: first playable observation sample
- Status: playable
- Canonical variant: `codex-gpt-5-5-xhigh-2026-05-31`
- Model label: `GPT-5.5 xhigh`
- Agent/tool: `Codex`
- Created date: `2026-05-31`
- Human code edits: `false`

Observation 002 / Game 002 is **Lumen Lattice**.

- Hall: Puzzle Logic Hall
- Slot type: benchmark
- Archive role: first Puzzle Logic Hall observation sample
- Status: playable
- Canonical variant: `claude-opus-4-8-2026-05-31`
- Model label: `Claude Opus 4.8`
- Agent/tool: `Claude Code`
- Created date: `2026-05-31`
- Human code edits: `false`

## Framework Pieces

- `games/manifest.json`: collection index
- `halls/halls.json`: hall structure
- `schemas/`: metadata shapes
- `scripts/`: validation and scaffolding
- `templates/`: game, variant, run, and prompt templates
- `docs/`: policies and process docs

## Current Limitations

- Public hosting is configured through GitHub Pages: `https://aidong27.github.io/99-ai-games/`.
- Verified local screenshots are included for Observation 001 and Observation 002.
- Observation 001 and Observation 002 need more real playtesting notes.
- Future model comparisons should be added only when real variants exist.
