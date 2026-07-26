# Security

Protocol 99 executes participant game code only as a local/static browser
artifact. The repository uses defense in depth, not a claim of perfect safety.

## Static Policy

Entry runtime scanning reports external URLs and remote imports; `fetch`,
XMLHttpRequest, WebSocket, and EventSource; external iframe/form targets;
`eval` and `new Function`; service-worker registration; analytics and suspicious
mining patterns; popup/top-navigation and permission APIs; path escape; and
files above the size budget. It also rejects cross-frame access through
`window.parent`, `window.top`, `frameElement`, or `document.domain`. Hidden
runtime files are included in the source hash and scan; symbolic links and
special files are rejected.

Static text scanning is explainable but not proof that code is harmless.

## Runtime Policy

- Playwright aborts and records requests outside the active Run's `game/`
  directory, including same-origin attempts to load another Entry or Legacy
  game.
- Public Entry iframes use a restrictive `sandbox`. Local module loading on a
  static GitHub Pages origin requires `allow-same-origin`, so cross-frame
  access is separately prohibited and scanned.
- Games have no backend, account, API key, analytics, or external runtime asset.
- `.site/` exposes only public Finalized game/evidence data and public JSON
  schemas. It rejects symbolic links and development-only Run files.
- The evidence hash covers the verification report, console/network records,
  file inventory, and screenshots. Only the report's self-referential
  `evidenceHash` field is normalized out of the hash input.
- Participant tests and Work Orders are not deployed.

## Test Integrity

The participant uses a restricted SDK. Tests may send public input and read the
serializable `window.__P99__` state. Direct mutation, arbitrary state injection,
teleportation, hazard disabling, or test-only victory paths are prohibited and
statically checked. Participant tests may import only the central SDK and are
executed in a VM context without Node globals or string/wasm code generation;
they are not imported as ordinary privileged Node modules.

## Provenance and Secrets

Do not commit `.agent/`, credentials, cookies, tokens, local browser profiles,
or private tool logs. Identity fields describe the coding system without
storing account identifiers or secrets.

## Reporting

Use [`SECURITY.md`](../SECURITY.md) for a real vulnerability. Do not publish a
working exploit in a public issue. A security repair to a Finalized Entry must
create a new explicitly labeled Run; it cannot silently replace Raw evidence.
