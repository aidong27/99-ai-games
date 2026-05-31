# 99 AI Games Project Plan

## Purpose

99 AI Games is a long-term archive of browser games made by Codex or other AI agents. It is not a sprint to produce 99 games quickly. It is a structured record of how AI game-making improves over time.

## Core Rule

The 99 game slots represent 99 game concepts, not 99 AI generations. A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

## Maintainer Role

The maintainer:

- chooses project direction
- writes prompts
- tests builds
- publishes releases
- records provenance
- does not hand-write or hand-edit game code

## Archive Model

1. **Game Slot**: one official game concept.
2. **Model Variant**: one version of that concept made by a specific model or agent.
3. **Run Record**: one generation, revision, validation, benchmark, or comparison attempt.
4. **Game Hall**: one of 9 category halls, each with capacity for 11 official game concepts.

## Current Slot

Game 001 is **Signal Cartographer**.

- Hall: Survival Strategy Hall
- Slot type: benchmark
- Status: playable
- Canonical variant: `codex-gpt-5-5-xhigh-2026-05-31`
- Model label: `GPT-5.5 xhigh`
- Agent/tool: `Codex`
- Human code edits: `false`

## Growth Strategy

Do not add placeholders for all 99 slots. Add game concepts gradually when an AI agent will actually build, revise, or compare something.

Use halls to preserve variety:

- arcade reaction
- puzzle logic
- survival strategy
- card strategy
- text adventure
- clicker management
- physics experiment
- rhythm audio
- AI meme

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

1. Keep Game 001 stable.
2. Capture real screenshots.
3. Enable public static hosting if desired.
4. Add a first comparison variant only when there is a meaningful model comparison to record.
5. Add Game 002 after the framework has been tested on Game 001.
