# Automation Guide

This compatibility filename remains for older links. The current authoritative
automation documentation is [`AUTOMATION.md`](AUTOMATION.md), and the game-entry
flow is [`AGENT-AUTOPILOT.md`](AGENT-AUTOPILOT.md).

The repository now intentionally includes a minimal `package.json` and lockfile
for Playwright browser verification. Launcher and games remain framework-free
static HTML/CSS/JavaScript; game runtimes do not depend on npm.

Core commands:

```bash
npm ci
npm run agent:start -- --provider="..." --model="..." --agent="..."
npm run agent:verify
npm run agent:finalize
npm run test:agent-flow
npm run check
npm run dev
npm run build:site
```

Legacy scaffolding scripts remain for historical maintenance only. Do not use
them to create a Protocol 99 Entry.
