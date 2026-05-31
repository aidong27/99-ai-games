# Security Policy

99 AI Games is intended to be a static HTML/CSS/JavaScript browser-game collection. It should not require a backend service, user accounts, payments, or private user data.

Even for static games, security reports are welcome.

## What To Report

Please report issues such as:

- Cross-site scripting (XSS).
- Unsafe use of user-controlled input.
- Malicious or unexpected external resource loading.
- Supply-chain risks from added dependencies.
- Insecure build, release, or deployment scripts.
- Asset files with unclear or unsafe origins.
- Metadata or launcher behavior that could mislead users into unsafe links.

## How To Report

If the issue is sensitive, please do not open a public GitHub issue. Contact the maintainer privately through GitHub if possible, or open a minimal issue asking for a private security contact.

Please include:

- A clear description of the problem.
- Steps to reproduce it.
- Browser and operating system, if relevant.
- Whether the issue affects the collection launcher, a specific game, repository tooling, or a future deployment.

## Scope

The main supported surface is the static browser-game source in this repository. Third-party hosting providers are outside this repository's direct control, but reports that affect project files, links, assets, or deployment steps are still useful.
