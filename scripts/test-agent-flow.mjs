#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile, cp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashDirectory,
  hashFile,
  pathExists,
  readJson,
  runCommand,
  stableJson,
  writeJson
} from "./lib/common.mjs";
import {
  allocateEntryNumber,
  computeRunIntegrity,
  copyRepairRun,
  createRawEntry,
  loadCurrentTask,
  scanEntries,
  verifyProtocolLock
} from "./lib/protocol.mjs";
import { isAllowedGameRequest } from "./run-browser-verification.mjs";
import {
  scanRuntimeSecurity,
  validateCurrentPathScope,
  validateEntries,
  validateParticipantTests
} from "./lib/validation.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const temporaryRoots = [];
const results = [];

try {
  await test("empty repository allocates Entry 001", async () => {
    const root = await createFixtureRepo();
    assert.equal(await allocateEntryNumber(root), 1);
  });

  await test("existing Entry 001 makes the next allocation 002", async () => {
    const root = await createFixtureRepo();
    await createRawEntry(root, identityOptions({ number: 1 }));
    assert.equal(await allocateEntryNumber(root), 2);
  });

  await test("allocation refuses a full 001–099 range", async () => {
    const root = await createFixtureRepo();
    for (let number = 1; number <= 99; number += 1) {
      const directory = path.join(
        root,
        "entries",
        `${String(number).padStart(3, "0")}-occupied-${number}`
      );
      await mkdir(directory, { recursive: true });
      await writeJson(path.join(directory, "entry.json"), {
        entryId: `p99-v1-${String(number).padStart(3, "0")}-occupied-${number}`,
        entryNumber: number,
        runs: []
      });
    }
    await assert.rejects(() => allocateEntryNumber(root), /no free Entry number/i);
  });

  await test("active Work Orders, dirty starts, and duplicate identities are refused", async () => {
    const root = await createFixtureRepo();
    const first = await createRawEntry(root, identityOptions({ number: 1 }));
    await assert.rejects(
      () => createRawEntry(root, identityOptions({ number: 2 })),
      /active Agent Work Order/i
    );
    await closeAndCommitWorkOrder(root, "Finalize fixture Entry 001");
    await writeFile(path.join(root, "README.md"), "\nuncommitted change\n", { flag: "a" });
    await assert.rejects(
      () => createRawEntry(root, identityOptions({ number: 2 })),
      /clean Git worktree/i
    );
    runCommand("git", ["restore", "README.md"], { cwd: root });
    await assert.rejects(
      () => createRawEntry(root, identityOptions({ number: 2, entryId: first.entry.entryId })),
      /Entry ID already exists/
    );
    await assert.rejects(
      () => createRawEntry(root, identityOptions({ number: 1 })),
      /already allocated/
    );
  });

  await test("Prompt Hash mismatch blocks new work", async () => {
    const root = await createFixtureRepo();
    await writeFile(
      path.join(root, "benchmarks/protocol-99/v1/PROMPT.md"),
      "\nunauthorized change\n",
      { flag: "a" }
    );
    const lock = await verifyProtocolLock(root);
    assert(lock.errors.some((error) => error.includes("PROMPT.md hash mismatch")));
    await assert.rejects(() => createRawEntry(root, identityOptions()), /Challenge Lock is invalid/);
  });

  await test("Finalize refuses an unverified Run", async () => {
    const root = await createFixtureRepo();
    await createRawEntry(root, identityOptions());
    const result = runCommand(process.execPath, [
      path.join(repoRoot, "scripts/agent-finalize.mjs"),
      `--repo=${root}`
    ], { cwd: repoRoot, allowFailure: true });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /must pass agent:verify/i);
  });

  await test("Finalized Raw source changes fail integrity", async () => {
    const root = await createFixtureRepo();
    const created = await createRawEntry(root, identityOptions());
    await synthesizeFinalizedRun(root, created);
    assert.deepEqual((await validateEntries(root)).errors, []);
    await writeFile(
      path.join(created.runDir, "game/src/main.js"),
      "\n// post-finalize tamper\n",
      { flag: "a" }
    );
    assert((await validateEntries(root)).errors.some((error) => (
      error.includes("Finalized source changed after lock")
    )));
  });

  await test("Repair Run copies instead of overwriting Raw", async () => {
    const root = await createFixtureRepo();
    const created = await createRawEntry(root, identityOptions());
    await synthesizeFinalizedRun(root, created);
    await closeAndCommitWorkOrder(root, "Finalize fixture Raw Run");
    const before = await hashDirectory(path.join(created.runDir, "game"));
    const repair = await copyRepairRun(root, {
      entryId: created.entry.entryId,
      fromRun: created.run.runId
    });
    const after = await hashDirectory(path.join(created.runDir, "game"));
    assert.equal(before.sha256, after.sha256);
    assert.notEqual(repair.runDir, created.runDir);
    assert.equal(repair.run.parentRunId, created.run.runId);
    assert.equal(repair.run.parentSourceHash, (await readJson(path.join(created.runDir, "run.json"))).sourceHash);
    assert.equal(repair.run.identity.modelName, created.run.identity.modelName);
    assert.equal(repair.run.identity.agentName, created.run.identity.agentName);
    assert.equal(repair.entry.status, "finalized");
    runGenerator(root);
    const data = await readJson(path.join(root, "data/benchmark.json"));
    assert.equal(data.defaultEntries.length, 1);
    assert.equal(data.defaultEntries[0].canonicalRun.runType, "raw");
    await writeJson(path.join(repair.runDir, "run.json"), { ...repair.run, status: "verified" });
    await writeJson(path.join(repair.runDir, "evidence/report.json"), {
      status: "failed", runId: repair.run.runId
    });
    const finalize = runCommand(process.execPath, [
      path.join(repoRoot, "scripts/agent-finalize.mjs"), `--repo=${root}`
    ], { cwd: repoRoot, allowFailure: true });
    assert.notEqual(finalize.status, 0);
    assert.match(`${finalize.stdout}${finalize.stderr}`, /matching passed verification report/);
  });

  await test("generated benchmark indexes are deterministic", async () => {
    const root = await createFixtureRepo();
    const created = await createRawEntry(root, identityOptions());
    await synthesizeFinalizedRun(root, created);
    const metadataPath = path.join(created.entryDir, "entry.json");
    await writeJson(metadataPath, {
      ...await readJson(metadataPath), title: "Fixture Beacon", summary: "Public metadata, not a model identity."
    });
    runGenerator(root);
    const first = await generatedHashes(root);
    runGenerator(root);
    const second = await generatedHashes(root);
    assert.deepEqual(second, first);
    const data = await readJson(path.join(root, "data/benchmark.json"));
    const entryId = data.entries[0].entryId;
    assert.equal(data.stats.benchmarkEntries, 1);
    assert.equal(data.entries[0].title, "Fixture Beacon");
    assert.equal(data.defaultEntries[0].summary, "Public metadata, not a model identity.");
    assert.equal(await pathExists(path.join(root, `assets/social/entries/${entryId}.svg`)), true);
    assert.match(
      await readFile(path.join(root, "assets/social/og-cover.svg"), "utf8"),
      />1 \/ 99</
    );
    runGenerator(root, true);
  });

  await test("real Chromium fixture wins, loses, pauses, and restarts", async () => {
    const result = runCommand(process.execPath, [
      "scripts/run-browser-verification.mjs",
      "--fixture"
    ], { cwd: repoRoot, allowFailure: true });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /passed, 100\/100/);
  });

  await test("test fixture never enters production data or Pages output", async () => {
    const data = await readJson(path.join(repoRoot, "data/benchmark.json"));
    assert(!data.entries.some((entry) => entry.entryId === "fixture-not-production"));
    runCommand(process.execPath, ["scripts/prepare-pages.mjs"], { cwd: repoRoot });
    assert.equal(await pathExists(path.join(repoRoot, ".site/tests")), false);
    assert.equal(await pathExists(path.join(repoRoot, ".site/benchmarks/protocol-99/test-sdk")), false);
  });

  await test("unverified Entry stays out of default comparison data", async () => {
    const root = await createFixtureRepo();
    await createRawEntry(root, identityOptions());
    runGenerator(root);
    const data = await readJson(path.join(root, "data/benchmark.json"));
    assert.equal(data.entries.length, 1);
    assert.equal(data.defaultEntries.length, 0);
    assert.equal(data.stats.benchmarkEntries, 0);
  });

  await test("Work Order rejects paths outside the assigned Entry", async () => {
    const root = await createFixtureRepo();
    await createRawEntry(root, identityOptions());
    await writeFile(path.join(root, "README.md"), "\nforbidden edit\n", { flag: "a" });
    const scope = await validateCurrentPathScope(root);
    assert(scope.errors.some((error) => error.includes("README.md")));
    const currentPath = path.join(root, ".agent/current.json");
    const current = await readJson(currentPath);
    await writeJson(currentPath, {
      ...current,
      runDir: "../../outside/run-escape"
    });
    await assert.rejects(
      () => loadCurrentTask(root),
      /runDir escapes the assigned Entry/
    );
    const invalidScope = await validateCurrentPathScope(root);
    assert.equal(invalidScope.active, true);
    assert(invalidScope.errors.some((error) => (
      error.includes("runDir escapes the assigned Entry")
    )));
  });

  await test("external requests and privileged participant tests are detected", async () => {
    const root = await createFixtureRepo();
    const created = await createRawEntry(root, identityOptions());
    await writeFile(
      path.join(created.runDir, "game/src/main.js"),
      '\nfetch("https://example.com/runtime.json");\nwindow.parent.document.body;\n',
      { flag: "a" }
    );
    await writeFile(
      path.join(created.runDir, "game/.hidden-runtime.js"),
      'fetch("https://example.com/hidden.json");\n'
    );
    await symlink(
      "src/main.js",
      path.join(created.runDir, "game/runtime-link.js")
    );
    const security = await scanRuntimeSecurity(path.join(created.runDir, "game"));
    assert(security.findings.some((finding) => finding.id === "network-fetch"));
    assert(security.findings.some((finding) => finding.id === "remote-url"));
    assert(security.findings.some((finding) => finding.id === "cross-frame-access"));
    assert(security.findings.some((finding) => finding.path === ".hidden-runtime.js"));
    assert(security.findings.some((finding) => finding.id === "symbolic-link"));
    const gameBase = "http://127.0.0.1:4173/entries/001-test/runs/run-raw/game/";
    assert.equal(
      isAllowedGameRequest(`${gameBase}src/main.js`, gameBase),
      true
    );
    assert.equal(
      isAllowedGameRequest("http://127.0.0.1:4173/games/legacy/index.html", gameBase),
      false
    );
    assert.equal(
      isAllowedGameRequest(`${gameBase}%2e%2e%2f%2e%2e%2flegacy/index.html`, gameBase),
      false
    );
    await writeFile(
      path.join(created.runDir, "tests/playthrough.spec.mjs"),
      '\nimport fs from "node:fs";\nprocess.cwd();\n',
      { flag: "a" }
    );
    const testErrors = await validateParticipantTests(
      path.join(created.runDir, "tests"),
      created.run.runId
    );
    assert(testErrors.some((error) => error.includes("only import")));
    assert(testErrors.some((error) => error.includes("Node/global capability")));
  });

  await test("report and screenshot tampering fail integrity", async () => {
    const root = await createFixtureRepo();
    const created = await createRawEntry(root, identityOptions());
    await synthesizeFinalizedRun(root, created);
    const reportPath = path.join(created.runDir, "evidence/report.json");
    const originalReport = await readFile(reportPath, "utf8");
    const alteredReport = JSON.parse(originalReport);
    alteredReport.score.earned = 99;
    await writeJson(reportPath, alteredReport);
    const reportValidation = await validateEntries(root);
    assert(reportValidation.errors.some((error) => (
      error.includes("Finalized evidence changed after lock")
    )));
    await writeFile(reportPath, originalReport);
    const screenshot = path.join(created.runDir, "evidence/screenshots/victory.png");
    await writeFile(screenshot, "not a browser screenshot");
    const validation = await validateEntries(root);
    assert(validation.errors.some((error) => (
      error.includes("plausible real browser PNG")
      || error.includes("verification report hash")
      || error.includes("evidence changed after lock")
    )));
  });
} finally {
  await Promise.all(temporaryRoots.map((root) => rm(root, { recursive: true, force: true })));
}

console.log("\n──────── Agent Autopilot flow tests ────────");
for (const result of results) {
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}`);
}
const failed = results.filter((result) => !result.ok);
if (failed.length) {
  console.error(`\n${failed.length} Agent flow test(s) failed.`);
  for (const result of failed) {
    console.error(`- ${result.name}: ${result.error.message}`);
  }
  process.exit(1);
}
console.log(`\nAll ${results.length} Agent flow tests passed.`);

async function test(name, callback) {
  try {
    await callback();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

async function createFixtureRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), "p99-agent-flow-"));
  temporaryRoots.push(root);
  for (const relative of [
    "benchmarks/current.json",
    "benchmarks/protocol-99/v1",
    "schemas"
  ]) {
    const source = path.join(repoRoot, relative);
    const destination = path.join(root, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
  }
  await mkdir(path.join(root, "entries"), { recursive: true });
  await mkdir(path.join(root, "games"), { recursive: true });
  await writeJson(path.join(root, "entries/manifest.json"), {
    generated: true,
    entries: []
  });
  await writeJson(path.join(root, "games/manifest.json"), {
    targetGameCount: 99,
    games: []
  });
  await writeFile(path.join(root, ".gitignore"), ".agent/\ntest-results/\n");
  await writeFile(path.join(root, "README.md"), "# Protocol 99 test repository\n");
  runCommand("git", ["init", "-b", "main"], { cwd: root });
  runCommand("git", ["config", "user.name", "Protocol 99 Test"], { cwd: root });
  runCommand("git", ["config", "user.email", "protocol99@example.invalid"], { cwd: root });
  runCommand("git", ["add", "."], { cwd: root });
  runCommand("git", ["commit", "-m", "Fixture baseline"], { cwd: root });
  return root;
}

async function closeAndCommitWorkOrder(root, message) {
  await rm(path.join(root, ".agent", "current.json"), { force: true });
  runCommand("git", ["add", "."], { cwd: root });
  runCommand("git", ["commit", "-m", message], { cwd: root });
}

function identityOptions(overrides = {}) {
  return {
    provider: "Fixture Labs",
    model: "Fixture Model 1",
    modelVersion: "1",
    agent: "Fixture Agent",
    agentVersion: "1",
    identitySource: "test-fixture",
    identityConfidence: "declared",
    ...overrides
  };
}

async function synthesizeFinalizedRun(root, created) {
  await rm(path.join(created.runDir, "game"), { recursive: true, force: true });
  await rm(path.join(created.runDir, "tests"), { recursive: true, force: true });
  await cp(
    path.join(repoRoot, "tests/fixtures/protocol99/game"),
    path.join(created.runDir, "game"),
    { recursive: true }
  );
  await cp(
    path.join(repoRoot, "tests/fixtures/protocol99/tests"),
    path.join(created.runDir, "tests"),
    { recursive: true }
  );
  const evidenceDir = path.join(created.runDir, "evidence");
  const screenshotDir = path.join(evidenceDir, "screenshots");
  await mkdir(screenshotDir, { recursive: true });
  const screenshotSource = path.join(
    repoRoot,
    "games/context-window/assets/images/screenshot-gameplay.png"
  );
  const screenshotHashes = {};
  for (const name of ["title.png", "gameplay.png", "relay-1.png", "victory.png"]) {
    const destination = path.join(screenshotDir, name);
    await cp(screenshotSource, destination);
    screenshotHashes[name] = await hashFile(destination);
  }
  await writeJson(path.join(evidenceDir, "console.json"), []);
  await writeJson(path.join(evidenceDir, "network.json"), []);
  await writeJson(path.join(evidenceDir, "file-inventory.json"), []);

  const firstIntegrity = await computeRunIntegrity(created.runDir);
  const report = {
    "$schema": "../../../../../schemas/verification-report.schema.json",
    reportVersion: "1.0",
    challengeId: created.run.challengeId,
    challengeVersion: created.run.challengeVersion,
    canonicalPromptHash: created.run.canonicalPromptHash,
    entryId: created.entry.entryId,
    runId: created.run.runId,
    runType: created.run.runType,
    status: "passed",
    verifiedAt: new Date().toISOString(),
    seed: 99,
    sourceHash: firstIntegrity.sourceHash,
    sourceBytes: firstIntegrity.sourceBytes,
    sourceFileCount: firstIntegrity.sourceFileCount,
    browser: { name: "Chromium", version: "fixture" },
    checks: {},
    score: {
      name: "Automated Compliance Score",
      earned: 100,
      maximum: 100,
      groups: []
    },
    failures: [],
    evidence: {
      screenshots: Object.keys(screenshotHashes),
      screenshotHashes,
      sourceHash: firstIntegrity.sourceHash,
      console: "console.json",
      network: "network.json",
      fileInventory: "file-inventory.json"
    }
  };
  await writeJson(path.join(evidenceDir, "report.json"), report);
  const integrity = await computeRunIntegrity(created.runDir);
  await writeJson(path.join(evidenceDir, "report.json"), {
    ...report,
    evidenceHash: integrity.evidenceHash
  });
  const run = {
    ...created.run,
    status: "finalized",
    finishedAt: new Date().toISOString(),
    sourceHash: integrity.sourceHash,
    evidenceHash: integrity.evidenceHash,
    environment: { ...created.run.environment, browser: "fixture" }
  };
  const entry = {
    ...created.entry,
    status: "finalized",
    canonicalRunId: run.runId
  };
  await writeJson(path.join(created.runDir, "run.json"), run);
  await writeJson(path.join(created.entryDir, "entry.json"), entry);
}

function runGenerator(root, check = false) {
  const args = [
    "scripts/generate-benchmark.mjs",
    `--repo=${root}`
  ];
  if (check) args.push("--check");
  runCommand(process.execPath, args, { cwd: repoRoot });
}

async function generatedHashes(root) {
  const paths = [
    "entries/manifest.json",
    "data/benchmark.json",
    "docs/generated-benchmark-index.md",
    "assets/social/entries/manifest.json",
    "assets/social/og-cover.svg"
  ];
  const values = {};
  for (const relative of paths) {
    values[relative] = await hashFile(path.join(root, relative));
  }
  return values;
}
