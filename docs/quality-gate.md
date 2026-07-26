# Quality Gate

The single source of truth is:

```bash
node scripts/check.mjs
```

`npm run check`, CI, Pages, and Agent Finalize call the same file.

## Coverage

1. `node --check` across launcher, scripts, benchmarks, tests, Entry modules,
   and Legacy game source.
2. Protocol 99 Challenge schema and SHA-256 Lock validation.
3. Entry/Run schema, status, prompt, source, evidence, screenshot, and Raw/Repair
   integrity.
4. Active Work Order path-scope validation.
5. static Entry runtime security scan.
6. Legacy Hall/game structure, provenance, and honesty rules.
7. launcher DOM/CSS/meta/link/PWA-retirement contracts.
8. public counts, links, social assets, and Legacy promo evidence boundaries.
9. deterministic `--check` for benchmark, promo, social, discovery, and
   generated index outputs.
10. the 15-case Agent Autopilot flow suite.
11. real Chromium Protocol 99 fixture: seed, pause, restart, ability, mobile,
    real defeat, real win, screenshots, and two runs in one tab.
12. all discovered Legacy `scripts/verify-*.mjs` proofs.
13. `.site/` construction and public-file allowlist.
14. `git diff --check HEAD`.

Any failure makes the command non-zero. Browser unavailability is not converted
into a fake pass.

## Focused Checks

```bash
node scripts/validate-benchmark.mjs
node scripts/validate-entries.mjs
node scripts/validate-path-scope.mjs
node scripts/validate-entry-security.mjs
node scripts/validate-launcher.mjs
node scripts/validate-public-surfaces.mjs
npm run test:agent-flow
npm run test:browser-fixture
npm run build:site
```

Generated files should be repaired through their generators, not by weakening
the validator or editing the output.
