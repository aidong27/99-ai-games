import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  formatEntryNumber,
  fromRepo,
  git,
  gitOutput,
  hashDirectory,
  hashFile,
  isoCompact,
  pathExists,
  readJson,
  resolveRepoRoot,
  sha256,
  slugify,
  stableJson,
  writeJson
} from "./common.mjs";

export const RUN_TYPES = new Set([
  "raw",
  "standard-repair",
  "regeneration",
  "human-curated",
  "cross-agent-repair"
]);

export const FINAL_STATUSES = new Set(["finalized", "withdrawn"]);

const GENERATED_WRITE_PATHS = [
  "entries/manifest.json",
  "data/benchmark.json",
  "docs/generated-benchmark-index.md",
  "assets/social/entries/",
  "assets/social/og-cover.svg",
  "assets/social/og-cover.png",
  "assets/social/raster-manifest.json",
  "benchmark-pages/",
  "sitemap.xml",
  "index.html"
];

export async function loadProtocol(repoRoot = resolveRepoRoot()) {
  const currentPath = fromRepo(repoRoot, "benchmarks", "current.json");
  const current = await readJson(currentPath);
  const challengeDir = path.dirname(fromRepo(repoRoot, "benchmarks", current.challengePath));
  const challenge = await readJson(path.join(challengeDir, "challenge.json"));
  const lock = await readJson(path.join(challengeDir, "LOCK.json"));
  const rubric = await readJson(path.join(challengeDir, "rubric.json"));
  return {
    repoRoot,
    current,
    challengeDir,
    challenge,
    lock,
    rubric,
    promptPath: path.join(challengeDir, "PROMPT.md"),
    testContractPath: path.join(challengeDir, "TEST-CONTRACT.md")
  };
}

export async function verifyProtocolLock(repoRoot = resolveRepoRoot()) {
  const protocol = await loadProtocol(repoRoot);
  const expectedFiles = {
    "PROMPT.md": protocol.lock.canonicalPromptSha256,
    "challenge.json": protocol.lock.challengeJsonSha256,
    "rubric.json": protocol.lock.rubricJsonSha256,
    "TEST-CONTRACT.md": protocol.lock.testContractSha256
  };
  const errors = [];

  if (protocol.current.challengeId !== protocol.challenge.challengeId) {
    errors.push("benchmarks/current.json challengeId does not match challenge.json");
  }
  if (protocol.current.challengeVersion !== protocol.challenge.challengeVersion) {
    errors.push("benchmarks/current.json challengeVersion does not match challenge.json");
  }
  if (protocol.lock.challengeId !== protocol.challenge.challengeId
      || protocol.lock.challengeVersion !== protocol.challenge.challengeVersion) {
    errors.push("LOCK.json identity does not match challenge.json");
  }

  for (const [file, expected] of Object.entries(expectedFiles)) {
    const actual = await hashFile(path.join(protocol.challengeDir, file));
    if (!/^[a-f0-9]{64}$/.test(expected ?? "")) {
      errors.push(`LOCK.json has an invalid hash for ${file}`);
    } else if (actual !== expected) {
      errors.push(`${file} hash mismatch: expected ${expected}, found ${actual}`);
    }
    if (protocol.lock.files?.[file] !== expected) {
      errors.push(`LOCK.json files.${file} does not match its named hash field`);
    }
  }

  const rubricMaximum = protocol.rubric.groups?.reduce(
    (sum, group) => sum + Number(group.maximumScore ?? 0),
    0
  );
  const rubricCheckMaximum = protocol.rubric.groups?.reduce(
    (sum, group) => sum + (group.checks ?? []).reduce(
      (groupSum, check) => groupSum + Number(check.weight ?? 0),
      0
    ),
    0
  );
  if (protocol.rubric.title !== "Automated Compliance Score") {
    errors.push("rubric title must be Automated Compliance Score");
  }
  if (protocol.rubric.maximumScore !== 100
      || rubricMaximum !== 100
      || rubricCheckMaximum !== 100) {
    errors.push(
      `rubric weights must total 100 (declared=${protocol.rubric.maximumScore}, groups=${rubricMaximum}, checks=${rubricCheckMaximum})`
    );
  }

  return { ...protocol, errors };
}

export async function scanEntries(repoRoot = resolveRepoRoot()) {
  const entriesRoot = fromRepo(repoRoot, "entries");
  if (!(await pathExists(entriesRoot))) {
    return [];
  }
  const dirents = await readdir(entriesRoot, { withFileTypes: true });
  const entries = [];
  for (const dirent of dirents.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!dirent.isDirectory() || !/^\d{3}-[a-z0-9-]+$/.test(dirent.name)) {
      continue;
    }
    const entryDir = path.join(entriesRoot, dirent.name);
    const entryPath = path.join(entryDir, "entry.json");
    if (!(await pathExists(entryPath))) {
      entries.push({
        directoryName: dirent.name,
        entryDir,
        entryPath,
        entry: null,
        runs: [],
        loadError: "entry.json is missing"
      });
      continue;
    }
    const entry = await readJson(entryPath);
    const runs = [];
    for (const runRef of entry.runs ?? []) {
      const runDir = path.resolve(entryDir, runRef);
      const runPath = path.join(runDir, "run.json");
      if (!(await pathExists(runPath))) {
        runs.push({ runRef, runDir, runPath, run: null, loadError: "run.json is missing" });
        continue;
      }
      runs.push({ runRef, runDir, runPath, run: await readJson(runPath) });
    }
    entries.push({ directoryName: dirent.name, entryDir, entryPath, entry, runs });
  }
  return entries;
}

export async function allocateEntryNumber(repoRoot = resolveRepoRoot()) {
  const { challenge } = await loadProtocol(repoRoot);
  const entries = await scanEntries(repoRoot);
  const used = new Set(entries.map((record) => record.entry?.entryNumber).filter(Number.isInteger));
  for (let number = challenge.entryRange.first; number <= challenge.entryRange.last; number += 1) {
    if (!used.has(number)) {
      return number;
    }
  }
  throw new Error(`Protocol 99 ${challenge.challengeVersion} has no free Entry number from 001 through 099`);
}

export function resolveIdentity(options = {}) {
  const provider = normalizeIdentityValue(options.provider ?? process.env.AI_PROVIDER);
  const modelName = normalizeIdentityValue(
    options.model ?? options.modelName ?? process.env.AI_MODEL
  );
  const modelVersion = normalizeIdentityValue(options.modelVersion ?? process.env.AI_MODEL_VERSION);
  const agentName = normalizeIdentityValue(
    options.agent ?? options.agentName ?? process.env.AI_AGENT
  );
  const agentVersion = normalizeIdentityValue(options.agentVersion ?? process.env.AI_AGENT_VERSION);
  const declared = [provider, modelName, agentName].filter((value) => value !== "unknown").length;
  const identitySource = options.identitySource
    ?? (declared ? "command-line-or-environment-declaration" : "undeclared");
  const identityConfidence = options.identityConfidence
    ?? (declared === 3 ? "declared" : declared > 0 ? "partial" : "unknown");
  return {
    provider,
    modelName,
    modelVersion,
    agentName,
    agentVersion,
    identitySource,
    identityConfidence
  };
}

function normalizeIdentityValue(value) {
  const clean = String(value ?? "").trim();
  return clean || "unknown";
}

export function createEntryId({ challengeVersion, number, identity }) {
  const identitySlug = slugify(
    [identity.provider, identity.modelName, identity.agentName]
      .filter((value) => value && value !== "unknown")
      .join("-"),
    "unknown-system"
  ).slice(0, 72);
  return `p99-${challengeVersion}-${formatEntryNumber(number)}-${identitySlug}`;
}

export function createRunId({ runType, date = new Date(), identity }) {
  const stamp = date.toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .replace("Z", "");
  const suffix = slugify(identity?.agentName ?? identity?.modelName ?? "unknown").slice(0, 32);
  return `run-${runType}-${stamp}-${suffix}`;
}

export async function createRawEntry(repoRoot, options = {}) {
  const protocol = await verifyProtocolLock(repoRoot);
  if (protocol.errors.length) {
    throw new Error(`Current Challenge Lock is invalid:\n- ${protocol.errors.join("\n- ")}`);
  }
  await assertWorkOrderCanStart(repoRoot);
  const number = options.number ?? await allocateEntryNumber(repoRoot);
  if (!Number.isInteger(number) || number < 1 || number > 99) {
    throw new Error(`Entry number must be an integer from 1 through 99, received ${number}`);
  }
  const existing = await scanEntries(repoRoot);
  if (existing.some((record) => record.entry?.entryNumber === number)) {
    throw new Error(`Entry number ${formatEntryNumber(number)} is already allocated`);
  }

  const identity = resolveIdentity(options);
  const entryId = options.entryId ?? createEntryId({
    challengeVersion: protocol.challenge.challengeVersion,
    number,
    identity
  });
  if (existing.some((record) => record.entry?.entryId === entryId)) {
    throw new Error(`Entry ID already exists: ${entryId}`);
  }

  const directoryName = `${formatEntryNumber(number)}-${slugify(entryId.replace(/^p99-v\d+-\d{3}-/, ""))}`;
  const entryDir = fromRepo(repoRoot, "entries", directoryName);
  if (await pathExists(entryDir)) {
    throw new Error(`Entry directory already exists: ${path.relative(repoRoot, entryDir)}`);
  }
  const startedAt = options.startedAt ?? isoCompact();
  const runId = options.runId ?? createRunId({ runType: "raw", identity });
  const runRef = `runs/${runId}`;
  const runDir = path.join(entryDir, runRef);
  const promptSnapshot = await readFile(protocol.promptPath);
  const baselineGitCommit = options.baselineGitCommit
    ?? gitOutput(repoRoot, ["rev-parse", "HEAD"]);
  const branch = gitOutput(repoRoot, ["branch", "--show-current"]);

  const entry = {
    "$schema": "../../schemas/entry.schema.json",
    entryId,
    entryNumber: number,
    challengeId: protocol.challenge.challengeId,
    challengeVersion: protocol.challenge.challengeVersion,
    canonicalPromptHash: protocol.lock.canonicalPromptSha256,
    status: "building",
    identity,
    createdAt: startedAt,
    canonicalRunId: null,
    runs: [runRef],
    reviews: {
      playerExperience: null,
      engineering: null
    }
  };
  const run = {
    "$schema": "../../../../schemas/protocol-run.schema.json",
    runId,
    entryId,
    challengeId: protocol.challenge.challengeId,
    challengeVersion: protocol.challenge.challengeVersion,
    canonicalPromptHash: protocol.lock.canonicalPromptSha256,
    promptSnapshot: "prompt-snapshot.md",
    runType: "raw",
    status: "building",
    identity,
    startedAt,
    finishedAt: null,
    baselineGitCommit,
    baselineBranch: branch,
    humanPromptCount: options.humanPromptCount ?? 1,
    humanCodeEdits: options.humanCodeEdits ?? false,
    parentRunId: null,
    parentSourceHash: null,
    sourceHash: null,
    evidenceHash: null,
    verificationReport: "evidence/report.json",
    knownIssues: [],
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      browser: "pending verification"
    },
    toolAccess: {
      shell: options.shellAccess ?? "declared-available",
      filesystem: options.filesystemAccess ?? "declared-available",
      browser: options.browserAccess ?? "pending-verification",
      network: options.networkAccess ?? "undeclared"
    },
    paths: {
      game: "game/",
      tests: "tests/",
      evidence: "evidence/"
    }
  };

  await mkdir(path.join(runDir, "game", "src"), { recursive: true });
  await mkdir(path.join(runDir, "game", "styles"), { recursive: true });
  await mkdir(path.join(runDir, "game", "assets"), { recursive: true });
  await mkdir(path.join(runDir, "tests"), { recursive: true });
  await mkdir(path.join(runDir, "evidence", "screenshots"), { recursive: true });
  await writeJson(path.join(entryDir, "entry.json"), entry);
  await writeJson(path.join(runDir, "run.json"), run);
  await writeFile(path.join(runDir, "prompt-snapshot.md"), promptSnapshot);
  await writeFile(path.join(entryDir, "README.md"), renderEntryReadme(entry, run));
  await writeFile(path.join(runDir, "WORK-ORDER.md"), renderWorkOrder(entry, run));
  await writeFile(path.join(runDir, "game", "README.md"), renderGameReadme(entry, run));
  await writeFile(path.join(runDir, "game", "KNOWN-ISSUES.md"), "# Known Issues\n\nNone recorded yet.\n");
  await writeFile(path.join(runDir, "game", "index.html"), renderGameStarter(entry));
  await writeFile(path.join(runDir, "game", "src", "main.js"), renderGameScriptStarter());
  await writeFile(path.join(runDir, "game", "styles", "main.css"), renderGameStyleStarter());
  await writeFile(path.join(runDir, "tests", "playthrough.spec.mjs"), renderPlaythroughStarter());
  await writeFile(path.join(runDir, "tests", "defeat.spec.mjs"), renderDefeatStarter());

  const relativeEntryDir = path.relative(repoRoot, entryDir).split(path.sep).join("/");
  const relativeRunDir = path.relative(repoRoot, runDir).split(path.sep).join("/");
  const currentTask = {
    protocolVersion: "1.0",
    entryId,
    entryNumber: number,
    runId,
    runType: "raw",
    challengeId: protocol.challenge.challengeId,
    challengeVersion: protocol.challenge.challengeVersion,
    canonicalPromptHash: protocol.lock.canonicalPromptSha256,
    baselineGitCommit,
    startedAt,
    entryDir: relativeEntryDir,
    runDir: relativeRunDir,
    allowedWritePaths: [
      `${relativeEntryDir}/entry.json`,
      `${relativeEntryDir}/README.md`,
      `${relativeRunDir}/`,
      ".agent/current.json"
    ],
    generatedWritePaths: [...GENERATED_WRITE_PATHS],
    forbiddenReadPaths: [
      "entries/*/runs/*/game/",
      "entries/*/runs/*/tests/"
    ],
    note: "Do not inspect another Entry's game or tests. This is an honor-system path protocol in a public repository, not an absolute sandbox."
  };
  await writeJson(fromRepo(repoRoot, ".agent", "current.json"), currentTask);
  return { entry, run, currentTask, entryDir, runDir };
}

export async function loadCurrentTask(repoRoot = resolveRepoRoot()) {
  const currentPath = fromRepo(repoRoot, ".agent", "current.json");
  if (!(await pathExists(currentPath))) {
    throw new Error("No active Agent task. Run npm run agent:start first.");
  }
  const currentTask = await readJson(currentPath);
  const entryDir = fromRepo(repoRoot, currentTask.entryDir);
  const runDir = fromRepo(repoRoot, currentTask.runDir);
  const entry = await readJson(path.join(entryDir, "entry.json"));
  const run = await readJson(path.join(runDir, "run.json"));
  return { repoRoot, currentPath, currentTask, entryDir, runDir, entry, run };
}

export async function computeRunIntegrity(runDir) {
  const source = await hashDirectory(runDir, {
    skip: (relative) => (
      relative === "run.json"
      || relative === "WORK-ORDER.md"
      || relative.startsWith("evidence/")
      || relative === "prompt-snapshot.md"
    )
  });
  const promptHash = await hashFile(path.join(runDir, "prompt-snapshot.md"));
  const evidence = await hashDirectory(path.join(runDir, "evidence"), {
    skip: (relative) => relative === "report.json"
  });
  return {
    sourceHash: source.sha256,
    sourceFileCount: source.fileCount,
    sourceBytes: source.totalBytes,
    promptHash,
    evidenceHash: evidence.sha256,
    evidenceFileCount: evidence.fileCount,
    evidenceBytes: evidence.totalBytes
  };
}

export async function copyRepairRun(repoRoot, options) {
  await assertWorkOrderCanStart(repoRoot);
  const entries = await scanEntries(repoRoot);
  const record = entries.find((item) => item.entry?.entryId === options.entryId);
  if (!record) {
    throw new Error(`Entry not found: ${options.entryId}`);
  }
  const source = record.runs.find((item) => item.run?.runId === options.fromRun);
  if (!source) {
    throw new Error(`Source Run not found: ${options.fromRun}`);
  }
  if (source.run.status !== "finalized") {
    throw new Error(`Source Run must be finalized before repair: ${options.fromRun}`);
  }
  const runType = options.runType ?? "standard-repair";
  if (!RUN_TYPES.has(runType) || runType === "raw") {
    throw new Error(`Repair Run type must be a non-raw supported type, received ${runType}`);
  }
  const identity = resolveIdentity({
    ...source.run.identity,
    ...options,
    identitySource: options.identitySource ?? source.run.identity.identitySource,
    identityConfidence: options.identityConfidence ?? source.run.identity.identityConfidence
  });
  const runId = options.runId ?? createRunId({ runType, identity });
  const runRef = `runs/${runId}`;
  const runDir = path.join(record.entryDir, runRef);
  if (await pathExists(runDir)) {
    throw new Error(`Repair Run already exists: ${runId}`);
  }
  await mkdir(runDir, { recursive: true });
  await cp(path.join(source.runDir, "game"), path.join(runDir, "game"), { recursive: true });
  await cp(path.join(source.runDir, "tests"), path.join(runDir, "tests"), { recursive: true });
  await cp(
    path.join(source.runDir, "prompt-snapshot.md"),
    path.join(runDir, "prompt-snapshot.md")
  );
  await mkdir(path.join(runDir, "evidence", "screenshots"), { recursive: true });

  const startedAt = options.startedAt ?? isoCompact();
  const run = {
    ...source.run,
    runId,
    runType,
    status: "building",
    identity,
    startedAt,
    finishedAt: null,
    baselineGitCommit: gitOutput(repoRoot, ["rev-parse", "HEAD"]),
    baselineBranch: gitOutput(repoRoot, ["branch", "--show-current"]),
    humanPromptCount: options.humanPromptCount ?? 1,
    humanCodeEdits: options.humanCodeEdits ?? false,
    parentRunId: source.run.runId,
    parentSourceHash: source.run.sourceHash,
    sourceHash: null,
    evidenceHash: null,
    verificationReport: "evidence/report.json",
    knownIssues: [...(source.run.knownIssues ?? [])],
    repairInput: "STANDARD-REPAIR-REPORT.md"
  };
  await writeJson(path.join(runDir, "run.json"), run);
  await writeFile(path.join(runDir, "WORK-ORDER.md"), renderWorkOrder(record.entry, run));
  await writeFile(
    path.join(runDir, "STANDARD-REPAIR-REPORT.md"),
    await renderRepairReport(source.runDir)
  );

  const entry = {
    ...record.entry,
    status: "building",
    runs: [...record.entry.runs, runRef]
  };
  await writeJson(record.entryPath, entry);
  const relativeEntryDir = path.relative(repoRoot, record.entryDir).split(path.sep).join("/");
  const relativeRunDir = path.relative(repoRoot, runDir).split(path.sep).join("/");
  const currentTask = {
    protocolVersion: "1.0",
    entryId: entry.entryId,
    entryNumber: entry.entryNumber,
    runId,
    runType,
    challengeId: entry.challengeId,
    challengeVersion: entry.challengeVersion,
    canonicalPromptHash: entry.canonicalPromptHash,
    baselineGitCommit: run.baselineGitCommit,
    startedAt,
    entryDir: relativeEntryDir,
    runDir: relativeRunDir,
    allowedWritePaths: [
      `${relativeEntryDir}/entry.json`,
      `${relativeEntryDir}/README.md`,
      `${relativeRunDir}/`,
      ".agent/current.json"
    ],
    generatedWritePaths: [...GENERATED_WRITE_PATHS],
    note: "The parent Finalized Run is immutable. Repair only the new copied Run."
  };
  await writeJson(fromRepo(repoRoot, ".agent", "current.json"), currentTask);
  return { entry, run, currentTask, entryDir: record.entryDir, runDir };
}

async function assertWorkOrderCanStart(repoRoot) {
  if (await pathExists(fromRepo(repoRoot, ".agent", "current.json"))) {
    throw new Error(
      "An active Agent Work Order already exists. Finish or remove it deliberately before starting another Run."
    );
  }
  const status = git(repoRoot, ["status", "--porcelain"], { allowFailure: true });
  if (status.status !== 0) {
    throw new Error("Cannot inspect the Git worktree before starting an Agent Work Order");
  }
  const changed = status.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (changed.length) {
    throw new Error(
      `Agent Work Orders require a clean Git worktree. Commit or isolate these changes first:\n- ${changed.slice(0, 12).join("\n- ")}`
    );
  }
}

async function renderRepairReport(sourceRunDir) {
  const reportPath = path.join(sourceRunDir, "evidence", "report.json");
  if (!(await pathExists(reportPath))) {
    return "# Standard Repair Input\n\nThe source Run has no machine report. Repair cannot proceed honestly.\n";
  }
  const report = await readJson(reportPath);
  return `# Standard Repair Input

Source Run: \`${report.runId}\`

Only the following machine-reported failures are repair input:

${report.failures?.length
    ? report.failures.map((failure) => `- ${failure}`).join("\n")
    : "- No failed checks were reported. Do not redesign or add features."}
`;
}

function renderEntryReadme(entry, run) {
  return `# Protocol 99 Entry ${formatEntryNumber(entry.entryNumber)}

- Entry ID: \`${entry.entryId}\`
- Challenge: \`${entry.challengeId} ${entry.challengeVersion}\`
- Run: \`${run.runId}\`
- Model: ${entry.identity.modelName}
- Agent: ${entry.identity.agentName}
- Status: ${entry.status}

This directory is created and maintained through the Agent Autopilot commands.
Do not hand-edit global manifests. Finalized Raw Runs are immutable.
`;
}

function renderWorkOrder(entry, run) {
  return `# Protocol 99 Work Order

Build the current Challenge in this Run only.

- Entry: \`${entry.entryId}\`
- Number: \`${formatEntryNumber(entry.entryNumber)}\`
- Run: \`${run.runId}\`
- Run type: \`${run.runType}\`
- Canonical Prompt SHA-256: \`${run.canonicalPromptHash}\`
- Game directory: \`game/\`
- Participant tests: \`tests/\`
- Evidence output: \`evidence/\` (written by verification)

## Required sequence

1. Read \`prompt-snapshot.md\` and the repository test SDK documentation.
2. Implement only inside \`game/\` and \`tests/\`.
3. Run \`npm run agent:verify\`.
4. Fix only the current Run and repeat verification until it passes.
5. Run \`npm run agent:finalize\`.
6. Run \`npm run check\`.

Do not inspect another Entry's game or tests. Do not modify the Challenge,
Legacy game source, another Entry, generated global files, or evidence by hand.
`;
}

function renderGameReadme(entry, run) {
  return `# Protocol 99 Game Workspace

Assigned Entry: \`${entry.entryId}\`
Assigned Run: \`${run.runId}\`

Implement the complete static game here. The runtime must not depend on npm or
remote resources. Record honest limitations in \`KNOWN-ISSUES.md\`.
`;
}

function renderGameStarter(entry) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>Protocol 99 Entry ${formatEntryNumber(entry.entryNumber)}</title>
    <link rel="stylesheet" href="./styles/main.css">
  </head>
  <body>
    <main>
      <section data-p99-ui="instructions">
        <h1>Protocol 99</h1>
        <p>Implement the assigned game in this directory.</p>
        <button type="button" data-p99-action="start">Start</button>
      </section>
      <section data-p99-ui="hud" hidden aria-label="Game status"></section>
      <button type="button" data-p99-action="pause" hidden>Pause</button>
      <button type="button" data-p99-action="restart">Restart</button>
      <section data-p99-ui="victory" hidden>Victory</section>
      <section data-p99-ui="defeat" hidden>Defeat</section>
    </main>
    <script type="module" src="./src/main.js"></script>
  </body>
</html>
`;
}

function renderGameScriptStarter() {
  return `// Replace this starter with the current AI coding system's implementation.
// Verification intentionally fails until the real state contract is complete.
const state = {
  phase: "title",
  seed: new URLSearchParams(location.search).get("seed") === "99" ? 99 : 99,
  integrity: 1,
  maxIntegrity: 1,
  carryingCore: false,
  coresCollectedTotal: 0,
  relaysActivated: 0,
  worldStage: 0,
  abilityStatus: "unavailable",
  exitUnlocked: false,
  elapsedMs: 0
};

window.__P99__ = {
  contractVersion: "1.0",
  getState: () => structuredClone(state)
};
`;
}

function renderGameStyleStarter() {
  return `* { box-sizing: border-box; }
html { min-width: 320px; background: #0b0d10; color: #f4f7fb; }
body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; }
main { width: min(960px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0; }
button:focus-visible { outline: 3px solid #72d8ff; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
`;
}

function renderPlaythroughStarter() {
  return `import { defineProtocolTest } from "../../../../../benchmarks/protocol-99/test-sdk/index.mjs";

export default defineProtocolTest("winning playthrough", async (game) => {
  await game.start();
  // Use only public controls through the SDK. Reach a real win, then keep both
  // required checkpoints. Verification fails until this is implemented.
  await game.checkpoint("relay-1");
  await game.waitForState({ phase: "won" });
  await game.checkpoint("victory");
});
`;
}

function renderDefeatStarter() {
  return `import { defineProtocolTest } from "../../../../../benchmarks/protocol-99/test-sdk/index.mjs";

export default defineProtocolTest("defeat path", async (game) => {
  await game.start();
  // Use public controls to reach the real defeat state.
  await game.waitForState({ phase: "lost" });
});
`;
}
