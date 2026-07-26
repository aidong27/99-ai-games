import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_VERSION } from "../src/app/constants.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const siteRoot = "https://aidong27.github.io/99-ai-games";
const checkOnly = process.argv.includes("--check");
const failures = [];
const manifest = JSON.parse(await readFile(path.join(repoRoot, "games/manifest.json"), "utf8"));
const games = Array.isArray(manifest.games) ? manifest.games : [];
const benchmark = JSON.parse(await readFile(path.join(repoRoot, "data/benchmark.json"), "utf8"));

const urls = [
  `${siteRoot}/`,
  `${siteRoot}/challenge.html`,
  `${siteRoot}/entries.html`,
  `${siteRoot}/library.html`,
  `${siteRoot}/compare.html`,
  `${siteRoot}/methodology.html`,
  `${siteRoot}/press.html`,
  `${siteRoot}/log.html`,
  ...(benchmark.defaultEntries ?? []).map(
    (entry) => `${siteRoot}/benchmark-pages/${encodeURIComponent(entry.entryId)}/`
  ),
  ...games.map((game) => `${siteRoot}/promo/${encodeURIComponent(game.slug)}/`)
];

await assertGenerated("robots.txt", renderRobots());
await assertGenerated("sitemap.xml", renderSitemap(urls));
await assertGenerated("404.html", renderNotFound());
await assertIndexStructuredData(renderIndexStructuredData(games, benchmark));

if (failures.length) {
  console.error("Generated discovery surfaces are out of date:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`${checkOnly ? "Checked" : "Generated"} discovery files and index structured data`);

function renderRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteRoot}/sitemap.xml\n`;
}

function renderSitemap(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n")}
</urlset>
`;
}

function renderNotFound() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="theme-color" content="#0b0c0e">
    <title>Page Not Found | 99 AI Games</title>
    <script src="./src/theme.js?v=${ASSET_VERSION}"></script>
    <script src="./src/i18n.js?v=${ASSET_VERSION}"></script>
    <script type="module" src="./src/pwa.js?v=${ASSET_VERSION}"></script>
    <link rel="stylesheet" href="./styles/tokens.css?v=${ASSET_VERSION}">
    <link rel="stylesheet" href="./styles/base.css?v=${ASSET_VERSION}">
    <link rel="stylesheet" href="./styles/layout.css?v=${ASSET_VERSION}">
    <link rel="stylesheet" href="./styles/components.css?v=${ASSET_VERSION}">
    <link rel="stylesheet" href="./styles/benchmark.css?v=${ASSET_VERSION}">
  </head>
  <body class="benchmark-page">
    <a class="skip-link" href="#not-found-main">Skip to recovery links</a>
    <header class="benchmark-header" aria-label="Benchmark navigation">
      <a class="benchmark-brand" href="./"><span class="benchmark-brand-mark">99</span><span class="benchmark-brand-copy"><strong>AI Games</strong><small>EVOLUTION BENCHMARK</small></span></a>
      <nav class="benchmark-nav"><a href="./">Home</a><a href="./challenge.html">Challenge</a><a href="./entries.html">Entries</a><a href="./library.html">Legacy</a></nav>
      <span class="benchmark-header-status">HTTP 404</span>
    </header>
    <main id="not-found-main" class="benchmark-shell">
      <section class="benchmark-empty">
        <span class="empty-index">404</span>
        <div class="empty-copy">
          <p class="benchmark-kicker">No fabricated fallback</p>
          <h1>This path is outside the current archive.</h1>
          <p>The Entry, evidence record, or Legacy observation may have moved. The site never invents a result to fill a missing route.</p>
          <div class="benchmark-actions">
            <a class="archive-button primary" href="./entries.html">Browse Entries</a>
            <a class="archive-button secondary" href="./library.html">Open Legacy Archive</a>
          <a class="archive-button secondary" href="./">Return home</a>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>
`;
}

function renderIndexStructuredData(entries, benchmarkData) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "99 AI Games",
        url: `${siteRoot}/`,
        description: "One fixed browser-game challenge implemented by different AI coding systems."
      },
      {
        "@type": "Dataset",
        name: "Protocol 99 AI Coding-System Benchmark",
        url: `${siteRoot}/entries.html`,
        description: "Playable implementations of one locked browser-game prompt with real browser evidence.",
        version: benchmarkData.challenge.version,
        identifier: benchmarkData.challenge.canonicalPromptHash,
        size: benchmarkData.stats.benchmarkEntries,
        isBasedOn: `${siteRoot}/challenge.html`
      },
      {
        "@type": "CollectionPage",
        name: "99 AI Games Pre-Benchmark Era Archive",
        url: `${siteRoot}/library.html`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: entries.length,
          itemListElement: entries.map((game, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: game.title,
            url: `${siteRoot}/promo/${encodeURIComponent(game.slug)}/`
          }))
        }
      }
    ]
  };
  const json = JSON.stringify(graph).replaceAll("<", "\\u003c");
  return `    <script type="application/ld+json">${json}</script>`;
}

async function assertIndexStructuredData(content) {
  const relativePath = "index.html";
  const filePath = path.join(repoRoot, relativePath);
  const start = "    <!-- GENERATED:structured-data:start -->";
  const end = "    <!-- GENERATED:structured-data:end -->";
  const existing = await readFile(filePath, "utf8");
  const startIndex = existing.indexOf(start);
  const endIndex = existing.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) {
    failures.push(`${relativePath} is missing structured-data markers`);
    return;
  }
  const replacement = `${start}\n${content}\n${end}`;
  const current = existing.slice(startIndex, endIndex + end.length);
  if (checkOnly) {
    if (current !== replacement) {
      failures.push(`${relativePath} structured data is out of date`);
    }
    return;
  }
  const next = `${existing.slice(0, startIndex)}${replacement}${existing.slice(endIndex + end.length)}`;
  await writeFile(filePath, next);
}

async function assertGenerated(relativePath, content) {
  const filePath = path.join(repoRoot, relativePath);
  if (checkOnly) {
    let existing = "";
    try {
      existing = await readFile(filePath, "utf8");
    } catch {
      failures.push(`${relativePath} is missing`);
      return;
    }
    if (existing !== content) {
      failures.push(`${relativePath} is not generated from current manifest and version`);
    }
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
