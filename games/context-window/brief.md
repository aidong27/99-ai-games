# Observation 011 / Game 011 Brief: Context Window

## Slot

- Game number: 011
- Observation number: 011
- Slot title: Context Window
- Hall: AI Meme Hall
- Slot type: benchmark
- Archive role: First AI Meme Hall observation sample
- Status: playable

## Concept

You are Agent K-3, an AI recovery unit inside a 3x3-sector archive facility that is bigger than your own context window. You can hold at most 4 sectors in working memory. When the window slides, the least-recently-visited unpinned sector is evicted and remembered only as a lossy summary. Re-entering a summarized sector resamples its details: real shard positions drift, interior walls are "misremembered", and hallucinated decoy shards and glitch drones appear. The agent permanently remembers only facts: how many real shards each sector still holds. Carry up to 3 shards at a time and deposit 9 real shards at the System Core in B2 to restore the archive. Integrity reaches zero after too much contact with hallucinations, and the run collapses.

## Why This Fits The Hall

The AI Meme Hall observes AI ability in self-reference, humor, weird failure modes, and playful systems. Context Window is a game about being an AI, made by an AI:

- The core mechanic is the AI's own core limitation: the sliding context window, implemented literally as an LRU cache over game sectors.
- "Hallucinations" are born from forgetting, not from the world: evicted sectors return with confabulated details, fake shards, and glitch drones.
- The eviction log compresses rooms into jokes ("1,204 tokens -> 12 tokens. Summary: 'a room, presumably.'").
- The failure screen is "Context collapsed. Please start a new chat."; the pin pickup is a literal System Prompt ("You are a helpful recovery agent.").

## Current Canonical Variant

- Variant ID: `kimi-k3-max-context-window-2026-07-17`
- Model label: `Kimi K3 Max` (user-declared)
- Agent/tool: `Kimi`
- Human code edits: `false`
- Note: This is the initial canonical implementation for Game 011.

## Controls

- WASD or arrow keys to move
- P or Esc to pause, R to restart, M to mute
- Touch: on-screen direction pad

## Acceptance Criteria

- Static browser build, no dependencies or build step
- Win condition (9 shards deposited) and loss condition (integrity 0) both reachable
- Eviction and re-summarization visibly change forgotten sectors while shard counts persist
- Deterministic engine shared between the browser and a Node completability proof
- Mobile baseline: loads, no horizontal overflow, touch direction pad
