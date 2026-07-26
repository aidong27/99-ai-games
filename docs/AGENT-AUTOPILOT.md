# Agent Autopilot

[`AGENTS.md`](../AGENTS.md) is authoritative. This document explains the
implemented command flow; it does not override the protocol.

## Goal

A compatible coding Agent should be able to receive the repository plus
“Build the game”, discover the locked Challenge, create its own work area,
implement, test, repair, capture real evidence, finalize, and prepare a
reviewable commit without manual manifest wiring.

## Environment

```bash
npm ci
npx playwright install chromium
npm run agent:status
```

Identity may be supplied with CLI flags or:

```text
AI_PROVIDER
AI_MODEL
AI_MODEL_VERSION
AI_AGENT
AI_AGENT_VERSION
```

Unknown values stay `unknown`; exact versions are never guessed.

## Start

```bash
npm run agent:start -- \
  --provider="<provider>" \
  --model="<model>" \
  --agent="<agent>"
```

`agent:start` verifies `LOCK.json`, allocates the smallest free 001–099 number,
creates the Entry and Raw Run, snapshots the canonical prompt, records the
baseline commit, and writes:

```text
.agent/current.json
entries/<entry-directory>/entry.json
entries/<entry-directory>/runs/<run-id>/run.json
entries/<entry-directory>/runs/<run-id>/WORK-ORDER.md
entries/<entry-directory>/runs/<run-id>/prompt-snapshot.md
entries/<entry-directory>/runs/<run-id>/game/
entries/<entry-directory>/runs/<run-id>/tests/
```

Use `--dry-run` to inspect allocation and `--json` for machine-readable output.
The local `.agent/` state is ignored by Git. A write-mode start requires a clean
worktree and no active Work Order.

## Build Boundary

The Work Order lists allowed paths. The participant writes only the assigned
`game/` and `tests/`. It must not read another Entry's implementation or edit
the Challenge, Legacy games, launcher, validators, SDK, or generated indexes.

Participant tests import the central SDK from
`benchmarks/protocol-99/test-sdk/`. They may send public keyboard/pointer input
and read `window.__P99__.getState()`. Arbitrary `page.evaluate`, direct state
mutation, teleportation, auto-win, invulnerability, or hidden controls are
rejected.

## Verify

```bash
npm run agent:verify
```

The verifier:

- checks path scope, required files, size, and static security findings;
- starts a local HTTP server;
- runs the participant playthrough and defeat scenarios in real Chromium;
- checks seed 99, hooks, pause, restart, active ability, world stages, mobile
  overflow, real defeat, real victory, and two runs in one tab;
- blocks external network requests and records attempted requests;
- captures console/page errors;
- captures title, gameplay, first-relay, and victory PNGs;
- writes `report.json`, `console.json`, `network.json`, and file inventory;
- computes the public 100-point Automated Compliance result.

Verification never edits game source or participant tests. A failure returns
non-zero and leaves an actionable report. The Agent repairs its current Run and
repeats verify. Without Chromium, the status is
`pending-browser-verification`, not passed.

## Finalize

```bash
npm run agent:finalize
```

Finalize requires a matching passed report. It verifies that source did not
change after verification, records Source/Evidence hashes, marks the Run
Finalized, regenerates public outputs, validates Entry integrity, and runs
`node scripts/check.mjs`. A quality-gate failure restores the previous verified
metadata.

After success, `.agent/current.json` is removed and the Raw Run is immutable.
Review the complete diff before committing.

## Repair

```bash
npm run agent:repair -- \
  --entry="<entry-id>" \
  --from-run="<finalized-run-id>" \
  --type=standard-repair
```

Repair copies a Finalized parent into a new Run, records its parent Run ID and
Source Hash, clears old evidence, and creates a new Work Order. It never edits
the parent. Supported explicit types are `standard-repair`, `regeneration`,
`human-curated`, and `cross-agent-repair`. Commit the Finalized parent first;
Repair also requires a clean worktree.

## Failure Rules

- Challenge Lock mismatch: stop; do not rewrite the lock.
- Number range full: stop; do not create Entry 100.
- Active Work Order present: resolve it; do not overwrite it.
- Path-scope error: revert only the participant's out-of-scope change.
- Browser unavailable: keep pending status; do not invent screenshots.
- Verification failure: repair the active Run, not the verifier.
- Finalize failure: preserve the verified Run and report the actual blocker.
