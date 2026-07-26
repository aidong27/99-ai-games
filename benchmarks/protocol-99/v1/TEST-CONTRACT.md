# Protocol 99 v1 Test Contract

This contract turns the canonical prompt into observable browser checks. It
does not add creative requirements and does not replace `PROMPT.md`.

## Runtime surface

The game entry point is `game/index.html`. Verification serves the repository
over a local HTTP origin and opens the game with `?seed=99`.

The page must expose:

```js
window.__P99__ = {
  contractVersion: "1.0",
  getState() {
    return {
      phase,
      seed,
      integrity,
      maxIntegrity,
      carryingCore,
      coresCollectedTotal,
      relaysActivated,
      worldStage,
      abilityStatus,
      exitUnlocked,
      elapsedMs
    };
  }
};
```

`getState()` is read-only. The central SDK deep-clones its return value before
making it available to participant tests.

For machine-observable scoring, `getState()` also exposes a read-only
`diagnostics` object:

```js
{
  objective: { coreCount: 3, relayCount: 3, exitCount: 1 },
  hazards: [
    { id: "stable-id", behavior: "short factual behavior description" },
    { id: "stable-id", behavior: "different factual behavior description" }
  ],
  ability: { id: "stable-id", limitation: "factual cooldown/cost/risk" },
  worldSignature: "a stable value that changes after each relay"
}
```

These fields must describe the real implementation. They expose facts but do
not mutate the game and do not replace browser playthrough verification.

## Allowed participant-test API

Entry tests import only:

```js
import { defineProtocolTest } from "../../../../../benchmarks/protocol-99/test-sdk/index.mjs";
```

The harness passed to a test exposes public-player operations:

- `start()`
- `restart()`
- `pause()` and `resume()`
- `press(key)`
- `hold(key, durationMs)`
- `clickAction(action)`
- `click(selector)`
- `state()`
- `waitForState(expected, options)`
- `checkpoint(name)`

It does not expose the Playwright page, arbitrary browser evaluation, direct
game objects, or mutation helpers.

## Required entry tests

Every Run includes:

- `tests/playthrough.spec.mjs`, exporting a test that reaches `phase: "won"`
  through public controls and records `relay-1` and `victory` checkpoints.
- `tests/defeat.spec.mjs`, exporting a test that reaches `phase: "lost"`
  through public controls.

The repository runner separately verifies start, pause/resume, restart,
deterministic initial state, required hooks, mobile overflow, external network
requests, console errors, and two same-tab winning runs.

## Prohibited test behavior

Entry tests may not:

- import Playwright directly;
- call `page.evaluate`, `addInitScript`, CDP, or browser internals;
- reference `window.__P99__` directly;
- alter query parameters except through the SDK;
- write game state or call a game-internal function;
- inject input listeners, timers, styles, or scripts;
- use a teleport, auto-win, invulnerability, or hazard-disable mechanism;
- read another Entry's game or test source.

The static test validator rejects common bypasses. Browser evidence and
sandboxing provide additional defense, but this public-repository protocol is
not described as an absolute blind-execution sandbox.

## Required evidence

Successful verification writes real, current-run evidence:

- `report.json`
- `console.json`
- `network.json`
- `file-inventory.json`
- `screenshots/title.png`
- `screenshots/gameplay.png`
- `screenshots/relay-1.png`
- `screenshots/victory.png`

The report records source and prompt hashes, Chromium version, seed, viewports,
test time, raw check booleans, score contributions, and actionable failures.

If Chromium cannot run, verification fails and the Run remains
`pending-browser-verification`. Missing evidence is never synthesized.

## Score boundary

The runner computes only the versioned **Automated Compliance Score** from
`rubric.json`. Player Experience Review and Engineering Review are independent,
optional, named reviews. Absence is rendered as "Not yet reviewed", never as a
fabricated number.
