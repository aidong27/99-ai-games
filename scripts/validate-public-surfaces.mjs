import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasCurrentScreenshotEvidence } from "../src/data/media-evidence.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const siteRoot = "https://aidong27.github.io/99-ai-games";
const errors = [];
const benchmark = await readJson("data/benchmark.json");
const entryManifest = await readJson("entries/manifest.json");
const legacyManifest = await readJson("games/manifest.json");
const legacyGames = legacyManifest.games ?? [];

const readme = await readText("README.md");
for (const expected of [
  "Same brief. Same rules. Different AI.",
  "| Finalized Protocol 99 Raw Entries | [Generated index](docs/generated-benchmark-index.md) |",
  "| Allocated Protocol 99 Entries | [Generated index](docs/generated-benchmark-index.md) |",
  `| Legacy playable experiments | ${benchmark.stats?.legacyPlayableExperiments ?? 0} |`,
  "npm run agent:start",
  "npm run agent:verify",
  "npm run agent:finalize",
  "npm run test:agent-flow",
  "node scripts/check.mjs"
]) {
  expect("README.md", readme, expected);
}
for (const game of legacyGames) {
  expect("README.md", readme, `| ${String(game.number).padStart(3, "0")} | ${game.title} |`);
  expect("README.md", readme, `${siteRoot}/promo/${game.slug}/`);
}

const press = await readText("press.html");
for (const expected of [
  "<dt>Protocol 99 Raw</dt><dd>Loading manifest</dd>",
  "<dt>Allocated Entries</dt><dd>Loading manifest</dd>",
  "<dt>Legacy playable</dt><dd>Loading manifest</dd>",
  "<dt>Prompt status</dt><dd>Locked</dd>"
]) {
  expect("press.html", press, expected);
}

const home = await readText("index.html");
for (const expected of [
  "One challenge.",
  "Same rules.",
  "Different AI.",
  "Pre-Benchmark Era",
  "data/benchmark.json",
  "GENERATED:structured-data:start",
  "GENERATED:structured-data:end"
]) {
  if (expected === "data/benchmark.json") {
    const mainSource = await readText("src/benchmark-data.js");
    expect("src/benchmark-data.js", mainSource, expected);
  } else {
    expect("index.html", home, expected);
  }
}

for (const sourcePath of [
  "src/main.js",
  "src/challenge.js",
  "src/entries.js",
  "src/entry.js",
  "src/compare.js"
]) {
  const source = await readText(sourcePath);
  if (/["']\.\/docs\//.test(source)) {
    fail(`${sourcePath} links to local docs/ even though docs/ is excluded from the Pages artifact`);
  }
}

const socialReadme = await readText("assets/social/README.md");
expect("assets/social/README.md", socialReadme, "derives its Finalized Raw count");
expect("assets/social/README.md", socialReadme, "11 playable experiments");
expect("assets/social/README.md", socialReadme, "not gameplay");
const ogCover = await readText("assets/social/og-cover.svg");
expect("assets/social/og-cover.svg", ogCover, "SAME BRIEF · SAME RULES · DIFFERENT AI");
expect("assets/social/og-cover.svg", ogCover, `>${benchmark.stats?.benchmarkEntries ?? 0} / 99<`);
expect("assets/social/og-cover.svg", ogCover, `>${benchmark.stats?.legacyPlayableExperiments ?? 0} preserved<`);
await validatePng("assets/social/og-cover.png", 1200, 630);

for (const game of legacyGames) {
  await validateLegacyPromo(game);
}
for (const entry of benchmark.defaultEntries ?? []) {
  const page = `benchmark-pages/${entry.entryId}/index.html`;
  const card = `assets/social/entries/${entry.entryId}.svg`;
  const raster = `assets/social/entries/${entry.entryId}.png`;
  if (!(await exists(page))) fail(`Finalized Entry detail redirect is missing: ${page}`);
  if (!(await exists(card))) fail(`Finalized Entry social card is missing: ${card}`);
  if (!(await exists(raster))) fail(`Finalized Entry social raster is missing: ${raster}`);
  else await validatePng(raster, 1200, 630);
  if (await exists(page)) {
    const html = await readText(page);
    expect(page, html, entry.canonicalPromptHash);
    expect(page, html, `entry.html?id=${encodeURIComponent(entry.entryId)}`);
  }
}

if (entryManifest.finalizedRawEntryCount !== benchmark.stats?.benchmarkEntries) {
  fail("entries/manifest.json and data/benchmark.json disagree about Finalized Raw count");
}
if ((entryManifest.entries ?? []).some((entry) => entry.entryId === "fixture-not-production")) {
  fail("the browser fixture leaked into the production Entry manifest");
}

const shareKit = await readText("docs/share-kit.md");
for (const expected of [
  `${siteRoot}/`,
  `${siteRoot}/challenge.html`,
  `${siteRoot}/entries.html`,
  `${siteRoot}/compare.html`,
  `${siteRoot}/library.html`,
  "assets/social/og-cover.png",
  "assets/social/entries/<entry-id>.svg"
]) {
  expect("docs/share-kit.md", shareKit, expected);
}

if (errors.length) {
  console.error("Public surface validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Public surface validation passed");

async function validateLegacyPromo(game) {
  const number = String(game.number).padStart(3, "0");
  const page = `promo/${game.slug}/index.html`;
  const svg = `assets/social/games/${game.slug}.svg`;
  const png = `assets/social/games/${game.slug}.png`;
  const poster = `assets/posters/games/${game.slug}.jpg`;
  for (const file of [page, svg, png, poster]) {
    if (!(await exists(file))) fail(`${game.slug} public asset is missing: ${file}`);
  }
  if (!(await exists(page))) return;
  const html = await readText(page);
  for (const expected of [
    `${game.title} | Promo | 99 AI Games`,
    `Observation ${number} / Game ${number}`,
    `../../play.html?slug=${game.slug}`,
    `../../observation.html?slug=${game.slug}`,
    "promotional presentation surface"
  ]) {
    expect(page, html, expected);
  }
  const metadataPath = String(game.metadataPath ?? `games/${game.slug}/game.json`).replace(/^\.\//, "");
  const gameJson = await readJson(metadataPath);
  const merged = { ...game, ...gameJson };
  const screenshots = [
    ...(game.media?.screenshots ?? []),
    ...(game.screenshots ?? []),
    ...(gameJson.media?.screenshots ?? []),
    ...(gameJson.screenshots ?? [])
  ].filter(Boolean);
  if (!hasCurrentScreenshotEvidence(merged) || screenshots.length === 0) {
    expect(page, html, "No verified screenshot");
    expect(page, html, "does not substitute generated art for gameplay evidence");
  }
}

async function validatePng(relativePath, width, height) {
  if (!(await exists(relativePath))) {
    fail(`${relativePath} is missing`);
    return;
  }
  const bytes = await readFile(path.join(repoRoot, relativePath));
  if (
    bytes.length < 24
    || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || bytes.readUInt32BE(16) !== width
    || bytes.readUInt32BE(20) !== height
  ) {
    fail(`${relativePath} must be a ${width}x${height} PNG`);
  }
}

function expect(file, text, value) {
  if (!text.includes(value)) {
    fail(`${file} is missing ${value}`);
  }
}

async function exists(relativePath) {
  try {
    await access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readText(relativePath) {
  try {
    return await readFile(path.join(repoRoot, relativePath), "utf8");
  } catch (error) {
    fail(`${relativePath} could not be read: ${error.message}`);
    return "";
  }
}

async function readJson(relativePath) {
  const text = await readText(relativePath);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath} is invalid JSON: ${error.message}`);
    return {};
  }
}

function fail(message) {
  errors.push(message);
}
