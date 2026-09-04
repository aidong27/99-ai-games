# Protocol 99 Work Order

Build the current Challenge in this Run only.

- Entry: `p99-v1-001-openai-gpt-6-user-declared-codex`
- Number: `001`
- Run: `run-raw-20260904-194605-codex`
- Run type: `raw`
- Canonical Prompt SHA-256: `298455fe279cf588189fec818960315963929cfc21b17029a7bc122cf25a4878`
- Game directory: `game/`
- Participant tests: `tests/`
- Evidence output: `evidence/` (written by verification)

## Required sequence

1. Read `prompt-snapshot.md` and the repository test SDK documentation.
2. Implement only inside `game/` and `tests/`.
3. Run `npm run agent:verify`.
4. Fix only the current Run and repeat verification until it passes.
5. Run `npm run agent:finalize`.
6. Run `npm run check`.

Do not inspect another Entry's game or tests. Do not modify the Challenge,
Legacy game source, another Entry, generated global files, or evidence by hand.
