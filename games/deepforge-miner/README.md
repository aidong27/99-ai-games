# Deepforge Miner

Observation 009 / Game 009 in [99 AI Games](https://github.com/aidong27/99-ai-games).

The original June 24 package used Observation 006 before that archive number was occupied. Archive integration renumbered labels and metadata to 009; gameplay logic and balance remain unchanged.

## Provenance

| Field | Value |
|---|---|
| **Model** | DeepSeek v4 Pro |
| **Agent** | Claude Code |
| **Created** | 2026-06-24 |
| **Canonical variant** | `claude-deepforge-miner-2026-06-24` |
| **Human code edits** | false |
| **Hall** | Clicker Management Hall |
| **Slot type** | normal |

## How to play locally

```bash
python3 -m http.server 4173
# Open http://localhost:4173/games/deepforge-miner/
```

Or launch through the archive:
```bash
python3 -m http.server 4173
# Open http://localhost:4173/ → library → Deepforge Miner
```

## Goal

Build a space mining empire. Click the asteroid to mine ore, buy drones to automate
production, upgrade your tools, and prestige to unlock rarer resources with permanent
bonuses. Reach Dark Matter with 5+ prestige cycles to win.

## Controls

| Action | Input |
|---|---|
| Mine ore | Click asteroid / Space (hold for auto) |
| Buy drone | D key |
| Upgrade tool | U key |
| Prestige | P key (when available) |
| Pause | Esc |
| Restart | R |

## Mechanics

- **5 resource tiers**: Copper → Iron → Gold → Diamond → Dark Matter (unlocked via prestige)
- **4 upgrade tiers**: Pickaxe → Laser Cutter → Plasma Drill → Quantum Extractor (10× per tier)
- **Drone automation**: 1 ore/sec per drone base, cost scales 1.15× per drone
- **Prestige**: 1M cumulative ore to prestige; +25% permanent OPS bonus per cycle
- **Win condition**: Reach Dark Matter tier with 5+ prestige cycles

## QA hooks

`window.__deepforgeMinerQA` exposes: `getSnapshot()`, `start()`, `restart()`,
`clickMine()`, `forceOre(n)`, `forcePrestige()`, `forceWin()`.
