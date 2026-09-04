# Tidelight

An original, self-contained Protocol 99 v1 implementation. A repair drone
recovers three portable data cores, consumes each at a relay, and physically
reaches the unlocked east extraction dock.

## Play

- Move with WASD or arrow keys. Touch direction buttons are also provided.
- Press E, or the visible Interact button, to collect a nearby core or restore a relay.
- Space or Shift activates a 2.6-second barrier with a 9-second cooldown.
- Escape or P pauses/resumes. R or the visible button restarts after either ending.
- Only one core can be carried. A relay restores 25 integrity.
- Wait for vents marked CLEAR. Moving patrol machines deal contact damage.

The compact facility has three sectors. The first relay opens the west crossway
and shortens vent duty; the second opens two more crossways; the third restores
the extraction bridge. Gate numbers indicate the required world stage.

Intended first-time play length: about 3-8 minutes, depending on navigation and
hazard timing. A practiced deterministic verification route is shorter.
No audio, runtime dependency, remote asset or network access is used.

## Implementation

- `src/level.js`: geometry, objectives and deterministic hazard functions.
- `src/simulation.js`: fixed-step movement, collision, integrity, relay and exit rules.
- `src/render.js`: local Canvas artwork, objective indicator and facility minimap.
- `src/main.js`: public input, DOM status and a single restart-safe animation loop.
- `styles/main.css`: responsive UI and reduced-motion behavior.

`window.__P99__` is frozen and provides read-only copies, including actual drone
coordinates. Participant tests use only the central SDK's ordinary controls;
they never mutate state, disable hazards or bypass extraction.

## Verification

Run `npm run agent:verify` from the repository root while this Work Order is active.
The repository captures actual title, gameplay, relay and victory screenshots,
and verifies the same winning route twice in one tab plus real defeat.

## Attribution

Built by Codex. The requester supplied the label "GPT-6"; it is recorded as
user-declared and unverified, not as an independently established model identity.
Exact runtime model and Agent versions were not independently verified.
