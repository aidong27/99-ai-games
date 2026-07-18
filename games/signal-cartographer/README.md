# Signal Cartographer

Signal Cartographer is Observation 001 / Game 001 in 99 AI Games.

The current canonical version is **Signal Cartographer: Deep Field**, a PC-first tactical map survival game where the player scans hostile lanes, collects fragments, drops limited beacons, and reaches an exit before signal integrity fails. As an archive entry, its role is to serve as the first playable observation sample of AI game-making capability.

## Metadata

- Hall: Survival Strategy Hall
- Slot type: benchmark
- Archive role: first playable observation sample
- Status: playable
- Canonical variant: `codex-signal-cartographer-deep-field-2026-06-03`
- Model label: `GPT-5 (Codex session)`
- Agent/tool: `Codex`
- Created date: `2026-06-03`
- Human code edits: `false`

The earlier `codex-gpt-5-5-xhigh-2026-05-31` implementation remains archived as the historical baseline variant and was not deleted.

## Local Play

From the repository root:

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/games/signal-cartographer/
```

## Controls

- Move: WASD or Arrow keys
- Set route target: click or drag on the chart
- Scan: E or Scan button
- Beacon: Space or Beacon button
- Restart: R
- Pause: P

## Variants And Runs

This folder is the official Observation 001 / Game 001 slot. Future versions made by different models should be added as model variants under `variants/`. Generation, revision, validation, and comparison attempts should be recorded under `runs/`.

Variants and runs do not consume new game numbers.
