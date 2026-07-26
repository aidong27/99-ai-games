# 99 AI Games Agent Protocol

This is the authoritative instruction file for every AI coding Agent working in
this repository. Tool-specific instruction files point here and must not
duplicate or override this protocol.

## Trigger

When the user says any equivalent of:

- 做游戏
- 创建一个新游戏
- 参加当前挑战
- Build the game
- Create a benchmark entry
- Make a new entry

execute the **Autopilot Entry Protocol** below. Do not ask the user to choose a
game idea. The current locked Challenge already defines the task.

## Project Model

99 AI Games compares an **AI coding system**: model + Agent + native tool
environment. It does not claim to isolate a base model or produce a scientific
intelligence ranking.

- **Challenge**: one immutable, versioned build brief.
- **Entry**: one AI coding system participating in that Challenge.
- **Run**: Raw, Standard Repair, regeneration, human-curated, or cross-agent.
- **Evaluation**: machine checks and real browser evidence, plus optional
  independent reviews.
- **99**: the target number of standardized Entries.

The eleven games under `games/` are the frozen **Pre-Benchmark Era** archive.
They are not Protocol 99 Entries and do not count toward the target.

## Non-Negotiable Integrity Rules

1. Read `benchmarks/current.json`, the selected Challenge, and this file before
   writing anything.
2. Record your identity truthfully. Use `unknown` when exact provider, model, or
   Agent details are not available. Never infer a precise version.
3. Do not inspect, copy, import, or adapt another Entry's `game/` or `tests/`.
   Public metadata and Finalized reports may be read.
4. Modify only paths listed in the generated Work Order, plus generated outputs
   written by repository generators.
5. Never modify a Challenge version, another Entry, `games/**`, Legacy
   provenance, or a Finalized Raw Run.
6. Never hand-edit generated manifests, benchmark pages, promo pages, social
   cards, discovery files, or generated indexes.
7. Never fabricate a screenshot, score, test pass, model identity, review,
   provenance claim, user count, download count, or popularity metric.
8. Never add a test-only teleport, auto-win, invulnerability switch, hidden
   state mutator, direct victory command, or equivalent bypass.
9. A public Git repository cannot enforce perfect source blindness. This is a
   behavior and path-scope protocol, not a claim of an absolute sandbox.
10. Do not mark a Run playable, verified, or finalized unless the real command
    completed successfully.

## Autopilot Entry Protocol

### 1. Prepare

```bash
npm ci
npm run agent:status
```

Confirm that `node scripts/check.mjs` passes before starting when practical. If
the Git worktree is not clean or an active `.agent/current.json` exists, stop
rather than mixing work or overwriting another Run.

### 2. Declare Identity and Start

Prefer explicit declarations:

```bash
npm run agent:start -- \
  --provider="<provider>" \
  --model="<model>" \
  --agent="<agent>"
```

The command also reads `AI_PROVIDER`, `AI_MODEL`, `AI_MODEL_VERSION`,
`AI_AGENT`, and `AI_AGENT_VERSION`. Missing values remain `unknown`.

`agent:start` must:

- validate the current Challenge Lock;
- allocate the smallest free number from 001 through 099;
- create one Entry and one Raw Run;
- snapshot the canonical prompt;
- record the baseline commit and environment;
- write `.agent/current.json` and `WORK-ORDER.md`;
- print the allowed paths.

Useful options are `--dry-run`, `--json`, `--number`, `--repo`, and `--help`.

### 3. Build

Read the assigned `WORK-ORDER.md`, `prompt-snapshot.md`, canonical prompt, and
`TEST-CONTRACT.md`. Implement only in:

```text
entries/<entry-directory>/runs/<run-id>/game/
entries/<entry-directory>/runs/<run-id>/tests/
```

Runtime requirements:

- local HTML, CSS, JavaScript, Canvas, SVG, DOM, or Web Audio only;
- no backend, CDN, remote asset, analytics, external API, or runtime npm package;
- desktop target plus usable 390 x 700 layout;
- deterministic `?seed=99`;
- real `window.__P99__` read-only state;
- required `data-p99-*` hooks;
- participant win and defeat tests using the central read-only SDK.

The Agent may run and debug its own current Run repeatedly. It must not seek a
human design decision or inspect another Entry for implementation ideas.

### 4. Verify and Repair the Current Run

```bash
npm run agent:verify
```

Verification performs static/security checks, starts a local server, drives
real Chromium with public controls, captures screenshots, console and network
logs, proves pause/restart/defeat/victory/two-runs-in-one-tab behavior, and
writes a transparent Automated Compliance report.

If it fails, read the report, fix only the current Run, and repeat
`npm run agent:verify`. Do not weaken the Challenge, verifier, tests, SDK, or
quality gate to make a game pass. If Chromium is unavailable, leave the Run as
`pending-browser-verification`; do not fabricate evidence.

### 5. Finalize

```bash
npm run agent:finalize
```

Finalize is allowed only for a verified Run. It locks Source and Evidence
SHA-256 values, updates local Entry/Run metadata, regenerates all public
indexes/cards/pages, validates integrity, and runs the unified quality gate. A
failed quality gate rolls metadata back to the verified state.

After Finalize:

```bash
npm run check
git diff --check HEAD
```

Review that no Challenge, Legacy game, or unrelated Entry changed. If Git and
GitHub permissions are available, create a dedicated branch, commit the full
Entry and generated outputs, push it, and open a reviewable pull request. Never
hide failing checks or force-push over unrelated work.

## Repair Protocol

Never modify a Finalized Raw Run. Start from an immutable parent:

```bash
npm run agent:repair -- \
  --entry="<entry-id>" \
  --from-run="<run-id>" \
  --type=standard-repair
```

The command copies the parent to a new Run, records the parent Source Hash, and
creates a new Work Order. Standard Repair input is the standardized machine
report. A human-curated or cross-agent repair must use the corresponding
explicit Run type and actual modifier identity. Every repair repeats
verify → finalize and remains separate from Raw comparison.

Commit the Finalized parent and generated outputs before starting Repair;
`agent:repair` requires a clean worktree.

## Ownership Boundaries

| Path | Owner / rule |
|---|---|
| `benchmarks/` | Locked protocol; never alter during an Entry |
| `entries/<assigned>/runs/<active>/game/` | Current participant implementation |
| `entries/<assigned>/runs/<active>/tests/` | Current participant public-control tests |
| `entries/**/evidence/` | Written by verification, never fabricated |
| `games/` | Frozen Legacy implementations; read public metadata only |
| `src/`, `styles/`, root HTML | Launcher maintainers, not Entry participants |
| `scripts/`, `schemas/` | Benchmark maintainers, not Entry participants |
| generated manifests/pages/cards | Generators only |
| `.agent/` | Local Work Order state; never commit |

## Required Completion Evidence

A formal Finalized Run requires:

- matching Canonical Prompt Hash and prompt snapshot;
- source inventory and Source SHA-256;
- passed browser report and Evidence SHA-256;
- real title, gameplay, first-relay, and victory PNG screenshots;
- console and network reports;
- real public-control victory and defeat;
- transparent rubric results;
- no external runtime request;
- no path-scope violation;
- full `node scripts/check.mjs` pass.

Anything less remains building, pending, or failed.
