import {
  formatIdentity,
  getCanonicalGameUrl,
  loadBenchmark,
  shortHash
} from "./benchmark-data.js";
import { createBenchmarkEmptyState } from "./ui/benchmark.js";
import { createElement } from "./ui/dom.js";
import { comparableEntries, samplePair } from "./data/entry-runs.js";
import { createGameFrame, createFact as fact } from "./ui/game-frame.js";
import { createEvidenceFigure, createComplianceDetails } from "./ui/evidence.js";

const refs = {
  blindButton: document.querySelector("#start-blind"),
  blindSection: document.querySelector("#blind-section"),
  blindStage: document.querySelector("#blind-stage"),
  columns: document.querySelector("#compare-columns"),
  checkpoint: document.querySelector("#compare-checkpoint"),
  headerStatus: document.querySelector("#compare-header-status"),
  list: document.querySelector("#compare-list"),
  picker: document.querySelector("#compare-picker"),
  policy: document.querySelector("#compare-policy"),
  reload: document.querySelector("#reload-games"),
  run: document.querySelector("#compare-run-type"),
  tabs: document.querySelector("#compare-tabs")
};

let entries = [];
let data;
const selected = new Set();

refs.reload.addEventListener("click", () => renderComparison(true));
refs.blindButton.addEventListener("click", renderBlindCompare);
refs.run?.addEventListener("change", updateEntries);
refs.checkpoint?.addEventListener("change", () => {
  for (const region of refs.columns.querySelectorAll("[data-evidence-entry]")) {
    const entry = entries.find((item) => item.entryId === region.dataset.evidenceEntry);
    if (entry) region.replaceChildren(createEvidenceFigure(entry, refs.checkpoint.value));
  }
});
init();

async function init() {
  try {
    data = await loadBenchmark();
    updateEntries();
  } catch (error) {
    refs.headerStatus.textContent = "INDEX UNAVAILABLE";
    refs.columns.replaceChildren(createBenchmarkEmptyState({
      title: "Comparison data could not load",
      message: error.message,
      actionHref: "./entries/manifest.json",
      actionLabel: "Inspect manifest"
    }));
  }
}

function updateEntries() {
  if (!data) return;
  const runType = refs.run?.value ?? "raw";
  entries = comparableEntries(data, runType);
  selected.clear();
  entries.slice(0, 2).forEach((entry) => selected.add(entry.entryId));
  refs.policy.textContent = `${data.challenge.title} ${data.challenge.version} · ${runType} · Finalized · Prompt ${shortHash(data.challenge.canonicalPromptHash, 16)}. Cross-version mixing is blocked.`;
  refs.headerStatus.textContent = `${entries.length} COMPARABLE`;
  refs.headerStatus.classList.toggle("live", entries.length >= 2);
  refs.blindSection.hidden = true;
  refs.blindStage.replaceChildren();
  renderChoices();
  renderComparison();
}

function renderChoices() {
  if (!entries.length) {
    refs.list.replaceChildren(createElement("p", { className: "compare-warning" },
      "No verified Entries exist for this Run type."
    ));
    refs.reload.disabled = true;
    refs.blindButton.disabled = true;
    return;
  }
  refs.list.replaceChildren(...entries.map((entry) => {
    const label = createElement("label", { className: "compare-choice" });
    const checkbox = createElement("input", {
      type: "checkbox",
      checked: selected.has(entry.entryId),
      value: entry.entryId
    });
    checkbox.addEventListener("change", () => {
      if (checkbox.checked && selected.size >= 4) {
        checkbox.checked = false;
        return;
      }
      if (checkbox.checked) selected.add(entry.entryId);
      else selected.delete(entry.entryId);
      renderComparison();
    });
    const copy = createElement("span");
    copy.append(
      createElement("strong", {}, `Entry ${entry.entryNumberLabel} · ${entry.identity.modelName}`),
      createElement("small", {}, entry.identity.agentName)
    );
    label.append(
      checkbox,
      copy,
      createElement("output", {}, `${entry.canonicalRun.report.score.earned}/100`)
    );
    return label;
  }));
}

function renderComparison(forceReload = false) {
  const chosen = entries.filter((entry) => selected.has(entry.entryId));
  refs.reload.disabled = chosen.length < 2;
  refs.blindButton.disabled = entries.length < 2;
  if (chosen.length < 2) {
    refs.columns.style.removeProperty("--compare-count");
    refs.columns.replaceChildren(createBenchmarkEmptyState({
      title: entries.length < 2 ? "Two verified Entries are required" : "Select at least two Entries",
      message: entries.length < 2
        ? "The comparison remains unavailable until two real AI coding systems finalize the same Protocol 99 version."
        : "Choose two to four compatible Entries from the selection list.",
      actionHref: "./entries.html",
      actionLabel: "Open Entry index"
    }));
    refs.tabs.replaceChildren();
    return;
  }
  refs.columns.style.setProperty("--compare-count", String(chosen.length));
  refs.columns.replaceChildren(...chosen.map((entry, index) => createColumn(entry, index, forceReload)));
  refs.tabs.replaceChildren(...chosen.map((entry, index) => {
    const button = createElement("button", {
      type: "button",
      className: `archive-button compact ${index === 0 ? "primary" : ""}`
    }, `Entry ${entry.entryNumberLabel}`);
    button.addEventListener("click", () => activateMobileColumn(index));
    return button;
  }));
  activateMobileColumn(0);
}

function createColumn(entry, index, forceReload) {
  const column = createElement("article", {
    className: `compare-column ${index === 0 ? "mobile-active" : ""}`
  });
  const header = createElement("header");
  header.append(
    createElement("p", { className: "benchmark-kicker" }, `Entry ${entry.entryNumberLabel} · ${entry.canonicalRun.runType}`),
    createElement("h3", {}, entry.identity.modelName),
    createElement("p", { className: "entry-identity" }, entry.identity.agentName)
  );
  const gameUrl = getCanonicalGameUrl(entry);
  const iframe = createGameFrame({
    title: `Protocol 99 Entry ${entry.entryNumberLabel} game`,
    src: forceReload && gameUrl ? `${gameUrl}&reload=${Date.now()}` : gameUrl,
  });
  const report = entry.canonicalRun.report;
  const facts = createElement("dl", { className: "compare-facts" });
  facts.append(
    fact("Compliance", `${report.score.earned} / ${report.score.maximum}`),
    fact("Prompt", shortHash(entry.canonicalPromptHash)),
    fact("Source", `${report.sourceFileCount ?? "?"} files · ${formatBytes(report.sourceBytes)}`),
    fact("Browser", report.browser?.version ?? "unknown"),
    fact("Uncaught error check", report.checks?.["browser.no-uncaught-errors"] === true ? "Passed" : "Not confirmed"),
    fact("External network check", report.checks?.["security.no-external-network"] === true ? "Passed" : "Not confirmed"),
    fact("Known failures", String(report.failures?.length ?? 0))
  );
  const record = createElement("a", {
    className: "archive-button compact",
    href: entry.detailUrl
  }, "Open full record");
  const actions = createElement("div", { className: "entry-card-actions" }, record);
  const evidence = createElement("div", { className: "evidence-grid compare-evidence" });
  evidence.dataset.evidenceEntry = entry.entryId;
  evidence.append(createEvidenceFigure(entry, refs.checkpoint?.value ?? "gameplay"));
  column.append(header, iframe, evidence, facts, createComplianceDetails(report),
    createElement("p", { className: "compare-warning" },
      entry.canonicalRun.knownIssues?.join(" · ") || "No known issues declared by participant."), actions);
  return column;
}

function activateMobileColumn(activeIndex) {
  [...refs.columns.children].forEach((column, index) => {
    column.classList.toggle("mobile-active", index === activeIndex);
  });
  [...refs.tabs.children].forEach((button, index) => {
    button.classList.toggle("primary", index === activeIndex);
    button.setAttribute("aria-pressed", index === activeIndex ? "true" : "false");
  });
}

function renderBlindCompare() {
  if (entries.length < 2) {
    return;
  }
  const pair = samplePair(entries);
  refs.blindSection.hidden = false;
  refs.blindStage.replaceChildren(...pair.map((entry, index) => {
    const option = createElement("article", { className: "blind-option" });
    option.append(
      createElement("p", { className: "benchmark-kicker" }, `Anonymous build ${index === 0 ? "A" : "B"}`),
      createGameFrame({
        title: `Anonymous Protocol 99 build ${index === 0 ? "A" : "B"}`,
        src: getCanonicalGameUrl(entry),
      }),
      createElement("button", {
        className: "archive-button compact",
        type: "button",
        onclick: () => revealBlind(pair, index)
      }, `Prefer build ${index === 0 ? "A" : "B"}`)
    );
    return option;
  }));
  refs.blindSection.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start"
  });
}

function revealBlind(pair, preferredIndex) {
  refs.blindStage.replaceChildren(...pair.map((entry, index) => {
    const result = createElement("article", { className: "blind-option" });
    result.append(
      createElement("p", { className: "benchmark-kicker" }, index === preferredIndex ? "Your local choice" : "Other build"),
      createElement("h3", {}, `Entry ${entry.entryNumberLabel} · ${entry.identity.modelName}`),
      createElement("p", {}, formatIdentity(entry)),
      createElement("p", {}, `Automated Compliance: ${entry.canonicalRun.report.score.earned} / 100`),
      createElement("a", { className: "archive-button compact", href: entry.detailUrl }, "Open evidence")
    );
    return result;
  }));
  try {
    localStorage.setItem("99ag-last-blind-choice", pair[preferredIndex].entryId);
  } catch {
    // The reveal remains useful when browser storage is unavailable.
  }
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "unknown";
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`;
}
