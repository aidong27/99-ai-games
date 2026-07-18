import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const errors = [];
const deviceStates = new Set(["supported", "limited", "unsupported"]);
const launcherPolicies = new Set(["allow", "warn", "block"]);
const inputTypes = new Set(["keyboard", "pointer", "touch", "gamepad"]);

function fail(message) {
  errors.push(message);
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return {};
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

async function readDirs(relativePath) {
  try {
    const entries = await readdir(path.join(repoRoot, relativePath), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function readJsonFiles(relativePath) {
  try {
    const entries = await readdir(path.join(repoRoot, relativePath), { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => entry.name);
  } catch {
    return [];
  }
}

function validateDeviceSupport(support, label) {
  if (!support || typeof support !== "object" || Array.isArray(support)) {
    fail(`${label} deviceSupport is required`);
    return;
  }

  if (!deviceStates.has(support.desktop)) fail(`${label} deviceSupport.desktop must be supported, limited, or unsupported`);
  if (!deviceStates.has(support.mobile)) fail(`${label} deviceSupport.mobile must be supported, limited, or unsupported`);
  if (!launcherPolicies.has(support.launcherPolicy)) fail(`${label} deviceSupport.launcherPolicy must be allow, warn, or block`);
  if (!support.mobileNotes || typeof support.mobileNotes !== "string") fail(`${label} deviceSupport.mobileNotes is required`);

  const viewport = support.minViewport ?? {};
  if (!Number.isInteger(viewport.width) || viewport.width < 320) fail(`${label} deviceSupport.minViewport.width must be an integer >= 320`);
  if (!Number.isInteger(viewport.height) || viewport.height < 480) fail(`${label} deviceSupport.minViewport.height must be an integer >= 480`);

  if (!Array.isArray(support.inputs) || support.inputs.length === 0) {
    fail(`${label} deviceSupport.inputs must list at least one input type`);
  } else {
    const seenInputs = new Set();
    for (const input of support.inputs) {
      if (!inputTypes.has(input)) fail(`${label} deviceSupport.inputs contains invalid input: ${input}`);
      if (seenInputs.has(input)) fail(`${label} deviceSupport.inputs contains duplicate input: ${input}`);
      seenInputs.add(input);
    }
  }

  if (support.mobile === "unsupported" && support.launcherPolicy !== "block") {
    fail(`${label} unsupported mobile entries must use launcherPolicy block`);
  }
  if (support.mobile === "limited" && support.launcherPolicy !== "warn") {
    fail(`${label} limited mobile entries must use launcherPolicy warn`);
  }
  if (support.mobile === "supported" && support.launcherPolicy === "block") {
    fail(`${label} supported mobile entries cannot use launcherPolicy block`);
  }
}

function sameDeviceSupport(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

const manifest = await readJson("games/manifest.json");
const hallsIndex = await readJson("halls/halls.json");
const hallIds = new Set((hallsIndex.halls ?? []).map((hall) => hall.id));
const games = manifest.games ?? [];

if (manifest.projectName !== "99 AI Games") fail("manifest.projectName must be 99 AI Games");
if (manifest.targetGameCount !== 99) fail("manifest.targetGameCount must be 99");
if (manifest.humanCodeEditsPolicy !== false) fail("manifest.humanCodeEditsPolicy must be false");
if (!manifest.slotVariantRunPolicy) fail("manifest.slotVariantRunPolicy is required");
if (games.length > 99) fail("manifest.games cannot contain more than 99 official game slots");

const numbers = new Set();
const slugs = new Set();

for (const game of games) {
  const label = `Game ${game.number ?? "?"} (${game.slug ?? "missing-slug"})`;

  if (!Number.isInteger(game.number) || game.number < 1 || game.number > 99) fail(`${label} has invalid number`);
  if (numbers.has(game.number)) fail(`Duplicate game number: ${game.number}`);
  numbers.add(game.number);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug ?? "")) fail(`${label} has invalid slug`);
  if (slugs.has(game.slug)) fail(`Duplicate game slug: ${game.slug}`);
  slugs.add(game.slug);

  if (!["benchmark", "normal", "failed-weird", "future-remake"].includes(game.slotType)) fail(`${label} has invalid slotType`);
  if (!hallIds.has(game.hallId)) fail(`${label} references unknown hallId: ${game.hallId}`);
  if (game.provenance?.humanCodeEdits !== false) fail(`${label} provenance.humanCodeEdits must be false`);
  validateDeviceSupport(game.deviceSupport, label);

  const gameDir = `games/${game.slug}`;
  for (const requiredPath of [
    `${gameDir}/index.html`,
    `${gameDir}/game.json`,
    `${gameDir}/brief.md`,
    `${gameDir}/README.md`,
    `${gameDir}/src`,
    `${gameDir}/styles`,
    `${gameDir}/assets/images`,
    `${gameDir}/assets/audio`,
    `${gameDir}/variants`,
    `${gameDir}/runs`
  ]) {
    if (!(await exists(requiredPath))) fail(`${label} is missing ${requiredPath}`);
  }

  const gameJson = await readJson(`${gameDir}/game.json`);
  if (gameJson.number !== game.number) fail(`${label} number mismatch between manifest and game.json`);
  if (gameJson.slug !== game.slug) fail(`${label} slug mismatch between manifest and game.json`);
  if (gameJson.title !== game.title) fail(`${label} title mismatch between manifest and game.json`);
  if (gameJson.hallId !== game.hallId) fail(`${label} hallId mismatch between manifest and game.json`);
  if (gameJson.provenance?.humanCodeEdits !== false) fail(`${label} game.json provenance.humanCodeEdits must be false`);
  if (!gameJson.canonicalVariantId) fail(`${label} game.json canonicalVariantId is required`);
  validateDeviceSupport(gameJson.deviceSupport, `${label} game.json`);
  if (!sameDeviceSupport(game.deviceSupport, gameJson.deviceSupport)) {
    fail(`${label} deviceSupport mismatch between manifest and game.json`);
  }

  const variantDirs = await readDirs(`${gameDir}/variants`);
  const variantIds = new Set();
  for (const variantDir of variantDirs) {
    if (!(await exists(`${gameDir}/variants/${variantDir}/variant.json`))) {
      fail(`${label} variant ${variantDir} is missing variant.json`);
      continue;
    }
    const variantJson = await readJson(`${gameDir}/variants/${variantDir}/variant.json`);
    variantIds.add(variantJson.variantId);
    if (variantJson.variantId !== variantDir) fail(`${label} variant folder does not match variantId: ${variantDir}`);
    if (variantJson.gameNumber !== game.number) fail(`${label} variant ${variantDir} has wrong gameNumber`);
    if (variantJson.gameSlug !== game.slug) fail(`${label} variant ${variantDir} has wrong gameSlug`);
    if (variantJson.humanCodeEdits !== false) fail(`${label} variant ${variantDir} humanCodeEdits must be false`);
  }
  if (!variantIds.has(game.canonicalVariantId)) fail(`${label} canonicalVariantId is missing from variants`);

  const runFiles = await readJsonFiles(`${gameDir}/runs`);
  const runIds = new Set();
  for (const runFile of runFiles) {
    const runJson = await readJson(`${gameDir}/runs/${runFile}`);
    runIds.add(`${gameDir}/runs/${runFile}`);
    if (`${runJson.runId}.json` !== runFile) fail(`${label} run file name does not match runId: ${runFile}`);
    if (runJson.gameNumber !== game.number) fail(`${label} run ${runFile} has wrong gameNumber`);
    if (runJson.gameSlug !== game.slug) fail(`${label} run ${runFile} has wrong gameSlug`);
    if (!variantIds.has(runJson.variantId)) fail(`${label} run ${runFile} references unknown variantId`);
    if (runJson.humanCodeEdits !== false) fail(`${label} run ${runFile} humanCodeEdits must be false`);
  }

  for (const runPath of game.runRecords ?? []) {
    const normalized = runPath.replace(/^\.\//, "");
    if (!(await exists(normalized))) fail(`${label} manifest runRecord does not exist: ${runPath}`);
    if (!runIds.has(normalized)) fail(`${label} manifest runRecord is not present in runs directory: ${runPath}`);
  }
}

if (errors.length) {
  console.error("Game validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Game validation passed");
