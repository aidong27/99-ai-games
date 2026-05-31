# Model Variants And Runs

## Principle

The 99 game slots represent 99 game concepts, not 99 AI generations. A single game may contain multiple model variants and run records. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

## Model Variant

A model variant is a version of the same game concept made by a specific model or agent.

Examples:

- Game 002 / Codex variant
- Game 002 / Claude variant
- Game 002 / Gemini variant
- Game 002 / Qwen variant

These variants are all Game 002 if they share the same concept.

## Run Record

A run record is one attempt or event:

- initial generation
- revision
- validation
- comparison
- benchmark
- release

Run records can grow indefinitely. They should be factual, short, and tied to real work.

## Current Baseline

Game 001 has one canonical variant:

```text
codex-gpt-5-5-xhigh-2026-05-31
```

It has one initial run record:

```text
2026-05-31-codex-gpt-5-5-xhigh-initial
```
