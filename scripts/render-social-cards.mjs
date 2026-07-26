import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const checkOnly = process.argv.includes("--check");
const legacy = await readJson("games/manifest.json");
const entries = await readJson("assets/social/entries/manifest.json");
const failures = [];
let fallbackBrowser = null;

const groups = [
  {
    id: "legacy",
    manifestPath: "assets/social/games/raster-manifest.json",
    targets: (legacy.games ?? []).map((game) => ({
      id: game.slug,
      source: `assets/social/games/${game.slug}.svg`,
      output: `assets/social/games/${game.slug}.png`
    }))
  },
  {
    id: "brand",
    manifestPath: "assets/social/raster-manifest.json",
    targets: [{
      id: "og-cover",
      source: "assets/social/og-cover.svg",
      output: "assets/social/og-cover.png"
    }]
  },
  {
    id: "entries",
    manifestPath: "assets/social/entries/raster-manifest.json",
    targets: (entries.cards ?? []).map((card) => ({
      id: card.entryId,
      source: card.path,
      output: card.rasterPath ?? card.path.replace(/\.svg$/i, ".png")
    }))
  }
];

try {
  for (const group of groups) {
    await processGroup(group);
  }
} finally {
  await fallbackBrowser?.close();
}

if (failures.length) {
  console.error("Social card rendering failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const targetCount = groups.reduce((total, group) => total + group.targets.length, 0);
console.log(
  `${checkOnly ? "Checked" : "Rendered"} ${targetCount} social card raster${targetCount === 1 ? "" : "s"}`
);

async function processGroup(group) {
  const previous = await readOptionalJson(group.manifestPath);
  if (checkOnly && previous === null) {
    failures.push(`${group.manifestPath} is missing or invalid`);
  }
  const expected = {};

  for (const target of group.targets) {
    const sourcePath = path.join(repoRoot, target.source);
    let source;
    try {
      source = await readFile(sourcePath);
    } catch {
      failures.push(`${target.source} is missing`);
      continue;
    }
    const sourceHash = createHash("sha256").update(source).digest("hex");
    expected[target.id] = sourceHash;

    if (checkOnly) {
      if (!(await exists(target.output))) {
        failures.push(`${target.output} is missing`);
      } else {
        await validatePng(target.output, 1200, 630);
      }
      if (previous?.[target.id] !== sourceHash) {
        failures.push(`${target.output} is stale relative to ${target.source}`);
      }
    } else {
      await renderSvg(target.source, target.output);
      if (await exists(target.output)) {
        await validatePng(target.output, 1200, 630);
      }
    }
  }

  for (const staleId of Object.keys(previous ?? {}).filter((id) => !(id in expected))) {
    failures.push(`${group.manifestPath} contains removed card ${staleId}`);
  }
  if (group.id === "entries") {
    await detectStaleEntryRasters(group.targets);
  }
  if (!checkOnly && failures.length === 0) {
    const destination = path.join(repoRoot, group.manifestPath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(expected, null, 2)}\n`);
  }
}

async function renderSvg(source, output) {
  const destination = path.join(repoRoot, output);
  await mkdir(path.dirname(destination), { recursive: true });
  const native = process.env.P99_FORCE_PLAYWRIGHT_RASTER === "1"
    ? { status: 1 }
    : spawnSync("sips", ["-s", "format", "png", source, "--out", output], {
        cwd: repoRoot,
        encoding: "utf8"
      });
  if (native.status === 0) {
    return;
  }

  try {
    fallbackBrowser ??= await chromium.launch({
      headless: true,
      args: ["--allow-file-access-from-files"]
    });
    const page = await fallbackBrowser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1
    });
    await page.goto(pathToFileURL(path.join(repoRoot, source)).href, {
      waitUntil: "load"
    });
    await page.screenshot({
      path: destination,
      fullPage: false,
      animations: "disabled"
    });
    await page.close();
  } catch (error) {
    failures.push(`${output} could not be rendered: ${error.message}`);
  }
}

async function validatePng(relativePath, width, height) {
  const bytes = await readFile(path.join(repoRoot, relativePath));
  if (
    bytes.length < 24
    || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || bytes.readUInt32BE(16) !== width
    || bytes.readUInt32BE(20) !== height
  ) {
    failures.push(`${relativePath} must be a ${width}x${height} PNG`);
  }
}

async function detectStaleEntryRasters(targets) {
  const directory = path.join(repoRoot, "assets/social/entries");
  const expected = new Set(targets.map((target) => path.basename(target.output)));
  let files = [];
  try {
    files = await readdir(directory);
  } catch {
    return;
  }
  for (const file of files.filter((name) => name.endsWith(".png"))) {
    if (!expected.has(file)) {
      failures.push(`assets/social/entries/${file} is a stale Entry raster`);
    }
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

async function readOptionalJson(relativePath) {
  try {
    return await readJson(relativePath);
  } catch {
    return null;
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
