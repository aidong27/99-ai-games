import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const errors = [];
const requiredAssetVersion = "2026-06-14-claude7";
const expectedOgImage = "https://aidong27.github.io/99-ai-games/assets/social/og-cover.png";

const requiredFiles = [
  "index.html",
  "library.html",
  "observation.html",
  "play.html",
  "press.html",
  "log.html",
  "compare.html",
  "styles/archive.css",
  "styles/main.css",
  "src/archive-effects.js",
  "src/archive-data.js",
  "src/main.js",
  "src/library.js",
  "src/observation.js",
  "src/play.js",
  "src/press.js",
  "src/share.js",
  "src/compare.js",
  "assets/social/og-cover.svg",
  "assets/social/og-cover.png",
  "assets/social/social-card.svg",
  "assets/social/social-card-square.svg",
  "docs/share-kit.md",
  "games/manifest.json"
];

const launcherPages = [
  "index.html",
  "library.html",
  "observation.html",
  "play.html",
  "press.html",
  "log.html",
  "compare.html"
];

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

async function isDirectory(relativePath) {
  try {
    return (await stat(repoPath(relativePath))).isDirectory();
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

function stripQueryAndHash(value) {
  return String(value).split("#")[0].split("?")[0];
}

function isExternalRef(value) {
  return /^(?:https?:)?\/\//.test(value);
}

function normalizeLocalRef(value, context) {
  const clean = stripQueryAndHash(value);
  if (!clean || clean.startsWith("data:") || clean.startsWith("mailto:")) {
    return "";
  }
  if (isExternalRef(clean)) {
    fail(`${context} uses external resource ${value}`);
    return "";
  }
  if (clean.startsWith("/")) {
    fail(`${context} uses absolute root path ${value}`);
    return "";
  }
  return clean.replace(/^\.\//, "");
}

function validateVersionedRef(value, context) {
  if (!/[?&]v=/.test(value)) {
    fail(`${context} should include a cache-busting ?v= query`);
    return;
  }

  try {
    const parsed = new URL(value, "https://local.invalid/");
    const version = parsed.searchParams.get("v");
    if (version !== requiredAssetVersion) {
      fail(`${context} has stale cache-busting version ${version ?? "missing"}, expected ${requiredAssetVersion}`);
    }
  } catch {
    fail(`${context} could not parse cache-busting URL ${value}`);
  }
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function parseTags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

async function validateHtmlReferences(pagePath) {
  const html = await readText(pagePath);

  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    if (!isExternalRef(match[1])) {
      normalizeLocalRef(match[1], `${pagePath} reference`);
    }
  }

  for (const tag of parseTags(html, "link")) {
    const rel = getAttribute(tag, "rel").toLowerCase();
    if (!rel.split(/\s+/).includes("stylesheet")) {
      continue;
    }
    const href = getAttribute(tag, "href");
    validateVersionedRef(href, `${pagePath} stylesheet`);
    const localPath = normalizeLocalRef(href, `${pagePath} stylesheet`);
    if (localPath && !(await exists(localPath))) {
      fail(`${pagePath} stylesheet does not exist: ${href}`);
    }
  }

  for (const tag of parseTags(html, "script")) {
    const src = getAttribute(tag, "src");
    if (!src) {
      continue;
    }
    validateVersionedRef(src, `${pagePath} script`);
    const localPath = normalizeLocalRef(src, `${pagePath} script`);
    if (localPath && !(await exists(localPath))) {
      fail(`${pagePath} script does not exist: ${src}`);
    }
  }

  validateSocialMeta(html, pagePath);
}

function validateSocialMeta(html, pagePath) {
  const requiredMeta = [
    ["property", "og:title"],
    ["property", "og:description"],
    ["property", "og:type"],
    ["property", "og:url"],
    ["property", "og:image"],
    ["name", "twitter:card"],
    ["name", "twitter:title"],
    ["name", "twitter:description"],
    ["name", "twitter:image"],
    ["name", "theme-color"]
  ];

  for (const [attribute, value] of requiredMeta) {
    const content = getMetaContent(html, attribute, value);
    if (!content) {
      fail(`${pagePath} missing ${attribute}="${value}" meta tag`);
    }
  }

  const ogImage = getMetaContent(html, "property", "og:image");
  const twitterImage = getMetaContent(html, "name", "twitter:image");
  if (ogImage !== expectedOgImage) {
    fail(`${pagePath} og:image should be ${expectedOgImage}`);
  }
  if (twitterImage !== expectedOgImage) {
    fail(`${pagePath} twitter:image should be ${expectedOgImage}`);
  }
}

function getMetaContent(html, attribute, value) {
  for (const tag of parseTags(html, "meta")) {
    if (getAttribute(tag, attribute).toLowerCase() === value.toLowerCase()) {
      return getAttribute(tag, "content");
    }
  }
  return "";
}

function normalizeManifestPath(value, context) {
  if (!value || typeof value !== "string") {
    fail(`${context} path is required`);
    return "";
  }
  if (isExternalRef(value)) {
    fail(`${context} uses external path ${value}`);
    return "";
  }
  if (value.startsWith("/")) {
    fail(`${context} uses absolute root path ${value}`);
    return "";
  }
  return value.replace(/^\.\//, "");
}

function resolveGameAsset(game, assetPath, context) {
  if (!assetPath) {
    return "";
  }
  if (isExternalRef(assetPath)) {
    fail(`${context} uses external media path ${assetPath}`);
    return "";
  }
  if (assetPath.startsWith("/")) {
    fail(`${context} uses absolute root media path ${assetPath}`);
    return "";
  }

  const clean = assetPath.replace(/^\.\//, "");
  if (clean.startsWith("games/")) {
    return clean;
  }

  const localPath = normalizeManifestPath(game.localPath, `${context} localPath`);
  return path.posix.join(localPath, clean);
}

function validateDeviceSupport(support, label) {
  const required = ["desktop", "mobile", "launcherPolicy", "inputs", "minViewport", "mobileNotes"];
  if (!support || typeof support !== "object" || Array.isArray(support)) {
    fail(`${label} deviceSupport object is required`);
    return;
  }

  for (const key of required) {
    if (!(key in support)) {
      fail(`${label} deviceSupport.${key} is required for launcher rendering`);
    }
  }

  if (!Array.isArray(support.inputs) || support.inputs.length === 0) {
    fail(`${label} deviceSupport.inputs must be a non-empty array`);
  }

  if (!support.minViewport || !Number.isInteger(support.minViewport.width) || !Number.isInteger(support.minViewport.height)) {
    fail(`${label} deviceSupport.minViewport width and height must be integers`);
  }

  if (typeof support.mobileNotes !== "string" || !support.mobileNotes.trim()) {
    fail(`${label} deviceSupport.mobileNotes must be a non-empty string`);
  }
}

function collectMediaPaths(game) {
  return [
    game.media?.thumbnail,
    ...(game.media?.screenshots ?? []),
    ...(game.screenshots ?? [])
  ].filter(Boolean);
}

function validateNoPlaceholderGame(game, label) {
  const placeholderText = [
    game.slug,
    game.title,
    game.status,
    game.statusLabel,
    game.sourceCompleteness
  ].filter(Boolean).join(" ").toLowerCase();

  if (/\b(?:placeholder|reserved slot|no source yet)\b/.test(placeholderText)) {
    fail(`${label} looks like a reserved placeholder in manifest.games`);
  }
}

for (const requiredPath of requiredFiles) {
  if (!(await exists(requiredPath))) {
    fail(`Required launcher file is missing: ${requiredPath}`);
  }
}

for (const pagePath of launcherPages) {
  await validateHtmlReferences(pagePath);
}

await validateReadmeAssets();
await validateShareKitAssets();
await validateNoFalseClaims();

const manifest = await readJson("games/manifest.json");
const games = Array.isArray(manifest.games) ? manifest.games : [];
const targetGameCount = manifest.targetGameCount ?? 99;

if (!Number.isInteger(targetGameCount) || targetGameCount < 1) {
  fail("manifest.targetGameCount must be a positive integer");
}

if (games.length > targetGameCount) {
  fail(`manifest.games length (${games.length}) exceeds targetGameCount (${targetGameCount})`);
}

for (const game of games) {
  const label = `Game ${game.number ?? "?"} (${game.slug ?? "missing-slug"})`;
  if (!game.slug) {
    fail(`${label} slug is required`);
  }
  validateNoPlaceholderGame(game, label);
  validateDeviceSupport(game.deviceSupport, `${label} manifest`);

  const localPath = normalizeManifestPath(game.localPath, `${label} localPath`);
  const metadataPath = normalizeManifestPath(game.metadataPath, `${label} metadataPath`);
  if (localPath && !(await isDirectory(localPath))) {
    fail(`${label} localPath directory does not exist: ${game.localPath}`);
  }
  if (metadataPath && !(await exists(metadataPath))) {
    fail(`${label} metadataPath file does not exist: ${game.metadataPath}`);
  }

  const observationHref = `./observation.html?slug=${encodeURIComponent(game.slug ?? "")}`;
  const playGateHref = `./play.html?slug=${encodeURIComponent(game.slug ?? "")}`;
  const libraryHref = `./library.html#${encodeURIComponent(game.slug ?? "")}`;
  const gameHref = `./${localPath.replace(/\/$/, "")}/`;
  const metadataHref = `./${metadataPath}`;
  if (!libraryHref.startsWith("./library.html#")) {
    fail(`${label} library hash URL could not be generated safely`);
  }
  if (!observationHref.startsWith("./observation.html?slug=")) {
    fail(`${label} observation URL could not be generated safely`);
  }
  if (!playGateHref.startsWith("./play.html?slug=")) {
    fail(`${label} play gate URL could not be generated safely`);
  }
  if (!gameHref.startsWith("./games/") || !gameHref.endsWith("/")) {
    fail(`${label} game URL could not be generated safely from localPath`);
  }
  if (!metadataHref.startsWith("./games/") || !metadataHref.endsWith("/game.json")) {
    fail(`${label} metadata URL could not be generated safely from metadataPath`);
  }

  const gameJson = metadataPath ? await readJson(metadataPath) : {};
  validateDeviceSupport(gameJson.deviceSupport, `${label} game.json`);

  for (const mediaPath of collectMediaPaths(game)) {
    const resolved = resolveGameAsset(game, mediaPath, `${label} manifest media`);
    if (resolved && !(await exists(resolved))) {
      fail(`${label} manifest media path does not exist: ${mediaPath}`);
    }
  }

  for (const mediaPath of collectMediaPaths(gameJson)) {
    const resolved = resolveGameAsset({ ...game, ...gameJson }, mediaPath, `${label} game.json media`);
    if (resolved && !(await exists(resolved))) {
      fail(`${label} game.json media path does not exist: ${mediaPath}`);
    }
  }
}

if (errors.length) {
  console.error("Launcher validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Launcher validation passed");

async function validateReadmeAssets() {
  const readme = await readText("README.md");
  for (const match of readme.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
    const localPath = normalizeLocalRef(match[1], "README image");
    if (localPath && !(await exists(localPath))) {
      fail(`README image path does not exist: ${match[1]}`);
    }
  }
}

async function validateShareKitAssets() {
  const shareKit = await readText("docs/share-kit.md");
  const requiredAssets = [
    "assets/social/og-cover.png",
    "assets/social/og-cover.svg",
    "assets/social/social-card.svg",
    "assets/social/social-card-square.svg"
  ];

  for (const asset of requiredAssets) {
    if (!shareKit.includes(asset)) {
      fail(`docs/share-kit.md should list ${asset}`);
    }
    if (!(await exists(asset))) {
      fail(`Share kit asset does not exist: ${asset}`);
    }
  }
}

async function validateNoFalseClaims() {
  const files = [
    "README.md",
    "press.html",
    "log.html",
    "docs/share-kit.md",
    "assets/social/README.md"
  ];
  const claimPatterns = [
    /99\s+completed\s+games/i,
    /thousands\s+of\s+players/i,
    /millions?\s+of\s+players/i,
    /\bpopular\s+archive\b/i,
    /\bwent\s+viral\b/i,
    /\bviral\s+project\b/i,
    /\b\d[\d,.]*\s*(?:k|m)?\s+(?:users|downloads|ratings|stars)\b/i
  ];

  for (const file of files) {
    const text = await readText(file);
    for (const pattern of claimPatterns) {
      if (pattern.test(text)) {
        fail(`${file} appears to contain an unsupported public metric or completion claim: ${pattern}`);
      }
    }
  }
}
