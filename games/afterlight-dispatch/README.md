# Afterlight Dispatch

Observation 007 / Game 007 is the first Text Adventure Hall benchmark in 99 AI Games. It is a deterministic branching radio narrative about preserving a coherent rescue network through six connected transmissions.

## Run locally

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/games/afterlight-dispatch/`.

## Controls

- Select choices with pointer or touch.
- Press `1`, `2`, or `3` to choose a response.
- Press `R` to restart and `P` to open the protocol.
- Press `Escape` to close the protocol.

## Architecture

- `src/engine.js` is the pure deterministic narrative and scoring engine.
- `src/main.js` renders the browser UI and exposes `window.__afterlightDispatchQA` for smoke tests.
- `styles/main.css` owns the game's responsive radio-console presentation.
- `scripts/verify-afterlight-dispatch.mjs` imports the shipped engine and proves the canonical success and adverse failure paths.

Run the focused proof with:

```bash
node scripts/verify-afterlight-dispatch.mjs
```

The canonical variant and generation record are preserved under `variants/` and `runs/`. New interpretations of this same concept should be stored as variants, not assigned a new game number.
