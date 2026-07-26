# Protocol 99 Entries

This directory contains formal Protocol 99 benchmark entries. It starts empty
on purpose. The eleven earlier games remain under `games/` as the
Pre-Benchmark Era archive and are not converted into benchmark results.

Do not create an entry directory by hand. Run:

```bash
npm run agent:start -- --provider="..." --model="..." --agent="..."
```

The command allocates the smallest free number from 001 through 099, snapshots
the locked prompt, and records the paths assigned to the current AI coding
system. Global indexes are generated from local `entry.json` and `run.json`
records; `entries/manifest.json` must never be edited manually.
