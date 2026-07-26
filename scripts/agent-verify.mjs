#!/usr/bin/env node
import path from "node:path";
import {
  parseCli,
  resolveRepoRoot,
  stableJson,
  writeJson
} from "./lib/common.mjs";
import { loadCurrentTask, verifyProtocolLock } from "./lib/protocol.mjs";
import {
  buildStaticFacts,
  validateCurrentPathScope
} from "./lib/validation.mjs";
import { runBrowserVerification } from "./run-browser-verification.mjs";

const cli = parseCli();
const repoRoot = resolveRepoRoot(cli.get("repo"));

if (cli.has("help")) {
  console.log(`Usage: npm run agent:verify [-- --json] [--repo=<path>]

Verifies the active .agent/current.json Work Order. The command never edits
game source or participant tests. It writes only machine evidence and updates
the current Run/Entry status.`);
  process.exit(0);
}

const protocol = await verifyProtocolLock(repoRoot);
if (protocol.errors.length) {
  throw new Error(`Challenge Lock failed:\n- ${protocol.errors.join("\n- ")}`);
}
const current = await loadCurrentTask(repoRoot);
const failures = [];

if (current.entry.canonicalPromptHash !== protocol.lock.canonicalPromptSha256
    || current.run.canonicalPromptHash !== protocol.lock.canonicalPromptSha256) {
  failures.push("Entry or Run canonicalPromptHash differs from the current LOCK.json");
}
const pathScope = await validateCurrentPathScope(repoRoot);
failures.push(...pathScope.errors);
const staticFacts = await buildStaticFacts(current.runDir, current.run);
failures.push(...staticFacts.testErrors);
failures.push(...staticFacts.security.findings.map(
  (finding) => `${finding.path}:${finding.line} uses prohibited ${finding.message}`
));
if (staticFacts.security.totalBytes > protocol.challenge.runtime.maximumCommittedBytes) {
  failures.push(
    `game runtime is ${staticFacts.security.totalBytes} bytes; limit is ${protocol.challenge.runtime.maximumCommittedBytes}`
  );
}

let report;
if (failures.length) {
  report = createStaticFailureReport(current, protocol, staticFacts, failures);
  await writeJson(path.join(current.runDir, "evidence", "file-inventory.json"), staticFacts.inventory);
  await writeJson(path.join(current.runDir, "evidence", "console.json"), []);
  await writeJson(path.join(current.runDir, "evidence", "network.json"), []);
  await writeJson(path.join(current.runDir, "evidence", "report.json"), report);
} else {
  report = await runBrowserVerification({
    repoRoot,
    entry: current.entry,
    run: current.run,
    runDir: current.runDir,
    protocol,
    staticFacts
  });
}

const passed = report.status === "passed";
const nextRun = {
  ...current.run,
  status: passed ? "verified" : report.status === "pending-browser-verification"
    ? "pending-browser-verification"
    : "building",
  environment: {
    ...current.run.environment,
    browser: report.browser?.version ?? current.run.environment?.browser ?? "unavailable"
  }
};
const nextEntry = {
  ...current.entry,
  status: current.entry.canonicalRunId
    ? current.entry.status
    : passed ? "verified" : nextRun.status
};
await writeJson(path.join(current.runDir, "run.json"), nextRun);
await writeJson(path.join(current.entryDir, "entry.json"), nextEntry);

if (cli.has("json")) {
  console.log(stableJson(report).trimEnd());
} else {
  console.log(`Protocol 99 verification ${passed ? "passed" : "failed"} for ${current.run.runId}.`);
  console.log(`Automated Compliance Score: ${report.score.earned} / ${report.score.maximum}`);
  if (report.failures.length) {
    console.log("Failures:");
    for (const failure of report.failures) {
      console.log(`- ${failure}`);
    }
  }
  console.log(`Report: ${path.relative(repoRoot, path.join(current.runDir, "evidence", "report.json"))}`);
}
if (!passed) {
  process.exitCode = 1;
}

function createStaticFailureReport(task, protocolData, facts, errors) {
  return {
    "$schema": "../../../../../schemas/verification-report.schema.json",
    reportVersion: "1.0",
    challengeId: task.run.challengeId,
    challengeVersion: task.run.challengeVersion,
    canonicalPromptHash: task.run.canonicalPromptHash,
    entryId: task.entry.entryId,
    runId: task.run.runId,
    runType: task.run.runType,
    status: "failed",
    verifiedAt: new Date().toISOString(),
    seed: 99,
    sourceHash: facts.sourceHash,
    sourceBytes: facts.sourceBytes,
    browser: {
      name: "Chromium",
      version: "not started because static validation failed"
    },
    viewports: {
      desktop: protocolData.challenge.runtime.desktopViewport,
      mobile: protocolData.challenge.runtime.mobileBaselineViewport
    },
    checks: {},
    score: {
      name: "Automated Compliance Score",
      earned: 0,
      maximum: 100,
      groups: []
    },
    failures: errors,
    disclaimer: protocolData.rubric.disclaimer
  };
}
