#!/usr/bin/env node
import { resolveRepoRoot } from "./lib/common.mjs";
import { scanEntries } from "./lib/protocol.mjs";
import { scanRuntimeSecurity } from "./lib/validation.mjs";

const repoRoot = resolveRepoRoot();
const errors = [];
let scanned = 0;
for (const record of await scanEntries(repoRoot)) {
  for (const runRecord of record.runs ?? []) {
    if (!runRecord.run) {
      continue;
    }
    const result = await scanRuntimeSecurity(`${runRecord.runDir}/game`);
    scanned += 1;
    for (const finding of result.findings) {
      errors.push(`${runRecord.run.runId}/${finding.path}:${finding.line}: ${finding.message}`);
    }
  }
}
if (errors.length) {
  console.error("Protocol 99 static security scan failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
console.log(`Protocol 99 static security scan passed: ${scanned} Run${scanned === 1 ? "" : "s"}`);
