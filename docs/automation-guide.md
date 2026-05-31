# Automation Guide

The project intentionally avoids a heavy build system. Automation should stay plain Node.js where possible.

## Validation

```bash
node scripts/validate-halls.mjs
node scripts/validate-games.mjs
node scripts/generate-index.mjs --check
```

## Generate Markdown Index

```bash
node scripts/generate-index.mjs --write
```

## Scaffold A Planned Game

```bash
node scripts/new-game.mjs --number=2 --slug=my-game --title="My Game" --hall=puzzle-logic --slot-type=normal
```

After scaffolding, update:

- `games/manifest.json`
- `halls/halls.json`
- game brief

## Scaffold A Variant

```bash
node scripts/new-variant.mjs --game=signal-cartographer --variant-id=model-name-date --model="Model" --agent="Agent"
```

After scaffolding, update:

- game `variants` list
- manifest `variants` list
- run records after generation starts

## GitHub Workflow

The validation workflow checks metadata and JavaScript syntax. It does not replace browser playtesting.
