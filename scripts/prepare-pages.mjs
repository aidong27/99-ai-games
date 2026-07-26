import { access, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathExists } from "./lib/common.mjs";
import { scanEntries } from "./lib/protocol.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outputRoot = path.join(repoRoot, ".site");
const publicDirectories = [
  "assets",
  "data",
  "games",
  "halls",
  "promo",
  "schemas",
  "src",
  "styles"
];
const optionalGeneratedDirectories = ["benchmark-pages"];
const rootFiles = [
  "404.html",
  "challenge.html",
  "compare.html",
  "entries.html",
  "entry.html",
  "favicon.ico",
  "index.html",
  "library.html",
  "log.html",
  "manifest.webmanifest",
  "methodology.html",
  "observation.html",
  "play.html",
  "press.html",
  "robots.txt",
  "service-worker.js",
  "sitemap.xml"
];
const challengeFiles = [
  "benchmarks/current.json",
  "benchmarks/protocol-99/v1/LOCK.json",
  "benchmarks/protocol-99/v1/PROMPT.md",
  "benchmarks/protocol-99/v1/PROMPT.zh-CN.md",
  "benchmarks/protocol-99/v1/README.md",
  "benchmarks/protocol-99/v1/TEST-CONTRACT.md",
  "benchmarks/protocol-99/v1/challenge.json",
  "benchmarks/protocol-99/v1/rubric.json"
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const directory of publicDirectories) {
  await cp(path.join(repoRoot, directory), path.join(outputRoot, directory), { recursive: true });
}
for (const directory of optionalGeneratedDirectories) {
  const source = path.join(repoRoot, directory);
  if (await pathExists(source)) {
    await cp(source, path.join(outputRoot, directory), { recursive: true });
  }
}
for (const file of rootFiles) {
  await cp(path.join(repoRoot, file), path.join(outputRoot, file));
}
for (const file of challengeFiles) {
  const destination = path.join(outputRoot, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(repoRoot, file), destination);
}

await copyPublicEntries();
await writeFile(path.join(outputRoot, ".nojekyll"), "");
await validateArtifact();

console.log(
  `Prepared GitHub Pages artifact with ${publicDirectories.length} public directories, ${rootFiles.length} root files, and Finalized-only Protocol 99 Runs`
);

async function copyPublicEntries() {
  const entriesRoot = path.join(outputRoot, "entries");
  await mkdir(entriesRoot, { recursive: true });
  await cp(
    path.join(repoRoot, "entries", "manifest.json"),
    path.join(entriesRoot, "manifest.json")
  );

  for (const record of await scanEntries(repoRoot)) {
    if (!record.entry || record.entry.status !== "finalized") {
      continue;
    }
    const destinationEntry = path.join(entriesRoot, record.directoryName);
    await mkdir(destinationEntry, { recursive: true });
    await cp(record.entryPath, path.join(destinationEntry, "entry.json"));
    if (await pathExists(path.join(record.entryDir, "README.md"))) {
      await cp(path.join(record.entryDir, "README.md"), path.join(destinationEntry, "README.md"));
    }
    for (const runRecord of record.runs) {
      if (!runRecord.run || runRecord.run.status !== "finalized") {
        continue;
      }
      const destinationRun = path.join(
        destinationEntry,
        "runs",
        runRecord.run.runId
      );
      await mkdir(destinationRun, { recursive: true });
      await cp(path.join(runRecord.runDir, "run.json"), path.join(destinationRun, "run.json"));
      await cp(path.join(runRecord.runDir, "game"), path.join(destinationRun, "game"), {
        recursive: true
      });
      await cp(path.join(runRecord.runDir, "evidence"), path.join(destinationRun, "evidence"), {
        recursive: true
      });
    }
  }
}

async function validateArtifact() {
  const forbiddenTopLevel = [
    ".agent",
    ".git",
    ".github",
    "docs",
    "node_modules",
    "package-lock.json",
    "package.json",
    "scripts",
    "tests"
  ];
  for (const forbidden of forbiddenTopLevel) {
    try {
      await access(path.join(outputRoot, forbidden));
      throw new Error(`Forbidden deployment path was copied: ${forbidden}`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  const leaks = [];
  await walk(outputRoot, (relative) => {
    if (
      /(^|\/)(?:WORK-ORDER\.md|STANDARD-REPAIR-REPORT\.md|prompt-snapshot\.md)$/.test(relative)
      || /(^|\/)tests\//.test(relative)
      || /\.(?:spec|test)\.m?js$/.test(relative)
    ) {
      leaks.push(relative);
    }
  });
  if (leaks.length) {
    throw new Error(`Deployment artifact contains private/development Run files:\n- ${leaks.join("\n- ")}`);
  }
}

async function walk(root, visit, prefix = "") {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      await walk(path.join(root, entry.name), visit, relative);
    } else if (entry.isFile()) {
      visit(relative);
    } else {
      throw new Error(`Deployment artifact contains an unsupported link or special file: ${relative}`);
    }
  }
}
