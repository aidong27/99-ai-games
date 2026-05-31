# 99 AI Games Project Plan

## 1. Project Definition

**99 AI Games** is a long-term open-source project that will collect 99 small browser games made by Codex or other AI agents.

The project is also an observation log. Each game should show what AI agents were capable of at the time it was made: mechanics, code structure, controls, visual polish, accessibility, and reliability.

## 2. Maintainer Role

The maintainer acts as:

- project director
- prompt writer
- tester
- publisher
- curator
- provenance record keeper

The maintainer does not hand-write or hand-edit game code. If this rule ever changes, the affected game must say so clearly in metadata.

## 3. Core Rules

- Every game must be playable locally from the repository before it is marked playable.
- Every game must have a `game.json` file.
- Every game must be listed in `games/manifest.json`.
- Every game must record model, agent/tool, creation date, status, and `humanCodeEdits`.
- Missing or uncertain information must be labeled honestly.
- Do not claim users, stars, downloads, or popularity without evidence.

## 4. Repository Shape

```text
.
├── index.html
├── src/
├── styles/
├── games/
│   ├── manifest.json
│   └── <slug>/
│       ├── index.html
│       ├── game.json
│       ├── src/
│       ├── styles/
│       └── assets/
├── docs/
├── README.md
├── ROADMAP.md
├── TODO.md
└── OPENAI_OSS_APPLICATION.md
```

The root page is the AI Observatory launcher. Individual games stay isolated in `games/<slug>/`.

## 5. Game 001

Game 001 is **Signal Cartographer**.

Summary:

- Canvas navigation survival game.
- Player maps a hostile signal field.
- Goal is to collect fragments, deploy beacons, and reach the exit.
- Hazards include interference waves, corrupted zones, and drifting noise.
- The run spans three short sectors with upgrade choices.
- Controls include keyboard, pointer steering, and mobile-friendly buttons.

Provenance:

- Model label: `GPT-5.5 xhigh`
- Agent/tool: `Codex`
- Created date: `2026-05-31`
- Human code edits: `false`
- Note: model label is maintainer-declared for this project entry.

## 6. Game Lifecycle

1. Define a small game concept.
2. Ask an AI agent to implement it.
3. Keep the code in `games/<slug>/`.
4. Add or update `game.json`.
5. Add the game to `games/manifest.json`.
6. Run local static-server checks.
7. Verify controls, layout, and console state.
8. Capture screenshots.
9. Write short development notes.
10. Commit and publish.

## 7. Launcher Plan

The launcher should behave like an AI Observatory:

- show collection progress
- show the latest playable game
- show model and agent provenance
- show launch and metadata actions
- remain usable on mobile
- avoid fake rankings or popularity claims

The launcher should read `games/manifest.json` rather than hard-coding the full game list.

## 8. Contribution Policy

The project is issues-first:

- bug reports are welcome
- feature ideas are welcome
- accessibility feedback is welcome
- metadata corrections are welcome
- ordinary human-written game-code PRs are not the default contribution path

Code changes should normally be maintainer-controlled AI-generated work, with model and agent details recorded.

## 9. Quality Bar

A game is ready for the catalog when:

- it loads locally over a static server
- the launcher can open it
- the primary game surface renders
- documented controls work
- the browser console has no errors
- desktop and mobile layouts do not overflow horizontally
- metadata matches the actual source state

## 10. Milestones

### v0.1 Open Source Cleanup

- Publish repository.
- Replace placeholder Game 001 with Signal Cartographer.
- Redesign launcher as AI Observatory.
- Add current docs, issue templates, PR template, and metadata.

### v0.2 Gameplay Polish

- Tune Game 001.
- Capture screenshots.
- Add postmortem notes.
- Improve local verification checklist.

### v0.3 Mobile and Accessibility

- Improve touch controls.
- Add reduced-motion support if needed.
- Review contrast and keyboard focus.
- Verify common mobile widths.

### v0.4 Content Expansion

- Add Game 002.
- Add filters or tags to the launcher.
- Compare Game 002 with Game 001 in a short notes file.

## 11. Risks

- The project could accidentally imply a fake history if metadata is vague.
- AI-generated games can be playable but shallow, so each game needs a clear hook.
- Layout and controls can break on mobile if not checked.
- A rushed 99-game target would reduce the value of observing AI progress.

## 12. Next Actions

- Finish browser QA for the redesigned launcher and Signal Cartographer.
- Commit and push the current open-source release.
- Capture verified screenshots.
- Decide how to host the static site publicly.
- Begin designing Game 002 only after Game 001 is stable.
