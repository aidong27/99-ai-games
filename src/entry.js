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
import { selectEntryRun } from "./data/entry-runs.js";
import { createGameFrame } from "./ui/game-frame.js";
import { setDocumentMeta } from "./ui/meta.js";
import { EVIDENCE_LABELS, createEvidenceFigure, createComplianceDetails } from "./ui/evidence.js";

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
    const selected = selectEntryRun(entry, "raw", new URLSearchParams(location.search).get("run"));
    if (!selected) return renderMissing();
    renderEntry(selected, data);
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
  setDocumentMeta({
    title: `Entry ${entry.entryNumberLabel}: ${entry.title || entry.identity.modelName}`,
    description: `Protocol 99 ${entry.canonicalRun?.runType ?? "Run"} by ${formatIdentity(entry)}, with playable game and browser evidence.`,
    canonicalPath: entry.detailUrl,
    socialImagePath: entry.screenshots?.title
  });
  headerStatus.textContent = entry.selectedRunPublished
    ? `VERIFIED ${entry.canonicalRun.runType.toUpperCase()}` : entry.canonicalRun.status.toUpperCase();
  headerStatus.classList.toggle("live", entry.selectedRunPublished);

  const heading = createElement("header", { className: "detail-heading" });
  const headingCopy = createElement("div");
  headingCopy.append(
    createElement("p", { className: "benchmark-kicker" }, `Protocol 99 · Entry ${entry.entryNumberLabel} · ${entry.canonicalRun?.runType ?? "pending"}`),
    createElement("h1", { translate: false }, entry.title || entry.identity.modelName),
    createElement("p", { translate: false }, `${formatIdentity(entry)} · ${family.name}`)
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
    primary.append(createElement("div", { className: "game-toolbar" }, [
      createElement("span", {}, "Play"),
      createElement("a", { className: "archive-button compact", href: gameUrl }, "Open game")
    ]));
    const iframe = createGameFrame({
      title: `Protocol 99 Entry ${entry.entryNumberLabel} ${entry.canonicalRun.runType} game`,
      src: gameUrl, lazy: false
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
    report ? createScoreBreakdown(report.score) : createElement("p", {}, "No machine score is available."),
    ...(report ? [createComplianceDetails(report)] : [])
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
    createElement("a", { className: "archive-button compact", href: `${entry.canonicalRun.publicPath ?? getRepositoryUrl(entry.canonicalRun.repositoryPath)}evidence/report.json` }, "Verification report"),
    createElement("a", { className: "archive-button compact", href: getRepositoryUrl(`${entry.canonicalRun.repositoryPath}tests/`) }, "Participant tests"),
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
    createRuns(entry),
    createElement("h2", {}, "Known issues"),
    createElement("p", {}, entry.canonicalRun.knownIssues?.join(" · ") || "No issues declared by the participant."),
    createElement("h2", {}, "Tool environment"),
    createElement("dl", { className: "detail-facts" }, [
      detailFact("Verified browser", report?.browser?.version ?? "Pending")
    ]),
    createElement("h3", {}, "Declared tool access"),
    createElement("dl", { className: "detail-facts" }, Object.entries(entry.canonicalRun.toolAccess ?? {}).map(([key, value]) => detailFact(key, value)))
  );
  layout.append(primary, sidebar);
  root.replaceChildren(heading, layout);
}

function createEvidence(entry) {
  const grid = createElement("div", { className: "evidence-grid" });
  for (const key of Object.keys(EVIDENCE_LABELS)) {
    if (entry.screenshots?.[key]) grid.append(createEvidenceFigure(entry, key));
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
    const row = createElement("div");
    row.append(createElement("dt", {}, `${run.runType} · ${run.status}`),
      createElement("dd", {}, [
        createElement("a", {
          href: `./entry.html?${new URLSearchParams({ id: entry.entryId, run: run.runId })}`,
          ariaCurrent: run.runId === entry.canonicalRun.runId ? "page" : undefined
        }, run.runId),
        createElement("span", {}, run.parentRunId ? ` · from ${shortHash(run.parentSourceHash)}` : " · original")
      ]));
    facts.append(row);
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
      translate: false,
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
