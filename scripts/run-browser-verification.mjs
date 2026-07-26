#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createContext, Script } from "node:vm";
import {
  fromRepo,
  hashFile,
  parseCli,
  pathExists,
  resolveRepoRoot,
  writeJson
} from "./lib/common.mjs";
import { startStaticServer } from "./lib/static-server.mjs";
import { loadProtocol } from "./lib/protocol.mjs";
import { buildStaticFacts } from "./lib/validation.mjs";
import { createProtocolHarness } from "../benchmarks/protocol-99/test-sdk/runner.mjs";
import { defineProtocolTest } from "../benchmarks/protocol-99/test-sdk/index.mjs";

const REQUIRED_STATE = {
  phase: (value) => ["title", "playing", "paused", "won", "lost"].includes(value),
  seed: (value) => value === 99,
  integrity: Number.isFinite,
  maxIntegrity: (value) => Number.isFinite(value) && value > 0,
  carryingCore: (value) => typeof value === "boolean",
  coresCollectedTotal: (value) => Number.isInteger(value) && value >= 0,
  relaysActivated: (value) => Number.isInteger(value) && value >= 0 && value <= 3,
  worldStage: (value) => Number.isInteger(value) && value >= 0 && value <= 3,
  abilityStatus: (value) => ["ready", "cooldown", "unavailable"].includes(value),
  exitUnlocked: (value) => typeof value === "boolean",
  elapsedMs: (value) => Number.isFinite(value) && value >= 0
};

const REQUIRED_HOOKS = [
  '[data-p99-action="start"]',
  '[data-p99-action="pause"]',
  '[data-p99-action="restart"]',
  '[data-p99-ui="instructions"]',
  '[data-p99-ui="hud"]',
  '[data-p99-ui="victory"]',
  '[data-p99-ui="defeat"]'
];

export async function runBrowserVerification(options) {
  const {
    repoRoot,
    entry,
    run,
    runDir,
    protocol,
    staticFacts
  } = options;
  const evidenceDir = options.evidenceDir ?? path.join(runDir, "evidence");
  const screenshotDir = path.join(evidenceDir, "screenshots");
  await mkdir(screenshotDir, { recursive: true });

  const checks = Object.fromEntries(
    protocol.rubric.groups.flatMap((group) => group.checks).map((check) => [check.id, false])
  );
  checks["security.static-scan"] = staticFacts.security.findings.length === 0;
  const promptSnapshotPath = path.join(runDir, "prompt-snapshot.md");
  checks["integrity.source-and-prompt"] = (
    run.canonicalPromptHash === protocol.lock.canonicalPromptSha256
    && (
      entry.entryNumber === 0
      || (
        await pathExists(promptSnapshotPath)
        && await hashMatches(promptSnapshotPath, run.canonicalPromptHash)
      )
    )
  );

  const failures = [];
  const consoleEntries = [];
  const networkEntries = [];
  const checkpointNames = new Set();
  const stateHistory = [];
  let browser;
  let server;
  let browserVersion = "unavailable";

  try {
    server = await startStaticServer({ root: repoRoot, port: 0, host: "127.0.0.1" });
    browser = await chromium.launch({ headless: true });
    browserVersion = browser.version();
    const relativeGame = path.relative(repoRoot, path.join(runDir, "game"))
      .split(path.sep)
      .map(encodeURIComponent)
      .join("/");
    const gameUrl = `${server.origin}/${relativeGame}/?seed=99`;

    const generic = await newPage(browser, server.origin, consoleEntries, networkEntries, {
      viewport: protocol.challenge.runtime.desktopViewport
    });
    const genericHarness = createProtocolHarness(generic.page, {
      gameUrl,
      screenshotDir,
      history: stateHistory,
      checkpointNames
    });
    const initial = await genericHarness.goto();
    checks["browser.loads"] = validateState(initial).length === 0;
    failures.push(...validateState(initial));

    const hookFacts = await generic.page.evaluate((selectors) => Object.fromEntries(
      selectors.map((selector) => [selector, document.querySelectorAll(selector).length])
    ), REQUIRED_HOOKS);
    checks["contract.required-hooks"] = REQUIRED_HOOKS.every((selector) => hookFacts[selector] >= 1);
    if (!checks["contract.required-hooks"]) {
      failures.push("one or more required data-p99 action/UI hooks are missing");
    }

    await genericHarness.checkpoint("title");
    await genericHarness.start();
    await genericHarness.checkpoint("gameplay");
    const firstStarted = await genericHarness.state();
    const firstDeterministic = deterministicState(firstStarted);
    await generic.page.reload({ waitUntil: "domcontentloaded" });
    await genericHarness.start();
    const secondStarted = await genericHarness.state();
    checks["determinism.seed-99"] = deepEqual(firstDeterministic, deterministicState(secondStarted));
    if (!checks["determinism.seed-99"]) {
      failures.push("seed 99 did not reproduce the same observable initial state");
    }

    const paused = await genericHarness.pause();
    await generic.page.waitForTimeout(280);
    const stillPaused = await genericHarness.state();
    const elapsedDrift = Math.abs(stillPaused.elapsedMs - paused.elapsedMs);
    await genericHarness.resume();
    const resumedBefore = await genericHarness.state();
    await generic.page.waitForTimeout(180);
    const resumedAfter = await genericHarness.state();
    checks["flow.pause-resume"] = (
      paused.phase === "paused"
      && stillPaused.phase === "paused"
      && elapsedDrift <= 40
      && resumedAfter.phase === "playing"
      && resumedAfter.elapsedMs > resumedBefore.elapsedMs
    );
    if (!checks["flow.pause-resume"]) {
      failures.push(`pause/resume did not freeze and resume elapsedMs (pause drift ${elapsedDrift} ms)`);
    }

    const abilityBefore = await genericHarness.state();
    await genericHarness.press("Space");
    const abilityAfter = await genericHarness.state();
    const abilityFacts = abilityAfter.diagnostics?.ability ?? abilityAfter.ability;
    checks["systems.limited-ability"] = Boolean(
      abilityFacts?.id
      && abilityFacts?.limitation
      && abilityBefore.abilityStatus === "ready"
      && abilityAfter.abilityStatus === "cooldown"
    );
    if (!checks["systems.limited-ability"]) {
      failures.push("the active ability did not expose a real limitation and observable cooldown");
    }
    await generic.context.close();

    const mobile = await newPage(browser, server.origin, consoleEntries, networkEntries, {
      viewport: protocol.challenge.runtime.mobileBaselineViewport,
      reducedMotion: "reduce"
    });
    const mobileHarness = createProtocolHarness(mobile.page, {
      gameUrl,
      screenshotDir,
      history: stateHistory,
      checkpointNames
    });
    await mobileHarness.goto();
    const mobileFacts = await mobile.page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      startVisible: (() => {
        const element = document.querySelector('[data-p99-action="start"]');
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
      })()
    }));
    checks["layout.mobile-baseline"] = (
      mobileFacts.scrollWidth <= mobileFacts.clientWidth + 1
      && mobileFacts.startVisible
    );
    if (!checks["layout.mobile-baseline"]) {
      failures.push(`390x700 baseline is unusable or horizontally overflows (${mobileFacts.scrollWidth}/${mobileFacts.clientWidth})`);
    }
    const a11yFacts = await inspectAccessibility(mobile.page, path.join(runDir, "game"));
    checks["accessibility.focus-and-motion"] = a11yFacts.focusVisible && a11yFacts.reducedMotionRule;
    if (!checks["accessibility.focus-and-motion"]) {
      failures.push("visible keyboard focus or prefers-reduced-motion support is missing");
    }
    await mobile.context.close();

    const playthroughModule = await loadParticipantTest(
      path.join(runDir, "tests", "playthrough.spec.mjs"),
      "winning playthrough"
    );
    const play = await newPage(browser, server.origin, consoleEntries, networkEntries, {
      viewport: protocol.challenge.runtime.desktopViewport
    });
    const playHarness = createProtocolHarness(play.page, {
      gameUrl,
      screenshotDir,
      history: stateHistory,
      checkpointNames,
      timeoutMs: 20_000
    });
    await playHarness.goto();
    await runParticipant(playthroughModule, playHarness, "winning playthrough");
    const firstWin = await playHarness.state();
    checks["flow.real-victory"] = firstWin.phase === "won";
    if (!checks["flow.real-victory"]) {
      failures.push(`winning playthrough ended in ${firstWin.phase}, not won`);
    }
    const restartState = await playHarness.restart();
    checks["flow.restart"] = (
      ["title", "playing"].includes(restartState.phase)
      && restartState.relaysActivated === 0
      && restartState.coresCollectedTotal === 0
      && restartState.carryingCore === false
      && restartState.exitUnlocked === false
    );
    if (!checks["flow.restart"]) {
      failures.push("restart did not reset the complete game state");
    }
    await runParticipant(playthroughModule, playHarness, "second same-tab winning playthrough");
    const secondWin = await playHarness.state();
    checks["flow.two-runs-one-tab"] = secondWin.phase === "won";
    if (!checks["flow.two-runs-one-tab"]) {
      failures.push("the second same-tab playthrough did not reach a stable win");
    }
    await play.context.close();

    const defeatModule = await loadParticipantTest(
      path.join(runDir, "tests", "defeat.spec.mjs"),
      "defeat path"
    );
    const defeat = await newPage(browser, server.origin, consoleEntries, networkEntries, {
      viewport: protocol.challenge.runtime.desktopViewport
    });
    const defeatHarness = createProtocolHarness(defeat.page, {
      gameUrl,
      screenshotDir,
      history: stateHistory,
      checkpointNames,
      timeoutMs: 20_000
    });
    await defeatHarness.goto();
    await runParticipant(defeatModule, defeatHarness, "defeat path");
    const defeated = await defeatHarness.state();
    checks["flow.real-defeat"] = defeated.phase === "lost" && defeated.integrity === 0;
    if (!checks["flow.real-defeat"]) {
      failures.push(`defeat test ended at phase=${defeated.phase}, integrity=${defeated.integrity}`);
    }
    await defeatHarness.checkpoint("defeat");
    const defeatRestart = await defeatHarness.restart();
    checks["flow.restart"] = checks["flow.restart"] && (
      ["title", "playing"].includes(defeatRestart.phase)
      && defeatRestart.integrity === defeatRestart.maxIntegrity
    );
    await defeat.context.close();

    const finalWin = firstWin;
    const diagnostics = finalWin.diagnostics ?? {};
    checks["objective.cores"] = (
      finalWin.coresCollectedTotal === 3
      && (diagnostics.objective?.coreCount ?? finalWin.coreCount) === 3
    );
    checks["objective.relays"] = (
      finalWin.relaysActivated === 3
      && (diagnostics.objective?.relayCount ?? finalWin.relayCount) === 3
    );
    checks["objective.extraction"] = (
      finalWin.exitUnlocked === true
      && finalWin.phase === "won"
      && (diagnostics.objective?.exitCount ?? finalWin.exitCount) === 1
    );
    checks["systems.two-hazards"] = hasTwoDistinctHazards(diagnostics.hazards ?? finalWin.hazards);

    for (const stage of [1, 2, 3]) {
      const currentSignatures = new Set(stateHistory
        .map((record) => record.state)
        .filter((state) => state.relaysActivated === stage && state.worldStage >= stage)
        .map(worldSignature)
        .filter(Boolean));
      const previousSignatures = new Set(stateHistory
        .map((record) => record.state)
        .filter((state) => state.relaysActivated === stage - 1)
        .map(worldSignature)
        .filter(Boolean));
      checks[`world.stage-${stage === 1 ? "one" : stage === 2 ? "two" : "three"}`] = (
        currentSignatures.size > 0
        && previousSignatures.size > 0
        && [...currentSignatures].some((signature) => !previousSignatures.has(signature))
      );
    }
    if (!checks["world.stage-one"]) failures.push("relay 1 did not expose a world signature distinct from stage 0");
    if (!checks["world.stage-two"]) failures.push("relay 2 did not expose a world signature distinct from stage 1");
    if (!checks["world.stage-three"]) failures.push("relay 3 did not expose a world signature distinct from stage 2");
    if (!checks["objective.cores"]) failures.push("the real win did not prove exactly three data cores");
    if (!checks["objective.relays"]) failures.push("the real win did not prove exactly three relays");
    if (!checks["objective.extraction"]) failures.push("the real win did not prove physical unlocked extraction");
    if (!checks["systems.two-hazards"]) failures.push("two behaviorally distinct hazards were not exposed as observable facts");

    const requiredScreenshots = ["title", "gameplay", "relay-1", "victory"];
    for (const checkpoint of requiredScreenshots) {
      if (!checkpointNames.has(checkpoint)) {
        failures.push(`required real screenshot checkpoint is missing: ${checkpoint}`);
      }
    }

    checks["security.no-external-network"] = (
      networkEntries.every((request) => request.allowed)
    );
    if (!checks["security.no-external-network"]) {
      failures.push("one or more external network requests were attempted");
    }
    checks["browser.no-uncaught-errors"] = !consoleEntries.some(
      (entry) => entry.level === "error" || entry.kind === "pageerror"
    );
    if (!checks["browser.no-uncaught-errors"]) {
      failures.push("one or more uncaught console/page errors were captured");
    }
  } catch (error) {
    const unavailable = /browserType\.launch|Executable doesn't exist|playwright install/i.test(
      `${error.message}\n${error.stack ?? ""}`
    );
    failures.push(unavailable
      ? "Chromium is unavailable; run npx playwright install chromium"
      : error.message);
    const status = unavailable ? "pending-browser-verification" : "failed";
    return await writeReport({
      status,
      checks,
      failures,
      protocol,
      entry,
      run,
      evidenceDir,
      browserVersion,
      staticFacts,
      consoleEntries,
      networkEntries
    });
  } finally {
    await browser?.close().catch(() => {});
    await server?.close().catch(() => {});
  }

  return writeReport({
    status: Object.values(checks).every(Boolean) && failures.length === 0 ? "passed" : "failed",
    checks,
    failures,
    protocol,
    entry,
    run,
    evidenceDir,
    browserVersion,
    staticFacts,
    consoleEntries,
    networkEntries
  });
}

async function newPage(browser, allowedOrigin, consoleEntries, networkEntries, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    reducedMotion: options.reducedMotion ?? "reduce",
    colorScheme: "dark"
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    const parsed = new URL(url);
    const allowed = parsed.origin === allowedOrigin || ["data:", "blob:"].includes(parsed.protocol);
    networkEntries.push({
      url,
      method: request.method(),
      resourceType: request.resourceType(),
      allowed
    });
    if (allowed) {
      await route.continue();
    } else {
      await route.abort("blockedbyclient");
    }
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    consoleEntries.push({
      kind: "console",
      level: message.type(),
      text: message.text(),
      location: message.location()
    });
  });
  page.on("pageerror", (error) => {
    consoleEntries.push({
      kind: "pageerror",
      level: "error",
      text: error.message,
      stack: error.stack ?? null
    });
  });
  return { context, page };
}

async function inspectAccessibility(page, gameDir) {
  const focusVisible = await page.evaluate(() => {
    const target = document.querySelector('[data-p99-action="start"]');
    if (!target) return false;
    target.focus();
    const style = getComputedStyle(target);
    return (
      (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0)
      || style.boxShadow !== "none"
    );
  });
  const cssFiles = [];
  async function collect(dir) {
    const { readdir } = await import("node:fs/promises");
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await collect(target);
      else if (entry.isFile() && entry.name.endsWith(".css")) cssFiles.push(target);
    }
  }
  await collect(gameDir);
  let css = "";
  for (const file of cssFiles) css += await readFile(file, "utf8");
  return {
    focusVisible,
    reducedMotionRule: /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(css)
  };
}

async function loadParticipantTest(filePath, label) {
  const source = await readFile(filePath, "utf8");
  const sdkImport = /^\s*import\s*\{\s*defineProtocolTest\s*\}\s*from\s*["'][^"']*benchmarks\/protocol-99\/test-sdk\/index\.mjs["'];?\s*$/m;
  if (!sdkImport.test(source)) {
    throw new Error(`${label} does not use the sole allowed Protocol 99 SDK import`);
  }
  const withoutImport = source.replace(sdkImport, "");
  if (/\bimport\b/.test(withoutImport)
      || (withoutImport.match(/\bexport\s+default\b/g) ?? []).length !== 1
      || /\bexport\s+(?!default\b)/.test(withoutImport)) {
    throw new Error(`${label} contains imports or exports outside the restricted test format`);
  }
  const executable = withoutImport.replace(/\bexport\s+default\b/, "__test =");
  const sandbox = {
    __test: null,
    __defineProtocolTest: defineProtocolTest
  };
  const context = createContext(sandbox, {
    name: `protocol99:${label}`,
    codeGeneration: {
      strings: false,
      wasm: false
    }
  });
  const script = new Script(
    `"use strict";\nconst defineProtocolTest = __defineProtocolTest;\n${executable}`,
    { filename: filePath }
  );
  script.runInContext(context, { timeout: 1_000 });
  const test = sandbox.__test;
  if (!test || test.contract !== "protocol-99-test/1.0" || typeof test.run !== "function") {
    throw new Error(`${label} does not default-export defineProtocolTest(...)`);
  }
  return test;
}

async function runParticipant(test, harness, label) {
  const timeout = new Promise((_, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} exceeded the 30 second test budget`)),
      30_000
    );
    timer.unref?.();
  });
  await Promise.race([test.run(harness), timeout]);
}

function validateState(state) {
  const errors = [];
  for (const [key, validator] of Object.entries(REQUIRED_STATE)) {
    if (!validator(state?.[key])) {
      errors.push(`window.__P99__.getState() has invalid ${key}: ${JSON.stringify(state?.[key])}`);
    }
  }
  if (state?.integrity > state?.maxIntegrity) {
    errors.push("integrity exceeds maxIntegrity");
  }
  return errors;
}

function deterministicState(state) {
  const clone = JSON.parse(JSON.stringify(state));
  clone.elapsedMs = 0;
  return clone;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasTwoDistinctHazards(hazards) {
  if (!Array.isArray(hazards) || hazards.length < 2) {
    return false;
  }
  const behaviors = new Set(
    hazards.map((hazard) => String(hazard?.behavior ?? hazard?.kind ?? "").trim()).filter(Boolean)
  );
  return behaviors.size >= 2;
}

function worldSignature(state) {
  return String(
    state.diagnostics?.worldSignature
    ?? state.worldSignature
    ?? ""
  ).trim();
}

async function hashMatches(filePath, expected) {
  const { hashFile } = await import("./lib/common.mjs");
  return await hashFile(filePath) === expected;
}

function computeScore(rubric, checks) {
  const groups = rubric.groups.map((group) => {
    const items = group.checks.map((check) => ({
      id: check.id,
      label: check.label,
      passed: checks[check.id] === true,
      earned: checks[check.id] === true ? check.weight : 0,
      maximum: check.weight
    }));
    return {
      id: group.id,
      title: group.title,
      earned: items.reduce((sum, item) => sum + item.earned, 0),
      maximum: group.maximumScore,
      checks: items
    };
  });
  return {
    name: "Automated Compliance Score",
    earned: groups.reduce((sum, group) => sum + group.earned, 0),
    maximum: 100,
    groups
  };
}

async function writeReport(options) {
  const {
    status,
    checks,
    failures,
    protocol,
    entry,
    run,
    evidenceDir,
    browserVersion,
    staticFacts,
    consoleEntries,
    networkEntries
  } = options;
  await mkdir(evidenceDir, { recursive: true });
  await writeJson(path.join(evidenceDir, "file-inventory.json"), staticFacts.inventory);
  await writeJson(path.join(evidenceDir, "console.json"), consoleEntries);
  await writeJson(path.join(evidenceDir, "network.json"), networkEntries);
  const screenshotHashes = {};
  for (const name of ["title.png", "gameplay.png", "relay-1.png", "victory.png"]) {
    const screenshotPath = path.join(evidenceDir, "screenshots", name);
    if (await pathExists(screenshotPath)) {
      screenshotHashes[name] = await hashFile(screenshotPath);
    }
  }
  const score = computeScore(protocol.rubric, checks);
  const report = {
    "$schema": "../../../../../../schemas/verification-report.schema.json",
    reportVersion: "1.0",
    challengeId: run.challengeId,
    challengeVersion: run.challengeVersion,
    canonicalPromptHash: run.canonicalPromptHash,
    entryId: entry.entryId,
    runId: run.runId,
    runType: run.runType,
    status,
    verifiedAt: new Date().toISOString(),
    seed: 99,
    sourceHash: staticFacts.sourceHash,
    sourceBytes: staticFacts.sourceBytes,
    sourceFileCount: staticFacts.sourceFileCount,
    browser: {
      name: "Chromium",
      version: browserVersion
    },
    viewports: {
      desktop: protocol.challenge.runtime.desktopViewport,
      mobile: protocol.challenge.runtime.mobileBaselineViewport
    },
    checks,
    score,
    failures: [...new Set(failures)],
    evidence: {
      screenshots: ["title.png", "gameplay.png", "relay-1.png", "victory.png"],
      screenshotHashes,
      sourceHash: staticFacts.sourceHash,
      console: "console.json",
      network: "network.json",
      fileInventory: "file-inventory.json"
    },
    disclaimer: protocol.rubric.disclaimer
  };
  await writeJson(path.join(evidenceDir, "report.json"), report);
  return report;
}

async function runFixture() {
  const repoRoot = resolveRepoRoot();
  const protocol = await loadProtocol(repoRoot);
  const fixtureDir = fromRepo(repoRoot, "tests", "fixtures", "protocol99");
  const evidenceDir = fromRepo(repoRoot, "test-results", "protocol99-fixture", "evidence");
  const staticFacts = await buildStaticFacts(fixtureDir, {
    runId: "fixture-run"
  });
  const report = await runBrowserVerification({
    repoRoot,
    entry: {
      entryId: "fixture-not-production",
      entryNumber: 0
    },
    run: {
      runId: "fixture-run",
      runType: "fixture",
      challengeId: protocol.challenge.challengeId,
      challengeVersion: protocol.challenge.challengeVersion,
      canonicalPromptHash: protocol.lock.canonicalPromptSha256
    },
    runDir: fixtureDir,
    evidenceDir,
    protocol,
    staticFacts
  });
  console.log(`Protocol 99 browser fixture: ${report.status}, ${report.score.earned}/100`);
  if (report.status !== "passed") {
    for (const failure of report.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

const isDirect = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  const cli = parseCli();
  if (cli.has("fixture")) {
    await runFixture();
  } else {
    console.error("Use npm run agent:verify for an active Entry, or pass --fixture.");
    process.exitCode = 1;
  }
}
