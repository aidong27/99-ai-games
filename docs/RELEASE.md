# Release

## Local Gate

From a clean dependency install:

```bash
npm ci
npx playwright install chromium
node scripts/check.mjs
npm run build:site
git diff --check HEAD
```

`node scripts/check.mjs` already builds and validates `.site/`, but the explicit
build command is useful for artifact inspection.

## Browser Acceptance

Run:

```bash
npm run dev
```

Check at 1440 x 900 and 390 x 700:

- Home, Current Challenge, Entries, Compare, Entry Detail missing state,
  Methodology, Legacy Library, Observation, Play Gate, Press, Log, and one
  Legacy promo;
- dark, light, and auto theme;
- navigation, filters, query/hash routes, and visible controls;
- no horizontal overflow or uncaught console error;
- real Entry iframes are sandboxed when Entries exist;
- Legacy games and promo evidence boundaries still work.

Stop the server after testing and confirm the chosen port is no longer
listening.

## Generated Drift

Run `npm run generate`, then run it a second time. The second pass must produce
no diff. Never edit generated output to make a check pass.

## Pull Request

Use a dedicated branch. The PR must state the Challenge/Entry/Run effect,
whether any game implementation changed, commands and viewports actually
tested, generated output changes, current benchmark/Legacy counts, and known
limitations. Wait for CI and merge only when the quality gate passes.

Before using GitHub's web merge controls, confirm that the account setting
**Keep my email addresses private** is enabled. Web edits and merge commits can
otherwise publish the account's real email address even when local Git uses a
GitHub `noreply` address. Enabling privacy later does not rewrite email metadata
already present in public commits.

## Pages

The Pages workflow installs the exact lockfile and Chromium, runs the same
quality gate, creates `.site/`, uploads that directory, and deploys. The
workflow does not commit generated changes to `main`.

After deployment, verify the live Home, Challenge Prompt Hash, Entries count,
one Legacy route, and current asset version. Do not use a local preview server
as permanent hosting.
