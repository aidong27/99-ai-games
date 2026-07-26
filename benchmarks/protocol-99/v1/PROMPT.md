# Protocol 99 v1 — Canonical Build Prompt

Build one complete, original, self-contained 2D browser game for the Protocol 99 benchmark in the run directory assigned by the repository automation.

## Player role

The player controls a repair drone inside a damaged relay facility.

## Core objective

The arena contains:

- exactly three portable data cores;
- exactly three inactive relay nodes;
- one locked extraction exit.

The player may carry at most one data core at a time.

To activate a relay, the player must transport a data core to that relay and perform an explicit interaction. Activating the relay consumes the carried core.

After all three relays have been activated, the extraction exit must unlock. The player wins only by physically reaching and entering the unlocked exit.

## Required gameplay systems

The game must include all of the following:

1. Real-time two-dimensional movement in a compact top-down arena.
2. Player integrity represented by a value from zero to a defined maximum.
3. A clear defeat state when integrity reaches zero.
4. At least two hazards with meaningfully different behavior. Color-only variants do not count.
5. Exactly one primary active player ability, such as a dash, shield, pulse, decoy, scan, or other original mechanic.
6. The active ability must have a real limitation such as cooldown, energy cost, charge count, risk, or positioning requirement.
7. Three observable world stages corresponding to zero, one, two, and three activated relays.
8. Every relay activation must materially change gameplay or the playable world. A text message, score increase, or color change alone does not count.
9. A locked-exit state and a visibly unlocked extraction state.
10. A complete game loop that can be restarted without reloading the browser tab.

## Scope budget

The intended successful playthrough length is approximately three to eight minutes for a first-time player.

The implementation must remain focused:

- one primary arena or compact connected map;
- no campaign;
- no multi-level progression;
- no online multiplayer;
- no backend;
- no account system;
- no external AI API;
- no large dialogue tree;
- no upgrade tree;
- no inventory system beyond carrying the required data core;
- no more than one optional major feature beyond the required systems.

The optional major feature may add creative identity, but it must not replace or obscure the required game loop.

## Required interface states

The game must provide:

- title or start state;
- concise controls and objective instructions;
- active gameplay HUD;
- pause state;
- victory state;
- defeat state;
- restart action.

The HUD must clearly communicate:

- integrity;
- whether a data core is being carried;
- number of activated relays out of three;
- active ability availability;
- extraction lock or unlock status.

## Standard controls

The game must support:

- movement: WASD and arrow keys;
- interaction: E;
- active ability: Space or Shift;
- pause: Escape or P;
- restart after victory or defeat: R and a visible button;
- pointer input for menus and visible buttons.

Touch gameplay is optional, but the page must not horizontally overflow or become unusable at a 390 × 700 viewport. Desktop gameplay is the required benchmark target.

## Accessibility baseline

The implementation must include:

- visible keyboard focus;
- no essential information communicated by color alone;
- readable text contrast;
- support for `prefers-reduced-motion`;
- a mute control if audio is present;
- no rapidly flashing content.

## Determinism

The game must support a deterministic benchmark seed.

When the URL contains `?seed=99`, the same initial game state and hazard behavior must be produced on repeated runs.

Random behavior without the seed parameter is allowed, but the benchmark test path uses seed 99.

## Browser test contract

The page must expose a read-only benchmark state interface:

```js
window.__P99__
```

It must expose:

```js
{
  contractVersion: "1.0",
  getState()
}
```

`getState()` must return a plain serializable object containing at least:

```js
{
  phase: "title" | "playing" | "paused" | "won" | "lost",
  seed: 99,
  integrity: number,
  maxIntegrity: number,
  carryingCore: boolean,
  coresCollectedTotal: number,
  relaysActivated: number,
  worldStage: number,
  abilityStatus: "ready" | "cooldown" | "unavailable",
  exitUnlocked: boolean,
  elapsedMs: number
}
```

The state interface must reflect the real game state. It must not contain hidden auto-win commands, direct state mutation methods, test-only teleportation, invulnerability, fake completion states, or mechanisms that bypass normal gameplay.

The game must dispatch a browser CustomEvent named:

```text
protocol99:statechange
```

after meaningful state transitions.

Required visible elements must use these hooks where applicable:

```text
data-p99-action="start"
data-p99-action="pause"
data-p99-action="restart"
data-p99-ui="instructions"
data-p99-ui="hud"
data-p99-ui="victory"
data-p99-ui="defeat"
```

## Playthrough evidence

The implementation must include deterministic Playwright tests for:

1. starting a run;
2. pausing and resuming;
3. restarting;
4. reaching a real defeat state;
5. completing a real winning playthrough using public player controls.

The tests may read benchmark state through the repository-provided read-only test SDK.

The tests must not mutate the game state, call hidden game internals, inject a win, teleport the player, disable hazards, or invoke test-only cheats.

## Technical constraints

- The game must run from a local static HTTP server.
- Runtime code must use local HTML, CSS, JavaScript, Canvas, SVG, DOM, or Web Audio.
- No remote network requests.
- No runtime npm dependencies.
- No third-party CDN.
- No iframe embedding of remote content.
- No copyrighted franchise characters, logos, music, or copied game assets.
- No `eval`, `new Function`, dynamic remote imports, service-worker registration, WebSocket, EventSource, or external analytics.
- Total committed runtime size for the game should remain below 5 MiB unless the repository validator documents a justified exception.
- The game must load without uncaught console errors.
- Restarting and replaying the game twice in one tab must not duplicate loops, controls, timers, or event listeners.

## Creative freedom

You may choose:

- visual language;
- setting details;
- arena layout;
- hazard design;
- active ability;
- animation style;
- local procedural visuals;
- local generated sound;
- title subtitle;
- narrative flavor;
- the optional major feature.

Creative decisions must preserve the fixed objective and scope.

## Integrity rules

Do not inspect, copy, import, or adapt the game source code of previous benchmark entries.

Do not modify the benchmark definition, another entry, another run, or legacy game source.

Do not fabricate screenshots, test reports, model identity, completion evidence, or provenance.

All gameplay implementation for this run must be created inside the assigned run directory.

Complete the implementation, write the required deterministic browser tests, run the repository verification workflow, fix your own failures, and finalize the entry only when the real checks pass.
