# Quality gate

The archive's promises — playable games, honest provenance, no fabricated
popularity, completable levels — are enforced by a single command, run locally
and in CI on every push and pull request:

```bash
node scripts/check.mjs
```

## What it runs

`scripts/check.mjs` is the one source of truth. The CI workflow
(`.github/workflows/ci.yml`) runs exactly this command, so the pipeline and a
local check cannot drift apart. It runs, and fails on the first problem in any of:

1. **`node --check`** on every module under `src/`, `scripts/`, and each
   `games/<slug>/src/` — no game or tool ships with a syntax error.
2. **`scripts/validate-halls.mjs`** — hall taxonomy, capacities, and game→hall
   assignment integrity.
3. **`scripts/validate-games.mjs`** — game directory structure, manifest/metadata
   agreement, variant and run-record wiring.
4. **`scripts/validate-launcher.mjs`** — launcher files, HTML asset references and
   cache-busting, manifest paths, declared media existence, and `deviceSupport`.
5. **`scripts/validate-provenance.mjs`** — the honesty gate (see below).
6. **`scripts/validate-public-surfaces.mjs`** — README stats, press fallback
   stats, social-card counts, share-kit promo links, and generated promo pages
   stay aligned with the real manifest.
7. **`scripts/generate-promo-pages.mjs --check`** — generated per-game promo
   pages and promotional cards match the current manifest and game metadata.
8. **`scripts/generate-index.mjs --check`** — the generated index matches the
   manifest.
9. **`scripts/verify-gravity-atlas.mjs`** — replays each Gravity Atlas plate's
   embedded reference launch vector through the real engine to prove every plate
   is completable. Games that ship a deterministic engine should add a similar
   standing proof.

## The provenance / honesty gate

`scripts/validate-provenance.mjs` turns the project's written rules into a
machine check across `games/manifest.json` and every `game.json`,
`variant.json`, and run record:

- `humanCodeEdits` is exactly `false` everywhere (manifest entries, game
  metadata, variants, and runs), and `manifest.humanCodeEditsPolicy` is `false`.
- Every game, variant, and run carries real model/agent labels.
- Every game has at least one run record, and every run documents a non-empty
  list of real checks (`verification.performed`, or the legacy `verification.checks`);
  a `pending` list, when present, must be an array.
- `canonicalVariantId` is a variant that actually exists.
- No object anywhere declares a fabricated popularity or traffic metric
  (downloads, stars, ratings, installs, views, and similar keys are rejected).

If a real exception to `humanCodeEdits` ever occurs, it must be represented
honestly in the data and this validator updated deliberately — not worked
around.
