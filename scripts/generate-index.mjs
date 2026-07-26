import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outputPath = path.join(repoRoot, "docs/generated-index.md");
const manifest = JSON.parse(await readFile(path.join(repoRoot, "games/manifest.json"), "utf8"));

function formatGameNumber(number) {
  return String(number).padStart(3, "0");
}

const rows = (manifest.games ?? []).map((game) => {
  const variantCount = game.variants?.length ?? 0;
  const runCount = game.runRecords?.length ?? 0;
  return `| ${formatGameNumber(game.number)} | ${game.title} | ${game.hallName ?? game.hallId} | ${game.slotType} | ${game.status} | ${variantCount} | ${runCount} |`;
});

const content = `# Generated Legacy Observation Index

This file is generated from \`games/manifest.json\`.

These games belong to the Pre-Benchmark Era. They used different briefs and do
not consume Protocol 99 Entry numbers or participate in its comparison score.
Variants and historical Run records remain attached to their original game.

The games are playable. The real exhibit is the AI that made them.

| # | Observation sample | Hall | Slot type | Status | Variants | Runs |
|---|---|---|---|---|---:|---:|
${rows.join("\n")}
`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = await readFile(outputPath, "utf8");
  } catch {
    console.error("docs/generated-index.md does not exist. Run node scripts/generate-index.mjs --write");
    process.exit(1);
  }

  if (current !== content) {
    console.error("docs/generated-index.md is out of date. Run node scripts/generate-index.mjs --write");
    process.exit(1);
  }

  console.log("Generated index is up to date");
} else if (process.argv.includes("--write")) {
  await writeFile(outputPath, content);
  console.log("Wrote docs/generated-index.md");
} else {
  process.stdout.write(content);
}
