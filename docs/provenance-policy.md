# Provenance Policy

99 AI Games depends on honest provenance.

## Required Fields

Every game, variant, and run should record:

- game number
- title or slug
- model name
- agent/tool
- created date
- `humanCodeEdits`
- status
- notes when provenance is uncertain or maintainer-declared

## Human Code Edits

The project rule is:

```json
{
  "humanCodeEdits": false
}
```

The maintainer can curate prompts, test, publish, and document, but should not hand-write game code. If this rule ever changes, the exception must be explicit in metadata and documentation.

## No Fake Claims

Do not invent:

- model provenance
- source completeness
- screenshots
- user numbers
- stars
- downloads
- popularity
- verification

If a fact is missing, say it is missing.

## Maintainer-Declared Labels

When the maintainer declares a model label, metadata should say so. Game 001 uses `GPT-5.5 xhigh` as a maintainer-declared model label.
