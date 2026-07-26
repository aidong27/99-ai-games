# TODO

Keep this list honest. A future item is not a completed Entry, verification
result, screenshot, score, or public claim.

## Protocol 99

- Run the first formal Raw Entry through the complete
  `agent:start -> verify -> finalize -> check` protocol.
- Review the first real Entry report and improve automation only through a new
  benchmark version if a change would alter the locked v1 task or scoring.
- Add Player Experience and Engineering reviews only after independent,
  named reviewers perform them.
- Keep the default Entries and Compare views limited to Finalized Raw Runs
  with the current Prompt Hash.

## Automation

- Keep `node scripts/check.mjs` as the single local and CI quality gate.
- Keep all generators deterministic and require their `--check` modes to pass.
- Re-run the isolated 15-case Agent flow test after changing allocation,
  integrity, repair, evidence, or path-scope behavior.
- Re-run the real Chromium fixture after changing the test contract or SDK.
- Keep `.site/` limited to public files and Finalized Protocol 99 Runs.

## Public site

- Verify Home, Challenge, Entries, Compare, Entry Detail, Methodology, Legacy,
  and promo routes at desktop and 390 px mobile widths before release.
- Keep provider and model-family grouping based only on recorded metadata.
- Add Blind Compare history or aggregation only if it remains local or gains a
  real, documented backend. Never invent global vote counts.

## Legacy archive

- Preserve all 11 Pre-Benchmark Era games, their provenance, variants, Runs,
  screenshots, and stable URLs.
- Do not migrate Legacy games into Protocol 99 or include them in benchmark
  completion counts.
- Maintain Legacy metadata with its existing validators; do not mix Legacy
  game implementation edits into launcher or benchmark architecture work.
