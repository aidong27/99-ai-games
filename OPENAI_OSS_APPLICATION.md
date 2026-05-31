# OpenAI Codex for Open Source Application Draft

## Project Summary

99 AI Games is a long-term AI game-making evolution archive by aidong27. It uses 99 playable HTML/CSS/JavaScript browser-game experiments as observation samples to record how AI agent capability changes over time.

Observation 001 / Game 001 is **Signal Cartographer**, a self-contained Canvas game where the player maps a hostile signal field, collects fragments, drops beacons, and exits before signal integrity fails.

The repository includes the shared AI Observatory launcher, `games/manifest.json`, Observation 001 source, the 9 Game Halls framework, schemas, templates, validation scripts, per-game metadata, documentation, community files, and a roadmap.

The games are playable. The real exhibit is the AI that made them.

The project distinguishes between game slots, model variants, and run records. The 99 game slots represent 99 observation samples, not 99 AI generations. Model comparisons are stored as variants/runs under the same game slot and do not consume additional game numbers.

## Why I Am the Maintainer

I am the creator, curator, tester, and maintainer of 99 AI Games. My role is not to hand-write the game code. I define the direction, ask Codex or other AI agents to build games, test the results, publish the project, and keep clear records of which AI systems made what.

This is not a large established open-source project. It is a small, transparent, long-term experiment by an independent maintainer who wants to document AI-assisted game creation over time.

## What I Use Codex For

I use Codex as an AI engineering and game-building agent for:

- Creating small browser games from prompts.
- Building and maintaining the shared launcher UI.
- Organizing each game into a clear folder structure.
- Creating model variants for the same game concept without consuming new game numbers.
- Recording generation, revision, validation, and comparison attempts as run records.
- Writing metadata that records model, agent, date, and human edit status.
- Refactoring AI-generated code while preserving the no-human-code-edits rule.
- Running local browser checks.
- Writing documentation, TODOs, and release notes.

I do not want Codex to invent fake history, fake user numbers, or fake source completeness. If something is missing or uncertain, the repository should say so clearly.

## How Codex Would Help the Project

Codex would make the project sustainable for a solo maintainer. Each game needs the same cycle: design a concept, generate code, test it, document it, publish it, and compare it with earlier games. Codex can reduce the overhead of each cycle while keeping the repository structured and reviewable.

The most useful Codex support would be:

- Generating new HTML5 games.
- Generating controlled variants of existing games for model comparison.
- Improving existing AI-generated game code.
- Building smoke checks for static browser games.
- Checking whether each game remains playable after changes.
- Keeping metadata and documentation synchronized.
- Improving accessibility and mobile support.
- Helping compare games across model generations.

## Why the Project Is Useful to Open Source and Beginner Developers

99 AI Games can be useful as a public record of AI-assisted creative coding. Beginner developers can inspect:

- Small browser-game structures.
- How AI agents organize game loops, controls, UI, and metadata.
- How a static JavaScript game can be documented and maintained.
- What provenance fields are useful for AI-generated projects.
- How model variants and run records can document AI work without inflating game counts.
- How project quality changes as models and agents improve.

The project is intentionally modest and transparent. It does not claim to be a large community project.

## Honest Status and Future Plan

The project is in its early open-source stage. Observation 001 / Game 001, **Signal Cartographer**, is included as local playable source. The model label `GPT-5.5 xhigh` is maintainer-declared for this entry, and the agent is Codex.

Current limitations:

- Public hosting is not configured yet.
- Real screenshots still need to be captured.
- Gameplay balance needs more playtesting.
- Future games should keep the same metadata standard.

The long-term goal is to complete 99 playable observation samples gradually. The point is not speed; the point is to witness and document AI agents improving over time.
