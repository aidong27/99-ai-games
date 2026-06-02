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
- device support and mobile readiness must be machine-readable and evidence-based
- `humanCodeEdits` should remain false unless an exception is documented
- no fake screenshots or fake verification
- launcher reviews must check the four-level static path: title screen, library, observation record, and play gate
