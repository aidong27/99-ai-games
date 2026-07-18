import { access, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const checkOnly = process.argv.includes("--check");
const manifest = JSON.parse(await readFile(path.join(repoRoot, "games/manifest.json"), "utf8"));
const rasterManifestPath = path.join(repoRoot, "assets/social/games/raster-manifest.json");
const failures = [];
let rasterManifest = {};
try {
  rasterManifest = JSON.parse(await readFile(rasterManifestPath, "utf8"));
} catch {
  if (checkOnly) {
    failures.push("assets/social/games/raster-manifest.json is missing or invalid");
  }
}
const nextRasterManifest = {};

for (const game of manifest.games ?? []) {
  const source = `assets/social/games/${game.slug}.svg`;
  const output = `assets/social/games/${game.slug}.png`;
  const sourceHash = createHash("sha256").update(await readFile(path.join(repoRoot, source))).digest("hex");
  nextRasterManifest[game.slug] = sourceHash;
  if (checkOnly) {
    try {
      await access(path.join(repoRoot, output));
    } catch {
      failures.push(`${output} is missing`);
    }
    if (rasterManifest[game.slug] !== sourceHash) {
      failures.push(`${output} is stale relative to ${source}`);
    }
    continue;
  }

  const result = spawnSync("sips", ["-s", "format", "png", source, "--out", output], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    failures.push(`${output} could not be rendered with sips`);
  }
}

if (checkOnly) {
  const expectedSlugs = new Set((manifest.games ?? []).map((game) => game.slug));
  for (const slug of Object.keys(rasterManifest)) {
    if (!expectedSlugs.has(slug)) {
      failures.push(`raster-manifest.json contains removed game ${slug}`);
    }
  }
}

if (!checkOnly && failures.length === 0) {
  await writeFile(rasterManifestPath, `${JSON.stringify(nextRasterManifest, null, 2)}\n`);
}

if (failures.length) {
  console.error("Social card rendering failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`${checkOnly ? "Checked" : "Rendered"} ${(manifest.games ?? []).length} raster social cards`);
