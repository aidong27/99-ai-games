# Game 005 Brief: Gravity Atlas

## Concept

A PC-first deterministic physics puzzle for the Physics Experiment Hall. Each level is a
**gravity plate**: a 16:9 field holding masses (attractors), repulsors, void zones, a
launch pad, and a target ring. The player drags from the pad to aim and set power, then
releases to fire a probe whose path is bent by the field. Reach the ring within the
plate's **shot budget** to clear it; clear all six plates to complete the atlas.

## Why this is a Physics Experiment Hall observation sample

The hall observes AI ability in simulation feel, spatial reasoning, cause/effect, and
sandbox tuning. Gravity Atlas makes those qualities inspectable:

- **The physics is one shared pure module.** `src/engine.js` contains the integrator and
  all plate data, imported verbatim by both the browser page and the committed Node
  verifier — what is proven is exactly what is played.
- **Completability is machine-verified, not hoped for.** Each plate embeds a reference
  launch vector found by random search through the real engine.
  `node scripts/verify-gravity-atlas.mjs` replays them and asserts every plate ends in a
  target hit within budget and under the power cap. Plate V's first layout failed this
  bar (unsolvable in 400k samples) and was redesigned — the proof shaped the design.
- **Determinism by construction.** Fixed timestep (1/120 s), semi-implicit Euler,
  softened inverse-square gravity, and no transcendental functions in the integration
  loop, so a launch vector replays identically across runs and runtimes.
- **Cause/effect is readable.** A short dotted plotter previews only the first moments of
  the path (the rest is discovery), a faint ghost shows the previous attempt, and
  outcomes are named (target, mass core, void, out of bounds, timeout).

## The six plates

1. **Open Field** — no gravity; teaches aim and power.
2. **One Mass** — a single attractor bends the path to an offset target.
3. **Twin Masses** — a two-well channel; thread it or swing wide.
4. **The Gate** — void zones force a curved route through a gap.
5. **Repulsor** — a pushing mass plus a catching mass, voids overhead.
6. **The Atlas** — three masses and narrow voids; one long curve.

Budgets run 4–7 shots with pars of 1–3; running out of shots fails the run, finishing all
plates wins it, and the score rewards spare shots and par-or-under clears.

## Scope

- 6 plates, deterministic engine, shot budgets, par scoring, pause/help, restart.
- PC-first: mouse drag aiming with arrow-key fine control, Space fire, tuned for
  1440x900 and 1920x1080. Mobile is a no-overflow baseline (drag works as touch).
- No external assets, no build step, no network calls.

## Provenance intent

Evidence of what Claude Fable 5 (model label maintainer-declared), driven through Claude
Code, could design and implement as a physics benchmark whose central claim — every level
is completable — is enforced by a committed, re-runnable proof rather than by assertion.
