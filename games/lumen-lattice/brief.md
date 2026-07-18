# Game 002 Brief: Lumen Lattice

## Concept

A compact, fully self-contained constraint logic puzzle for the Puzzle Logic Hall.
The board is a square lattice of "lumens" that are either lit or dark. Pressing a
node fires light down its entire row and column; every lumen the beams pass through
flips state (the pressed node flips once, with the cross). The goal is to light every
node in the lattice.

## Why this is a Puzzle Logic Hall observation sample

The Puzzle Logic Hall observes AI ability in rules, constraints, state logic,
solvability, and puzzle communication. Lumen Lattice was chosen to make those
qualities inspectable:

- **Solvability is guaranteed, not hoped for.** Each lattice is built by starting
  from a fully solved (all-lit) board and applying a sequence of random cross-toggle
  clicks. Because every click is its own inverse and clicks commute, re-applying the
  scramble clicks always restores the solved board. There is no way to generate an
  unsolvable puzzle.
- **The solver is part of the design.** The generator tracks the parity of which
  nodes were used to scramble the board. Player moves update that parity in place, so
  the hint system can always point at a node belonging to a valid remaining solution,
  and `window.__lumenLatticeQA.autoSolve()` can finish any board.
- **Win detection is independent of the tracked solution.** A board is won when every
  node is lit, so alternative (kernel) solutions still count, while the hint path stays
  valid.

## Scope

- 5 lattices of increasing size (4x4 up to 6x6) with growing scramble depth.
- Pointer, keyboard cursor, and touch input.
- Hint, undo, and reset tools, plus a per-lattice move "par".
- No external assets, no build step, no network calls.

## Provenance intent

This entry is evidence of what Claude Opus 4.8, driven through Claude Code, could
design and implement for the archive. The maintainer declares the model label and did
not hand-edit the generated code.
