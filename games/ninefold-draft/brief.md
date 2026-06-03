# Game 004 Brief: Ninefold Draft

## Concept

A short PC-first card strategy benchmark for the Card Strategy Hall. Over eight cycles
the player drafts one **protocol card** per cycle from a deterministic offer, spends
Energy to install an engine or play one-shot actions, and manages **Energy / Focus /
Integrity** to reach an **Alignment** objective (60) before the cycles run out — all
against a **telegraphed hazard track**.

## Why this is a Card Strategy Hall observation sample

The hall observes AI ability in probabilistic decisions, drafting, turn structure, and
readable strategy. Ninefold Draft makes those qualities inspectable:

- **Drafting with trade-offs.** Each cycle offers three of nine protocol cards. Picks are
  permanent commitments: cheap weak generators vs. expensive scaling amplifiers vs.
  defensive shields vs. tempo actions.
- **Readable, not random.** The draft offers (seeded) and the hazard order are
  deterministic, and the current and next hazard are always shown, so the player can plan
  (install a Shield or play Purge before a Surge). Strategy decides the run, not luck.
- **A legible engine.** Installed generators add Alignment every cycle; amplifiers scale
  with the number of generators; Focus banks toward the Converter; Capacitor grows Energy
  capacity. The production is shown in the log each cycle.
- **Clear win/loss and scoring.** Reach Alignment 60 to win (scored by cycles left,
  Integrity, Focus, and engine size); lose by dropping Integrity to 0 or running out of
  cycles short of the objective.

## The nine protocols

| Card | Cost | Kind | Effect |
|---|---:|---|---|
| Relay | 1 | Install | +3 Alignment / cycle |
| Lattice Node | 2 | Install | +5 Alignment / cycle |
| Amplifier | 2 | Install | +2 Alignment per generator / cycle |
| Capacitor | 2 | Install | +1 Energy capacity / cycle |
| Focus Array | 1 | Install | +2 Focus / cycle |
| Converter | 1 | Action | Spend 3 Focus: +12 Alignment now |
| Shield Wall | 2 | Install | Reduce hazard damage by 2 / cycle |
| Overclock | 1 | Action | +4 Energy this cycle |
| Purge | 2 | Action | Cancel this cycle's hazard |

## Hazard track (telegraphed, deterministic)

`Calm → Drain → Surge → Static → Flux → Surge → Static → Flux`, where Surge and Flux cost
Integrity (reduced by Shield), Static and Flux cost Alignment, and Drain lowers next
cycle's Energy capacity.

## Scope

- 8 cycles, 9-card protocol pool, deterministic seed (reproducible runs).
- PC-first: mouse to draft/play, keyboard Space/U/R/P, tuned for 1440x900 and 1920x1080.
- Mobile is a no-overflow baseline (cards reflow to fewer columns).
- No external assets, no build step, no network calls.

## Solvability / balance

Verified by a standalone simulation that replays the exact offers, engine production, and
hazard math: a sensible engine-building line wins on cycle 8 with margin, while passive
play loses — so both outcomes are reachable and the game rewards strategy.

## Provenance intent

Evidence of what Claude Opus 4.8, driven through Claude Code, could design and implement as
a readable card strategy benchmark. The maintainer declares the model label and did not
hand-edit the generated code.
