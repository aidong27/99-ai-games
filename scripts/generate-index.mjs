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

const content = `# Generated Game Index

This file is generated from \`games/manifest.json\`.

The 99 game slots represent 99 game concepts, not 99 AI generations. Variants and run records belong under a game slot and do not consume additional game numbers.

| # | Game | Hall | Slot type | Status | Variants | Runs |
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
