import { getModelFamily } from "./data/model-families.js";

let benchmarkPromise;

export function loadBenchmark() {
  benchmarkPromise ??= fetch(new URL("../data/benchmark.json", import.meta.url), {
    cache: "no-store"
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Benchmark data returned HTTP ${response.status}`);
    }
    return response.json();
  });
  return benchmarkPromise;
}

export function getEntryFamily(entry) {
  const family = getModelFamily(entry?.identity?.modelName);
  if (family.id !== "other") {
    return family;
  }
  const provider = String(entry?.identity?.provider ?? "").trim();
  const hasDeclaredProvider = provider && provider !== "unknown";
  return {
    ...family,
    id: hasDeclaredProvider ? `provider-${toFamilyId(provider)}` : family.id,
    name: hasDeclaredProvider ? provider : family.name,
    providerName: hasDeclaredProvider ? provider : family.providerName
  };
}

export function groupEntriesByFamily(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const family = getEntryFamily(entry);
    const current = groups.get(family.id) ?? { ...family, entries: [] };
    current.entries.push(entry);
    groups.set(family.id, current);
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "en"))
    .map((group) => ({
      ...group,
      entries: group.entries.sort((a, b) => a.entryNumber - b.entryNumber)
    }));
}

export function getCanonicalGameUrl(entry) {
  const publicPath = entry?.canonicalRun?.publicPath;
  return publicPath ? `${publicPath}game/index.html?seed=99` : null;
}

export function getRepositoryUrl(relativePath = "") {
  const clean = String(relativePath).replace(/^\.?\//, "");
  return `https://github.com/aidong27/99-ai-games/tree/main/${clean}`;
}

export function shortHash(hash, length = 12) {
  const value = String(hash ?? "");
  return value ? `${value.slice(0, length)}${value.length > length ? "…" : ""}` : "unknown";
}

export function formatIdentity(entry) {
  const model = entry?.identity?.modelName ?? "unknown model";
  const agent = entry?.identity?.agentName ?? "unknown Agent";
  return `${model} × ${agent}`;
}

export function formatDate(value) {
  if (!value) {
    return "Pending";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat(document.documentElement.lang || "en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function toFamilyId(value) {
  const encoded = encodeURIComponent(String(value).trim().toLowerCase())
    .toLowerCase()
    .replaceAll("%", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return encoded || "unclassified";
}
