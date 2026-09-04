import { loadBenchmark, shortHash } from "./benchmark-data.js";
import {
  createBenchmarkEmptyState,
  createBenchmarkEntryCard
} from "./ui/benchmark.js";

const refs = {
  allocatedCount: document.querySelector("#allocated-count"),
  benchmarkCount: document.querySelector("#benchmark-count"),
  challengeTitle: document.querySelector("#challenge-title"),
  entryGrid: document.querySelector("#home-entry-grid"),
  headerStatus: document.querySelector("#header-status"),
  legacyCount: document.querySelector("#legacy-count"),
  promptHash: document.querySelector("#prompt-hash")
};

init();

async function init() {
  try {
    const data = await loadBenchmark();
    refs.benchmarkCount.textContent = data.stats.benchmarkEntries;
    refs.allocatedCount.textContent = data.stats.allocatedEntries;
    refs.legacyCount.textContent = data.stats.legacyPlayableExperiments;
    refs.challengeTitle.textContent = `${data.challenge.title} ${data.challenge.version}`;
    refs.promptHash.textContent = shortHash(data.challenge.canonicalPromptHash, 16);
    refs.promptHash.title = data.challenge.canonicalPromptHash;
    refs.headerStatus.textContent = data.stats.benchmarkEntries
      ? `${data.stats.benchmarkEntries} VERIFIED RAW`
      : "PROTOCOL LOCKED · 0 ENTRIES";
    refs.headerStatus.classList.toggle("live", data.stats.benchmarkEntries > 0);
    const latest = [...data.defaultEntries].sort((a, b) =>
      String(b.canonicalRun?.finishedAt ?? "").localeCompare(String(a.canonicalRun?.finishedAt ?? ""))
    );
    renderEntries(latest.slice(0, 3));
  } catch (error) {
    refs.headerStatus.textContent = "INDEX UNAVAILABLE";
    refs.entryGrid.replaceChildren(createBenchmarkEmptyState({
      title: "Benchmark index could not load",
      message: error.message,
      actionHref: "./entries/manifest.json",
      actionLabel: "Inspect the generated manifest"
    }));
  }
}

function renderEntries(entries) {
  if (!entries.length) {
    refs.entryGrid.replaceChildren(createBenchmarkEmptyState());
    return;
  }
  refs.entryGrid.replaceChildren(
    ...entries.map((entry, index) => createBenchmarkEntryCard(entry, {
      eager: index === 0, featured: index === 0
    }))
  );
}
