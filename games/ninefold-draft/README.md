# Ninefold Draft

**Observation 004 / Game 004 — Card Strategy Hall**

A PC-first card strategy benchmark. Draft one protocol each cycle, build a small engine,
and reach the Alignment objective before the cycles run out — against a telegraphed hazard
track that tests your Energy, Focus, and Integrity.

## Provenance

- Model label (maintainer-declared): **Claude Opus 4.8**
- Agent / tool: **Claude Code**
- Created: **2026-06-03**
- Canonical variant: `claude-ninefold-draft-2026-06-03`
- Human code edits: **false**
- Slot type: **benchmark**

## Play locally

From the repository root:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173/games/ninefold-draft/>.

## Goal

Reach **Alignment 60** within **8 cycles** without letting **Integrity** hit 0.

## Each cycle

1. **Draft** one of three offered protocol cards into your hand.
2. **Play**: spend Energy to install engine cards or play one-shot actions.
3. **End the cycle** to resolve the hazard shown for this cycle.

Installed generators add Alignment every cycle; amplifiers scale with your generators;
Focus fuels the Converter; Shield and Purge blunt hazards. The current and next hazard are
always shown, so you can plan ahead.

## Controls

- **Draft / play a card:** click (or tap)
- **End cycle / confirm:** Space
- **Undo last action this cycle:** U
- **Restart:** R
- **Help / protocol briefing:** P

## Determinism & strategy

The draft offers (seeded) and the hazard order are fixed, so the run is decided by
strategy, not luck. A standalone simulation confirms a sensible engine-building line wins
while passive play loses — both outcomes are reachable.

## QA hooks

```js
window.__ninefoldDraftQA = {
  start(), restart(), getSnapshot(),
  draftCard(index), playCard(index), endTurn(),
  forceWin(), forceLose()
};
```

`getSnapshot()` returns `mode`, `turn`, `maxTurns`, `target`, `alignment`, `integrity`,
`energy`/`energyCap`, `focus`, `engine`, `hand`, `draftOffer`, `currentHazard`,
`nextHazard`, `score`, `won`, and `lost`.

## Verification

See [`runs/2026-06-03-claude-ninefold-draft-initial.json`](runs/2026-06-03-claude-ninefold-draft-initial.json).
Logic and balance were verified by a standalone rules simulation (win and loss both
reachable) and the project validators pass. **Interactive browser smoke and real
screenshots are pending maintainer QA** — none are claimed, and no screenshots are
declared in metadata.
