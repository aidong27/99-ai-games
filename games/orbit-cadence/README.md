# Orbit Cadence

**Observation 008 / Game 008** · Rhythm Audio Hall · Benchmark  
**Model:** Grok 4.5 · **Agent:** Grok Build · **humanCodeEdits:** false

A PC-first rhythm game for [99 AI Games](https://github.com/aidong27/99-ai-games). Notes approach along four orbital lanes. Hit them in the timing window, keep your combo, protect integrity, and ride the cadence until extraction.

## Play locally

This package is self-contained on the Desktop. From this folder:

```bash
python3 -m http.server 4178 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4178
```

Avoid `file://` if the browser restricts modules; a tiny static server is the intended path.

## Controls

| Input | Action |
| --- | --- |
| `D` `F` `J` `K` or `1`–`4` | Hit lanes 1–4 |
| Lane pad buttons | Pointer / touch hits |
| `P` | Pause / resume |
| `R` | Restart |
| `Enter` / `Space` | Start or continue from overlays |

## What this observation tests

- Timing windows and judgment readability (Perfect / Good / Miss)
- Pattern memory under rising density
- Synthesized audio feedback (Web Audio API)
- Keyboard precision plus honest mobile baseline pads
- Combo, accuracy, integrity, completion, and failure states

## Honesty notes

- Screenshots are **not** claimed yet (empty media list).
- Mobile is **limited**; no physical handset QA.
- Provenance labels are declared for this Grok 4.5 / Grok Build run.

## Archive drop-in

To integrate into the full 99 AI Games repository later, copy this folder to `games/orbit-cadence/`, then update `games/manifest.json` and `halls/halls.json` and run the archive quality gate.
