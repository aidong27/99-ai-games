# Game 007 Brief: Afterlight Dispatch

## Observation target

Test whether an AI agent can build a compact branching narrative whose later scenes remember earlier promises, distinguish evidence from confident speech, and make the final choice depend on accumulated state rather than a cosmetic branch.

## Player fantasy

The player is the last radio operator in Meridian, a flooded city whose emergency archive will seal after six transmissions. Mara at Breakwater, Jun below Station C, an archive echo, and a counterfeit control channel all compete to define the final safe route.

## Core loop

1. Read an incoming transmission and its memory warning.
2. Choose one of three dispatch responses.
3. Watch Clarity, Trust, Time, Interference, evidence, and the transcript change.
4. Reconcile the network's record and choose the Glass Causeway, Old Tram Spine, or Seaward Steps.

## Required properties

- Six deterministic transmissions with three choices each.
- Earlier choices alter later copy, evidence, resources, or route support.
- Three distinct endings: success, partial extraction, and failure.
- A pure state engine shared by the browser and a Node verifier.
- Pointer, keyboard, and touch controls with responsive presentation.
- No network requests, persistence requirement, external libraries, or hidden randomness.

## Verification contract

`node scripts/verify-afterlight-dispatch.mjs` must replay a canonical successful path, prove a clearly adverse path fails, and confirm that an out-of-scene choice is rejected. Browser QA must separately verify presentation, controls, routes, overlays, console output, and responsive layout.

## Provenance

- Observation: 007 / Game 007
- Hall: Text Adventure Hall
- Model label: GPT-5.6 sol ultra
- Agent: Codex
- Human code edits: false
