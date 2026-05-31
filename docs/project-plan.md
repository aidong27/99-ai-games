# 99 AI Games Project Plan

Date: 2026-05-31
Maintainer: aidong27
Repository: https://github.com/aidong27/99-ai-games

## 1. Project Overview

99 AI Games is a long-term open-source collection of 99 small browser games made by Codex or other AI agents.

The project is not a short-term challenge to produce 99 games quickly. Its core purpose is to witness and document the growth of AI agents as creative coding partners. Each game should act as a time capsule: what model was used, what agent or tool produced it, what the game feels like, what it does well, and where it still falls short.

The maintainer does not hand-write or hand-edit game code. The maintainer's role is to provide direction, test builds, publish games, preserve source files, and keep honest provenance records.

## 2. Vision

The long-term vision is to build a public archive where people can follow the evolution of AI-made browser games across many model generations.

By the end of the project, the repository should contain:

- 99 small browser games.
- A shared launcher UI for browsing and opening the games.
- Provenance metadata for every game.
- Notes about model behavior, strengths, failures, and improvements.
- A transparent record that separates AI-generated implementation from human direction and testing.

## 3. Principles

### AI-Made Game Code

Game code should be created by Codex or another AI agent. Human work should focus on prompting, testing, reviewing, publishing, and documentation.

Each game must record:

- model name
- agent or tool name
- creation date
- source completeness
- `humanCodeEdits: false`

If a fact is unknown, the repository should say `Pending maintainer confirmation` instead of guessing.

### Honest Status

The project should never claim a game is source-complete, tested, popular, or community-backed unless that is actually true.

For Game 001, Star Survivor PX Neon, the published itch.io page exists, but the real playable source has not yet been imported into this repository. This must remain visible until the source is added and verified.

### Slow Growth

The 99 games should be created over time. The pace should follow meaningful AI progress, not a fixed content deadline.

### Beginner-Friendly Structure

The repository should remain understandable to beginner developers:

- plain HTML/CSS/JavaScript by default
- small self-contained game folders
- minimal build tooling
- readable metadata
- clear local preview instructions

## 4. Target Audience

Primary audience:

- the maintainer, as a long-term AI coding experiment curator
- beginner developers interested in browser games
- people interested in AI-assisted creative coding
- OpenAI Codex for Open Source reviewers

Secondary audience:

- playtesters
- game jam participants
- AI tool builders
- educators looking for small examples of AI-generated code

## 5. Current State

Current status:

- GitHub repository exists and is public.
- Shared launcher UI exists.
- `games/manifest.json` exists.
- Game 001, Star Survivor PX Neon, has a placeholder entry.
- Game 001 has live itch.io link.
- Game 001 source is not yet imported.
- Game 001 exact model and agent provenance still need confirmation.

Current repository URL:

https://github.com/aidong27/99-ai-games

Game 001 live URL:

https://aidong27.itch.io/star-survivor-px-neon

## 6. Repository Structure

The long-term structure should stay stable:

```text
.
├── index.html
├── src/
├── styles/
├── games/
│   ├── manifest.json
│   └── <game-slug>/
│       ├── index.html
│       ├── game.json
│       ├── src/
│       ├── styles/
│       └── assets/
├── docs/
├── AGENTS.md
├── README.md
├── ROADMAP.md
└── TODO.md
```

Each game should be runnable from its own folder and reachable from the root launcher.

## 7. Game Lifecycle

Each game should move through these stages:

1. Idea
   - Maintainer writes or selects a concept.
   - Concept should include core mechanic, mood, controls, and expected scope.

2. AI Build
   - Codex or another AI agent creates the implementation.
   - Human maintainer should not hand-edit game code.

3. Local Verification
   - Run through a local static server.
   - Check desktop and mobile viewport basics.
   - Check browser console errors.
   - Verify the game can start, play, and restart or end.

4. Metadata
   - Add or update `game.json`.
   - Update `games/manifest.json`.
   - Record model, agent, date, and source completeness.

5. Documentation
   - Add controls, gameplay summary, screenshots, and known limitations.
   - Keep claims aligned with the actual build.

6. Publication
   - Push to GitHub.
   - Optionally publish selected games to itch.io.

7. Reflection
   - Record what the AI agent did well.
   - Record weaknesses, bugs, or design limitations.
   - Compare with older games where useful.

## 8. Milestones

### Phase 1: Foundation

Status: in progress

- Public GitHub repository.
- Shared launcher UI.
- Game manifest.
- Game 001 placeholder.
- Contribution and security policies.
- Project plan.
- Codex agent instructions.

### Phase 2: Game 001 Completion

Goal:

- Import the real Star Survivor PX Neon source.
- Confirm model and agent provenance if available.
- Add real screenshots.
- Verify local build against itch.io version.
- Mark Game 001 source status accurately.

### Phase 3: Repeatable Game Pipeline

Goal:

- Create a checklist for adding each new AI-made game.
- Standardize `game.json` metadata.
- Add smoke-test notes or scripts if the project grows enough to justify them.
- Document how to publish selected games to itch.io.

### Phase 4: Early Collection

Goal:

- Add Games 002-010 gradually.
- Try different models or agent workflows.
- Keep every game small, playable, and documented.
- Start comparing model behavior across entries.

### Phase 5: Long-Term Archive

Goal:

- Continue toward 99 games over a longer period.
- Preserve a public timeline of AI game-making progress.
- Improve launcher browsing, tags, screenshots, and accessibility.

## 9. Success Criteria

Short-term success:

- A visitor can understand the project in under one minute.
- The root launcher opens locally and from GitHub-hosted static files.
- Game 001's incomplete source status is clear and honest.
- Codex agents entering the repo know the rules from `AGENTS.md`.

Medium-term success:

- Game 001 source is imported and verified.
- At least several AI-made games are added with consistent metadata.
- The maintainer can add a new game without redesigning the repository structure.

Long-term success:

- 99 games are completed over time.
- Each game preserves its AI provenance.
- The collection visibly shows how AI-generated games evolved.

## 10. Risks and Mitigations

### Risk: Fake or unclear provenance

Mitigation:

- Use `Pending maintainer confirmation` when model or agent identity is unknown.
- Do not infer provenance from memory or guesses.

### Risk: Placeholder mistaken for playable source

Mitigation:

- Keep source status visible in README, TODO, manifest, and each game page.

### Risk: Project becomes a generic game dump

Mitigation:

- Require provenance and reflection for every game.
- Prefer slow, meaningful additions over bulk generation.

### Risk: Human code edits weaken the concept

Mitigation:

- Keep `humanCodeEdits: false` as a required metadata field.
- If policy changes later, document the change explicitly.

### Risk: AI-generated code quality varies

Mitigation:

- Use local server verification.
- Keep games small.
- Record known limitations instead of hiding them.

## 11. OpenAI Codex for Open Source Fit

This project is a strong fit for Codex because Codex is not just a helper around the project; Codex and similar agents are part of the project's subject.

Codex can help by:

- generating new game implementations
- preserving consistent project structure
- writing and updating metadata
- running browser checks
- documenting model behavior
- improving accessibility and code readability
- keeping the no-human-code-edits rule explicit

The project should remain honest: it is a small independent long-term experiment, not a large existing open-source community.

## 12. Next Actions

Recommended next actions:

1. Import the real Star Survivor PX Neon source.
2. Confirm the AI model and agent used for Game 001.
3. Add real screenshots from Game 001.
4. Add a Game 002 concept issue.
5. Decide whether to enable GitHub Pages for the launcher.
6. Keep this plan updated as the project evolves.
