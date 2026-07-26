import {
  formatDate,
  formatIdentity,
  getCanonicalGameUrl,
  getEntryFamily,
  getRepositoryUrl,
  loadBenchmark,
  shortHash
} from "./benchmark-data.js";
import {
  createBenchmarkEmptyState,
  createScoreBreakdown
} from "./ui/benchmark.js";
import { createElement } from "./ui/dom.js";

const root = document.querySelector("#entry-detail");
const headerStatus = document.querySelector("#detail-header-status");
const entryId = new URLSearchParams(location.search).get("id");

init();

async function init() {
  try {
    const data = await loadBenchmark();
    const entry = data.entries.find((candidate) => candidate.entryId === entryId);
    if (!entry) {
      renderMissing();
      return;
    }
    renderEntry(entry, data);
  } catch (error) {
    headerStatus.textContent = "ENTRY UNAVAILABLE";
    root.replaceChildren(createBenchmarkEmptyState({
      title: "Entry record could not load",
      message: error.message,
      actionHref: "./entries.html",
      actionLabel: "Return to Entry index"
    }));
  }
}

function renderEntry(entry, data) {
  const report = entry.canonicalRun?.report;
  const family = getEntryFamily(entry);
  const title = `Entry ${entry.entryNumberLabel}: ${entry.identity.modelName} | 99 AI Games`;
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute(
    "content",
    `Protocol 99 ${entry.canonicalRun?.runType ?? "Run"} by ${formatIdentity(entry)}, with playable game and browser evidence.`
  );
  headerStatus.textContent = entry.defaultComparable ? "VERIFIED RAW" : entry.status.toUpperCase();
  headerStatus.classList.toggle("live", entry.defaultComparable);

  const heading = createElement("header", { className: "detail-heading" });
  const headingCopy = createElement("div");
  headingCopy.append(
    createElement("p", { className: "benchmark-kicker" }, `Protocol 99 · Entry ${entry.entryNumberLabel} · ${entry.canonicalRun?.runType ?? "pending"}`),
    createElement("h1", {}, entry.identity.modelName),
    createElement("p", {}, `${entry.identity.agentName} · ${family.name} / ${family.providerName}`)
  );
  const score = createElement("div", { className: "detail-score" });
  score.append(
    createElement("strong", {}, report ? `${report.score.earned}/100` : "Pending"),
    createElement("span", {}, "Automated Compliance Score")
  );
  heading.append(headingCopy, score);

  const layout = createElement("div", { className: "detail-layout" });
  const primary = createElement("div", { className: "detail-game" });
  const gameUrl = getCanonicalGameUrl(entry);
  if (gameUrl) {
    const iframe = createElement("iframe", {
      title: `Protocol 99 Entry ${entry.entryNumberLabel} playable Raw game`,
      src: gameUrl,
      referrerPolicy: "no-referrer",
      attrs: {
        sandbox: "allow-scripts allow-same-origin",
        allow: ""
      }
    });
    primary.append(iframe);
  } else {
    primary.append(createBenchmarkEmptyState({
      title: "This Entry is not playable yet",
      message: "A Run appears here only after browser verification and Finalize both succeed.",
      actionHref: "./methodology.html",
      actionLabel: "Read publication rules"
    }));
  }
  primary.append(
    sectionHeading("Real browser evidence", "Screenshots are captured from the source hash shown in this record."),
    createEvidence(entry),
    sectionHeading("Automated Compliance", data.scoreDisclaimer),
    report ? createScoreBreakdown(report.score) : createElement("p", {}, "No machine score is available.")
  );

  const sidebar = createElement("aside", { className: "detail-sidebar" });
  const facts = createElement("dl", { className: "detail-facts" });
  facts.append(
    detailFact("Entry", entry.entryNumberLabel),
    detailFact("Provider", entry.identity.provider),
    detailFact("Model", entry.identity.modelName),
    detailFact("Model version", entry.identity.modelVersion),
    detailFact("Agent", entry.identity.agentName),
    detailFact("Agent version", entry.identity.agentVersion),
    detailFact("Identity source", entry.identity.identitySource),
    detailFact("Identity confidence", entry.identity.identityConfidence),
    detailFact("Challenge", `${entry.challengeId} ${entry.challengeVersion}`),
    detailFact("Prompt SHA-256", entry.canonicalPromptHash, true),
    detailFact("Run type", entry.canonicalRun?.runType),
    detailFact("Started", formatDate(entry.canonicalRun?.startedAt)),
    detailFact("Finished", formatDate(entry.canonicalRun?.finishedAt)),
    detailFact("Source SHA-256", entry.canonicalRun?.sourceHash, true),
    detailFact("Human prompts", entry.canonicalRun?.humanPromptCount),
    detailFact("Human code edits", String(entry.canonicalRun?.humanCodeEdits ?? "unknown"))
  );
  const links = createElement("div", { className: "benchmark-actions" });
  links.append(
    createElement("a", {
      className: "archive-button compact",
      href: getRepositoryUrl(entry.repositoryPath)
    }, "Entry source"),
    createElement("a", {
      className: "archive-button compact",
      href: "./compare.html"
    }, "Compare"),
    createElement("a", {
      className: "archive-button compact",
      href: "./benchmarks/protocol-99/v1/PROMPT.md"
    }, "Prompt")
  );
  sidebar.append(
    createElement("p", { className: "benchmark-kicker" }, "Provenance and integrity"),
    facts,
    links,
    createElement("p", { className: "compare-warning" },
      `Player Experience Review: ${entry.reviews?.playerExperience ? "available" : "not reviewed"}. Engineering Review: ${entry.reviews?.engineering ? "available" : "not reviewed"}.`
    ),
    createRuns(entry)
  );
  layout.append(primary, sidebar);
  root.replaceChildren(heading, layout);
}

function createEvidence(entry) {
  const grid = createElement("div", { className: "evidence-grid" });
  const labels = {
    title: "Title state",
    gameplay: "Active gameplay",
    relay1: "After relay one",
    victory: "Real victory"
  };
  for (const [key, label] of Object.entries(labels)) {
    const src = entry.screenshots?.[key];
    if (!src) continue;
    const figure = createElement("figure");
    figure.append(
      createElement("img", { src, alt: `${label} evidence for Entry ${entry.entryNumberLabel}`, loading: "lazy" }),
      createElement("figcaption", {}, label)
    );
    grid.append(figure);
  }
  return grid.children.length
    ? grid
    : createElement("p", { className: "compare-warning" }, "Real screenshot evidence is pending.");
}

function createRuns(entry) {
  const section = createElement("section", { className: "benchmark-section" });
  section.append(createElement("h2", {}, "Run history"));
  const facts = createElement("dl", { className: "detail-facts" });
  for (const run of entry.runs) {
    facts.append(detailFact(
      `${run.runType} · ${run.status}`,
      `${run.runId} · ${run.parentRunId ? `from ${shortHash(run.parentSourceHash)}` : "original"}`
    ));
  }
  section.append(facts);
  return section;
}

function sectionHeading(title, description) {
  const header = createElement("div", { className: "benchmark-section-heading" });
  const copy = createElement("div");
  copy.append(createElement("h2", {}, title));
  header.append(copy, createElement("p", {}, description));
  return header;
}

function detailFact(label, value, mono = false) {
  const row = createElement("div");
  row.append(
    createElement("dt", {}, label),
    createElement("dd", {
      className: mono ? "mono-value" : "",
      title: mono ? String(value ?? "") : ""
    }, mono ? shortHash(value, 18) : value ?? "unknown")
  );
  return row;
}

function renderMissing() {
  headerStatus.textContent = "ENTRY NOT FOUND";
  root.replaceChildren(createBenchmarkEmptyState({
    title: "Entry not found",
    message: entryId
      ? `No generated record matches “${entryId}”.`
      : "The Entry URL is missing its id parameter.",
    actionHref: "./entries.html",
    actionLabel: "Open Entry index"
  }));
}
