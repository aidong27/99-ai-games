#!/usr/bin/env node
import {
  formatEntryNumber,
  parseCli,
  resolveRepoRoot,
  stableJson
} from "./lib/common.mjs";
import {
  allocateEntryNumber,
  createEntryId,
  createRawEntry,
  loadProtocol,
  resolveIdentity,
  scanEntries,
  verifyProtocolLock
} from "./lib/protocol.mjs";

const cli = parseCli();
const repoRoot = resolveRepoRoot(cli.get("repo"));

if (cli.has("help")) {
  console.log(`Usage:
  npm run agent:start -- [identity options]

Options:
  --provider=<name>        Provider or company, otherwise AI_PROVIDER/unknown
  --model=<name>           Model label, otherwise AI_MODEL/unknown
  --model-version=<value>  Exact model version when declared
  --agent=<name>           Agent/tool label, otherwise AI_AGENT/unknown
  --agent-version=<value>  Exact Agent version when declared
  --number=<001-099>       Explicit number (normally auto-allocated)
  --dry-run                Show the allocation without writing
  --json                   Print machine-readable output
  --repo=<path>            Repository root override (mainly for tests)
  --help                   Show this help

Identity is never guessed. Missing values are recorded as "unknown".`);
  process.exit(0);
}

const protocol = await verifyProtocolLock(repoRoot);
if (protocol.errors.length) {
  throw new Error(`Cannot start: current Challenge Lock failed:\n- ${protocol.errors.join("\n- ")}`);
}
const identity = resolveIdentity({
  provider: cli.get("provider"),
  model: cli.get("model"),
  modelVersion: cli.get("model-version"),
  agent: cli.get("agent"),
  agentVersion: cli.get("agent-version")
});
const requestedNumber = cli.get("number");
const number = requestedNumber === undefined
  ? await allocateEntryNumber(repoRoot)
  : Number.parseInt(requestedNumber, 10);
const entryId = createEntryId({
  challengeVersion: protocol.challenge.challengeVersion,
  number,
  identity
});
const proposal = {
  action: cli.has("dry-run") ? "dry-run" : "created",
  challengeId: protocol.challenge.challengeId,
  challengeVersion: protocol.challenge.challengeVersion,
  canonicalPromptHash: protocol.lock.canonicalPromptSha256,
  entryNumber: number,
  entryNumberLabel: formatEntryNumber(number),
  entryId,
  identity
};

if (cli.has("dry-run")) {
  const existing = await scanEntries(repoRoot);
  if (existing.some((record) => record.entry?.entryNumber === number)) {
    throw new Error(`Entry number ${formatEntryNumber(number)} is already allocated`);
  }
  console.log(cli.has("json") ? stableJson(proposal).trimEnd() : renderSummary(proposal));
  process.exit(0);
}

const created = await createRawEntry(repoRoot, {
  number,
  entryId,
  ...identity,
  provider: identity.provider,
  model: identity.modelName,
  modelVersion: identity.modelVersion,
  agent: identity.agentName,
  agentVersion: identity.agentVersion,
  identitySource: identity.identitySource,
  identityConfidence: identity.identityConfidence
});
const output = {
  ...proposal,
  runId: created.run.runId,
  entryDir: created.currentTask.entryDir,
  runDir: created.currentTask.runDir,
  allowedWritePaths: created.currentTask.allowedWritePaths,
  next: [
    "Read WORK-ORDER.md and prompt-snapshot.md",
    "Implement only in the assigned game/ and tests/ directories",
    "Run npm run agent:verify",
    "Run npm run agent:finalize after verification passes"
  ]
};
console.log(cli.has("json") ? stableJson(output).trimEnd() : renderSummary(output));

function renderSummary(value) {
  return [
    `Protocol 99 ${value.challengeVersion} Work Order ${value.action}.`,
    `Entry: ${value.entryNumberLabel} / ${value.entryId}`,
    `Run: ${value.runId ?? "allocated on write"}`,
    `Identity: ${value.identity.modelName} × ${value.identity.agentName} (${value.identity.provider})`,
    `Prompt: ${value.canonicalPromptHash}`,
    value.runDir ? `Assigned Run directory: ${value.runDir}` : "",
    value.runDir ? "Do not inspect or modify another Entry's game or tests." : ""
  ].filter(Boolean).join("\n");
}
