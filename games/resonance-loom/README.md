# RESONANCE LOOM

> A browser rhythm game where your keystrokes weave a live-synthesised melody.

**Code authored entirely by GLM-5.2 (Z.ai)** · 2026-07-13
`humanCodeEdits: false`

---

## Play it

Double-click **`index.html`**. That's it — no install, no build step, no internet needed.

If you hear no sound on the first load, click anywhere once: browsers block audio
until there's a user gesture.

### Controls

| Action | Keys |
|---|---|
| Hit lanes | `D` `F` `J` `K` (or tap the lanes on touch screens) |
| Pause / Resume | `Space` |
| Quit to menu | `Esc` |

### Goal

Notes fall down four lanes. Press the matching key the instant a note crosses the
glowing line near the bottom. The closer to the line, the better your judgement:

- **Perfect** (within ±55 ms) — 300 pts
- **Great** (within ±100 ms) — 200 pts
- **Good** (within ±160 ms) — 100 pts
- **Miss** (too far off, or not pressed) — 0, breaks combo

Build combo for a per-note bonus and chase an **S** grade.

---

## The three songs

All music is **original to this game** and synthesised live in your browser by the
Web Audio API — no samples, no copyrighted melodies. Hitting a note adds its tone
to the weave, so accurate play literally sounds better.

| # | Song | Difficulty | BPM | Key |
|---|---|---|---|---|
| 1 | **Aurora Drift** | Easy | 90 | A minor |
| 2 | **Neon Loom** | Normal | 120 | E minor |
| 3 | **Chronos Surge** | Hard | 160 | D minor |

Your best score per song is saved locally in your browser.

---

## How it's built

Pure vanilla **HTML + CSS + JavaScript**. No frameworks, no bundler, no dependencies.

```
resonance-loom/
├── index.html      ← the screen layout (title / song-select / game / result / help)
├── style.css       ← all visuals (lanes, notes, animations, gradients)
├── game.js         ← game loop, note spawning, judgement, scoring, input
├── audio.js        ← Web Audio synthesis engine (hit tones + backing music)
├── songs.js        ← 3 original songs: note charts + backing sequences
├── game.json       ← provenance / sourcing record (mirrors 99-ai-games conventions)
└── README.md       ← this file
```

### Architecture in one paragraph

`GameManager` drives a `requestAnimationFrame` loop that converts each note's beat
time into an absolute hit time, spawns its DOM element `APPROACH_TIME` seconds
early, and moves it toward the hit line every frame. A shared `SynthEngine`
(audio.js) plays a short percussive tone on each hit — each lane has its own
pitch, so the player effectively *performs* a pentatonic melody. A `MusicPlayer`
schedules the backing bass/lead using the AudioContext clock for tight timing.
Scores persist in `localStorage`; everything else is in-memory.

---

## Provenance & honesty

This game was produced as a single-shot sample of **GLM-5.2** (Z.ai) coding-agent
output, after a review of the [`aidong27/99-ai-games`](https://github.com/aidong27/99-ai-games)
repository — a playable archive of AI-generated browser games.

- **No human wrote or edited** the game source (`index.html`, `style.css`, `game.js`,
  `audio.js`, `songs.js`). All five were produced by GLM-5.2 in one session.
- It targets that repo's currently-empty **"Rhythm Audio"** hall.
- It has **not** been submitted upstream (yet). No screenshots, scores, or
  download figures are claimed. See `game.json` for the full sourcing record.

### Audio licensing

Every melody in this game is original and generated at runtime by oscillators.
There are **no audio files** in this project. Nothing here is derived from
copyrighted music.

---

*Made by GLM-5.2 · Z.ai — July 2026.*
