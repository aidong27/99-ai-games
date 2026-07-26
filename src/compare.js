import {
  formatIdentity,
  getCanonicalGameUrl,
  loadBenchmark,
  shortHash
} from "./benchmark-data.js";
import { createBenchmarkEmptyState } from "./ui/benchmark.js";
import { createElement } from "./ui/dom.js";

const refs = {
  blindButton: document.querySelector("#start-blind"),
  blindSection: document.querySelector("#blind-section"),
  blindStage: document.querySelector("#blind-stage"),
  columns: document.querySelector("#compare-columns"),
  headerStatus: document.querySelector("#compare-header-status"),
  list: document.querySelector("#compare-list"),
  picker: document.querySelector("#compare-picker"),
  policy: document.querySelector("#compare-policy"),
  reload: document.querySelector("#reload-games"),
  tabs: document.querySelector("#compare-tabs")
};

let entries = [];
const selected = new Set();

refs.reload.addEventListener("click", () => renderComparison(true));
refs.blindButton.addEventListener("click", renderBlindCompare);
init();

async function init() {
  try {
    const data = await loadBenchmark();
    entries = data.defaultEntries.filter((entry) => (
      entry.canonicalPromptHash === data.challenge.canonicalPromptHash
    ));
    entries.slice(0, 2).forEach((entry) => selected.add(entry.entryId));
    refs.policy.textContent = `Default policy: ${data.challenge.title} ${data.challenge.version} · Raw · Finalized · Prompt ${shortHash(data.challenge.canonicalPromptHash, 16)}. Cross-version mixing is blocked.`;
    refs.headerStatus.textContent = `${entries.length} COMPARABLE`;
    refs.headerStatus.classList.toggle("live", entries.length >= 2);
    renderChoices();
    renderComparison();
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

function renderChoices() {
  if (!entries.length) {
    refs.list.replaceChildren(createElement("p", { className: "compare-warning" },
      "No verified Raw Entries exist yet."
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
  if (chosen.length < 2) {
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
    createElement("p", { className: "benchmark-kicker" }, `Entry ${entry.entryNumberLabel} · Raw`),
    createElement("h3", {}, entry.identity.modelName),
    createElement("p", { className: "entry-identity" }, entry.identity.agentName)
  );
  const gameUrl = getCanonicalGameUrl(entry);
  const iframe = createElement("iframe", {
    title: `Protocol 99 Entry ${entry.entryNumberLabel} game`,
    src: forceReload && gameUrl ? `${gameUrl}&reload=${Date.now()}` : gameUrl,
    loading: "lazy",
    referrerPolicy: "no-referrer",
    attrs: {
      sandbox: "allow-scripts allow-same-origin",
      allow: ""
    }
  });
  const report = entry.canonicalRun.report;
  const facts = createElement("dl", { className: "compare-facts" });
  facts.append(
    fact("Compliance", `${report.score.earned} / ${report.score.maximum}`),
    fact("Prompt", shortHash(entry.canonicalPromptHash)),
    fact("Source", `${report.sourceFileCount ?? "?"} files · ${formatBytes(report.sourceBytes)}`),
    fact("Browser", report.browser?.version ?? "unknown"),
    fact("Console errors", report.failures?.length ? "See record" : "0 blocking"),
    fact("Known failures", String(report.failures?.length ?? 0))
  );
  const record = createElement("a", {
    className: "archive-button compact",
    href: entry.detailUrl
  }, "Open full record");
  const actions = createElement("div", { className: "entry-card-actions" }, record);
  column.append(header, iframe, facts, actions);
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
  const pair = [...entries].sort(() => Math.random() - 0.5).slice(0, 2);
  refs.blindSection.hidden = false;
  refs.blindStage.replaceChildren(...pair.map((entry, index) => {
    const option = createElement("article", { className: "blind-option" });
    option.append(
      createElement("p", { className: "benchmark-kicker" }, `Anonymous build ${index === 0 ? "A" : "B"}`),
      createElement("iframe", {
        title: `Anonymous Protocol 99 build ${index === 0 ? "A" : "B"}`,
        src: getCanonicalGameUrl(entry),
        referrerPolicy: "no-referrer",
        attrs: {
          sandbox: "allow-scripts allow-same-origin",
          allow: ""
        }
      }),
      createElement("button", {
        className: "archive-button compact",
        type: "button",
        onclick: () => revealBlind(pair, index)
      }, `Prefer build ${index === 0 ? "A" : "B"}`)
    );
    return option;
  }));
  refs.blindSection.scrollIntoView({ behavior: "smooth", block: "start" });
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

function fact(label, value) {
  const row = createElement("div");
  row.append(createElement("dt", {}, label), createElement("dd", {}, value));
  return row;
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "unknown";
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`;
}
