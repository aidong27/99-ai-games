# Legacy Archive

## Pre-Benchmark Era

The 11 games under `games/` were produced before Protocol 99 standardized the
prompt, scope, Run protocol, and browser contract. They preserve real creative
experiments but cannot support same-task model comparison.

They remain available through `library.html`,
`observation.html?slug=<slug>`, `play.html?slug=<slug>`,
`promo/<slug>/`, and their original `games/<slug>/` URLs.

## Preservation Rules

- Keep original game source, styles, variants, run records, screenshots, and
  provenance.
- Do not relabel a Legacy game as a Protocol 99 Entry.
- Do not count Legacy games toward 0–99 benchmark progress.
- Keep Hall browsing and old coverage data inside Legacy surfaces only.
- Preserve original URLs or provide a compatibility path.
- Treat posters and social cards as promotional assets, not gameplay evidence.
- Do not hand-edit generated promo pages.

Launcher or benchmark refactors must not edit `games/<slug>/src/**`,
`styles/**`, `index.html`, `variants/**`, or `runs/**`.

## Counts

Protocol 99 and Legacy statistics are always displayed separately. The current
repository has 11 Legacy playable experiments. Their generated index is
[`generated-index.md`](generated-index.md); the Protocol 99 index is
[`generated-benchmark-index.md`](generated-benchmark-index.md).

## Future Maintenance

A verified provenance correction or security repair should be a dedicated,
fully documented change. It must retain history and must not imply that the
modified build is an untouched original. Routine launcher work does not justify
editing Legacy implementations.
