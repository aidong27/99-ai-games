/*
 * Model capability matrix.
 *
 * Renders a model x hall coverage view of the archive from real manifest data
 * only. Every observation is a real, linkable record; empty halls are rendered
 * as empty, never as placeholder games.
 */
import {
  loadArchive,
  loadHalls,
  getArchiveStats,
  getModelsFromGames,
  getObservationHref,
  getShortGameNumber,
  toTitle
} from "./archive-data.js";
import { createSignalField } from "./archive-effects.js";
import { createNode as el } from "./ui/dom.js";

const statsEl = document.querySelector("#compare-stats");
const tableEl = document.querySelector("#matrix-table");
const matrixEmptyEl = document.querySelector("#matrix-empty");
const modelGridEl = document.querySelector("#model-grid");
const hallCoverageEl = document.querySelector("#hall-coverage");
const statusEl = document.querySelector("#compare-status");
const signalCanvas = document.querySelector("#compare-signal");
const signalField = createSignalField(signalCanvas, { variant: "compare", density: 16 });

signalField.start();
init();
window.addEventListener("pagehide", () => signalField.destroy(), { once: true });

async function init() {
  try {
    const { manifest, games } = await loadArchive();
    const halls = await loadHalls(manifest);
    render(manifest, games, halls);
    statusEl.hidden = true;
  } catch (error) {
    statusEl.textContent = `The capability matrix could not load the archive manifest. ${error.message}`;
  }
}

function render(manifest, games, halls) {
  const playable = games.filter((game) => game.status === "playable");
  const models = getModelsFromGames(games);
  const hallList = halls.length ? halls : hallsFromGames(games);
  const filledHalls = new Set(games.map((game) => game.hallId));

  renderStats(manifest, games, models, hallList, filledHalls);
  renderMatrix(models, hallList, games);
  renderModels(models, games);
  renderHallCoverage(hallList, games);

  void playable;
}

function renderStats(manifest, games, models, hallList, filledHalls) {
  const stats = getArchiveStats(manifest, games);
  const entries = [
    ["Observations", `${stats.playableCount} playable`],
    ["Models observed", String(models.length)],
    ["Halls covered", `${filledHalls.size} / ${hallList.length}`],
    ["Model variants", String(stats.variantCount)],
    ["Run records", String(stats.runCount)],
    ["Target slots", String(stats.targetCount)]
  ];
  statsEl.replaceChildren(...entries.flatMap(([term, value]) => {
    const dt = el("dt", "", term);
    const dd = el("dd", "", value);
    return [dt, dd];
  }));
}

function renderMatrix(models, hallList, games) {
  if (models.length === 0) {
    matrixEmptyEl.hidden = false;
    matrixEmptyEl.textContent = "No models are recorded yet.";
    tableEl.replaceChildren();
    return;
  }
  matrixEmptyEl.hidden = true;

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(th("Model / tool", "col", "matrix-corner"));
  for (const hall of hallList) {
    const cell = th(hallShortName(hall), "col");
    cell.title = hall.name ?? hall.id;
    headRow.append(cell);
  }
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  for (const model of models) {
    const row = document.createElement("tr");
    const rowHead = th(model.modelName, "row", "matrix-rowhead");
    rowHead.append(el("span", "matrix-agent", [...model.agents].join(", ")));
    row.append(rowHead);

    for (const hall of hallList) {
      const cell = document.createElement("td");
      const hits = model.games
        .filter((game) => game.hallId === hall.id)
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
      if (hits.length === 0) {
        cell.className = "matrix-cell empty";
        cell.setAttribute("aria-label", `${model.modelName}, ${hall.name ?? hall.id}: none`);
        cell.textContent = "·";
      } else {
        cell.className = "matrix-cell filled";
        cell.append(...hits.map((game) => {
          const link = document.createElement("a");
          link.className = "matrix-chip";
          link.href = getObservationHref(game);
          link.textContent = getShortGameNumber(game);
          link.title = `${game.title} — ${hall.name ?? hall.id}`;
          return link;
        }));
      }
      row.append(cell);
    }
    tbody.append(row);
  }

  tableEl.replaceChildren(thead, tbody);
}

function renderModels(models, games) {
  if (models.length === 0) {
    modelGridEl.replaceChildren(el("p", "compare-note", "No models recorded yet."));
    return;
  }

  modelGridEl.replaceChildren(...models.map((model) => {
    const card = document.createElement("article");
    card.className = "model-card";

    const modelGames = games
      .filter((game) => game.provenance?.modelName === model.modelName
        || (game.variants ?? []).some((variant) => variant.modelName === model.modelName))
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

    const halls = new Set(modelGames.map((game) => game.hallId));
    const variantCount = modelGames.reduce((total, game) => total + (game.variants?.length ?? 0), 0);
    const runCount = modelGames.reduce((total, game) => total + (game.runRecords?.length ?? 0), 0);

    card.append(
      el("p", "archive-kicker", [...model.agents].join(", ") || "Tool unrecorded"),
      el("h3", "model-card-name", model.modelName),
      el("p", "model-card-meta", `${modelGames.length} observation${modelGames.length === 1 ? "" : "s"} · ${halls.size} hall${halls.size === 1 ? "" : "s"} · ${variantCount} variant${variantCount === 1 ? "" : "s"} · ${runCount} run${runCount === 1 ? "" : "s"}`)
    );

    const list = document.createElement("ul");
    list.className = "model-card-games";
    for (const game of modelGames) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = getObservationHref(game);
      link.textContent = `${getShortGameNumber(game)} · ${game.title}`;
      item.append(link, el("span", "model-card-hall", game.hallName ?? toTitle(game.hallId)));
      list.append(item);
    }
    card.append(list);
    return card;
  }));
}

function renderHallCoverage(hallList, games) {
  const byHall = new Map();
  for (const game of games) {
    if (!byHall.has(game.hallId)) {
      byHall.set(game.hallId, []);
    }
    byHall.get(game.hallId).push(game);
  }

  hallCoverageEl.replaceChildren(...hallList.map((hall) => {
    const entry = (byHall.get(hall.id) ?? []).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const item = document.createElement("li");
    item.className = `hall-row ${entry.length ? "covered" : "open"}`;
    item.append(
      el("span", "hall-dot", ""),
      el("span", "hall-name", hall.name ?? toTitle(hall.id))
    );
    if (entry.length) {
      const links = document.createElement("span");
      links.className = "hall-games";
      links.append(...entry.map((game) => {
        const link = document.createElement("a");
        link.href = getObservationHref(game);
        link.textContent = `${getShortGameNumber(game)} ${game.title}`;
        return link;
      }));
      item.append(links);
    } else {
      item.append(el("span", "hall-open-label", "Open — no observation yet"));
    }
    return item;
  }));
}

function hallsFromGames(games) {
  const seen = new Map();
  for (const game of games) {
    if (game.hallId && !seen.has(game.hallId)) {
      seen.set(game.hallId, { id: game.hallId, name: game.hallName ?? toTitle(game.hallId) });
    }
  }
  return [...seen.values()];
}

function hallShortName(hall) {
  const name = hall.name ?? toTitle(hall.id);
  return name.replace(/\s*Hall$/, "");
}

function th(content, scope, className) {
  const cell = document.createElement("th");
  cell.scope = scope;
  if (className) {
    cell.className = className;
  }
  cell.append(typeof content === "string" ? document.createTextNode(content) : content);
  return cell;
}
