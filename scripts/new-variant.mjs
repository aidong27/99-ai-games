import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const gameSlug = getArg("game");
const variantId = getArg("variant-id");
const modelName = getArg("model");
const agentName = getArg("agent");

if (!gameSlug || !variantId || !modelName || !agentName) {
  console.error("Usage: node scripts/new-variant.mjs --game=signal-cartographer --variant-id=model-name-date --model=\"Model\" --agent=\"Agent\"");
  process.exit(1);
}

const gamePath = path.join(repoRoot, "games", gameSlug, "game.json");
const gameJson = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(gamePath, "utf8")));
const variantDir = path.join(repoRoot, "games", gameSlug, "variants", variantId);
await mkdir(path.join(variantDir, "src"), { recursive: true });
await mkdir(path.join(variantDir, "styles"), { recursive: true });
await mkdir(path.join(variantDir, "assets/images"), { recursive: true });
await mkdir(path.join(variantDir, "assets/audio"), { recursive: true });

const variantJson = {
  variantId,
  gameNumber: gameJson.number,
  gameSlug,
  gameTitle: gameJson.title,
  status: "planned",
  createdDate: "Pending AI generation",
  modelName,
  agentName,
  humanCodeEdits: false,
  implementationPath: "./",
  metadataPath: "variant.json",
  notes: "Scaffolded variant. Do not mark playable until source and verification exist.",
  comparisonRole: "comparison",
  runRecords: []
};

await writeFile(path.join(variantDir, "variant.json"), `${JSON.stringify(variantJson, null, 2)}\n`);
await writeFile(path.join(variantDir, "index.html"), "<!doctype html>\n<title>Planned Variant</title>\n<p>This model variant is planned but not playable yet.</p>\n");
await writeFile(path.join(variantDir, "src/.gitkeep"), "");
await writeFile(path.join(variantDir, "styles/.gitkeep"), "");
await writeFile(path.join(variantDir, "assets/images/.gitkeep"), "");
await writeFile(path.join(variantDir, "assets/audio/.gitkeep"), "");

console.log(`Created planned variant at games/${gameSlug}/variants/${variantId}`);
console.log("Next: update game.json, games/manifest.json, and add a run record when generation starts.");
