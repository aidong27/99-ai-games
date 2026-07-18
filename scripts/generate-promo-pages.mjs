import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const ASSET_VERSION = "2026-07-11-gallery";
const SITE_ROOT = "https://aidong27.github.io/99-ai-games";
const checkOnly = process.argv.includes("--check");
const failures = [];

const manifest = await readJson("games/manifest.json");
const entries = Array.isArray(manifest.games) ? manifest.games : [];
const games = await Promise.all(entries.map(loadGame));

for (const game of games) {
  await assertGenerated(`promo/${game.slug}/index.html`, renderPromoPage(game));
  await assertGenerated(`assets/social/games/${game.slug}.svg`, renderSocialCard(game));
}

if (failures.length) {
  console.error("Generated promo pages are out of date:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`${checkOnly ? "Checked" : "Generated"} ${games.length} game promo pages`);

async function loadGame(entry) {
  const metadataPath = normalizePath(entry.metadataPath ?? `${entry.localPath ?? `./games/${entry.slug}/`}game.json`);
  let gameJson = {};
  try {
    gameJson = await readJson(metadataPath);
  } catch (error) {
    gameJson = { _metadataError: error.message };
  }

  return {
    ...entry,
    ...gameJson,
    slug: gameJson.slug ?? entry.slug,
    title: gameJson.title ?? entry.title ?? "Untitled observation",
    description: gameJson.description ?? entry.description ?? "No description recorded.",
    hallName: gameJson.hallName ?? entry.hallName ?? entry.hallId ?? "Hall unrecorded",
    localPath: normalizeDirectory(gameJson.localPath ?? entry.localPath ?? `./games/${entry.slug}/`),
    metadataPath,
    media: gameJson.media ?? entry.media ?? null,
    provenance: gameJson.provenance ?? entry.provenance ?? {},
    deviceSupport: gameJson.deviceSupport ?? entry.deviceSupport ?? {}
  };
}

function renderPromoPage(game) {
  const screenshots = getScreenshots(game);
  const hero = screenshots[0] ?? "";
  const number = String(game.number ?? "?").padStart(3, "0");
  const title = escapeHtml(game.title);
  const description = escapeHtml(game.description);
  const socialImage = `${SITE_ROOT}/assets/social/games/${encodeURIComponent(game.slug)}.svg`;
  const promoUrl = `${SITE_ROOT}/promo/${encodeURIComponent(game.slug)}/`;
  const metadataHref = rootHref(game.metadataPath);
  const gameHref = rootHref(game.localPath);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title} | 99 AI Games">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${promoUrl}">
    <meta property="og:image" content="${socialImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title} | 99 AI Games">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${socialImage}">
    <meta name="theme-color" content="#000000">
    <title>${title} | Promo | 99 AI Games</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23000000'/%3E%3Ctext x='16' y='22' font-family='Arial,sans-serif' font-size='13' font-weight='700' fill='%23ffffff' text-anchor='middle'%3E99%3C/text%3E%3C/svg%3E">
    <script src="../../src/theme.js?v=${ASSET_VERSION}"></script>
    <link rel="stylesheet" href="../../styles/archive.css?v=${ASSET_VERSION}">
  </head>
  <body class="archive-page promo-page">
    <a class="skip-link" href="#promo-main">Skip to game promo</a>
    <div class="archive-shell">
      <header class="archive-topbar" aria-label="Promo navigation">
        <a class="wordmark" href="../../">
          <span>99</span>
          <strong>AI Games</strong>
        </a>
        <div class="page-title">
          <p class="archive-kicker">Game promo / Observation ${number}</p>
          <h1>${title}</h1>
        </div>
        <a class="archive-button secondary compact" href="../../library.html#${encodeURIComponent(game.slug)}">Library</a>
      </header>

      <main id="promo-main">
        <section class="promo-hero">
          <div class="promo-copy">
            <p class="archive-kicker">${escapeHtml(game.hallName)}</p>
            <h1>${title}</h1>
            <p class="promo-lede">${description}</p>
            <div class="promo-actions">
              <a class="archive-button primary" href="../../play.html?slug=${encodeURIComponent(game.slug)}">Play Gate</a>
              <a class="archive-button secondary" href="../../observation.html?slug=${encodeURIComponent(game.slug)}">Observation Record</a>
              <a class="archive-button ghost" href="${metadataHref}">Metadata JSON</a>
            </div>
          </div>
          ${hero ? renderHeroImage(hero, game) : renderPlaceholder()}
        </section>

        <section class="promo-grid" aria-label="Game facts and evidence">
          <article class="promo-panel">
            <h2>Archive Facts</h2>
            <dl class="promo-facts">
              ${fact("Observation", `Observation ${number} / Game ${number}`)}
              ${fact("Hall", game.hallName)}
              ${fact("Model", game.provenance?.modelName ?? "Model unrecorded")}
              ${fact("Agent", game.provenance?.agentName ?? "Agent unrecorded")}
              ${fact("Desktop", toTitle(game.deviceSupport?.desktop ?? "limited"))}
              ${fact("Mobile", toTitle(game.deviceSupport?.mobile ?? "limited"))}
              ${fact("Source", game.sourceCompleteness ?? "Source status unrecorded")}
            </dl>
          </article>

          <article class="promo-panel">
            <h2>Evidence</h2>
            <p class="promo-evidence-note">This page is a promotional presentation surface. Listed screenshots are real repository files when present; generated social cards are promotional assets, not gameplay evidence.</p>
            ${renderGallery(screenshots, game)}
          </article>
        </section>

        <section class="promo-grid" aria-label="Useful links">
          ${linkCard("Play through device gate", `../../play.html?slug=${encodeURIComponent(game.slug)}`, "Uses launcher device-support policy before opening the game.")}
          ${linkCard("Open playable source", gameHref, "Direct static game page preserved in the repository.")}
          ${linkCard("Read observation record", `../../observation.html?slug=${encodeURIComponent(game.slug)}`, "Metadata, provenance, variants, controls, and run records.")}
          ${linkCard("Inspect metadata", metadataHref, "Machine-readable game.json source for this promo page.")}
        </section>
      </main>

      <nav class="archive-dock" aria-label="Archive sections">
        <a href="../../library.html">Library</a>
        <a href="../../compare.html">Compare</a>
        <a href="../../press.html">Press</a>
        <a href="../../log.html">Log</a>
        <a href="../../games/manifest.json">Manifest</a>
      </nav>
    </div>
  </body>
</html>
`;
}

function renderHeroImage(href, game) {
  return `<figure class="promo-media">
            <img src="${rootHref(href)}" alt="${escapeHtml(game.title)} verified screenshot" decoding="async">
          </figure>`;
}

function renderPlaceholder() {
  return `<div class="promo-media">
            <div class="promo-visual-placeholder">
              <p>No verified screenshot is listed for this observation yet.</p>
            </div>
          </div>`;
}

function renderGallery(screenshots, game) {
  if (!screenshots.length) {
    return `<p class="archive-notice">No verified screenshot is listed yet. This page does not substitute generated art for gameplay evidence.</p>`;
  }

  return `<div class="promo-gallery">
              ${screenshots.map((screenshot, index) => `<figure>
                <img src="${rootHref(screenshot)}" alt="${escapeHtml(game.title)} screenshot ${index + 1}" loading="lazy" decoding="async">
                <figcaption>${escapeHtml(normalizePath(screenshot))}</figcaption>
              </figure>`).join("\n              ")}
            </div>`;
}

function renderSocialCard(game) {
  const number = String(game.number ?? "?").padStart(3, "0");
  const title = escapeXml(game.title);
  const hall = escapeXml(game.hallName);
  const model = escapeXml(game.provenance?.modelName ?? "Model unrecorded");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${title} promo card</title>
  <desc id="desc">Promotional card for 99 AI Games observation ${number}. Not gameplay evidence.</desc>
  <rect width="1200" height="630" fill="#000000"/>
  <rect x="72" y="72" width="1056" height="486" rx="8" fill="#1c1c1e" opacity="0.92"/>
  <rect x="96" y="96" width="52" height="52" rx="8" fill="#0a84ff"/>
  <text x="122" y="130" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="700" text-anchor="middle">99</text>
  <text x="168" y="130" fill="#f5f5f7" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" font-size="24" font-weight="700">AI Games</text>
  <text x="96" y="232" fill="#8e8e93" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" font-size="22" font-weight="600">Observation ${number}</text>
  <text x="96" y="326" fill="#f5f5f7" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="76" font-weight="760">${title}</text>
  <text x="100" y="390" fill="#c7c7cc" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" font-size="28">${hall}</text>
  <text x="100" y="442" fill="#c7c7cc" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" font-size="24">${model}</text>
  <text x="96" y="520" fill="#8e8e93" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" font-size="18">Promotional asset - not gameplay evidence</text>
  <circle cx="1050" cy="132" r="12" fill="#0a84ff"/>
</svg>
`;
}

function getScreenshots(game) {
  const paths = [
    game.media?.thumbnail,
    ...(game.media?.screenshots ?? []),
    ...(game.screenshots ?? [])
  ].filter(Boolean);

  const seen = new Set();
  return paths.map((assetPath) => resolveGameAsset(game, assetPath)).filter((assetPath) => {
    if (!assetPath || seen.has(assetPath)) {
      return false;
    }
    seen.add(assetPath);
    return true;
  });
}

function resolveGameAsset(game, assetPath) {
  if (!assetPath) {
    return "";
  }

  const clean = normalizePath(assetPath);
  if (/^(?:https?:)?\/\//.test(clean) || clean.startsWith("games/")) {
    return clean;
  }

  return path.posix.join(normalizePath(game.localPath), clean);
}

function fact(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value ?? "Unrecorded")}</dd></div>`;
}

function linkCard(label, href, description) {
  return `<a class="promo-link-card" href="${href}">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(description)}</span>
          </a>`;
}

function rootHref(value) {
  const clean = normalizePath(value);
  if (/^(?:https?:)?\/\//.test(clean)) {
    return clean;
  }
  return `../../${clean}`;
}

function normalizePath(value) {
  return String(value ?? "").replace(/^\.\//, "");
}

function normalizeDirectory(value) {
  const clean = normalizePath(value);
  return clean.endsWith("/") ? clean : `${clean}/`;
}

async function readJson(relativePath) {
  const text = await readFile(path.join(repoRoot, relativePath), "utf8");
  return JSON.parse(text);
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
      failures.push(`${relativePath} is not generated from current metadata`);
    }
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

function toTitle(value = "unknown") {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", "&apos;");
}
