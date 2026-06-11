/*
 * Provenance & honesty validator.
 *
 * The archive's written rules — no faked popularity, no hidden provenance,
 * humanCodeEdits stays false, every accepted run documents what was verified —
 * are only as strong as their enforcement. This script turns those rules into a
 * machine gate over games/manifest.json and every game.json, variant.json, and
 * run record, so a future change cannot quietly violate them.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const errors = [];

// Keys that would imply unverifiable hype (downloads, stars, ratings, traffic).
const BANNED_KEYS = new Set([
  "stars", "stargazers", "downloads", "downloadcount", "users", "usercount",
  "dau", "mau", "rating", "ratings", "reviews", "popularity", "trending",
  "installs", "installcount", "plays", "playcount", "views", "viewcount",
  "likes", "followers", "impressions", "engagement"
]);

function fail(message) {
  errors.push(message);
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
  } catch (error) {
    fail(`${relativePath} could not be read as JSON: ${error.message}`);
    return null;
  }
}

function scanBannedKeys(value, context) {
  if (Array.isArray(value)) {
    for (const item of value) {
      scanBannedKeys(item, context);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (BANNED_KEYS.has(key.toLowerCase())) {
        fail(`${context} contains a banned popularity/metric key: "${key}"`);
      }
      scanBannedKeys(child, context);
    }
  }
}

function requireFalse(value, context) {
  if (value !== false) {
    fail(`${context} must be exactly false (found ${JSON.stringify(value)})`);
  }
}

function requireLabel(value, context) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${context} must be a non-empty string`);
  }
}

const manifest = await readJson("games/manifest.json");
if (!manifest) {
  reportAndExit();
}

requireFalse(manifest.humanCodeEditsPolicy, "manifest.humanCodeEditsPolicy");
scanBannedKeys(manifest, "games/manifest.json");

const games = Array.isArray(manifest.games) ? manifest.games : [];

for (const game of games) {
  const label = `Game ${game.number ?? "?"} (${game.slug ?? "missing-slug"})`;

  requireLabel(game.provenance?.modelName, `${label} manifest provenance.modelName`);
  requireLabel(game.provenance?.agentName, `${label} manifest provenance.agentName`);
  requireFalse(game.provenance?.humanCodeEdits, `${label} manifest provenance.humanCodeEdits`);

  const gameJson = await readJson(`games/${game.slug}/game.json`);
  if (gameJson) {
    scanBannedKeys(gameJson, `${label} game.json`);
    requireFalse(gameJson.provenance?.humanCodeEdits, `${label} game.json provenance.humanCodeEdits`);
    requireLabel(gameJson.provenance?.modelName, `${label} game.json provenance.modelName`);

    const variantIds = (gameJson.variants ?? []).map((variant) => variant.variantId);
    if (gameJson.canonicalVariantId && !variantIds.includes(gameJson.canonicalVariantId)) {
      fail(`${label} canonicalVariantId "${gameJson.canonicalVariantId}" is not listed in game.json variants`);
    }
  }

  // Every variant.json must keep humanCodeEdits false and carry a model label.
  const variantsDir = `games/${game.slug}/variants`;
  let variantDirs = [];
  try {
    variantDirs = (await readdir(path.join(repoRoot, variantsDir), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    variantDirs = [];
  }
  for (const dir of variantDirs) {
    const variant = await readJson(`${variantsDir}/${dir}/variant.json`);
    if (!variant) {
      continue;
    }
    scanBannedKeys(variant, `${label} variant ${dir}`);
    requireFalse(variant.humanCodeEdits, `${label} variant ${dir} humanCodeEdits`);
    requireLabel(variant.modelName, `${label} variant ${dir} modelName`);
  }

  // Every run record must document verification honestly and never fake provenance.
  const runsDir = `games/${game.slug}/runs`;
  let runFiles = [];
  try {
    runFiles = (await readdir(path.join(repoRoot, runsDir), { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name);
  } catch {
    runFiles = [];
  }
  if (runFiles.length === 0) {
    fail(`${label} has no run records; every observation must record at least one run`);
  }
  for (const file of runFiles) {
    const run = await readJson(`${runsDir}/${file}`);
    if (!run) {
      continue;
    }
    const runLabel = `${label} run ${file}`;
    scanBannedKeys(run, runLabel);
    requireFalse(run.humanCodeEdits, `${runLabel} humanCodeEdits`);
    requireLabel(run.modelName, `${runLabel} modelName`);
    requireLabel(run.agentName, `${runLabel} agentName`);

    if (!run.verification || typeof run.verification !== "object") {
      fail(`${runLabel} must include a verification object`);
      continue;
    }
    // Accept either the current "performed" field or the legacy "checks" field;
    // both are honest, non-empty lists of real verification steps.
    const performed = Array.isArray(run.verification.performed)
      ? run.verification.performed
      : run.verification.checks;
    if (!Array.isArray(performed) || performed.length === 0) {
      fail(`${runLabel} verification must list real checks in a non-empty "performed" (or legacy "checks") array`);
    }
    if ("pending" in run.verification && !Array.isArray(run.verification.pending)) {
      fail(`${runLabel} verification.pending must be an array when present`);
    }
  }
}

reportAndExit();

function reportAndExit() {
  if (errors.length) {
    console.error("Provenance validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
  console.log("Provenance validation passed: humanCodeEdits false, model labels present, runs verified, no fabricated metrics");
}
