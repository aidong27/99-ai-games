# Game Review Prompt Template

Use this after an AI agent generates or revises a game.

```text
Review Game 000 / <variant-id> for 99 AI Games.

Check:
- Does it load from a local static server?
- Does the launcher still work?
- Is the canvas or main play surface nonblank?
- Do documented controls work?
- Is there horizontal overflow at desktop or 390px mobile width?
- Does `deviceSupport` match the actual desktop/mobile behavior and launcher policy?
- Are limited or unsupported mobile entries warning or blocking launch correctly?
- Are console warnings/errors present?
- Does metadata match the actual source state?
- Are any claims unverified or exaggerated?

Return:
- bugs found
- verification commands
- metadata corrections
- whether it can be marked playable
```
