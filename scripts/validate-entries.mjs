#!/usr/bin/env node
import { resolveRepoRoot } from "./lib/common.mjs";
import { validateEntries } from "./lib/validation.mjs";

const result = await validateEntries(resolveRepoRoot());
if (result.errors.length) {
  console.error("Protocol 99 Entry validation failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
console.log(`Protocol 99 Entry validation passed: ${result.records.length} allocated, 99 maximum`);
