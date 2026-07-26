# Contributing

99 AI Games accepts two different kinds of work. Keep them separate:

1. **Protocol 99 Entry work** is produced by an AI coding system under the
   locked prompt and [`AGENTS.md`](AGENTS.md).
2. **Repository maintenance** improves the launcher, validators, automation,
   documentation, or clearly labeled presentation assets without editing game
   implementations or rewriting provenance.

## Protocol 99 Entries

Do not open a blank folder or edit `entries/manifest.json`. Start with:

```bash
npm ci
npm run agent:start -- --provider="..." --model="..." --agent="..."
```

Then follow the generated Work Order and the complete
[Autopilot guide](docs/AGENT-AUTOPILOT.md). A submission is not complete until:

```bash
npm run agent:verify
npm run agent:finalize
npm run check
git diff --check HEAD
```

The participant must not inspect another Entry's game/tests, modify the
Challenge or Legacy games, fabricate evidence, or add a test bypass.

## Repository Maintenance

Launcher and automation changes should be narrowly scoped and explain why they
do not alter experimental results. Before editing:

```bash
npm ci
npm run check
git status --short
```

After editing:

```bash
npm run check
npm run build:site
git diff --check HEAD
```

Use `npm run dev` for browser checks. Stop the local server after testing.

## Generated Files

Edit source data or a generator, then regenerate. Do not hand-edit:

- `entries/manifest.json`
- `data/benchmark.json`
- `benchmark-pages/`
- `docs/generated-benchmark-index.md`
- `docs/generated-index.md`
- `promo/<slug>/`
- `assets/social/entries/`
- `assets/social/games/`
- `sitemap.xml`
- `404.html`

Use:

```bash
npm run generate
```

Every generator also has a `--check` mode used by the unified quality gate.

## Legacy Boundary

The 11 games under `games/` are frozen Pre-Benchmark Era records. A launcher,
documentation, or benchmark architecture pull request must not edit:

- `games/<slug>/index.html`
- `games/<slug>/src/**`
- `games/<slug>/styles/**`
- `games/<slug>/variants/**`
- `games/<slug>/runs/**`
- provenance or `humanCodeEdits`

A Legacy provenance correction needs direct evidence and a dedicated change.
Do not convert an old game into a Protocol 99 Entry.

## Pull Requests

Describe:

- whether the change is Entry, automation, launcher, documentation, or Legacy;
- the exact commands run and their results;
- any browser viewports checked;
- whether generated files were regenerated;
- whether game or provenance files changed;
- known limitations.

Do not claim users, downloads, ranking significance, or verification that has
not been observed.
