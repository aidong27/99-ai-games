import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_VERSION } from "../src/app/constants.js";
import {
  filterGamesByModel,
  getModelFamiliesFromModels,
  getModelsFromGames
} from "../src/data/view-models.js";
import {
  getModelFamily,
  getModelFamilySelection
} from "../src/data/model-families.js";
import { getEntryFamily } from "../src/benchmark-data.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const siteRoot = "https://aidong27.github.io/99-ai-games";
const errors = [];
const sharedStack = [
  "styles/tokens.css",
  "styles/base.css",
  "styles/layout.css",
  "styles/components.css"
];
const benchmarkStack = [...sharedStack, "styles/benchmark.css"];
const legacyStack = [...sharedStack, "styles/archive-pages.css"];
const pageModules = {
  "index.html": "src/main.js",
  "challenge.html": "src/challenge.js",
  "entries.html": "src/entries.js",
  "entry.html": "src/entry.js",
  "compare.html": "src/compare.js",
  "library.html": "src/library.js",
  "observation.html": "src/observation.js",
  "play.html": "src/play.js",
  "press.html": "src/press.js",
  "log.html": "src/log.js"
};
const canonicalUrls = {
  "index.html": `${siteRoot}/`,
  "challenge.html": `${siteRoot}/challenge.html`,
  "entries.html": `${siteRoot}/entries.html`,
  "entry.html": `${siteRoot}/entry.html`,
  "compare.html": `${siteRoot}/compare.html`,
  "library.html": `${siteRoot}/library.html`,
  "observation.html": `${siteRoot}/observation.html`,
  "play.html": `${siteRoot}/play.html`,
  "press.html": `${siteRoot}/press.html`,
  "log.html": `${siteRoot}/log.html`,
  "methodology.html": `${siteRoot}/methodology.html`
};
const benchmarkPages = new Set([
  "index.html",
  "challenge.html",
  "entries.html",
  "entry.html",
  "compare.html",
  "methodology.html"
]);
const legacyPages = new Set([
  "library.html",
  "observation.html",
  "play.html",
  "press.html",
  "log.html"
]);
const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "CONTRIBUTING.md",
  ".github/copilot-instructions.md",
  ".cursor/rules/99-ai-games.mdc",
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  "package.json",
  "package-lock.json",
  "docs/AGENT-AUTOPILOT.md",
  "docs/AUTOMATION.md",
  "docs/BENCHMARK-METHOD.md",
  "docs/DATA-MODEL.md",
  "docs/EVALUATION.md",
  "docs/LEGACY-ARCHIVE.md",
  "docs/MIGRATION.md",
  "docs/PROTOCOL-99-V1.md",
  "docs/RELEASE.md",
  "docs/RUN-PROTOCOL.md",
  "docs/SECURITY.md",
  ...Object.keys(canonicalUrls),
  "404.html",
  "styles/tokens.css",
  "styles/base.css",
  "styles/layout.css",
  "styles/components.css",
  "styles/benchmark.css",
  "styles/archive.css",
  "styles/archive-pages.css",
  "src/app/constants.js",
  "src/app/routes.js",
  "src/archive-data.js",
  "src/benchmark-data.js",
  "src/challenge.js",
  "src/entries.js",
  "src/entry.js",
  "src/compare.js",
  "src/main.js",
  "src/theme.js",
  "src/i18n.js",
  "src/pwa.js",
  "src/data/model-families.js",
  "src/ui/benchmark.js",
  "src/ui/dom.js",
  "data/benchmark.json",
  "entries/manifest.json",
  "benchmarks/current.json",
  "benchmarks/protocol-99/v1/LOCK.json",
  "scripts/generate-benchmark.mjs",
  "scripts/prepare-pages.mjs",
  "service-worker.js"
];

for (const required of requiredFiles) {
  if (!(await exists(required))) {
    fail(`required launcher file is missing: ${required}`);
  }
}

for (const page of Object.keys(canonicalUrls)) {
  await validatePage(page);
}
await validatePage("404.html", { canonical: false, skipMeta: true });

const manifest = await readJson("games/manifest.json");
for (const game of manifest.games ?? []) {
  const promo = `promo/${game.slug}/index.html`;
  if (!(await exists(promo))) {
    fail(`generated Legacy promo page is missing: ${promo}`);
    continue;
  }
  await validatePage(promo, { promo: true, canonical: false });
  for (const asset of [
    `assets/posters/games/${game.slug}.jpg`,
    `assets/social/games/${game.slug}.svg`,
    `assets/social/games/${game.slug}.png`
  ]) {
    if (!(await exists(asset))) {
      fail(`${game.slug} public promotional asset is missing: ${asset}`);
    }
  }
}

await validateArchiveImports();
await validateCss();
await validateDomContracts();
validateModelFamilies();
await validateBenchmarkPositioning();
await validateAgentEntrypoints();
await validateRetiredPwa();
await validateNoFalseClaims();

if (errors.length) {
  console.error("Launcher validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
console.log("Launcher validation passed");

async function validatePage(pagePath, options = {}) {
  const html = await readText(pagePath);
  if (!html) return;
  const styles = [];
  const scripts = [];

  for (const tag of parseTags(html, "link")) {
    const rel = attribute(tag, "rel").toLowerCase().split(/\s+/);
    const href = attribute(tag, "href");
    if (rel.includes("stylesheet")) {
      validateVersion(href, `${pagePath} stylesheet`);
      const resolved = resolveLocal(pagePath, href);
      if (resolved) styles.push(resolved);
    }
    if (href && !isExternal(href) && !href.startsWith("data:") && !href.startsWith("#")) {
      await validateReference(pagePath, href);
    }
  }
  for (const tag of parseTags(html, "script")) {
    const src = attribute(tag, "src");
    if (!src) continue;
    validateVersion(src, `${pagePath} script`);
    const resolved = resolveLocal(pagePath, src);
    if (resolved) scripts.push(resolved);
    await validateReference(pagePath, src);
  }
  for (const tagName of ["img", "source"]) {
    for (const tag of parseTags(html, tagName)) {
      const src = attribute(tag, "src");
      if (!src) continue;
      if (isExternal(src)) {
        fail(`${pagePath} loads an external ${tagName} resource: ${src}`);
      } else {
        await validateReference(pagePath, src);
      }
    }
  }

  if (!scripts.includes("src/theme.js") || !scripts.includes("src/i18n.js")) {
    fail(`${pagePath} must load the shared theme and language controls`);
  }
  if (!scripts.includes("src/pwa.js")) {
    fail(`${pagePath} must load the legacy cache-cleanup migration`);
  }
  if (new Set(styles).size !== styles.length) {
    fail(`${pagePath} loads a stylesheet more than once`);
  }

  if (options.promo) {
    if (styles.join("|") !== "styles/archive.css") {
      fail(`${pagePath} must load only archive.css for generated Legacy compatibility`);
    }
  } else if (benchmarkPages.has(pagePath)) {
    expectOrderedStack(pagePath, styles, benchmarkStack);
  } else if (legacyPages.has(pagePath)) {
    expectOrderedStack(pagePath, styles, legacyStack);
  }

  const expectedModule = pageModules[pagePath];
  if (expectedModule && !scripts.includes(expectedModule)) {
    fail(`${pagePath} does not load its page module ${expectedModule}`);
  }
  if (options.canonical !== false && canonicalUrls[pagePath]) {
    const canonical = parseTags(html, "link")
      .filter((tag) => attribute(tag, "rel").split(/\s+/).includes("canonical"))
      .map((tag) => attribute(tag, "href"));
    if (canonical.length !== 1 || canonical[0] !== canonicalUrls[pagePath]) {
      fail(`${pagePath} canonical URL must be ${canonicalUrls[pagePath]}`);
    }
    const ogUrl = metaContent(html, "property", "og:url");
    if (ogUrl !== canonicalUrls[pagePath]) {
      fail(`${pagePath} og:url must match its canonical URL`);
    }
  }
  if (!options.skipMeta) {
    for (const [attributeName, name] of [
      ["property", "og:title"],
      ["property", "og:description"],
      ["property", "og:image"],
      ["name", "theme-color"]
    ]) {
      if (!metaContent(html, attributeName, name)) {
        fail(`${pagePath} is missing ${attributeName}="${name}" metadata`);
      }
    }
  }
}

function expectOrderedStack(page, actual, expected) {
  let previous = -1;
  for (const stylesheet of expected) {
    const index = actual.indexOf(stylesheet);
    if (index === -1) {
      fail(`${page} does not load ${stylesheet}`);
    } else if (index < previous) {
      fail(`${page} stylesheet order differs from ${expected.join(" -> ")}`);
    }
    previous = Math.max(previous, index);
  }
}

async function validateArchiveImports() {
  const css = await readText("styles/archive.css");
  const imports = [...css.matchAll(/@import\s+url\(["']?([^"')]+)["']?\);/g)]
    .map((match) => match[1]);
  const resolved = [];
  for (const source of imports) {
    validateVersion(source, "styles/archive.css import");
    const local = resolveLocal("styles/archive.css", source);
    if (local) resolved.push(local);
    if (local && !(await exists(local))) {
      fail(`styles/archive.css imports missing ${local}`);
    }
  }
  if (resolved.slice(0, legacyStack.length).join("|") !== legacyStack.join("|")) {
    fail("archive.css must import tokens, base, layout, components, and archive-pages in order");
  }
}

async function validateCss() {
  const files = [
    ...sharedStack,
    "styles/benchmark.css",
    "styles/archive-pages.css",
    "styles/archive.css"
  ];
  let combined = "";
  for (const file of files) {
    const css = await readText(file);
    combined += css;
    let depth = 0;
    const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const character of source) {
      if (character === "{") depth += 1;
      if (character === "}") depth -= 1;
      if (depth < 0) break;
    }
    if (depth !== 0) fail(`${file} has unbalanced CSS braces`);
  }
  const tokens = await readText("styles/tokens.css");
  if (!tokens.includes('html[data-theme="dark"]') || !tokens.includes('html[data-theme="light"]')) {
    fail("tokens.css must define both light and dark themes");
  }
  const declared = new Set([...combined.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  for (const match of combined.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!declared.has(match[1])) {
      fail(`launcher CSS references undeclared custom property ${match[1]}`);
    }
  }
}

async function validateDomContracts() {
  for (const [page, modulePath] of Object.entries(pageModules)) {
    const html = await readText(page);
    const source = await readText(modulePath);
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
    const idSet = new Set(ids);
    if (idSet.size !== ids.length) fail(`${page} contains duplicate element ids`);
    const expected = new Set([
      ...[...source.matchAll(/querySelector\(\s*["']#([\w:-]+)["']/g)].map((match) => match[1]),
      ...[...source.matchAll(/getElementById\(\s*["']([\w:-]+)["']/g)].map((match) => match[1])
    ]);
    for (const id of expected) {
      if (!idSet.has(id)) fail(`${modulePath} expects #${id}, but ${page} does not define it`);
    }
  }
}

function validateModelFamilies() {
  const gpt55 = getModelFamily("GPT-5.5 xhigh");
  const gpt56 = getModelFamily("GPT-5.6 sol ultra");
  const gptCompact = getModelFamily("GPT5.6");
  if (
    gpt55.id !== "chatgpt"
    || gpt56.id !== "chatgpt"
    || gptCompact.id !== "chatgpt"
    || gpt55.providerName !== "OpenAI"
  ) {
    fail("GPT-5.5 and GPT-5.6 must remain grouped under ChatGPT / OpenAI");
  }
  const providerA = getEntryFamily({ identity: { modelName: "Nova 1", provider: "Example A" } });
  const providerASecond = getEntryFamily({ identity: { modelName: "Nova 2", provider: "Example A" } });
  const providerB = getEntryFamily({ identity: { modelName: "Nova 1", provider: "Example B" } });
  if (providerA.id !== providerASecond.id || providerA.id === providerB.id) {
    fail("unclassified models must group by their declared provider without merging companies");
  }
  const expected = [
    ["Claude Opus 4.8", "claude"],
    ["Kimi K3 Max", "kimi"],
    ["Grok 4.5", "grok"],
    ["DeepSeek v4 Pro", "deepseek"],
    ["GLM-5.2", "glm"]
  ];
  for (const [model, family] of expected) {
    if (getModelFamily(model).id !== family) {
      fail(`${model} must belong to the ${family} product family`);
    }
  }
  const fixture = [{
    slug: "gpt-family",
    number: 1,
    provenance: { modelName: "GPT-5.5 xhigh", agentName: "Codex" },
    variants: [{ modelName: "GPT-5.6 sol ultra", agentName: "Codex" }]
  }];
  const families = getModelFamiliesFromModels(getModelsFromGames(fixture));
  const chatgpt = families.find((family) => family.id === "chatgpt");
  if (chatgpt?.models.length !== 2 || chatgpt.games.length !== 1) {
    fail("ChatGPT family aggregation must keep exact model versions and deduplicate games");
  }
  if (filterGamesByModel(fixture, getModelFamilySelection(chatgpt)).length !== 1) {
    fail("ChatGPT family filtering must return its game once");
  }
}

async function validateBenchmarkPositioning() {
  const benchmark = await readJson("data/benchmark.json");
  const entries = await readJson("entries/manifest.json");
  if (benchmark.project?.primaryTagline !== "Same brief. Same rules. Different AI.") {
    fail("benchmark data is missing the primary project positioning");
  }
  if (benchmark.stats?.benchmarkEntries !== entries.finalizedRawEntryCount) {
    fail("benchmark data and Entry manifest disagree about finalized Raw count");
  }
  const home = await readText("index.html");
  if (!home.includes("One challenge.") || !home.includes("Pre-Benchmark Era")) {
    fail("index.html does not explain the standardized benchmark and Legacy boundary");
  }
  const compare = await readText("compare.html");
  if (!compare.includes("same Prompt Hash") || /hall coverage/i.test(compare)) {
    fail("compare.html must compare same-Prompt Entries, not Legacy Hall coverage");
  }
  for (const sourcePath of ["src/compare.js", "src/entry.js"]) {
    const source = await readText(sourcePath);
    if (!source.includes('createGameFrame')) {
      fail(`${sourcePath} must sandbox playable Entry iframes`);
    }
  }
  const frame = await readText("src/ui/game-frame.js");
  if (!frame.includes('sandbox: "allow-scripts"') || frame.includes("allow-same-origin")) {
    fail("Benchmark frames must isolate the parent origin");
  }
}

async function validateAgentEntrypoints() {
  const protocol = await readText("AGENTS.md");
  for (const expected of [
    "Autopilot Entry Protocol",
    "npm run agent:start",
    "npm run agent:verify",
    "npm run agent:finalize",
    "Do not inspect, copy, import, or adapt another Entry's"
  ]) {
    if (!protocol.includes(expected)) {
      fail(`AGENTS.md is missing authoritative protocol marker: ${expected}`);
    }
  }
  for (const pointer of [
    "CLAUDE.md",
    "GEMINI.md",
    ".github/copilot-instructions.md",
    ".cursor/rules/99-ai-games.mdc"
  ]) {
    const text = await readText(pointer);
    if (!text.includes("AGENTS.md") || /## Autopilot Entry Protocol/.test(text)) {
      fail(`${pointer} must point to AGENTS.md without duplicating the protocol`);
    }
  }
}

async function validateRetiredPwa() {
  const cleanup = await readText("src/pwa.js");
  const worker = await readText("service-worker.js");
  if (!cleanup.includes("getRegistrations") || !cleanup.includes("registration.unregister()")) {
    fail("src/pwa.js must unregister the retired fixed-cache PWA");
  }
  if (!worker.includes("self.registration.unregister()") || worker.includes('addEventListener("fetch"')) {
    fail("service-worker.js must retire itself and must not intercept Protocol 99 requests");
  }
  if (cleanup.includes("serviceWorker.register")) {
    fail("src/pwa.js must not register a replacement fixed-cache worker");
  }
}

async function validateNoFalseClaims() {
  for (const file of ["README.md", "index.html", "press.html", "methodology.html", "log.html"]) {
    const text = await readText(file);
    for (const pattern of [
      /99\s+completed\s+games/i,
      /millions?\s+of\s+players/i,
      /\bworld'?s?\s+(?:best|first|leading)\b/i,
      /\bwent\s+viral\b/i
    ]) {
      if (pattern.test(text)) fail(`${file} contains an unsupported public claim: ${pattern}`);
    }
  }
}

function validateVersion(value, context) {
  if (!value || isExternal(value) || value.startsWith("data:")) return;
  const clean = value.split("#")[0];
  if (!/[?&]v=/.test(clean)) {
    fail(`${context} must include ?v=${ASSET_VERSION}`);
    return;
  }
  const parsed = new URL(clean, "https://local.invalid/");
  if (parsed.searchParams.get("v") !== ASSET_VERSION) {
    fail(`${context} uses stale version ${parsed.searchParams.get("v") ?? "missing"}`);
  }
}

async function validateReference(fromPath, value) {
  const local = resolveLocal(fromPath, value);
  if (local && !(await exists(local))) {
    fail(`${fromPath} references missing local file ${value}`);
  }
}

function resolveLocal(fromPath, value) {
  const clean = String(value ?? "").split("#")[0].split("?")[0];
  if (
    !clean
    || clean.startsWith("#")
    || clean.startsWith("data:")
    || clean.startsWith("mailto:")
    || clean.startsWith("javascript:")
    || isExternal(clean)
  ) {
    return "";
  }
  if (clean.startsWith("/")) {
    fail(`${fromPath} uses root-absolute path ${value}`);
    return "";
  }
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), clean))
    .replace(/^\.\//, "")
    .replace(/\/$/, "");
}

function parseTags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? "";
}

function metaContent(html, attributeName, value) {
  for (const tag of parseTags(html, "meta")) {
    if (attribute(tag, attributeName).toLowerCase() === value.toLowerCase()) {
      return attribute(tag, "content");
    }
  }
  return "";
}

function isExternal(value) {
  return /^(?:https?:)?\/\//i.test(String(value));
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
