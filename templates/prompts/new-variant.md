# New Model Variant Prompt Template

Use this when asking a different model or agent to remake an existing game concept.

```text
Create a new model variant for Game 000: <title>.

Variant ID:
Model label:
Agent/tool:
What this variant should explore:

Rules:
- This is a variant of an existing game slot.
- Do not consume a new game number.
- Store variant metadata under games/<slug>/variants/<variant-id>/.
- Store run records under games/<slug>/runs/.
- Keep humanCodeEdits false unless an exception is explicitly documented.
```
