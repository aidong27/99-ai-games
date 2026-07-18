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
  getModelFamiliesFromModels,
  getModelsFromGames,
  getObservationHref,
  getShortGameNumber,
  toTitle
} from "./archive-data.js";
import { createNode as el } from "./ui/dom.js";

const statsEl = document.querySelector("#compare-stats");
const tableEl = document.querySelector("#matrix-table");
const matrixEmptyEl = document.querySelector("#matrix-empty");
const modelGridEl = document.querySelector("#model-grid");
const hallCoverageEl = document.querySelector("#hall-coverage");
const statusEl = document.querySelector("#compare-status");

init();

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
  const models = getModelsFromGames(games);
  const modelFamilies = getModelFamiliesFromModels(models);
  const hallList = halls.length ? halls : hallsFromGames(games);
  const filledHalls = new Set(games.map((game) => game.hallId));

  renderStats(manifest, games, modelFamilies, models, hallList, filledHalls);
  renderMatrix(modelFamilies, hallList);
  renderModels(modelFamilies);
  renderHallCoverage(hallList, games);
}

function renderStats(manifest, games, modelFamilies, models, hallList, filledHalls) {
  const stats = getArchiveStats(manifest, games);
  const entries = [
    ["Observations", `${stats.playableCount} playable`],
    ["Model families", String(modelFamilies.length)],
    ["Models observed", String(models.length)],
    ["Halls covered", `${filledHalls.size} / ${hallList.length}`],
    ["Run records", String(stats.runCount)],
    ["Target slots", String(stats.targetCount)]
  ];
  statsEl.replaceChildren(...entries.map(([term, value]) => {
    const item = el("div", "compare-stat");
    item.append(el("dt", "", term), el("dd", "", value));
    return item;
  }));
}

function renderMatrix(modelFamilies, hallList) {
  if (modelFamilies.length === 0) {
    matrixEmptyEl.hidden = false;
    matrixEmptyEl.textContent = "No models are recorded yet.";
    tableEl.replaceChildren();
    return;
  }
  matrixEmptyEl.hidden = true;

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(th("Family / model", "col", "matrix-corner"));
  for (const hall of hallList) {
    const cell = th(hallShortName(hall), "col");
    cell.title = hall.name ?? hall.id;
    headRow.append(cell);
  }
  thead.append(headRow);

  const groups = modelFamilies.map((family) => {
    const tbody = document.createElement("tbody");
    tbody.className = "matrix-family-group";

    const familyRow = document.createElement("tr");
    familyRow.className = "matrix-family-row";
    const familyHead = th(family.name, "rowgroup", "matrix-family-head");
    familyHead.colSpan = hallList.length + 1;
    familyHead.append(el("span", "matrix-family-provider", `${family.providerName} · ${family.models.length} ${family.models.length === 1 ? "model" : "models"}`));
    familyRow.append(familyHead);
    tbody.append(familyRow);

    for (const model of family.models) {
      const row = document.createElement("tr");
      const rowHead = th(model.modelName, "row", "matrix-rowhead");
      rowHead.append(el("span", "matrix-agent", [...model.agents].join(", ")));
      row.append(rowHead);

      for (const hall of hallList) {
        const cell = document.createElement("td");
        const hits = model.games.filter((game) => game.hallId === hall.id);
        if (hits.length === 0) {
          cell.className = "matrix-cell empty";
          cell.setAttribute("aria-label", `${family.name}, ${model.modelName}, ${hall.name ?? hall.id}: none`);
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

    return tbody;
  });

  tableEl.replaceChildren(thead, ...groups);
}

function renderModels(modelFamilies) {
  if (modelFamilies.length === 0) {
    modelGridEl.replaceChildren(el("p", "compare-note", "No models recorded yet."));
    return;
  }

  modelGridEl.replaceChildren(...modelFamilies.map((family) => createModelFamilySection(family)));
}

function createModelFamilySection(family) {
  const section = document.createElement("section");
  section.className = "model-family-section";
  const headingId = `model-family-${family.id}`;
  section.setAttribute("aria-labelledby", headingId);

  const header = document.createElement("header");
  header.className = "model-family-header";
  const heading = el("h3", "model-family-name", family.name);
  heading.id = headingId;
  header.append(
    el("p", "archive-kicker", family.providerName),
    heading,
    el("p", "model-family-summary", `${family.models.length} ${family.models.length === 1 ? "model" : "models"} · ${family.games.length} ${family.games.length === 1 ? "observation" : "observations"}`)
  );

  const grid = document.createElement("div");
  grid.className = "model-family-grid";
  grid.append(...family.models.map((model) => {
    const card = document.createElement("article");
    card.className = "model-card";

    const modelGames = model.games;

    const halls = new Set(modelGames.map((game) => game.hallId));
    const variantCount = modelGames.reduce((total, game) => total + (game.variants ?? [])
      .filter((variant) => variant.modelName === model.modelName).length, 0);
    const runCount = modelGames.reduce((total, game) => total + (game.runRecords?.length ?? 0), 0);

    card.append(
      el("p", "archive-kicker", [...model.agents].join(", ") || "Tool unrecorded"),
      el("h4", "model-card-name", model.modelName),
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

  section.append(header, grid);
  return section;
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
