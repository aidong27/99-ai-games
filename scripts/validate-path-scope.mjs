#!/usr/bin/env node
import { resolveRepoRoot } from "./lib/common.mjs";
import { validateCurrentPathScope } from "./lib/validation.mjs";

const result = await validateCurrentPathScope(resolveRepoRoot());
if (result.errors.length) {
  console.error("Agent Work Order path scope failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
console.log(result.active
  ? `Agent Work Order path scope passed: ${result.changedPaths.length} changed paths`
  : "Agent Work Order path scope skipped: no active .agent/current.json");
