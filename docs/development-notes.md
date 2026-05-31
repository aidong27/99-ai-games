# Development Notes

## Local Preview

Use a local static server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

Avoid relying on `file://` for development checks. Browser modules, fetched JSON, assets, and canvas-related tests can behave differently from a normal HTTP preview.

## Game Folder Convention

Each game should live in:

```text
games/<slug>/
```

Each game directory should contain:

```text
index.html
game.json
src/
styles/
assets/images/
assets/audio/
```

The root `games/manifest.json` should include the same high-level metadata needed by the launcher.

## Provenance Rules

Every game entry must record:

- model name
- agent or tool name
- creation date
- whether human code edits were made

For this project, the intended game-code policy is:

```json
{
  "humanCodeEdits": false
}
```

If the model or agent is unknown, mark it as pending confirmation instead of guessing.

## Source Import Notes

If an AI agent produces a single-file `index.html`, import it first without a large rewrite. After the game is confirmed to run locally, split code gradually only through AI-generated changes and record the agent/model used.

## Suggested Verification Checklist

- Root launcher loads without console errors.
- `games/manifest.json` loads over HTTP.
- Game card appears in the launcher.
- Game entry page opens from the launcher.
- Game `game.json` loads over HTTP.
- After real source import, the game starts and controls respond.
- Layout remains usable on a narrow mobile viewport.

## Documentation Rules

- Do not claim features that are not in the source.
- Keep screenshots aligned with the actual build.
- Record asset licenses before accepting new assets.
- Keep README status current when a game becomes source-complete.
- Keep provenance honest, especially when model identity is unknown.
