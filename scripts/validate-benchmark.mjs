#!/usr/bin/env node
import { resolveRepoRoot } from "./lib/common.mjs";
import { validateProtocol } from "./lib/validation.mjs";

const repoRoot = resolveRepoRoot();
const result = await validateProtocol(repoRoot);
if (result.errors.length) {
  console.error("Protocol 99 Challenge validation failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
console.log(
  `Protocol 99 ${result.challenge.challengeVersion} lock passed: ${result.lock.canonicalPromptSha256}`
);
