# Signal Cartographer

Signal Cartographer is Observation 001 / Game 001 in 99 AI Games.

It is a Canvas survival-navigation game where the player maps a hostile signal field, collects fragments, drops beacons, and reaches an exit before signal integrity fails. As an archive entry, its role is to serve as the first playable observation sample of AI game-making capability.

## Metadata

- Hall: Survival Strategy Hall
- Slot type: benchmark
- Archive role: first playable observation sample
- Status: playable
- Canonical variant: `codex-gpt-5-5-xhigh-2026-05-31`
- Model label: `GPT-5.5 xhigh`
- Agent/tool: `Codex`
- Created date: `2026-05-31`
- Human code edits: `false`

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
- Steer: drag or press on the chart
- Beacon: Space or Beacon button
- Restart: R
- Pause: P

## Variants And Runs

This folder is the official Observation 001 / Game 001 slot. Future versions made by different models should be added as model variants under `variants/`. Generation, revision, validation, and comparison attempts should be recorded under `runs/`.

Variants and runs do not consume new game numbers.
