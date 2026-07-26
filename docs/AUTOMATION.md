# Automation

## Single Quality Gate

```bash
node scripts/check.mjs
```

`npm run check`, CI, and Pages all invoke this file. It owns syntax checks,
Protocol Lock, Entry integrity/security/path scope, launcher and Legacy
validation, generated freshness, Agent-flow tests, real Chromium fixture,
Legacy proofs, public artifact checks, and whitespace validation.

## Commands

```bash
npm ci
npm run agent:status
npm run agent:start -- --provider="..." --model="..." --agent="..."
npm run agent:verify
npm run agent:finalize
npm run agent:repair -- --entry="..." --from-run="..."
npm run test:agent-flow
npm run test:browser-fixture
npm run generate
npm run check
npm run dev
npm run build:site
```

Each Agent command supports `--help`.

## Generators

All generators are deterministic and have `--check`:

```bash
node scripts/generate-benchmark.mjs --check
node scripts/generate-promo-pages.mjs --check
node scripts/render-social-cards.mjs --check
node scripts/generate-discovery.mjs --check
node scripts/generate-index.mjs --check
```

`npm run generate` writes them in dependency order. A second run must not create
an unexplained diff.

## Agent-Flow Test

`npm run test:agent-flow` runs in temporary repositories. It verifies all 15
critical flows: allocation, capacity, ID collision, lock mismatch, Finalize
gating, Raw immutability, Repair copying, deterministic generation, real
browser fixture, fixture exclusion, default comparison filtering, path scope,
external-request detection, and verification-report/screenshot integrity.

Fixtures never consume production Entry numbers or appear on the site.

## Local Browser

`npm run dev` defaults to `127.0.0.1:4173` and supports `--port`/`--host`. Stop
it with Ctrl+C. Do not use a workstation as a permanent public server.

## CI and Pages

CI installs the lockfile and Playwright Chromium, runs the unified gate, and
uploads traces/reports on failure. Pages runs the same gate, builds `.site/`,
validates its allowlist, and deploys that artifact. A deployment never writes
generated files back to `main`.
