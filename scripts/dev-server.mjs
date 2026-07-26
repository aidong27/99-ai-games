#!/usr/bin/env node
import { parseCli, resolveRepoRoot } from "./lib/common.mjs";
import { startStaticServer } from "./lib/static-server.mjs";

const cli = parseCli();
if (cli.has("help")) {
  console.log("Usage: npm run dev -- [--port=4173] [--host=127.0.0.1]");
  process.exit(0);
}
const repoRoot = resolveRepoRoot(cli.get("repo"));
const server = await startStaticServer({
  root: repoRoot,
  port: Number(cli.get("port", process.env.PORT ?? 4173)),
  host: cli.get("host", "127.0.0.1")
});
console.log(`99 AI Games static server: ${server.origin}/`);
console.log("Press Ctrl+C to stop.");
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
