# Security Policy

99 AI Games is a static browser-game archive. The expected project surface is HTML, CSS, JavaScript, metadata, images, documentation, and GitHub Pages deployment. It should not require accounts, private user data, payments, analytics tracking, login flows, or a remote backend by default.

## Sensitive Material

Do not commit:

- Private tokens or API keys.
- Private prompts or unreleased prompt context.
- Account information, session data, cookies, or personal credentials.
- Secrets copied from local development tools.
- Links to private services that are not intended for public use.

If sensitive data is accidentally committed, rotate or revoke the exposed secret first, then open a maintenance issue or pull request to remove it from the public project state.

## What To Report

Please open a GitHub issue if you find:

- Malicious or unexpected scripts.
- Unsafe external links or third-party resource loading.
- Supply-chain risk from a new dependency or workflow.
- Browser behavior that collects user data unexpectedly.
- Obfuscated code or assets with unclear origin.
- Metadata that points users toward unsafe files or URLs.

Keep the report short and reproducible. Include the affected file, game, URL, or workflow when possible.

## Project Defaults

New games and launcher features should remain static and inspectable. Avoid adding tracking, login, account sync, remote storage, or backend calls unless there is a specific issue and pull request explaining why the project needs them.

External dependencies should be rare. If one is introduced, document the reason and keep the dependency visible in review.

## Scope

Supported surfaces include the repository source, static game pages, metadata, GitHub workflows, and public demo deployment. Third-party hosting behavior outside this repository is not directly maintained here, but unsafe links or deployment instructions in this repository are in scope.
