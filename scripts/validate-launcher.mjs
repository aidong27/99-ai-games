import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  filterGamesByModel,
  getGameStatusLabel,
  getModelFamiliesFromModels,
  getModelsFromGames
} from "../src/data/view-models.js";
import {
  getModelFamily,
  getModelFamilySelection
} from "../src/data/model-families.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const errors = [];
const requiredAssetVersion = "2026-07-13-orbit-cadence";
const generatedPromoAssetVersion = "2026-07-13-orbit-cadence";
const siteRoot = "https://aidong27.github.io/99-ai-games";
const expectedOgImage = "https://aidong27.github.io/99-ai-games/assets/social/og-cover.png";
const launcherCanonicalUrls = {
  "index.html": `${siteRoot}/`,
  "library.html": `${siteRoot}/library.html`,
  "observation.html": `${siteRoot}/observation.html`,
  "play.html": `${siteRoot}/play.html`,
  "compare.html": `${siteRoot}/compare.html`,
  "press.html": `${siteRoot}/press.html`,
  "log.html": `${siteRoot}/log.html`
};
const launcherStylesheets = [
  "styles/tokens.css",
  "styles/base.css",
  "styles/layout.css",
  "styles/components.css",
  "styles/archive-pages.css"
];
const cssSystemFiles = [
  ...launcherStylesheets,
  "styles/archive.css",
  "styles/pages/home.css"
];
const pageStylesheets = {
  "index.html": ["styles/pages/home.css"]
};
const launcherPageModules = {
  "index.html": "src/main.js",
  "library.html": "src/library.js",
  "observation.html": "src/observation.js",
  "play.html": "src/play.js",
  "compare.html": "src/compare.js",
  "press.html": "src/press.js",
  "log.html": "src/log.js"
};

const requiredFiles = [
  "index.html",
  "library.html",
  "observation.html",
  "play.html",
  "press.html",
  "log.html",
  "compare.html",
  "styles/tokens.css",
  "styles/base.css",
  "styles/layout.css",
  "styles/components.css",
  "styles/archive.css",
  "styles/archive-pages.css",
  "styles/pages/home.css",
  "src/app/constants.js",
  "src/app/routes.js",
  "src/theme.js",
  "src/i18n.js",
  "src/pwa.js",
  "src/archive-effects.js",
  "src/archive-data.js",
  "src/data/device-support.js",
  "src/data/media-evidence.js",
  "src/data/model-families.js",
  "src/data/paths.js",
  "src/data/view-models.js",
  "src/main.js",
  "src/library.js",
  "src/observation.js",
  "src/play.js",
  "src/press.js",
  "src/log.js",
  "src/share.js",
  "src/compare.js",
  "src/ui/badges.js",
  "src/ui/buttons.js",
  "src/ui/cards.js",
  "src/ui/dom.js",
  "src/ui/layout.js",
  "src/ui/meta.js",
  "scripts/generate-promo-pages.mjs",
  "scripts/validate-public-surfaces.mjs",
  "assets/social/og-cover.svg",
  "assets/social/og-cover.png",
  "assets/social/social-card.svg",
  "assets/social/social-card-square.svg",
  "assets/social/games/raster-manifest.json",
  "docs/css-selector-map.md",
  "docs/index.md",
  "docs/share-kit.md",
  "games/manifest.json",
  "404.html",
  "favicon.ico",
  "manifest.webmanifest",
  "robots.txt",
  "service-worker.js",
  "sitemap.xml"
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

async function validatePromoPoster(relativePath, label) {
  let bytes;
  try {
    bytes = await readFile(repoPath(relativePath));
  } catch (error) {
    fail(`${label} promo poster could not be read: ${error.message}`);
    return;
  }

  const dimensions = readJpegDimensions(bytes);
  if (!dimensions) {
    fail(`${label} promo poster must be a readable JPEG: ${relativePath}`);
    return;
  }
  if (dimensions.width !== 1024 || dimensions.height !== 1536) {
    fail(`${label} promo poster must be 1024x1536, found ${dimensions.width}x${dimensions.height}`);
  }
  if (bytes.byteLength > 800_000) {
    fail(`${label} promo poster exceeds the 800 KB delivery budget: ${relativePath}`);
  }
}

async function validateSocialCardPng(relativePath, label) {
  let bytes;
  try {
    bytes = await readFile(repoPath(relativePath));
  } catch (error) {
    fail(`${label} raster social card could not be read: ${error.message}`);
    return;
  }

  const pngSignature = "89504e470d0a1a0a";
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== pngSignature) {
    fail(`${label} raster social card must be a readable PNG: ${relativePath}`);
    return;
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== 1200 || height !== 630) {
    fail(`${label} raster social card must be 1200x630, found ${width}x${height}`);
  }
  if (bytes.byteLength > 500_000) {
    fail(`${label} raster social card exceeds the 500 KB delivery budget: ${relativePath}`);
  }
}

function readJpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
  ]);
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }
    if (offset + 2 > bytes.length) {
      return null;
    }

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }
    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) {
        return null;
      }
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5)
      };
    }
    offset += segmentLength;
  }

  return null;
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

function normalizeLocalRef(value, context, fromPath = ".") {
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
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), clean)).replace(/^\.\//, "");
}

function validateVersionedRef(value, context, expectedVersion = requiredAssetVersion) {
  if (!/[?&]v=/.test(value)) {
    fail(`${context} should include a cache-busting ?v= query`);
    return;
  }

  try {
    const parsed = new URL(value, "https://local.invalid/");
    const version = parsed.searchParams.get("v");
    if (version !== expectedVersion) {
      fail(`${context} has stale cache-busting version ${version ?? "missing"}, expected ${expectedVersion}`);
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
  const expectedAssetVersion = /^promo\/[^/]+\/index\.html$/.test(pagePath)
    ? generatedPromoAssetVersion
    : requiredAssetVersion;
  let hasThemeScript = false;
  let hasI18nScript = false;
  let hasPwaScript = false;
  let hasManifest = false;
  const stylesheetPaths = [];
  const scriptPaths = [];

  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    if (!isExternalRef(match[1])) {
      const localPath = normalizeLocalRef(match[1], `${pagePath} reference`, pagePath);
      if (localPath && !(await exists(localPath))) {
        fail(`${pagePath} local reference does not exist: ${match[1]}`);
      }
    }
  }

  for (const tag of parseTags(html, "link")) {
    const rel = getAttribute(tag, "rel").toLowerCase();
    if (rel.split(/\s+/).includes("manifest")) {
      hasManifest = true;
    }
    if (!rel.split(/\s+/).includes("stylesheet")) {
      continue;
    }
    const href = getAttribute(tag, "href");
    validateVersionedRef(href, `${pagePath} stylesheet`, expectedAssetVersion);
    const localPath = normalizeLocalRef(href, `${pagePath} stylesheet`, pagePath);
    if (localPath) {
      stylesheetPaths.push(localPath);
    }
    if (localPath && !(await exists(localPath))) {
      fail(`${pagePath} stylesheet does not exist: ${href}`);
    }
  }

  for (const tag of parseTags(html, "script")) {
    const src = getAttribute(tag, "src");
    if (!src) {
      continue;
    }
    validateVersionedRef(src, `${pagePath} script`, expectedAssetVersion);
    const localPath = normalizeLocalRef(src, `${pagePath} script`, pagePath);
    if (localPath) {
      scriptPaths.push(localPath);
    }
    if (localPath === "src/theme.js") {
      hasThemeScript = true;
    }
    if (localPath === "src/i18n.js") {
      hasI18nScript = true;
    }
    if (localPath === "src/pwa.js") {
      hasPwaScript = true;
    }
    if (localPath && !(await exists(localPath))) {
      fail(`${pagePath} script does not exist: ${src}`);
    }
  }

  if (!hasThemeScript) {
    fail(`${pagePath} should load src/theme.js before rendering themed UI`);
  }
  if (!hasI18nScript) {
    fail(`${pagePath} should load src/i18n.js for English and Chinese UI`);
  }
  if (!hasPwaScript) {
    fail(`${pagePath} should load src/pwa.js for progressive offline support`);
  }
  if (!hasManifest) {
    fail(`${pagePath} should link manifest.webmanifest`);
  }

  if (new Set(stylesheetPaths).size !== stylesheetPaths.length) {
    fail(`${pagePath} should not load the same stylesheet more than once`);
  }

  if (launcherPages.includes(pagePath)) {
    validateLauncherStylesheetStack(pagePath, stylesheetPaths);
    validateLauncherPageModule(pagePath, scriptPaths);
    validateLauncherCanonical(html, pagePath);
  }

  validatePromoStylesheetStack(pagePath, stylesheetPaths);
  validateSocialMeta(html, pagePath);
}

function validateLauncherPageModule(pagePath, scriptPaths) {
  const expectedModule = launcherPageModules[pagePath];
  if (!scriptPaths.includes(expectedModule)) {
    fail(`${pagePath} should load its page module ${expectedModule}`);
  }
}

async function validateLauncherDomContracts() {
  for (const [pagePath, modulePath] of Object.entries(launcherPageModules)) {
    const html = await readText(pagePath);
    const source = await readText(modulePath);
    const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
    const idSet = new Set(ids);

    for (const id of idSet) {
      if (ids.filter((entry) => entry === id).length > 1) {
        fail(`${pagePath} contains duplicate id="${id}"`);
      }
    }

    const requiredIds = new Set();
    for (const match of source.matchAll(/document\.querySelector\(\s*["']#([\w:-]+)["']\s*\)/g)) {
      requiredIds.add(match[1]);
    }
    for (const match of source.matchAll(/document\.getElementById\(\s*["']([\w:-]+)["']\s*\)/g)) {
      requiredIds.add(match[1]);
    }

    for (const id of requiredIds) {
      if (!idSet.has(id)) {
        fail(`${modulePath} expects #${id}, but ${pagePath} does not define it`);
      }
    }
  }
}

function validateViewModelContracts() {
  const overloadedPlayable = getGameStatusLabel({
    status: "playable",
    statusLabel: "Playable Observation 006 / Game 006"
  });
  if (overloadedPlayable !== "Playable") {
    fail("getGameStatusLabel should keep playable status separate from observation numbering");
  }

  if (getGameStatusLabel({ status: "in-review" }) !== "In Review") {
    fail("getGameStatusLabel should provide a readable fallback for non-playable states");
  }

  const gpt55Family = getModelFamily("GPT-5.5 xhigh");
  const gpt56Family = getModelFamily("GPT-5.6 sol ultra");
  if (gpt55Family.id !== "chatgpt" || gpt56Family.id !== "chatgpt") {
    fail("GPT-5.5 and GPT-5.6 should both belong to the ChatGPT model family");
  }
  if (gpt55Family.providerName !== "OpenAI") {
    fail("The ChatGPT model family should identify OpenAI as its provider");
  }
  if (getModelFamily("Claude Opus 4.8").id !== "claude" || getModelFamily("Claude Fable 5").id !== "claude") {
    fail("Claude models should share the Claude model family");
  }
  if (getModelFamily("Kimi").id !== "kimi") {
    fail("Kimi should belong to the Kimi model family");
  }
  const grokFamily = getModelFamily("Grok 4.5");
  if (grokFamily.id !== "grok" || grokFamily.providerName !== "xAI") {
    fail("Grok models should belong to the Grok / xAI model family");
  }

  const fixtureGames = [
    {
      slug: "openai-fixture",
      number: 1,
      provenance: { modelName: "GPT-5.5 xhigh", agentName: "Codex" },
      variants: [{ modelName: "GPT-5.6 sol ultra", agentName: "Codex" }]
    },
    {
      slug: "anthropic-fixture",
      number: 2,
      provenance: { modelName: "Claude Opus 4.8", agentName: "Claude Code" },
      variants: []
    }
  ];
  const fixtureModels = getModelsFromGames(fixtureGames);
  const fixtureFamilies = getModelFamiliesFromModels(fixtureModels);
  const chatgptFamily = fixtureFamilies.find((family) => family.id === "chatgpt");
  if (chatgptFamily?.models.length !== 2 || chatgptFamily.games.length !== 1) {
    fail("Model family aggregation should keep exact models while deduplicating shared observations");
  }
  const chatgptGames = filterGamesByModel(fixtureGames, getModelFamilySelection(chatgptFamily));
  if (chatgptGames.length !== 1 || chatgptGames[0].slug !== "openai-fixture") {
    fail("Model family filtering should return every observation in the selected family once");
  }
}

function validateLauncherCanonical(html, pagePath) {
  const canonicalTags = parseTags(html, "link").filter((tag) => {
    const rel = getAttribute(tag, "rel").toLowerCase().split(/\s+/);
    return rel.includes("canonical");
  });
  const expectedUrl = launcherCanonicalUrls[pagePath];

  if (canonicalTags.length !== 1) {
    fail(`${pagePath} should contain exactly one canonical link`);
    return;
  }

  const canonicalUrl = getAttribute(canonicalTags[0], "href");
  if (canonicalUrl !== expectedUrl) {
    fail(`${pagePath} canonical URL should be ${expectedUrl}`);
  }

  const ogUrl = getMetaContent(html, "property", "og:url");
  if (ogUrl !== expectedUrl) {
    fail(`${pagePath} og:url should match its canonical URL ${expectedUrl}`);
  }
}

function validateLauncherStylesheetStack(pagePath, stylesheetPaths) {
  let lastIndex = -1;
  for (const expected of launcherStylesheets) {
    const index = stylesheetPaths.indexOf(expected);
    if (index === -1) {
      fail(`${pagePath} should load ${expected}`);
      continue;
    }
    if (index < lastIndex) {
      fail(`${pagePath} should load shared CSS in tokens -> base -> layout -> components -> archive-pages order`);
    }
    lastIndex = index;
  }

  const archivePagesIndex = stylesheetPaths.indexOf("styles/archive-pages.css");

  const expectedPageStyles = pageStylesheets[pagePath] ?? [];
  let previousPageIndex = archivePagesIndex;
  for (const expected of expectedPageStyles) {
    const index = stylesheetPaths.indexOf(expected);
    if (index === -1) {
      fail(`${pagePath} should load ${expected}`);
      continue;
    }
    if (index < previousPageIndex) {
      fail(`${pagePath} should load page CSS after styles/archive-pages.css in the documented order`);
    }
    previousPageIndex = index;
  }
}

function validatePromoStylesheetStack(pagePath, stylesheetPaths) {
  if (!/^promo\/[^/]+\/index\.html$/.test(pagePath)) {
    return;
  }

  const expectedStylesheet = "styles/archive.css";
  if (stylesheetPaths.length !== 1 || stylesheetPaths[0] !== expectedStylesheet) {
    fail(`${pagePath} should load only ${expectedStylesheet}; archive.css imports shared CSS for generated promo compatibility`);
  }
}

async function validateArchiveCssImports() {
  const css = await readText("styles/archive.css");
  const imports = [];
  for (const match of css.matchAll(/@import\s+url\(["']?([^"')]+)["']?\);/g)) {
    validateVersionedRef(match[1], "styles/archive.css import");
    const localPath = normalizeLocalRef(match[1], "styles/archive.css import", "styles/archive.css");
    if (localPath) {
      imports.push(localPath);
      if (!(await exists(localPath))) {
        fail(`styles/archive.css import does not exist: ${match[1]}`);
      }
    }
  }

  const firstImports = imports.slice(0, launcherStylesheets.length);
  const expectedImports = launcherStylesheets;
  if (firstImports.join("|") !== expectedImports.join("|")) {
    fail("styles/archive.css should import tokens, base, layout, components, and archive-pages in order for generated promo compatibility");
  }
}

async function validateCssSystem() {
  const cssSources = [];
  for (const cssPath of cssSystemFiles) {
    const css = await readText(cssPath);
    cssSources.push(css);
    const source = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
    let depth = 0;
    for (const character of source) {
      if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth < 0) {
          fail(`${cssPath} contains an unmatched closing brace`);
          break;
        }
      }
    }
    if (depth > 0) {
      fail(`${cssPath} contains ${depth} unclosed CSS block${depth === 1 ? "" : "s"}`);
    }
  }

  const tokens = await readText("styles/tokens.css");
  if (!tokens.includes('html[data-theme="dark"]') || !tokens.includes('html[data-theme="light"]')) {
    fail("styles/tokens.css should define both dark and light theme tokens");
  }

  for (const cssPath of cssSystemFiles.filter((entry) => entry !== "styles/tokens.css")) {
    const css = await readText(cssPath);
    if (/(?:^|\n)\s*:root\b/.test(css)) {
      fail(`${cssPath} should not redefine root tokens; keep theme values in styles/tokens.css`);
    }
  }

  const combinedCss = cssSources.join("\n");
  const declaredVariables = new Set([...combinedCss.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  const referencedVariables = new Set([...combinedCss.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]));
  for (const variable of referencedVariables) {
    if (!declaredVariables.has(variable)) {
      fail(`CSS references ${variable}, but the custom property is never declared in the launcher CSS system`);
    }
  }
}

async function validateNoRetiredLauncherEffects() {
  const files = [
    ...launcherPages,
    "src/main.js",
    "src/library.js",
    "src/observation.js",
    "src/play.js",
    "src/press.js",
    "src/compare.js",
    "src/log.js"
  ];
  const retiredPatterns = [
    ["archive-signal-field", "retired launcher canvas"],
    ["createSignalField", "retired signal-field initializer"],
    ["precision-backdrop", "retired precision backdrop"]
  ];

  for (const file of files) {
    const source = await readText(file);
    for (const [pattern, label] of retiredPatterns) {
      if (source.includes(pattern)) {
        fail(`${file} still references the ${label}`);
      }
    }
  }
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
  const expectedImage = getExpectedOgImage(pagePath);
  if (ogImage !== expectedImage) {
    fail(`${pagePath} og:image should be ${expectedImage}`);
  }
  if (twitterImage !== expectedImage) {
    fail(`${pagePath} twitter:image should be ${expectedImage}`);
  }
}

function getExpectedOgImage(pagePath) {
  const promoMatch = pagePath.match(/^promo\/([^/]+)\/index\.html$/);
  return promoMatch ? `${siteRoot}/assets/social/games/${promoMatch[1]}.png` : expectedOgImage;
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

await validateArchiveCssImports();
await validateCssSystem();
await validateLauncherDomContracts();
validateViewModelContracts();
await validateNoRetiredLauncherEffects();
await validateReadmeAssets();
await validateShareKitAssets();
await validatePwaContract();
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
  const promoPage = `promo/${game.slug}/index.html`;
  const promoSocialSource = `assets/social/games/${game.slug}.svg`;
  const promoSocialImage = `assets/social/games/${game.slug}.png`;
  const promoPoster = `assets/posters/games/${game.slug}.jpg`;
  const promoHref = `./promo/${encodeURIComponent(game.slug)}/`;
  if (!(await exists(promoPage))) {
    fail(`${label} promo page does not exist: ${promoPage}`);
  } else {
    await validateHtmlReferences(promoPage);
  }
  if (!(await exists(promoSocialSource))) {
    fail(`${label} editable social card source does not exist: ${promoSocialSource}`);
  }
  if (!(await exists(promoSocialImage))) {
    fail(`${label} promo social image does not exist: ${promoSocialImage}`);
  } else {
    await validateSocialCardPng(promoSocialImage, label);
  }
  if (!(await exists(promoPoster))) {
    fail(`${label} promo poster does not exist: ${promoPoster}`);
  } else {
    await validatePromoPoster(promoPoster, label);
  }
  if (!promoHref.startsWith("./promo/") || !promoHref.endsWith("/")) {
    fail(`${label} promo URL could not be generated safely`);
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

async function validatePwaContract() {
  const manifest = await readJson("manifest.webmanifest");
  if (manifest.start_url !== "./" || manifest.scope !== "./" || manifest.display !== "standalone") {
    fail("manifest.webmanifest should keep relative start_url/scope and standalone display mode");
  }
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  for (const size of ["192x192", "512x512"]) {
    const icon = icons.find((entry) => entry.sizes === size && entry.type === "image/png");
    if (!icon?.src || !(await exists(icon.src))) {
      fail(`manifest.webmanifest is missing its ${size} PNG icon`);
    }
  }

  const worker = await readText("service-worker.js");
  for (const requiredText of [
    `99ag-shell-${requiredAssetVersion}`,
    "./404.html",
    "./games/manifest.json",
    "./src/data/media-evidence.js"
  ]) {
    if (!worker.includes(requiredText)) {
      fail(`service-worker.js is missing required shell contract ${requiredText}`);
    }
  }

  const registration = await readText("src/pwa.js");
  if (!registration.includes('new URL("../", import.meta.url).pathname')) {
    fail("src/pwa.js should derive its GitHub Pages scope from import.meta.url");
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
