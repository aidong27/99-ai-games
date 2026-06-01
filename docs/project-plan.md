# 99 AI Games Project Plan

## Purpose

99 AI Games is a long-term AI game-making evolution archive. It is not a sprint to produce 99 games quickly. It is a structured record of how AI agents improve at game design, logic, coding, polish, debugging, controls, accessibility, and creative judgment over time.

## Core Rule

The 99 game slots represent 99 observation samples, not 99 AI generations. A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

The games are playable. The real exhibit is the AI that made them.

## Maintainer Role

The maintainer:

- chooses project direction
- writes prompts
- tests builds
- publishes releases
- records provenance
- does not hand-write or hand-edit game code

## Archive Model

1. **Game Slot / Observation Sample**: one official playable experiment.
2. **Model Variant**: one version of that concept made by a specific model or agent.
3. **Run Record**: one generation, revision, validation, benchmark, or comparison attempt.
4. **Game Hall**: one of 9 AI capability observation categories, each with capacity for 11 observation samples.

## Current Slots

Observation 001 / Game 001 is **Signal Cartographer**.

- Hall: Survival Strategy Hall
- Slot type: benchmark
- Archive role: first playable observation sample
- Status: playable
- Canonical variant: `codex-gpt-5-5-xhigh-2026-05-31`
- Model label: `GPT-5.5 xhigh`
- Agent/tool: `Codex`
- Human code edits: `false`

Observation 002 / Game 002 is **Lumen Lattice**.

- Hall: Puzzle Logic Hall
- Slot type: benchmark
- Archive role: first Puzzle Logic Hall observation sample
- Status: playable
- Canonical variant: `claude-opus-4-8-2026-05-31`
- Model label: `Claude Opus 4.8`
- Agent/tool: `Claude Code`
- Human code edits: `false`

## Growth Strategy

Do not add placeholders for all 99 slots. Add observation samples gradually when an AI agent will actually build, revise, or compare something.

Use halls to observe different AI capabilities:

- arcade reaction: feedback, timing, input feel, difficulty curves
- puzzle logic: rules, constraints, state logic, solvability
- survival strategy: resource pressure, route planning, risk feedback
- card strategy: probability, drafting, turn structure, strategic readability
- text adventure: branching narrative, state memory, tone, meaningful choices
- clicker management: economy loops, scaling, automation
- physics experiment: simulation feel, spatial reasoning, cause/effect
- rhythm audio: timing windows, pattern memory, input precision
- AI meme: self-reference, humor, weird failure modes

## Quality Bar

A game can be marked playable only when:

- it loads from a local static server
- the launcher can open it
- the primary game surface renders
- documented controls work
- metadata matches the real source state
- browser console checks are clean
- desktop and mobile layouts do not overflow horizontally
- variants and run records are updated

## Automation

Use plain Node.js scripts:

```bash
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/generate-index.mjs --check
```

Use `templates/` and `templates/prompts/` for future agent tasks.

## Near-Term Plan

1. Keep Observation 001 and Observation 002 stable.
2. Keep verified screenshots current when playable samples change.
3. Enable public static hosting with GitHub Pages.
4. Add a first comparison variant only when there is a meaningful model comparison to record.
5. Write the Game 003 benchmark brief before generating any new game source.
