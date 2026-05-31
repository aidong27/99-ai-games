# OpenAI Codex for Open Source Application Draft

## Project Summary

99 AI Games is a long-term open-source browser-game collection by aidong27. The goal is to collect 99 small HTML/CSS/JavaScript games made by Codex or other AI agents, while documenting which model and agent made each game and how AI game-making quality changes over time.

The first game is Star Survivor PX Neon, a pixel/neon survival game published on itch.io:

https://aidong27.itch.io/star-survivor-px-neon

The repository is being prepared as the public home for the collection. It currently contains the shared launcher structure, documentation, contribution policy, roadmap, and metadata format. The real playable source for Star Survivor PX Neon still needs to be imported before Game 001 can be marked source-complete.

## Why I Am the Maintainer

I am the creator, curator, tester, and maintainer of the 99 AI Games project. My role is not to hand-write the game code. Instead, I define the direction, use Codex or other AI agents to create the games, test the results, publish them, and keep honest records of which AI systems made what.

This is not a large established open-source project. It is a small, transparent, long-term experiment by an independent developer who wants to document AI-assisted game creation over time.

## What I Use Codex For

I use Codex as an AI engineering and game-building agent for:

- Creating small browser games from prompts.
- Building and maintaining the shared launcher UI.
- Organizing each game into a clear folder structure.
- Writing metadata that records model, agent, date, and human edit status.
- Refactoring AI-generated code while preserving the "no human code edits" rule.
- Running local browser checks.
- Writing documentation, TODOs, and release notes.

I do not want Codex to invent fake history, fake user numbers, or fake source completeness. If source or provenance is missing, the repository should say so clearly.

## How Codex Would Help the Project

Codex would help by making the project sustainable for a solo maintainer. The project needs repeated small cycles: design a game, generate code, test it, document it, publish it, and compare it with earlier games. Codex can reduce the overhead of each cycle while keeping the repository structured and reviewable.

The most useful Codex support would be:

- Generating new HTML5 games.
- Building smoke tests for static browser games.
- Checking whether each game remains playable after changes.
- Keeping metadata and documentation synchronized.
- Improving accessibility and mobile support.
- Helping compare games across model generations.

## Why the Project Is Useful to Open Source and Beginner Developers

99 AI Games can be useful as a public record of AI-assisted creative coding. Beginner developers can inspect:

- Small browser-game structures.
- How AI agents organize game loops, controls, assets, and UI.
- What metadata is useful for AI-generated projects.
- How project quality changes as models improve.
- How a maintainer can stay honest about missing files, bugs, and limitations.

The project is intentionally modest and transparent. It does not claim to be a large community project.

## Honest Status and Future Plan

The project is in its early open-source setup stage. Game 001 exists on itch.io, but its real playable source has not yet been imported into this repository. The current repository work creates the collection structure and clearly marks what is missing.

The next steps are:

1. Import the real Star Survivor PX Neon source into `games/star-survivor-px-neon/`.
2. Confirm the original model and agent provenance for Game 001, if available.
3. Verify the local build against the itch.io version.
4. Add real screenshots.
5. Keep adding AI-made games gradually over time.
6. Track model, agent, date, and human edit status for every game.

The long-term goal is to complete 99 AI-made games, but not quickly or artificially. The point is to witness AI agents improving over time.
