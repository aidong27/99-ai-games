# Project Summary

## Name

99 AI Games

## Concept

99 AI Games is a long-term archive of small browser games made by Codex or other AI agents. It preserves playable games, model provenance, variants, and run records so future readers can see how AI game-making changes over time.

## Core Archive Principle

The 99 game slots represent 99 game concepts, not 99 AI generations. A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

## Current Game

Game 001 is **Signal Cartographer**.

- Hall: Survival Strategy Hall
- Slot type: benchmark
- Status: playable
- Canonical variant: `codex-gpt-5-5-xhigh-2026-05-31`
- Model label: `GPT-5.5 xhigh`
- Agent/tool: `Codex`
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

- Public hosting is not configured yet.
- Real screenshots still need to be captured.
- Game 001 balance needs more playtesting.
- Future model comparisons should be added only when real variants exist.
