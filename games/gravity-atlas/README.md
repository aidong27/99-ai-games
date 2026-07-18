# Gravity Atlas

**Observation 005 / Game 005 — Physics Experiment Hall**

A PC-first deterministic physics puzzle. Drag from the launch pad to aim, release to
fire, and curve a probe through masses, repulsors, and void zones into the target ring —
within each plate's shot budget, across six gravity plates.

## Provenance

- Model label (maintainer-declared): **Claude Fable 5**
- Agent / tool: **Claude Code**
- Created: **2026-06-10**
- Canonical variant: `claude-fable-5-gravity-atlas-2026-06-10`
- Human code edits: **false**
- Slot type: **benchmark**

## Play locally

From the repository root:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173/games/gravity-atlas/>.

## Goal

Clear all **6 plates** by landing the probe in each target ring before the plate's shot
budget runs out. Spare shots and par-or-under clears raise the score.

## Reading a plate

- **Mass** (lime orb) — pulls the probe; its core destroys the probe.
- **Repulsor** (amber orb) — pushes the probe away.
- **Void zone** (dashed red) — erases the probe.
- **Target ring** (ivory) — reach it to clear the plate.

The dotted plotter previews only the first moments of the path; the rest of the curve is
discovery. A faint ghost line shows your previous attempt.

## Controls

- **Aim & power:** drag on the plate (direction = pad → pointer, distance = power)
- **Fine aim / power:** Arrow keys
- **Fire:** release the drag, or Space
- **Restart atlas:** R · **Pause / help:** P

## The completability proof

The physics lives in [`src/engine.js`](src/engine.js), a pure module imported verbatim by
both this page and the repository verifier. Each plate embeds a reference launch vector
found by search through the real engine; running

```bash
node scripts/verify-gravity-atlas.mjs
```

replays those vectors and asserts every plate ends in a target hit within budget. The
integrator is fixed-timestep with no transcendental functions, so the replay is
deterministic. In the browser, `window.__gravityAtlasQA.autoSolveShot()` fires the proven
vector for the current plate.

## QA hooks

```js
window.__gravityAtlasQA = {
  start(), restart(), getSnapshot(),
  setAim(vx, vy), fire(), fireVector(vx, vy),
  autoSolveShot(), simulate(levelIndex, vx, vy),
  forceWin(), forceLose()
};
```

`getSnapshot()` returns `mode`, `level`, `levelCount`, `plateName`, `shotsLeft`,
`shotsUsed`, `par`, `score`, `aim`, `probeActive`, `probe`, `lastOutcome`, `won`, `lost`.

## Verification

See [`runs/2026-06-10-claude-fable-5-gravity-atlas-initial.json`](runs/2026-06-10-claude-fable-5-gravity-atlas-initial.json).
The committed verifier passes (all six plates completable), and the project validators
pass. **Interactive browser smoke and real screenshots are pending maintainer QA** — none
are claimed, and no screenshots are declared in metadata.
