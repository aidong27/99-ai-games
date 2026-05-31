# Contributing to 99 AI Games

Thanks for your interest in 99 AI Games. This project is a long-term experiment in AI-made browser games, so the contribution model is intentionally different from a normal open-source game repository.

## Contribution Policy

The maintainer does not hand-edit game code. Game code should be produced by Codex or another AI agent, then reviewed, tested, documented, and published by the maintainer.

The 99 game slots represent 99 observation samples, not 99 AI generations. If you are proposing a different model's attempt at an existing sample, use a model variant issue instead of asking for a new game number.

For now, this repository accepts:

- Bug reports.
- Feature ideas.
- Accessibility feedback.
- Game concept suggestions.
- Model variant suggestions for existing game slots.
- Documentation corrections.
- Reports about broken links, missing provenance, or incorrect metadata.

This repository does not accept ordinary human-written code pull requests by default. That policy keeps the project aligned with its main goal: observing AI agent growth across 99 games.

## Issues

When opening an issue, please include:

- The game number or title, if relevant.
- What you expected to happen.
- What actually happened.
- Browser and operating system.
- Screenshots or console errors if available.

For new game ideas, include the core mechanic, mood, and what would make the game distinct.

## Pull Requests

Pull requests are only expected for maintainer-controlled AI-generated changes or small documentation corrections. A PR that changes game code should clearly state:

- Which AI model created the change.
- Which agent or tool was used.
- Whether any human code edits were made.
- How the game was tested locally.

Spam PRs, unrelated rewrites, and unverified AI code dumps will not be accepted.

## Code Style

- Use plain HTML, CSS, and JavaScript unless a dependency is clearly justified.
- Keep each game self-contained in `games/<slug>/`.
- Keep variants under `games/<slug>/variants/<variant-id>/`.
- Keep run records under `games/<slug>/runs/`.
- Keep asset paths relative.
- Keep metadata current in both `games/manifest.json` and each game's `game.json`.
- Test through a local static server instead of relying on `file://`.

## Good Issue Ideas

- Suggest a new game concept for a future slot.
- Report a browser compatibility issue.
- Suggest accessibility improvements.
- Point out unclear game metadata.
- Compare one AI-made game with an earlier one in the collection.
