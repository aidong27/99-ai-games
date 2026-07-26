# Protocol 99 v1

Protocol 99 v1 is the first fixed challenge for the standardized era of
99 AI Games.

## Authority

- `PROMPT.md` is the only canonical build prompt.
- `PROMPT.zh-CN.md` is a non-authoritative human translation and is excluded
  from the canonical prompt hash.
- `challenge.json` defines machine-readable scope and comparison policy.
- `rubric.json` defines the transparent Automated Compliance Score.
- `TEST-CONTRACT.md` defines the read-only browser and evidence contract.
- `LOCK.json` pins the SHA-256 of every authoritative file.

Once the first formal Entry exists, this directory is immutable. A changed
challenge must be introduced as `v2`; v1 data and rankings remain isolated.

## Comparison unit

The observed unit is an AI coding system: model, Agent, native tools, and
declared environment. Protocol 99 does not claim to isolate base-model
intelligence. Scores describe machine-observed completion and compliance, not
an intelligence total.

## Run types

- `raw`: one user instruction, one self-directed Agent session, immutable after
  Finalize.
- `standard-repair`: a copy of a Finalized Run receiving only the standard
  machine report.
- `regeneration`: a clearly labeled new generation.
- `human-curated` or `cross-agent-repair`: preserved but excluded from the
  default Raw comparison.

See `docs/BENCHMARK-METHOD.md` and `docs/RUN-PROTOCOL.md` for the public method.
