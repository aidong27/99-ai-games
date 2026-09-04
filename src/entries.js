import {
  getEntryFamily,
  groupEntriesByFamily,
  loadBenchmark
} from "./benchmark-data.js";
import {
  createBenchmarkEmptyState,
  createBenchmarkEntryCard
} from "./ui/benchmark.js";
import { createElement } from "./ui/dom.js";
import { selectEntryRun } from "./data/entry-runs.js";

const refs = {
  agent: document.querySelector("#agent-filter"),
  family: document.querySelector("#family-filter"),
  filters: document.querySelector("#entry-filters"),
  groups: document.querySelector("#entry-groups"),
  headerStatus: document.querySelector("#entry-header-status"),
  run: document.querySelector("#run-filter"),
  search: document.querySelector("#entry-search"),
  slots: document.querySelector("#entry-slot-map"),
  sort: document.querySelector("#sort-filter"),
  status: document.querySelector("#status-filter"),
  summary: document.querySelector("#entry-summary")
};

let data;

refs.filters.addEventListener("input", renderIndex);
refs.filters.addEventListener("submit", (event) => event.preventDefault());
refs.filters.addEventListener("reset", () => requestAnimationFrame(renderIndex));
init();

async function init() {
  try {
    data = await loadBenchmark();
    renderSlots();
    populateFilters();
    renderIndex();
    refs.summary.textContent = `${data.stats.allocatedEntries} allocated · ${data.stats.benchmarkEntries} finalized Raw · ${data.stats.targetEntries} target`;
    refs.headerStatus.textContent = `${data.stats.benchmarkEntries} VERIFIED RAW`;
    refs.headerStatus.classList.toggle("live", data.stats.benchmarkEntries > 0);
  } catch (error) {
    refs.headerStatus.textContent = "INDEX UNAVAILABLE";
    refs.groups.replaceChildren(createBenchmarkEmptyState({
      title: "Entry index could not load",
      message: error.message,
      actionHref: "./entries/manifest.json",
      actionLabel: "Inspect manifest"
    }));
  }
}

function renderSlots() {
  const allocated = new Map(data.entries.map((entry) => [entry.entryNumber, entry]));
  refs.slots.replaceChildren(...Array.from({ length: 99 }, (_, index) => {
    const number = index + 1;
    const entry = allocated.get(number);
    const slot = createElement(entry ? "a" : "span", {
      className: `entry-slot ${entry ? "allocated" : ""}`,
      ...(entry ? {
        href: entry.detailUrl,
        title: `${entry.entryNumberLabel} · ${entry.identity.modelName} · ${entry.status}`
      } : {
        title: `${String(number).padStart(3, "0")} · Open slot`
      })
    }, String(number).padStart(3, "0"));
    return slot;
  }));
}

function populateFilters() {
  const familyMap = new Map();
  const agents = new Set();
  for (const entry of data.entries) {
    for (const identity of [entry.identity, ...entry.runs.map((run) => run.identity).filter(Boolean)]) {
      const family = getEntryFamily({ ...entry, identity });
      familyMap.set(family.id, family);
      agents.add(identity.agentName);
    }
  }
  for (const family of [...familyMap.values()].sort((a, b) => a.order - b.order)) {
    refs.family.append(createElement("option", { value: family.id }, family.name));
  }
  for (const agent of [...agents].sort((a, b) => a.localeCompare(b, "en"))) {
    refs.agent.append(createElement("option", { value: agent }, agent));
  }
}

function renderIndex() {
  if (!data) {
    return;
  }
  const query = refs.search.value.trim().toLowerCase();
  const entries = data.entries.map((entry) => selectEntryRun(entry, refs.run.value))
    .filter(Boolean).filter((entry) => {
    const family = getEntryFamily(entry);
    const haystack = [
      entry.title,
      entry.summary,
      entry.identity.modelName,
      entry.identity.provider,
      entry.identity.agentName,
      family.name,
      entry.entryNumberLabel
    ].join(" ").toLowerCase();
    const statusMatch = refs.status.value === "all"
      || (refs.status.value === "verified" && entry.selectedRunPublished)
      || (refs.status.value === "building" && !entry.selectedRunPublished);
    const runMatch = refs.run.value === "all"
      || entry.runs.some((run) => run.runType === refs.run.value);
    return (
      (!query || haystack.includes(query))
      && (refs.family.value === "all" || family.id === refs.family.value)
      && (refs.agent.value === "all" || entry.identity.agentName === refs.agent.value)
      && statusMatch
      && runMatch
    );
  });

  entries.sort((a, b) => {
    if (refs.sort.value === "newest") {
      return String(b.canonicalRun?.finishedAt ?? "").localeCompare(
        String(a.canonicalRun?.finishedAt ?? "")
      );
    }
    if (refs.sort.value === "score") {
      return (b.canonicalRun?.report?.score?.earned ?? -1)
        - (a.canonicalRun?.report?.score?.earned ?? -1);
    }
    return a.entryNumber - b.entryNumber;
  });

  if (!entries.length) {
    refs.groups.replaceChildren(createBenchmarkEmptyState({
      title: data.entries.length ? "No Entries match these filters" : "No formal Entries yet",
      message: data.entries.length
        ? "Adjust the family, Agent, Run, or verification filters."
        : "The first slot remains empty until a real AI coding system passes the Protocol 99 browser gate.",
      actionHref: "https://github.com/aidong27/99-ai-games/blob/main/docs/AGENT-AUTOPILOT.md",
      actionLabel: data.entries.length ? "Clear filters" : "Read the Autopilot protocol",
      ...(data.entries.length ? { onAction: () => refs.filters.reset() } : {})
    }));
    return;
  }

  refs.groups.replaceChildren(...groupEntriesByFamily(entries).map((family) => {
    const section = createElement("section", {
      ariaLabel: `${family.name} Entries`
    });
    const heading = createElement("div", { className: "entry-family-heading" });
    heading.append(
      createElement("h2", {}, family.name),
      createElement("span", {}, `${family.providerName} · ${family.entries.length} ${family.entries.length === 1 ? "Entry" : "Entries"}`)
    );
    const grid = createElement("div", { className: "benchmark-entry-grid" });
    grid.append(...family.entries.map((entry) => createBenchmarkEntryCard(entry)));
    section.append(heading, grid);
    return section;
  }));
}
