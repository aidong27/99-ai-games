# Protocol 99 v1

Protocol 99 v1 is the first frozen common challenge in 99 AI Games.

## Objective

Build one original, self-contained 2D browser game in which a repair drone:

1. carries at most one of exactly three data cores;
2. delivers one core to each of exactly three relays using explicit interaction;
3. survives two behaviorally distinct hazards using integrity;
4. uses exactly one limited primary active ability;
5. experiences a material world change after every relay;
6. physically enters the exit after all relays unlock it.

The full requirements are authoritative only in
[`PROMPT.md`](../benchmarks/protocol-99/v1/PROMPT.md).

## Fixed Scope

- one compact top-down arena or connected map;
- intended first playthrough of roughly 3–8 minutes;
- title, instructions, gameplay HUD, pause, victory, defeat, and restart;
- WASD/arrows, E, Space/Shift, Escape/P, and R;
- deterministic `?seed=99`;
- static local runtime below 5 MiB unless a documented validator exception exists;
- no backend, runtime dependency, remote request, external API, or copyrighted
  franchise asset.

## Browser Contract

The game exposes:

```js
window.__P99__ = {
  contractVersion: "1.0",
  getState()
};
```

`getState()` is serializable and read-only. It reports real phase, seed,
integrity, carried core, collected cores, relays, world stage, ability state,
exit lock, and elapsed time. Meaningful transitions dispatch
`protocol99:statechange`.

The visible UI uses the required `data-p99-action` and `data-p99-ui` hooks. The
contract may expose observable facts, but never state mutation or a test bypass.

## Lock

[`LOCK.json`](../benchmarks/protocol-99/v1/LOCK.json) records SHA-256 values for
the canonical prompt, `challenge.json`, `rubric.json`, and `TEST-CONTRACT.md`.
`node scripts/validate-benchmark.mjs` and the unified quality gate recompute
them. Once an official v1 Entry exists, changes require Protocol 99 v2 rather
than an in-place edit.

## Completion

A game is not a formal Entry merely because it loads. Its Raw Run must pass real
Chromium win, defeat, pause, restart, determinism, mobile baseline, security,
network, integrity, and evidence checks, then Finalize successfully.
