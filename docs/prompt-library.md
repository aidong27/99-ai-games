# Prompt Library

Prompt templates live in `templates/prompts/`.

## Templates

- `new-game.md`: create a new official game slot.
- `new-variant.md`: create a model variant for an existing game concept.
- `review-game.md`: review playability, metadata, and verification.

## Prompt Rules

Every prompt should remind the agent:

- game slots are concepts, not generations
- variants do not consume new numbers
- run records describe attempts
- provenance must be honest
- `humanCodeEdits` should remain false unless an exception is documented
- no fake screenshots or fake verification
