import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outputRoot = path.join(repoRoot, ".site");
const directories = ["assets", "games", "halls", "promo", "src", "styles"];
const files = [
  "404.html",
  "compare.html",
  "favicon.ico",
  "index.html",
  "library.html",
  "log.html",
  "manifest.webmanifest",
  "observation.html",
  "play.html",
  "press.html",
  "robots.txt",
  "service-worker.js",
  "sitemap.xml"
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
for (const directory of directories) {
  await cp(path.join(repoRoot, directory), path.join(outputRoot, directory), { recursive: true });
}
for (const file of files) {
  await cp(path.join(repoRoot, file), path.join(outputRoot, file));
}
await writeFile(path.join(outputRoot, ".nojekyll"), "");

for (const forbidden of [".git", ".github", "docs", "scripts"]) {
  try {
    await access(path.join(outputRoot, forbidden));
    throw new Error(`Forbidden deployment path was copied: ${forbidden}`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

console.log(`Prepared GitHub Pages artifact with ${directories.length} public directories and ${files.length} root files`);
