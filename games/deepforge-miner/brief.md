# Game 009 Brief: Deepforge Miner

## Concept

A space mining incremental clicker for the Clicker Management Hall. The player clicks
on a procedurally rendered asteroid to mine ore, purchases automated mining drones,
upgrades their mining tool through four tiers (pickaxe → laser → plasma → quantum), and
prestiges to unlock progressively rarer resource types with permanent production bonuses.

## Why this is a Clicker Management Hall observation sample

The hall observes AI ability in economies, automation loops, scaling, and player
motivation. Deepforge Miner makes those qualities inspectable:

- **Economy design**: Five resource tiers (Copper → Iron → Gold → Diamond → Dark Matter),
  each gated behind a prestige cycle. Drone cost scales at 1.15× per drone creating
  diminishing returns that prestige resets.
- **Automation loops**: Drones generate ore per second independently; the player
  transitions from manual clicking to managing a growing fleet. Holding Space enables
  auto-clicking at 8 clicks/second.
- **Scaling math**: Upgrade tiers provide 10× click power jumps. Prestige multiplies
  all production by a cumulative +25% per cycle. The math produces a ~30-60 minute first
  prestige and ~15 minute subsequent cycles.
- **Player motivation**: Visual feedback (particle bursts, floating numbers, orbiting
  drones, expanding click rings, asteroid growth) reinforces every action. The prestige
  system creates a compelling reset loop with permanent progress.

## Mechanics

- **Click to mine**: Click the asteroid to earn ore. Click power increases with upgrades.
- **Upgrades**: Four tiers — Rusty Pickaxe (1×), Laser Cutter (10×), Plasma Drill (100×),
  Quantum Extractor (1000×). Costs scale with prestige bonus discount.
- **Drones**: Automated miners that orbit the asteroid and generate ore per second.
  Cost scales at 1.15× per drone. Max 24 visible; excess shown as "+N more".
- **Prestige**: At 1M cumulative ore, reset progress for +25% permanent OPS bonus and
  unlock the next resource tier. Win condition: reach Dark Matter with 5+ prestige.
- **Visuals**: Canvas-rendered with starfield background, procedurally shaped asteroid
  with ore veins, particle effects, floating damage numbers, orbiting drone ships,
  expanding click rings, and screen shake on mine.

## Scope

- Single canvas-based game, 1280×720 native resolution.
- Desktop-first: mouse clicking and keyboard shortcuts tuned for 1280×720 and above.
  Mobile baseline supports tap-to-mine and tappable buttons.
- No external assets, no build step, no network calls.
- Self-contained ES module with no framework dependencies.

## Provenance intent

Evidence of what DeepSeek v4 Pro (model label maintainer-declared), driven through
Claude Code, could design and implement as a clicker management benchmark — a complete
incremental game with balanced economy, automation, prestige, and satisfying visual
feedback, all rendered on a single canvas.
