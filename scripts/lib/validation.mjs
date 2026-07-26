import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  fileInventory,
  fromRepo,
  git,
  hashDirectory,
  hashFile,
  isSubpath,
  listFiles,
  pathExists,
  readJson,
  resolveRepoRoot,
  toPosix
} from "./common.mjs";
import {
  FINAL_STATUSES,
  RUN_TYPES,
  computeRunIntegrity,
  loadCurrentTask,
  scanEntries,
  verifyProtocolLock
} from "./protocol.mjs";

const REQUIRED_STATE_KEYS = [
  "phase",
  "seed",
  "integrity",
  "maxIntegrity",
  "carryingCore",
  "coresCollectedTotal",
  "relaysActivated",
  "worldStage",
  "abilityStatus",
  "exitUnlocked",
  "elapsedMs"
];

const ENTRY_STATUSES = new Set([
  "building",
  "pending-browser-verification",
  "verified",
  "finalized",
  "withdrawn"
]);

const RUN_STATUSES = new Set([
  "building",
  "pending-browser-verification",
  "verified",
  "finalized",
  "failed",
  "withdrawn"
]);

const RUNTIME_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".js",
  ".mjs",
  ".css",
  ".svg",
  ".json"
]);

const SECURITY_RULES = [
  {
    id: "remote-url",
    pattern: /\b(?:https?:)?\/\/[a-z0-9]/i,
    message: "remote URL"
  },
  {
    id: "network-fetch",
    pattern: /\bfetch\s*\(/,
    message: "fetch()"
  },
  {
    id: "xhr",
    pattern: /\bXMLHttpRequest\b/,
    message: "XMLHttpRequest"
  },
  {
    id: "websocket",
    pattern: /\bWebSocket\b/,
    message: "WebSocket"
  },
  {
    id: "eventsource",
    pattern: /\bEventSource\b/,
    message: "EventSource"
  },
  {
    id: "eval",
    pattern: /\beval\s*\(/,
    message: "eval()"
  },
  {
    id: "new-function",
    pattern: /\bnew\s+Function\s*\(/,
    message: "new Function()"
  },
  {
    id: "service-worker",
    pattern: /\bserviceWorker\s*\.\s*register\s*\(/,
    message: "service worker registration"
  },
  {
    id: "remote-import",
    pattern: /\bimport\s*\(\s*["'`](?:https?:)?\/\//i,
    message: "remote dynamic import"
  },
  {
    id: "iframe",
    pattern: /<iframe\b/i,
    message: "iframe"
  },
  {
    id: "external-form",
    pattern: /<form\b[^>]*\baction\s*=\s*["'](?:https?:)?\/\//i,
    message: "external form action"
  },
  {
    id: "popup",
    pattern: /\bwindow\s*\.\s*open\s*\(/,
    message: "window.open()"
  },
  {
    id: "top-navigation",
    pattern: /\b(?:window\s*\.\s*)?(?:top|parent)\s*\.\s*location\b/,
    message: "top-level navigation"
  },
  {
    id: "cross-frame-access",
    pattern: /\b(?:(?:window|globalThis)\s*\.\s*(?:parent|top|frameElement)|(?:parent|top)\s*\.\s*(?:document|postMessage|frames|open)|document\s*\.\s*domain)\b/,
    message: "cross-frame access"
  },
  {
    id: "permission-api",
    pattern: /\bnavigator\s*\.\s*(?:geolocation|mediaDevices|bluetooth|usb|serial|hid)\b/,
    message: "permission-requiring browser API"
  },
  {
    id: "analytics",
    pattern: /\b(?:gtag|googleAnalytics|mixpanel|segment|amplitude)\s*\(/i,
    message: "external analytics"
  },
  {
    id: "mining",
    pattern: /\b(?:coinhive|cryptonight|stratum\+tcp|webminer)\b/i,
    message: "cryptocurrency mining indicator"
  }
];

const TEST_BYPASS_RULES = [
  [/\bfrom\s+["']@playwright\/test["']/, "imports Playwright directly"],
  [/\bfrom\s+["']playwright["']/, "imports Playwright directly"],
  [/\bpage\s*\./, "accesses a Playwright page directly"],
  [/\b(?:window\s*\.)?__P99__\b/, "reads the state contract outside the SDK"],
  [/\bevaluate\s*\(/, "uses arbitrary browser evaluation"],
  [/\baddInitScript\s*\(/, "injects a browser script"],
  [/\bnewCDPSession\s*\(/, "uses Chrome DevTools Protocol"],
  [/\bteleport\b/i, "mentions a teleport bypass"],
  [/\bautoWin\b/i, "mentions an auto-win bypass"],
  [/\binvulnerab/i, "mentions invulnerability"],
  [/\bdisableHazard/i, "mentions hazard disabling"],
  [/\b(?:process|Buffer|require|module|global|globalThis)\b/, "accesses a Node/global capability"],
  [/\b(?:Deno|Bun)\b/, "accesses an alternate runtime capability"],
  [/\bimport\s*\(/, "uses dynamic import"],
  [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/, "uses a network capability"]
];

export async function validateProtocol(repoRoot = resolveRepoRoot()) {
  const result = await verifyProtocolLock(repoRoot);
  const errors = [...result.errors];
  const prompt = await readFile(result.promptPath, "utf8");
  const testContract = await readFile(result.testContractPath, "utf8");
  const requiredPromptText = [
    "# Protocol 99 v1 — Canonical Build Prompt",
    "exactly three portable data cores",
    "window.__P99__",
    'contractVersion: "1.0"',
    "protocol99:statechange",
    'data-p99-action="start"',
    "Complete the implementation"
  ];
  for (const needle of requiredPromptText) {
    if (!prompt.includes(needle)) {
      errors.push(`PROMPT.md is missing canonical text: ${needle}`);
    }
  }
  for (const key of REQUIRED_STATE_KEYS) {
    if (!prompt.includes(`${key}:`)) {
      errors.push(`PROMPT.md state contract is missing ${key}`);
    }
  }
  if (!testContract.includes("Allowed participant-test API")
      || !testContract.includes("Prohibited test behavior")) {
    errors.push("TEST-CONTRACT.md is missing the participant test boundary");
  }
  return { ...result, errors };
}

export async function validateEntries(repoRoot = resolveRepoRoot()) {
  const protocol = await verifyProtocolLock(repoRoot);
  const records = await scanEntries(repoRoot);
  const errors = [];
  const entryIds = new Set();
  const numbers = new Set();
  const runIds = new Set();

  for (const record of records) {
    if (record.loadError) {
      errors.push(`${record.directoryName}: ${record.loadError}`);
      continue;
    }
    const { entry } = record;
    const expectedPrefix = `${String(entry.entryNumber).padStart(3, "0")}-`;
    if (!record.directoryName.startsWith(expectedPrefix)) {
      errors.push(`${entry.entryId}: directory number does not match entryNumber`);
    }
    if (!/^p99-v[0-9]+-[0-9]{3}-[a-z0-9-]+$/.test(entry.entryId ?? "")) {
      errors.push(`${record.directoryName}: invalid entryId ${entry.entryId ?? "missing"}`);
    }
    if (!Number.isInteger(entry.entryNumber) || entry.entryNumber < 1 || entry.entryNumber > 99) {
      errors.push(`${entry.entryId}: entryNumber must be from 1 through 99`);
    }
    if (entryIds.has(entry.entryId)) {
      errors.push(`duplicate Entry ID: ${entry.entryId}`);
    }
    if (numbers.has(entry.entryNumber)) {
      errors.push(`duplicate Entry number: ${entry.entryNumber}`);
    }
    entryIds.add(entry.entryId);
    numbers.add(entry.entryNumber);
    if (entry.challengeId !== protocol.challenge.challengeId
        || entry.challengeVersion !== protocol.challenge.challengeVersion) {
      errors.push(`${entry.entryId}: Challenge identity does not match current protocol`);
    }
    if (entry.canonicalPromptHash !== protocol.lock.canonicalPromptSha256) {
      errors.push(`${entry.entryId}: canonicalPromptHash does not match LOCK.json`);
    }
    if (!ENTRY_STATUSES.has(entry.status)) {
      errors.push(`${entry.entryId}: unsupported Entry status ${entry.status}`);
    }
    if (!Array.isArray(entry.runs) || entry.runs.length === 0) {
      errors.push(`${entry.entryId}: runs must contain at least one Run`);
    } else if (new Set(entry.runs).size !== entry.runs.length) {
      errors.push(`${entry.entryId}: runs contains duplicate references`);
    }
    if (entry.status === "finalized" && !entry.canonicalRunId) {
      errors.push(`${entry.entryId}: finalized Entry must identify canonicalRunId`);
    }
    if (entry.canonicalRunId && !["finalized", "withdrawn"].includes(entry.status)) {
      errors.push(`${entry.entryId}: an Entry with a canonical Raw Run cannot regress from finalized`);
    }

    for (const runRecord of record.runs) {
      if (runRecord.loadError) {
        errors.push(`${entry.entryId}/${runRecord.runRef}: ${runRecord.loadError}`);
        continue;
      }
      const { run } = runRecord;
      if (runIds.has(run.runId)) {
        errors.push(`duplicate Run ID: ${run.runId}`);
      }
      runIds.add(run.runId);
      if (runRecord.runRef !== `runs/${run.runId}`) {
        errors.push(`${run.runId}: directory reference does not match runId`);
      }
      if (run.entryId !== entry.entryId) {
        errors.push(`${run.runId}: entryId does not match parent Entry`);
      }
      if (!RUN_TYPES.has(run.runType)) {
        errors.push(`${run.runId}: unsupported runType ${run.runType}`);
      }
      if (!RUN_STATUSES.has(run.status)) {
        errors.push(`${run.runId}: unsupported Run status ${run.status}`);
      }
      if (run.challengeId !== entry.challengeId
          || run.challengeVersion !== entry.challengeVersion
          || run.canonicalPromptHash !== entry.canonicalPromptHash) {
        errors.push(`${run.runId}: Challenge or Prompt identity differs from parent Entry`);
      }
      if (run.promptSnapshot !== "prompt-snapshot.md") {
        errors.push(`${run.runId}: promptSnapshot must be prompt-snapshot.md`);
      }
      if (run.verificationReport !== "evidence/report.json") {
        errors.push(`${run.runId}: verificationReport must be evidence/report.json`);
      }
      for (const [key, expected] of Object.entries({
        game: "game/",
        tests: "tests/",
        evidence: "evidence/"
      })) {
        if (run.paths?.[key] !== expected) {
          errors.push(`${run.runId}: paths.${key} must be ${expected}`);
        }
      }
      const snapshotPath = path.join(runRecord.runDir, run.promptSnapshot ?? "");
      if (!(await pathExists(snapshotPath))) {
        errors.push(`${run.runId}: prompt snapshot is missing`);
      } else if (await hashFile(snapshotPath) !== run.canonicalPromptHash) {
        errors.push(`${run.runId}: prompt snapshot does not match canonicalPromptHash`);
      }
      errors.push(...await validateRunFiles(runRecord.runDir, run));
      if (FINAL_STATUSES.has(run.status)) {
        errors.push(...await validateFinalizedRun(runRecord.runDir, run));
      }
      if (run.runType === "raw" && run.parentRunId) {
        errors.push(`${run.runId}: Raw Run cannot have a parentRunId`);
      }
      if (run.runType !== "raw" && (!run.parentRunId || !run.parentSourceHash)) {
        errors.push(`${run.runId}: non-Raw Run must preserve parentRunId and parentSourceHash`);
      } else if (run.runType !== "raw") {
        const parent = record.runs.find((candidate) => candidate.run?.runId === run.parentRunId);
        if (!parent?.run || parent.run.status !== "finalized") {
          errors.push(`${run.runId}: parentRunId must reference a Finalized Run in the same Entry`);
        } else if (parent.run.sourceHash !== run.parentSourceHash) {
          errors.push(`${run.runId}: parentSourceHash differs from its parent Run`);
        }
      }
    }

    if (entry.canonicalRunId) {
      const canonical = record.runs.find((candidate) => (
        candidate.run?.runId === entry.canonicalRunId
      ));
      if (
        !canonical?.run
        || canonical.run.runType !== "raw"
        || canonical.run.status !== "finalized"
      ) {
        errors.push(`${entry.entryId}: canonicalRunId must reference a Finalized Raw Run`);
      }
    }
  }
  return { records, errors };
}

async function validateRunFiles(runDir, run) {
  const errors = [];
  for (const required of [
    "run.json",
    "prompt-snapshot.md",
    "game/index.html",
    "game/README.md",
    "game/KNOWN-ISSUES.md",
    "tests/playthrough.spec.mjs",
    "tests/defeat.spec.mjs"
  ]) {
    if (!(await pathExists(path.join(runDir, required)))) {
      errors.push(`${run.runId}: missing ${required}`);
    }
  }
  if (await pathExists(path.join(runDir, "tests"))) {
    errors.push(...await validateParticipantTests(path.join(runDir, "tests"), run.runId));
  }
  if (await pathExists(path.join(runDir, "game"))) {
    const security = await scanRuntimeSecurity(path.join(runDir, "game"));
    errors.push(...security.findings.map(
      (finding) => `${run.runId}: ${finding.path}:${finding.line} uses ${finding.message}`
    ));
  }
  return errors;
}

async function validateFinalizedRun(runDir, run) {
  const errors = [];
  const integrity = await computeRunIntegrity(runDir);
  if (!/^[a-f0-9]{64}$/.test(run.sourceHash ?? "")) {
    errors.push(`${run.runId}: Finalized Run has no valid sourceHash`);
  } else if (integrity.sourceHash !== run.sourceHash) {
    errors.push(`${run.runId}: Finalized source changed after lock`);
  }
  if (integrity.promptHash !== run.canonicalPromptHash) {
    errors.push(`${run.runId}: Finalized prompt snapshot hash changed`);
  }
  if (!/^[a-f0-9]{64}$/.test(run.evidenceHash ?? "")) {
    errors.push(`${run.runId}: Finalized Run has no valid evidenceHash`);
  } else if (integrity.evidenceHash !== run.evidenceHash) {
    errors.push(`${run.runId}: Finalized evidence changed after lock`);
  }
  const reportPath = path.join(runDir, run.verificationReport ?? "evidence/report.json");
  if (!(await pathExists(reportPath))) {
    errors.push(`${run.runId}: Finalized verification report is missing`);
    return errors;
  }
  const report = await readJson(reportPath);
  if (report.$schema !== "../../../../../schemas/verification-report.schema.json") {
    errors.push(`${run.runId}: verification report has an invalid schema reference`);
  }
  if (report.status !== "passed") {
    errors.push(`${run.runId}: Finalized verification report did not pass`);
  }
  if (report.sourceHash !== run.sourceHash
      || report.canonicalPromptHash !== run.canonicalPromptHash) {
    errors.push(`${run.runId}: report source/prompt identity differs from Run lock`);
  }
  if (report.evidenceHash !== run.evidenceHash) {
    errors.push(`${run.runId}: report evidenceHash differs from Run lock`);
  }
  for (const screenshot of ["title.png", "gameplay.png", "relay-1.png", "victory.png"]) {
    const screenshotPath = path.join(runDir, "evidence", "screenshots", screenshot);
    if (!(await pathExists(screenshotPath))) {
      errors.push(`${run.runId}: required real screenshot is missing: ${screenshot}`);
      continue;
    }
    const bytes = await readFile(screenshotPath);
    if (!isPng(bytes) || readPngWidth(bytes) < 390 || readPngHeight(bytes) < 300) {
      errors.push(`${run.runId}: ${screenshot} is not a plausible real browser PNG`);
    }
    const expectedHash = report.evidence?.screenshotHashes?.[screenshot];
    const actualHash = await hashFile(screenshotPath);
    if (!expectedHash || expectedHash !== actualHash) {
      errors.push(`${run.runId}: ${screenshot} differs from its verification report hash`);
    }
  }
  if (report.evidence?.sourceHash !== run.sourceHash) {
    errors.push(`${run.runId}: screenshot evidence is not bound to the Finalized sourceHash`);
  }
  return errors;
}

function isPng(bytes) {
  return bytes.length >= 24
    && bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
}

function readPngWidth(bytes) {
  return isPng(bytes) ? bytes.readUInt32BE(16) : 0;
}

function readPngHeight(bytes) {
  return isPng(bytes) ? bytes.readUInt32BE(20) : 0;
}

export async function validateParticipantTests(testsDir, label = "participant tests") {
  const errors = [];
  for (const fileName of ["playthrough.spec.mjs", "defeat.spec.mjs"]) {
    const filePath = path.join(testsDir, fileName);
    if (!(await pathExists(filePath))) {
      errors.push(`${label}: missing ${fileName}`);
      continue;
    }
    const source = await readFile(filePath, "utf8");
    const importLines = source.split(/\r?\n/).filter((line) => /^\s*import\b/.test(line));
    const sdkImport = /^\s*import\s*\{\s*defineProtocolTest\s*\}\s*from\s*["'][^"']*benchmarks\/protocol-99\/test-sdk\/index\.mjs["'];?\s*$/;
    if (importLines.length !== 1 || !sdkImport.test(importLines[0])) {
      errors.push(`${label}/${fileName}: the central Protocol 99 SDK must be its only import`);
    }
    if (!source.includes("defineProtocolTest")) {
      errors.push(`${label}/${fileName}: must use defineProtocolTest`);
    }
    if ((source.match(/\bexport\s+default\b/g) ?? []).length !== 1
        || /\bexport\s+(?!default\b)/.test(source)) {
      errors.push(`${label}/${fileName}: must have exactly one default test export`);
    }
    for (const [pattern, message] of TEST_BYPASS_RULES) {
      if (pattern.test(source)) {
        errors.push(`${label}/${fileName}: ${message}`);
      }
    }
  }
  return errors;
}

export async function scanRuntimeSecurity(gameDir) {
  const findings = [];
  await collectUnsupportedFilesystemEntries(gameDir, gameDir, findings);
  const files = await listFiles(gameDir, {
    includeHidden: true,
    relativeTo: gameDir
  });
  for (const file of files) {
    if (!RUNTIME_EXTENSIONS.has(path.extname(file.relative).toLowerCase())) {
      continue;
    }
    const source = await readFile(file.absolute, "utf8");
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const rule of SECURITY_RULES) {
        if (rule.pattern.test(line)) {
          findings.push({
            id: rule.id,
            message: rule.message,
            path: file.relative,
            line: index + 1,
            excerpt: line.trim().slice(0, 180)
          });
        }
      }
    }
  }
  const size = await hashDirectory(gameDir, { includeHidden: true });
  return {
    findings,
    totalBytes: size.totalBytes,
    fileCount: size.fileCount
  };
}

async function collectUnsupportedFilesystemEntries(root, current, findings) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = toPosix(path.relative(root, absolute));
    if (entry.isSymbolicLink()) {
      findings.push({
        id: "symbolic-link",
        message: "symbolic link",
        path: relative,
        line: 1,
        excerpt: "Symbolic links are not part of the stable source boundary"
      });
    } else if (entry.isDirectory()) {
      await collectUnsupportedFilesystemEntries(root, absolute, findings);
    } else if (!entry.isFile()) {
      findings.push({
        id: "special-file",
        message: "unsupported special file",
        path: relative,
        line: 1,
        excerpt: "Only regular files and directories are allowed"
      });
    }
  }
}

export async function validateCurrentPathScope(repoRoot = resolveRepoRoot()) {
  let current;
  try {
    current = await loadCurrentTask(repoRoot);
  } catch {
    return { active: false, errors: [], changedPaths: [] };
  }
  const errors = [];
  const result = git(repoRoot, [
    "diff",
    "--name-only",
    "--relative",
    current.currentTask.baselineGitCommit,
    "--"
  ], { allowFailure: true });
  if (result.status !== 0) {
    errors.push("could not calculate Git diff from the task baseline");
    return { active: true, errors, changedPaths: [] };
  }
  const changedPaths = result.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  const untrackedResult = git(repoRoot, [
    "ls-files",
    "--others",
    "--exclude-standard"
  ], { allowFailure: true });
  if (untrackedResult.status !== 0) {
    errors.push("could not calculate untracked files for the Work Order");
  }
  changedPaths.push(
    ...untrackedResult.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
  );
  const uniqueChangedPaths = [...new Set(changedPaths)].sort((a, b) => a.localeCompare(b, "en"));
  const allowed = [
    ...(current.currentTask.allowedWritePaths ?? []),
    ...(current.currentTask.generatedWritePaths ?? [])
  ];

  for (const changed of uniqueChangedPaths) {
    const permitted = allowed.some((rule) => {
      const normalizedRule = String(rule).replace(/\/$/, "");
      return changed === normalizedRule || changed.startsWith(`${normalizedRule}/`);
    });
    if (!permitted) {
      errors.push(`path outside current Work Order: ${changed}`);
    }
  }
  for (const record of await scanEntries(repoRoot)) {
    if (!record.entry || record.entry.entryId === current.entry.entryId) {
      continue;
    }
    const relative = toPosix(path.relative(repoRoot, record.entryDir));
    if (uniqueChangedPaths.some((changed) => changed === relative || changed.startsWith(`${relative}/`))) {
      errors.push(`another Entry was modified: ${record.entry.entryId}`);
    }
  }
  if (uniqueChangedPaths.some((changed) => changed.startsWith("games/"))) {
    errors.push("Legacy game source changed during an active benchmark Work Order");
  }
  if (uniqueChangedPaths.some((changed) => changed.startsWith("benchmarks/"))) {
    errors.push("Challenge files changed during an active benchmark Work Order");
  }
  return { active: true, errors: [...new Set(errors)], changedPaths: uniqueChangedPaths };
}

export async function buildStaticFacts(runDir, run) {
  const security = await scanRuntimeSecurity(path.join(runDir, "game"));
  const tests = await validateParticipantTests(path.join(runDir, "tests"), run.runId);
  const inventory = await fileInventory(runDir, {
    includeHidden: true,
    skip: (relative) => relative.startsWith("evidence/")
  });
  const source = await hashDirectory(runDir, {
    includeHidden: true,
    skip: (relative) => (
      relative === "run.json"
      || relative === "WORK-ORDER.md"
      || relative === "prompt-snapshot.md"
      || relative.startsWith("evidence/")
    )
  });
  return {
    security,
    testErrors: tests,
    inventory,
    sourceHash: source.sha256,
    sourceBytes: source.totalBytes,
    sourceFileCount: source.fileCount
  };
}
