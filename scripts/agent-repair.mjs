#!/usr/bin/env node
import { parseCli, resolveRepoRoot, stableJson } from "./lib/common.mjs";
import { copyRepairRun } from "./lib/protocol.mjs";

const cli = parseCli();
if (cli.has("help")) {
  console.log(`Usage:
  npm run agent:repair -- --entry=<entry-id> --from-run=<run-id> [options]

Options:
  --type=standard-repair | regeneration | human-curated | cross-agent-repair
  --provider=<name> --model=<name> --agent=<name>
  --json
  --repo=<path>

The source Run must be Finalized. It is copied to a new Run and never changed.`);
  process.exit(0);
}
const entryId = cli.get("entry");
const fromRun = cli.get("from-run");
if (!entryId || !fromRun) {
  throw new Error("--entry and --from-run are required");
}
const repoRoot = resolveRepoRoot(cli.get("repo"));
const created = await copyRepairRun(repoRoot, {
  entryId,
  fromRun,
  runType: cli.get("type", "standard-repair"),
  provider: cli.get("provider"),
  model: cli.get("model"),
  modelVersion: cli.get("model-version"),
  agent: cli.get("agent"),
  agentVersion: cli.get("agent-version")
});
const output = {
  entryId: created.entry.entryId,
  runId: created.run.runId,
  runType: created.run.runType,
  parentRunId: created.run.parentRunId,
  parentSourceHash: created.run.parentSourceHash,
  runDir: created.currentTask.runDir
};
console.log(cli.has("json")
  ? stableJson(output).trimEnd()
  : `Created ${output.runType} ${output.runId} from immutable ${output.parentRunId}.\nRun directory: ${output.runDir}`);
