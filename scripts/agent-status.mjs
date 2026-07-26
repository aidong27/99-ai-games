#!/usr/bin/env node
import { parseCli, resolveRepoRoot, stableJson } from "./lib/common.mjs";
import { loadCurrentTask, scanEntries, verifyProtocolLock } from "./lib/protocol.mjs";

const cli = parseCli();
const repoRoot = resolveRepoRoot(cli.get("repo"));
const protocol = await verifyProtocolLock(repoRoot);
const entries = await scanEntries(repoRoot);
let activeTask = null;
try {
  const current = await loadCurrentTask(repoRoot);
  activeTask = {
    entryId: current.entry.entryId,
    entryNumber: current.entry.entryNumber,
    runId: current.run.runId,
    runType: current.run.runType,
    status: current.run.status,
    runDir: current.currentTask.runDir,
    allowedWritePaths: current.currentTask.allowedWritePaths
  };
} catch {
  activeTask = null;
}
const status = {
  challenge: {
    id: protocol.challenge.challengeId,
    version: protocol.challenge.challengeVersion,
    status: protocol.challenge.status,
    lockValid: protocol.errors.length === 0,
    canonicalPromptHash: protocol.lock.canonicalPromptSha256
  },
  entries: {
    allocated: entries.length,
    finalizedRaw: entries.filter((record) => (
      record.entry?.status === "finalized"
      && record.runs.some((run) => run.run?.runType === "raw" && run.run.status === "finalized")
    )).length,
    capacity: 99
  },
  activeTask
};

if (cli.has("json")) {
  console.log(stableJson(status).trimEnd());
} else {
  console.log(`Protocol 99 ${status.challenge.version}: ${status.challenge.status}`);
  console.log(`Challenge Lock: ${status.challenge.lockValid ? "valid" : "INVALID"}`);
  console.log(`Canonical Prompt: ${status.challenge.canonicalPromptHash}`);
  console.log(`Formal Entries: ${status.entries.finalizedRaw} finalized Raw / ${status.entries.allocated} allocated / 99`);
  if (activeTask) {
    console.log(`Active Work Order: ${activeTask.entryId} / ${activeTask.runId} (${activeTask.status})`);
    console.log(`Assigned Run directory: ${activeTask.runDir}`);
  } else {
    console.log("Active Work Order: none");
  }
}

if (protocol.errors.length) {
  process.exitCode = 1;
}
