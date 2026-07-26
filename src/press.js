import {
  getArchiveStats,
  getGameNumberLabel,
  getGameStatusLabel,
  getMetadataHref,
  getMobileSupportInfo,
  getObservationHref,
  getPlayGateHref,
  loadArchive
} from "./archive-data.js";
import { loadBenchmark } from "./benchmark-data.js";
import { createActionRow } from "./ui/buttons.js";
import { createDefinitionGrid, createDefinitionItem } from "./ui/cards.js";
import { createElement, createText } from "./ui/dom.js";
import { replaceWithNotice } from "./ui/layout.js";

const statsRoot = document.querySelector("#press-stats");
const observationsRoot = document.querySelector("#press-observations");
const hallsRoot = document.querySelector("#press-halls");

loadPressData();

async function loadPressData() {
  try {
    const [{ manifest, games }, halls, benchmark] = await Promise.all([
      loadArchive(),
      loadHalls(),
      loadBenchmark()
    ]);
    const stats = getArchiveStats(manifest, games);
    renderStats(stats, benchmark);
    renderObservations(games);
    renderHalls(halls);
  } catch (error) {
    renderError(observationsRoot, `Manifest unavailable: ${error.message}`);
    renderError(hallsRoot, "Hall taxonomy unavailable.");
  }
}

async function loadHalls() {
  const response = await fetch("./halls/halls.json");
  if (!response.ok) {
    throw new Error(`halls/halls.json returned ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.halls) ? data.halls : [];
}

function renderStats(stats, benchmark) {
  if (!statsRoot) {
    return;
  }

  statsRoot.replaceChildren(
    createDefinitionItem("Protocol 99 Raw", `${benchmark.stats.benchmarkEntries} / ${benchmark.stats.targetEntries}`),
    createDefinitionItem("Allocated Entries", benchmark.stats.allocatedEntries),
    createDefinitionItem("Legacy playable", stats.playableCount),
    createDefinitionItem("Prompt status", "Locked")
  );
}

function renderObservations(games) {
  if (!observationsRoot) {
    return;
  }

  observationsRoot.replaceChildren(...games
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
    .map((game) => createObservationCard(game)));
}

function renderHalls(halls) {
  if (!hallsRoot) {
    return;
  }

  hallsRoot.replaceChildren(...halls.map((hall) => createHallCard(hall)));
}

function renderError(node, message) {
  replaceWithNotice(node, message);
}

function createObservationCard(game) {
  const mobile = getMobileSupportInfo(game);
  const article = createElement("article", { className: "press-observation" });

  article.append(
    createText("p", "archive-kicker", getGameNumberLabel(game)),
    createText("h3", "", game.title ?? "Untitled observation"),
    createDefinitionGrid([
      ["Hall", game.hallName ?? "Unassigned"],
      ["Model", `${game.provenance?.modelName ?? "Unknown"} / ${game.provenance?.agentName ?? "Unknown"}`],
      ["Status", getGameStatusLabel(game)],
      ["Device", `Desktop ${game.deviceSupport?.desktop ?? "unknown"}; ${mobile.label}`]
    ]),
    createActionRow([
      ["Play gate", getPlayGateHref(game), "secondary compact"],
      ["Record", getObservationHref(game), "secondary compact"],
      ["Metadata", getMetadataHref(game), "ghost compact"]
    ])
  );
  return article;
}

function createHallCard(hall) {
  const assignedCount = Array.isArray(hall.assignedGameNumbers) ? hall.assignedGameNumbers.length : 0;
  const article = createElement("article", { className: "hall-card" });
  article.append(
    createText("span", "", String(hall.number ?? "?").padStart(2, "0")),
    createText("h3", "", hall.name ?? "Unnamed Hall"),
    createText("p", "", hall.description ?? "Observation category."),
    createText("small", "", `${assignedCount} assigned / ${hall.capacity ?? 11} capacity`)
  );
  return article;
}
