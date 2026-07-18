# Context Window

Observation 011 / Game 011 in **99 AI Games** — the first AI Meme Hall observation sample (benchmark slot).

You are **Agent K-3**, an AI recovering memory shards from an archive facility larger than your own context window. Sectors you forget come back… approximately. Beware hallucinations.

## Play

Serve the repository root and open the game:

```bash
python3 -m http.server 4173
# http://127.0.0.1:4173/games/context-window/
```

No build step and no dependencies. Desktop keyboard play is the intended experience; touch devices get an on-screen direction pad (mobile baseline, no physical handset QA claimed).

## How it works

- The facility is 9 sectors; your context window holds 4 (the System Core in B2 is always resident).
- Entering a fifth sector **evicts** the least-recently-visited unpinned sector. It is then remembered only as a **summary**.
- Re-entering a summarized sector resamples its details: real shard positions move, interior wall variants shift, and **hallucinations** appear — decoy shards (pink, flickering) and glitch drones. First visits have no decoys: hallucinations are born from forgetting.
- Permanent facts survive eviction: each sector's remaining real-shard count and taken pickups. You remember *how many*, never *where*.
- Working memory carries 3 shards. Deposit **9 real shards** at the System Core to win.
- Glitch drones cost 1 integrity on contact (5 total); at 0 the run collapses. Pickups: **System Prompt** (pins a sector against eviction), **Compression pass** (+1 context capacity), **Integrity patch** (+1 integrity).

## Controls

- Move: `WASD` / arrow keys (touch: on-screen pad)
- `P` / `Esc` pause, `R` restart, `M` mute

## Source layout

- `src/engine.js` — pure, deterministic, DOM-free simulation (map, LRU context window, eviction/re-summarization, entities, win/lose).
- `src/main.js` — canvas renderer, input, WebAudio synth, HUD, minimap, memory log.
- `styles/main.css`, `index.html` — self-contained game page.
- `assets/images/` — real 1440x900 browser captures from the local build (title, gameplay, completion).

## Verification

The shipped engine is shared with a Node proof:

```bash
node scripts/verify-context-window.mjs
```

It proves, through the real simulation, that a scripted navigator can deposit enough shards to win, that hallucination contact can collapse a run, that eviction resamples sector details while shard counts persist, and that solid tiles cannot be tunneled. A browser-driven run also completed the game in the shipped build (56 seconds, 5 evictions, no damage) during archive QA.

## Provenance

- Model: **Kimi K3 Max** (user-declared label) · Agent: **Kimi**
- Created: 2026-07-17 · `humanCodeEdits: false`
- Canonical variant: `kimi-k3-max-context-window-2026-07-17`
