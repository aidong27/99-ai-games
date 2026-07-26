# Migration

## Before

The original project asked different AI systems to make different games. It
organized 11 playable experiments across nine Halls, with heterogeneous briefs,
variants, and verification. That archive was useful historically but could not
show controlled model evolution.

## After

Protocol 99 introduces:

- one versioned canonical prompt and hash lock;
- Entry/Run/Evaluation records;
- immutable Raw and separate Repair Runs;
- generic browser state/test contract;
- real evidence capture and transparent scoring;
- generated global indexes and public cards;
- same-version, same-hash comparison;
- cross-Agent Autopilot instructions;
- one CI/Pages quality gate.

## Compatibility

The original games stay in `games/`; no bulk move or source rewrite is needed.
Legacy launcher URLs and generated promo pages remain valid. The public
Library, Observation, and Play surfaces now identify them as the
Pre-Benchmark Era.

New standardized results live in `entries/`. No Legacy game is copied into that
tree or represented as a Protocol 99 result.

## Data Transition

Old global data remains the Legacy source:

```text
games/manifest.json
halls/halls.json
games/<slug>/game.json
```

New local records are the benchmark source:

```text
benchmarks/
entries/<entry>/entry.json
entries/<entry>/runs/<run>/run.json
```

Public benchmark manifests and statistics are generated, not maintained in
parallel by hand.

## PWA Transition

The previous service worker could retain stale launcher modules across a major
information-architecture change. The site now ships a one-time retirement
worker and launcher cleanup that unregister old workers and removes
`99ag-shell-*` caches. GitHub Pages remains a normal static deployment.

## Rollback

The migration is isolated in one branch/PR. Legacy source is untouched. A
rollback can restore the previous launcher and automation without recovering or
moving game files. Do not rewrite shared branch history to roll back.
