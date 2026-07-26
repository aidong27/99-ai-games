import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptsRoot = fileURLToPath(new URL("../..", import.meta.url));

export function resolveRepoRoot(explicitRoot = process.env.P99_REPO_ROOT) {
  return path.resolve(explicitRoot || scriptsRoot);
}

export function toPosix(value) {
  return String(value).split(path.sep).join("/");
}

export function fromRepo(root, ...parts) {
  return path.join(root, ...parts);
}

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath) {
  return readFile(filePath, "utf8");
}

export async function readJson(filePath) {
  const text = await readText(filePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${filePath} is not valid JSON: ${error.message}`);
  }
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, stableJson(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashFile(filePath) {
  return sha256(await readFile(filePath));
}

export async function listFiles(root, options = {}) {
  const {
    includeHidden = false,
    relativeTo = root,
    skip = () => false
  } = options;
  const results = [];

  if (!(await pathExists(root))) {
    return results;
  }

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      if (!includeHidden && entry.name.startsWith(".")) {
        continue;
      }
      const absolute = path.join(current, entry.name);
      const relative = toPosix(path.relative(relativeTo, absolute));
      if (skip(relative, entry)) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        results.push({ absolute, relative });
      }
    }
  }

  await walk(root);
  return results;
}

export async function hashDirectory(root, options = {}) {
  const files = await listFiles(root, { ...options, relativeTo: root });
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.relative);
    hash.update("\0");
    hash.update(await readFile(file.absolute));
    hash.update("\0");
  }
  return {
    sha256: hash.digest("hex"),
    fileCount: files.length,
    totalBytes: await sumFileSizes(files),
    files
  };
}

export async function fileInventory(root, options = {}) {
  const files = await listFiles(root, { ...options, relativeTo: root });
  const inventory = [];
  for (const file of files) {
    const info = await stat(file.absolute);
    inventory.push({
      path: file.relative,
      bytes: info.size,
      sha256: await hashFile(file.absolute)
    });
  }
  return inventory;
}

export async function sumFileSizes(files) {
  let total = 0;
  for (const file of files) {
    total += (await stat(file.absolute)).size;
  }
  return total;
}

export function slugify(value, fallback = "unknown") {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || fallback;
}

export function isoCompact(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.inherit ? "inherit" : "pipe"
  });
  if (result.status !== 0 && !options.allowFailure) {
    const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }
  return result;
}

export function git(root, args, options = {}) {
  return runCommand("git", args, { cwd: root, ...options });
}

export function gitOutput(root, args, fallback = "unknown") {
  const result = git(root, args, { allowFailure: true });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : fallback;
}

export function isSubpath(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSubpath(parent, candidate, label = "path") {
  if (!isSubpath(parent, candidate)) {
    throw new Error(`${label} escapes its allowed root: ${candidate}`);
  }
}

export function parseCli(argv = process.argv.slice(2)) {
  const flags = new Set();
  const values = new Map();
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const [rawName, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    if (inlineValue !== undefined) {
      values.set(rawName, inlineValue);
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      values.set(rawName, argv[index + 1]);
      index += 1;
    } else {
      flags.add(rawName);
    }
  }
  return {
    flags,
    values,
    positional,
    has: (name) => flags.has(name) || values.has(name),
    get: (name, fallback) => values.get(name) ?? fallback
  };
}

export function formatEntryNumber(value) {
  return String(value).padStart(3, "0");
}

export function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([key, child]) => [key, sortObject(child)])
  );
}
