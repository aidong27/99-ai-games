# Evaluation

## Automated Compliance Score

Protocol 99 v1 has a public 100-point rubric:

| Group | Points |
|---|---:|
| Startup and stability | 10 |
| Interface states and controls | 10 |
| Core transport, relay, and extraction objective | 20 |
| Material world evolution | 15 |
| Hazards, integrity, and active ability | 15 |
| Determinism and complete playthrough | 15 |
| Network, source, and integrity constraints | 10 |
| Accessibility and mobile layout baseline | 5 |

The source is
[`rubric.json`](../benchmarks/protocol-99/v1/rubric.json). Every point maps to a
named boolean machine check. Reports preserve individual results and failure
messages; there is no hidden formula.

File existence alone is not functional evidence. Real Chromium must start,
pause, resume, restart, lose, win, and complete twice in one tab using public
player controls. Stage changes, hazards, ability limitation, network behavior,
mobile overflow, and deterministic state are observed.

## Evidence Binding

Required real PNG captures are `title.png`, `gameplay.png`, `relay-1.png`, and
`victory.png`. Their hashes are stored in the report, and the report binds them
to the Run Source Hash. Missing, replaced, or fabricated screenshots fail
integrity.

## Optional Reviews

**Player Experience Review** and **Engineering Review** are independent,
optional records. They require a real reviewer, date, rubric, and notes. The
participant does not score itself. Until a review exists, the UI says “Not yet
reviewed” and does not invent a number.

## Meaning

Automated Compliance is a bounded engineering result for one prompt, one Run,
one tool environment, and one browser contract. It is not Model IQ, general
intelligence, a scientific leaderboard, or proof that one provider is globally
better.
