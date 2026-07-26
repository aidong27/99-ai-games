# Release Process

This compatibility filename remains for older links. Follow
[`RELEASE.md`](RELEASE.md) for the current CI, browser acceptance, generated
drift, pull request, and GitHub Pages procedure.

Minimum local release gate:

```bash
npm ci
npx playwright install chromium
node scripts/check.mjs
npm run build:site
git diff --check HEAD
```
