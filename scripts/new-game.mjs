import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const number = Number(getArg("number"));
const slug = getArg("slug");
const title = getArg("title");
const hallId = getArg("hall", "unassigned");
const slotType = getArg("slot-type", "normal");

if (!Number.isInteger(number) || number < 1 || number > 99 || !slug || !title) {
  console.error("Usage: node scripts/new-game.mjs --number=2 --slug=my-game --title=\"My Game\" --hall=puzzle-logic --slot-type=normal");
  process.exit(1);
}

const gameDir = path.join(repoRoot, "games", slug);
await mkdir(path.join(gameDir, "src"), { recursive: true });
await mkdir(path.join(gameDir, "styles"), { recursive: true });
await mkdir(path.join(gameDir, "assets/images"), { recursive: true });
await mkdir(path.join(gameDir, "assets/audio"), { recursive: true });
await mkdir(path.join(gameDir, "variants"), { recursive: true });
await mkdir(path.join(gameDir, "runs"), { recursive: true });

const gameJson = {
  number,
  title,
  slug,
  collection: "99 AI Games",
  slotType,
  hallId,
  status: "planned",
  statusLabel: "Planned",
  sourceCompleteness: "Planned; source not generated yet",
  description: "TODO: Describe the game concept.",
  deviceSupport: {
    desktop: "unsupported",
    mobile: "unsupported",
    minViewport: { width: 390, height: 700 },
    inputs: ["keyboard", "pointer", "touch"],
    mobileNotes: "Scaffold only. Do not allow launcher play until source and mobile behavior are implemented and verified.",
    launcherPolicy: "block"
  },
  provenance: {
    createdDate: "Pending AI generation",
    modelName: "Pending AI generation",
    agentName: "Pending AI generation",
    humanCodeEdits: false,
    notes: "Created by scaffold. Do not mark playable until source and verification exist."
  },
  variants: [],
  runRecords: [],
  tags: []
};

await writeFile(path.join(gameDir, "game.json"), `${JSON.stringify(gameJson, null, 2)}\n`);
await writeFile(path.join(gameDir, "brief.md"), `# Game ${String(number).padStart(3, "0")} Brief: ${title}\n\nTODO: Define the concept before asking an AI agent to build it.\n`);
await writeFile(path.join(gameDir, "README.md"), `# ${title}\n\nThis is a planned 99 AI Games slot. Do not mark it playable until source and verification exist.\n`);
await writeFile(path.join(gameDir, "index.html"), "<!doctype html>\n<title>Planned Game Slot</title>\n<p>This game slot is planned but not playable yet.</p>\n");
await writeFile(path.join(gameDir, "src/.gitkeep"), "");
await writeFile(path.join(gameDir, "styles/.gitkeep"), "");
await writeFile(path.join(gameDir, "assets/images/.gitkeep"), "");
await writeFile(path.join(gameDir, "assets/audio/.gitkeep"), "");

console.log(`Created planned game scaffold at games/${slug}`);
console.log("Next: update games/manifest.json and halls/halls.json, then run validation.");
