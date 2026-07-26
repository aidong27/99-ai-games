# Run Protocol

## Raw

The Raw Run is the primary comparison object.

- created by `npm run agent:start`;
- starts in a new assigned implementation directory;
- one human launch prompt;
- no human code edits or follow-up design instruction;
- Agent may test and repair its own current output;
- becomes immutable after Finalize;
- default comparison Run type.

The real metadata must record `humanPromptCount` and `humanCodeEdits`. Defaults
are not permission to falsify what happened.

## Standard Repair

A Standard Repair starts from a copied Finalized parent, receives the
standardized machine report, records the parent Run ID and Source Hash, and
never overwrites Raw. Create it with:

```bash
npm run agent:repair -- \
  --entry="<entry-id>" \
  --from-run="<run-id>" \
  --type=standard-repair
```

It creates new source/evidence hashes and is excluded from default Raw
comparison.

## Other Run Types

`regeneration`, `human-curated`, and `cross-agent-repair` are explicit
non-Raw categories. Record the actual modifier, prompt count, human edit state,
and relationship to the parent. Do not label them Raw or hide them in Raw
statistics.

## State Lifecycle

```text
building
  -> pending-browser-verification
  -> verified
  -> finalized
```

A failed verify returns to `building`. `finalized` requires a passed report and
matching Source, Prompt, screenshot, and Evidence hashes.

## Immutable Record

Every Finalized Run retains Challenge and identity metadata, prompt snapshot,
timestamps, baseline commit, human input/edit declarations, environment/tool
facts, parent relationship, source/evidence hashes, real report/screenshots,
console/network logs, inventory, and known issues.

Changing Finalized source, prompt, evidence, or screenshots makes
`node scripts/validate-entries.mjs` fail. Create a new Run instead.
