#!/usr/bin/env node
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  parseCli,
  readJson,
  resolveRepoRoot,
  stableJson,
  writeJson
} from "./lib/common.mjs";
import {
  computeRunIntegrity,
  loadCurrentTask,
  verifyProtocolLock
} from "./lib/protocol.mjs";
import {
  validateCurrentPathScope,
  validateEntries
} from "./lib/validation.mjs";

const cli = parseCli();
const repoRoot = resolveRepoRoot(cli.get("repo"));

if (cli.has("help")) {
  console.log(`Usage: npm run agent:finalize [-- --json] [--repo=<path>]

Finalizes the active verified Run, records immutable source/evidence hashes,
regenerates public indexes, and runs the repository quality gate. A failed
quality gate restores the Entry and Run metadata to their verified state.`);
  process.exit(0);
}

const protocol = await verifyProtocolLock(repoRoot);
if (protocol.errors.length) {
  throw new Error(`Challenge Lock failed:\n- ${protocol.errors.join("\n- ")}`);
}

const current = await loadCurrentTask(repoRoot);
if (current.run.status !== "verified" || current.entry.status !== "verified") {
  throw new Error(
    `Run must pass agent:verify before Finalize (entry=${current.entry.status}, run=${current.run.status})`
  );
}

const scope = await validateCurrentPathScope(repoRoot);
if (scope.errors.length) {
  throw new Error(`Work Order path scope failed:\n- ${scope.errors.join("\n- ")}`);
}

const reportPath = path.join(
  current.runDir,
  current.run.verificationReport ?? "evidence/report.json"
);
const report = await readJson(reportPath);
if (report.status !== "passed" || report.runId !== current.run.runId) {
  throw new Error("The active Run does not have a matching passed verification report");
}
if (report.canonicalPromptHash !== protocol.lock.canonicalPromptSha256) {
  throw new Error("Verification report Prompt Hash differs from the current Challenge Lock");
}

const integrity = await computeRunIntegrity(current.runDir);
if (report.sourceHash !== integrity.sourceHash) {
  throw new Error(
    "Game or participant tests changed after verification; run npm run agent:verify again"
  );
}
if (integrity.promptHash !== protocol.lock.canonicalPromptSha256) {
  throw new Error("Prompt Snapshot changed and no longer matches the Challenge Lock");
}

const requiredEvidence = [
  "evidence/report.json",
  "evidence/console.json",
  "evidence/network.json",
  "evidence/file-inventory.json",
  "evidence/screenshots/title.png",
  "evidence/screenshots/gameplay.png",
  "evidence/screenshots/relay-1.png",
  "evidence/screenshots/victory.png"
];
for (const relative of requiredEvidence) {
  await readFile(path.join(current.runDir, relative));
}

const finishedAt = new Date().toISOString();
const nextRun = {
  ...current.run,
  status: "finalized",
  finishedAt,
  sourceHash: integrity.sourceHash,
  evidenceHash: integrity.evidenceHash,
  environment: {
    ...current.run.environment,
    browser: report.browser?.version ?? current.run.environment?.browser ?? "unknown"
  }
};
const nextEntry = {
  ...current.entry,
  status: "finalized",
  canonicalRunId: current.run.runType === "raw"
    ? current.run.runId
    : current.entry.canonicalRunId
};
if (!nextEntry.canonicalRunId) {
  throw new Error("A non-Raw Run cannot finalize an Entry before its Raw Run is finalized");
}
const nextReport = {
  ...report,
  sourceHash: integrity.sourceHash,
  evidenceHash: integrity.evidenceHash,
  finalizedAt: finishedAt
};

await writeJson(path.join(current.runDir, "run.json"), nextRun);
await writeJson(path.join(current.entryDir, "entry.json"), nextEntry);
await writeJson(reportPath, nextReport);

try {
  regeneratePublicOutputs();
  const validation = await validateEntries(repoRoot);
  if (validation.errors.length) {
    throw new Error(`Finalized Entry validation failed:\n- ${validation.errors.join("\n- ")}`);
  }
  runNode("scripts/check.mjs");
} catch (error) {
  await writeJson(path.join(current.runDir, "run.json"), current.run);
  await writeJson(path.join(current.entryDir, "entry.json"), current.entry);
  await writeJson(reportPath, report);
  regeneratePublicOutputs({ allowFailure: true });
  throw error;
}

await rm(current.currentPath, { force: true });
const output = {
  entryId: nextEntry.entryId,
  runId: nextRun.runId,
  runType: nextRun.runType,
  status: nextRun.status,
  sourceHash: nextRun.sourceHash,
  evidenceHash: nextRun.evidenceHash,
  canonicalPromptHash: nextRun.canonicalPromptHash,
  automatedComplianceScore: nextReport.score,
  finalizedAt: finishedAt
};

console.log(cli.has("json")
  ? stableJson(output).trimEnd()
  : [
      `Finalized ${output.runType} ${output.runId}.`,
      `Entry: ${output.entryId}`,
      `Source SHA-256: ${output.sourceHash}`,
      `Evidence SHA-256: ${output.evidenceHash}`,
      `Automated Compliance Score: ${output.automatedComplianceScore.earned} / 100`,
      "The active Work Order is closed."
    ].join("\n"));

function runNode(script, options = {}) {
  const result = spawnSync(process.execPath, [script, ...(options.args ?? [])], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: cli.has("json") ? "pipe" : "inherit"
  });
  if (result.status !== 0 && !options.allowFailure) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(`${script} failed${output ? `:\n${output}` : ""}`);
  }
  return result;
}

function regeneratePublicOutputs(options = {}) {
  runNode("scripts/generate-benchmark.mjs", options);
  runNode("scripts/generate-promo-pages.mjs", options);
  runNode("scripts/render-social-cards.mjs", options);
  runNode("scripts/generate-discovery.mjs", options);
  runNode("scripts/generate-index.mjs", {
    ...options,
    args: ["--write"]
  });
}
