/*
 * The one repository quality gate.
 *
 * Local verification, Agent Finalize, CI, and Pages all execute this file.
 * Keep focused validators independently runnable, but never create a second
 * release gate with different requirements.
 */
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const steps = [];

async function collectModules(relativeDirectory) {
  const directory = path.join(repoRoot, relativeDirectory);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const modules = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      modules.push(...await collectModules(relative));
    } else if (entry.isFile() && /\.(?:mjs|js)$/.test(entry.name)) {
      modules.push(relative);
    }
  }
  return modules;
}

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      FORCE_COLOR: "0"
    }
  });
  const ok = result.status === 0;
  steps.push({ label, ok });
  process.stdout.write(`\n[${ok ? "PASS" : "FAIL"}] ${label}\n`);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) {
    process.stdout.write(`${output.split("\n").map((line) => `    ${line}`).join("\n")}\n`);
  }
  return ok;
}

const moduleRoots = ["src", "scripts", "games", "benchmarks", "tests", "entries"];
const modules = [
  "service-worker.js",
  ...(await Promise.all(moduleRoots.map((root) => collectModules(root)))).flat()
].sort();

process.stdout.write(`Syntax-checking ${modules.length} JavaScript modules...\n`);
let syntaxPassed = true;
for (const modulePath of modules) {
  const result = spawnSync(process.execPath, ["--check", modulePath], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    syntaxPassed = false;
    process.stdout.write(`[FAIL] node --check ${modulePath}\n${result.stderr ?? ""}\n`);
  }
}
steps.push({
  label: `node --check (${modules.length} modules)`,
  ok: syntaxPassed
});
process.stdout.write(
  `[${syntaxPassed ? "PASS" : "FAIL"}] node --check (${modules.length} modules)\n`
);

const validators = [
  ["validate-benchmark", "scripts/validate-benchmark.mjs"],
  ["validate-entries", "scripts/validate-entries.mjs"],
  ["validate-path-scope", "scripts/validate-path-scope.mjs"],
  ["validate-entry-security", "scripts/validate-entry-security.mjs"],
  ["validate-halls (Legacy)", "scripts/validate-halls.mjs"],
  ["validate-games (Legacy)", "scripts/validate-games.mjs"],
  ["validate-provenance (Legacy)", "scripts/validate-provenance.mjs"],
  ["validate-launcher", "scripts/validate-launcher.mjs"],
  ["validate-public-surfaces", "scripts/validate-public-surfaces.mjs"]
];
for (const [label, script] of validators) {
  run(label, process.execPath, [script]);
}

const freshnessChecks = [
  ["generate-benchmark --check", "scripts/generate-benchmark.mjs", "--check"],
  ["generate-promo-pages --check", "scripts/generate-promo-pages.mjs", "--check"],
  ["render-social-cards --check", "scripts/render-social-cards.mjs", "--check"],
  ["generate-discovery --check", "scripts/generate-discovery.mjs", "--check"],
  ["generate-index --check", "scripts/generate-index.mjs", "--check"]
];
for (const [label, script, flag] of freshnessChecks) {
  run(label, process.execPath, [script, flag]);
}

run("test-agent-flow (15 cases)", process.execPath, ["scripts/test-agent-flow.mjs"]);
run(
  "Protocol 99 real Chromium fixture",
  process.execPath,
  ["scripts/run-browser-verification.mjs", "--fixture"]
);

const scriptEntries = await readdir(path.join(repoRoot, "scripts"), {
  withFileTypes: true
});
const legacyProofs = scriptEntries
  .filter((entry) => entry.isFile() && /^verify-.+\.mjs$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();
for (const script of legacyProofs) {
  run(script.replace(/\.mjs$/, ""), process.execPath, [`scripts/${script}`]);
}

run("prepare-pages public artifact", process.execPath, ["scripts/prepare-pages.mjs"]);
run("git diff --check HEAD", "git", ["diff", "--check", "HEAD"]);

const failed = steps.filter((step) => !step.ok);
process.stdout.write("\n──────── 99 AI Games quality gate ────────\n");
for (const step of steps) {
  process.stdout.write(`  ${step.ok ? "✓" : "✗"} ${step.label}\n`);
}

if (failed.length) {
  process.stdout.write(`\n${failed.length} check(s) failed.\n`);
  process.exit(1);
}
process.stdout.write("\nAll checks passed.\n");
