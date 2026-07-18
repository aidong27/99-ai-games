/*
 * One command that runs the entire archive quality gate.
 *
 * This is the single source of truth for "is the repository sound": syntax
 * checks across every script and game module, the structural validators, the
 * provenance/honesty gate, the generated-index freshness check, and the
 * Gravity Atlas completability proof. CI runs exactly this, so local `node
 * scripts/check.mjs` and the pipeline cannot drift apart.
 */
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const steps = [];

async function collectJsFiles(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await readdir(path.join(repoRoot, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue;
      }
      out.push(...await collectJsFiles(rel));
    } else if (/\.(mjs|js)$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

function run(label, args) {
  const result = spawnSync("node", args, { cwd: repoRoot, encoding: "utf8" });
  const ok = result.status === 0;
  steps.push({ label, ok });
  const mark = ok ? "PASS" : "FAIL";
  process.stdout.write(`\n[${mark}] ${label}\n`);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) {
    process.stdout.write(`${output.split("\n").map((line) => `    ${line}`).join("\n")}\n`);
  }
  return ok;
}

const jsFiles = [
  "service-worker.js",
  ...await collectJsFiles("src"),
  ...await collectJsFiles("scripts"),
  ...await collectJsFiles("games")
].filter((file) => file.includes("/src/") || file.startsWith("src/") || file.startsWith("scripts/"));

process.stdout.write(`Syntax-checking ${jsFiles.length} JavaScript modules...\n`);
let syntaxOk = true;
for (const file of jsFiles) {
  const result = spawnSync("node", ["--check", file], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    syntaxOk = false;
    process.stdout.write(`[FAIL] node --check ${file}\n${result.stderr ?? ""}\n`);
  }
}
steps.push({ label: `node --check (${jsFiles.length} modules)`, ok: syntaxOk });
process.stdout.write(`[${syntaxOk ? "PASS" : "FAIL"}] node --check (${jsFiles.length} modules)\n`);

run("validate-halls", ["scripts/validate-halls.mjs"]);
run("validate-games", ["scripts/validate-games.mjs"]);
run("validate-launcher", ["scripts/validate-launcher.mjs"]);
run("validate-provenance", ["scripts/validate-provenance.mjs"]);
run("validate-public-surfaces", ["scripts/validate-public-surfaces.mjs"]);
run("generate-promo-pages --check", ["scripts/generate-promo-pages.mjs", "--check"]);
run("render-social-cards --check", ["scripts/render-social-cards.mjs", "--check"]);
run("generate-discovery --check", ["scripts/generate-discovery.mjs", "--check"]);
run("generate-index --check", ["scripts/generate-index.mjs", "--check"]);
run("prepare-pages", ["scripts/prepare-pages.mjs"]);
run("verify-gravity-atlas", ["scripts/verify-gravity-atlas.mjs"]);
run("verify-afterlight-dispatch", ["scripts/verify-afterlight-dispatch.mjs"]);
run("verify-context-window", ["scripts/verify-context-window.mjs"]);

const failed = steps.filter((step) => !step.ok);
process.stdout.write("\n──────── Archive quality gate ────────\n");
for (const step of steps) {
  process.stdout.write(`  ${step.ok ? "✓" : "✗"} ${step.label}\n`);
}

if (failed.length) {
  process.stdout.write(`\n${failed.length} check(s) failed.\n`);
  process.exit(1);
}
process.stdout.write("\nAll checks passed.\n");
