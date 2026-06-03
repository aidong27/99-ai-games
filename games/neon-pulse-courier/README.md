# Neon Pulse Courier

Observation 003 / Game 003 in **99 AI Games**.

Neon Pulse Courier is a PC-first arcade reaction benchmark for the Arcade Reaction Hall. It tests short-loop clarity, input feel, rhythmic warning readability, score feedback, combo pressure, dash timing, and difficulty ramping.

## Play

Open `games/neon-pulse-courier/` through the static site or local server.

Controls:

- Move: WASD / Arrow keys
- Mouse: click or drag to set a flight target
- Dash: Space
- Pause: P
- Restart: R

## Objective

Collect data parcels, avoid pulse barriers, preserve combo, and survive the 75-second run until the extraction window opens. Pulse barriers show amber warning states before turning dangerous.

## Archive Metadata

- Number: 3
- Hall: Arcade Reaction Hall
- Slot type: benchmark
- Canonical variant: `codex-neon-pulse-courier-2026-06-03`
- Agent: Codex
- Human code edits: `false`

## QA Hooks

The game exposes:

```js
window.__neonPulseCourierQA
```

Available helpers include `start()`, `pause()`, `restart()`, `getSnapshot()`, `setPlayerPosition(x, y)`, `collectParcel()`, `triggerFailure()`, and `forceCompleteRun()`.
