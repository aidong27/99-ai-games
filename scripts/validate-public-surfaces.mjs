import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasCurrentScreenshotEvidence } from "../src/data/media-evidence.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const siteRoot = "https://aidong27.github.io/99-ai-games";
const errors = [];

function fail(message) {
  errors.push(message);
}

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

async function exists(relativePath) {
  try {
    await access(repoPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readText(relativePath) {
  try {
    return await readFile(repoPath(relativePath), "utf8");
  } catch (error) {
    fail(`${relativePath} could not be read: ${error.message}`);
    return "";
  }
}

async function readJson(relativePath) {
  const text = await readText(relativePath);
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return {};
  }
}

function expectIncludes(file, text, expected, label) {
  if (!text.includes(expected)) {
    fail(`${file} is missing ${label}: ${expected}`);
  }
}

function expectMatches(file, text, pattern, label) {
  if (!pattern.test(text)) {
    fail(`${file} is missing ${label}: ${pattern}`);
  }
}

function padObservation(value) {
  return String(value).padStart(3, "0");
}

function normalizeLocalPath(value) {
  return String(value ?? "").replace(/^\.\//, "").replace(/\/$/, "");
}

function resolveGameMedia(game, mediaPath) {
  const clean = String(mediaPath ?? "").replace(/^\.\//, "");
  if (!clean) {
    return "";
  }
  if (clean.startsWith("games/")) {
    return clean;
  }
  return path.posix.join(normalizeLocalPath(game.localPath), clean);
}

function collectScreenshots(game, gameJson) {
  return [
    ...(game.media?.screenshots ?? []),
    ...(game.screenshots ?? []),
    ...(gameJson.media?.screenshots ?? []),
    ...(gameJson.screenshots ?? [])
  ].filter(Boolean);
}

const manifest = await readJson("games/manifest.json");
const games = Array.isArray(manifest.games) ? manifest.games : [];
const targetCount = manifest.targetGameCount ?? 99;
const hallCount = manifest.hallCount ?? 0;
const observationCount = games.length;
const playableCount = games.filter((game) => game.status === "playable").length;
const variantCount = games.reduce((total, game) => total + (game.variants?.length ?? 0), 0);
const runCount = games.reduce((total, game) => total + (game.runRecords?.length ?? 0), 0);
const modelNames = new Set();

for (const game of games) {
  if (game.provenance?.modelName) {
    modelNames.add(game.provenance.modelName);
  }
  for (const variant of game.variants ?? []) {
    if (variant.modelName) {
      modelNames.add(variant.modelName);
    }
  }
}

if (!Number.isInteger(targetCount) || targetCount < 1) {
  fail("games/manifest.json targetGameCount must be a positive integer");
}
if (!Array.isArray(manifest.games)) {
  fail("games/manifest.json games must be an array");
}

const readme = await readText("README.md");
expectIncludes("README.md", readme, `| Target observation slots | ${targetCount} |`, "target slot count");
expectIncludes("README.md", readme, `| Playable observations | ${playableCount} |`, "playable observation count");
expectIncludes("README.md", readme, `| Game halls | ${hallCount} |`, "hall count");
expectIncludes("README.md", readme, `| Model variants | ${variantCount} |`, "model variant count");
expectIncludes("README.md", readme, `| Run records | ${runCount} |`, "run record count");
expectIncludes("README.md", readme, "node scripts/validate-public-surfaces.mjs", "public-surface validator command");

for (const game of games) {
  const number = padObservation(game.number);
  expectIncludes("README.md", readme, `| ${number} | ${game.title} |`, `${game.slug} playable observation row`);
  expectIncludes("README.md", readme, `${siteRoot}/observation.html?slug=${game.slug}`, `${game.slug} observation URL`);
  expectIncludes("README.md", readme, `${siteRoot}/promo/${game.slug}/`, `${game.slug} promo URL`);
}

const press = await readText("press.html");
expectMatches("press.html", press, new RegExp(`<dt>Observations<\\/dt><dd>${observationCount} \\/ ${targetCount}<\\/dd>`), "fallback observation stats");
expectMatches("press.html", press, new RegExp(`<dt>Playable<\\/dt><dd>${playableCount}<\\/dd>`), "fallback playable stats");
expectMatches("press.html", press, new RegExp(`<dt>Halls<\\/dt><dd>${hallCount}<\\/dd>`), "fallback hall stats");
expectMatches("press.html", press, new RegExp(`<dt>Run records<\\/dt><dd>${runCount}<\\/dd>`), "fallback run-record stats");

const socialReadme = await readText("assets/social/README.md");
expectIncludes("assets/social/README.md", socialReadme, `\`${playableCount} / ${targetCount}\``, "current observation count");
expectIncludes("assets/social/README.md", socialReadme, "`games/<slug>.svg`", "game-specific card contract");
expectIncludes("assets/social/README.md", socialReadme, "`games/<slug>.png`", "raster game card contract");

const ogCover = await readText("assets/social/og-cover.svg");
expectIncludes("assets/social/og-cover.svg", ogCover, `>${playableCount} / ${targetCount}<`, "playable count");
expectIncludes("assets/social/og-cover.svg", ogCover, `>${modelNames.size} observed<`, "observed model count");
expectIncludes("assets/social/og-cover.svg", ogCover, `>${runCount}<`, "run record count");

const socialCard = await readText("assets/social/social-card.svg");
expectIncludes("assets/social/social-card.svg", socialCard, `${playableCount} playable observations / ${targetCount} target slots`, "wide card count line");
expectIncludes("assets/social/social-card.svg", socialCard, `>${playableCount}<`, "wide card playable badge");

const squareCard = await readText("assets/social/social-card-square.svg");
expectIncludes("assets/social/social-card-square.svg", squareCard, `${playableCount} playable / ${targetCount} target slots`, "square card count line");
expectIncludes("assets/social/social-card-square.svg", squareCard, `>${playableCount}<`, "square card playable badge");

const shareKit = await readText("docs/share-kit.md");
for (const requiredLink of [
  `${siteRoot}/`,
  "https://github.com/aidong27/99-ai-games",
  `${siteRoot}/library.html`,
  `${siteRoot}/games/manifest.json`,
  `${siteRoot}/press.html`,
  `${siteRoot}/log.html`
]) {
  expectIncludes("docs/share-kit.md", shareKit, requiredLink, `share link ${requiredLink}`);
}
for (const requiredAsset of [
  "assets/social/og-cover.png",
  "assets/social/og-cover.svg",
  "assets/social/social-card.svg",
  "assets/social/social-card-square.svg",
  "assets/social/games/<slug>.svg",
  "assets/social/games/<slug>.png"
]) {
  expectIncludes("docs/share-kit.md", shareKit, requiredAsset, `share asset ${requiredAsset}`);
}

for (const game of games) {
  const number = padObservation(game.number);
  const promoUrl = `${siteRoot}/promo/${game.slug}/`;
  const promoPage = `promo/${game.slug}/index.html`;
  const promoCard = `assets/social/games/${game.slug}.svg`;
  const promoCardPng = `assets/social/games/${game.slug}.png`;
  const metadataPath = normalizeLocalPath(game.metadataPath);

  expectIncludes("docs/share-kit.md", shareKit, promoUrl, `${game.slug} promo share URL`);

  if (!(await exists(promoPage))) {
    fail(`${promoPage} is missing`);
    continue;
  }
  if (!(await exists(promoCard))) {
    fail(`${promoCard} is missing`);
  }
  if (!(await exists(promoCardPng))) {
    fail(`${promoCardPng} is missing`);
  }

  const promo = await readText(promoPage);
  expectIncludes(promoPage, promo, `${game.title} | Promo | 99 AI Games`, "title");
  expectIncludes(promoPage, promo, `${siteRoot}/assets/social/games/${game.slug}.png`, "game social image meta");
  expectIncludes(promoPage, promo, '"@type":"VideoGame"', "VideoGame structured data");
  expectIncludes(promoPage, promo, `Observation ${number} / Game ${number}`, "observation label");
  expectIncludes(promoPage, promo, `../../play.html?slug=${game.slug}`, "play gate link");
  expectIncludes(promoPage, promo, `../../observation.html?slug=${game.slug}`, "observation record link");
  expectIncludes(promoPage, promo, `../../${metadataPath}`, "metadata link");
  expectIncludes(promoPage, promo, "promotional presentation surface", "evidence boundary copy");

  const gameJson = metadataPath ? await readJson(metadataPath) : {};
  const mergedGame = { ...game, ...gameJson };
  const screenshotPaths = hasCurrentScreenshotEvidence(mergedGame)
    ? [...new Set(collectScreenshots(game, gameJson).map((shot) => resolveGameMedia(game, shot)).filter(Boolean))]
    : [];
  if (screenshotPaths.length === 0) {
    expectIncludes(promoPage, promo, "No verified screenshot", "no-screenshot marker");
    expectIncludes(promoPage, promo, "does not substitute generated art for gameplay evidence", "no fake gameplay evidence copy");
  } else {
    for (const screenshotPath of screenshotPaths) {
      if (!(await exists(screenshotPath))) {
        fail(`${promoPage} references missing screenshot source ${screenshotPath}`);
      }
      expectIncludes(promoPage, promo, screenshotPath, `screenshot source ${screenshotPath}`);
    }
  }

  const promoCardText = await readText(promoCard);
  expectIncludes(promoCard, promoCardText, game.title, "game title");
  expectIncludes(promoCard, promoCardText, `Observation ${number}`, "observation number");
}

if (errors.length) {
  console.error("Public surface validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Public surface validation passed");
