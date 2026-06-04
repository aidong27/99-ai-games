import {
  getArchiveStats,
  getGameNumberLabel,
  getMetadataHref,
  getMobileSupportInfo,
  getObservationHref,
  getPlayGateHref,
  loadArchive
} from "./archive-data.js";
import { createSignalField } from "./archive-effects.js";

const statsRoot = document.querySelector("#press-stats");
const observationsRoot = document.querySelector("#press-observations");
const hallsRoot = document.querySelector("#press-halls");
const canvas = document.querySelector("#press-signal");
const signalField = createSignalField(canvas, { variant: "page", density: 20 });

signalField.start();
loadPressData();
window.addEventListener("pagehide", () => signalField.destroy(), { once: true });

async function loadPressData() {
  try {
    const [{ manifest, games }, halls] = await Promise.all([
      loadArchive(),
      loadHalls()
    ]);
    const stats = getArchiveStats(manifest, games);
    renderStats(stats, manifest);
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

function renderStats(stats, manifest) {
  if (!statsRoot) {
    return;
  }

  statsRoot.innerHTML = [
    stat("Observations", `${stats.observationCount} / ${stats.targetCount}`),
    stat("Playable", stats.playableCount),
    stat("Halls", manifest.hallCount ?? "9"),
    stat("Run records", stats.runCount)
  ].join("");
}

function renderObservations(games) {
  if (!observationsRoot) {
    return;
  }

  observationsRoot.innerHTML = games
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
    .map((game) => {
      const mobile = getMobileSupportInfo(game);
      return `
        <article class="press-observation">
          <p class="archive-kicker">${escapeHtml(getGameNumberLabel(game))}</p>
          <h3>${escapeHtml(game.title ?? "Untitled observation")}</h3>
          <dl class="definition-grid">
            ${stat("Hall", game.hallName ?? "Unassigned")}
            ${stat("Model", `${game.provenance?.modelName ?? "Unknown"} / ${game.provenance?.agentName ?? "Unknown"}`)}
            ${stat("Status", game.statusLabel ?? game.status ?? "Unknown")}
            ${stat("Device", `Desktop ${game.deviceSupport?.desktop ?? "unknown"}; ${mobile.label}`)}
          </dl>
          <div class="record-actions">
            <a class="archive-button secondary compact" href="${getPlayGateHref(game)}">Play gate</a>
            <a class="archive-button secondary compact" href="${getObservationHref(game)}">Record</a>
            <a class="archive-button ghost compact" href="${getMetadataHref(game)}">Metadata</a>
          </div>
        </article>
      `;
    }).join("");
}

function renderHalls(halls) {
  if (!hallsRoot) {
    return;
  }

  hallsRoot.innerHTML = halls.map((hall) => `
    <article class="hall-card">
      <span>${String(hall.number ?? "?").padStart(2, "0")}</span>
      <h3>${escapeHtml(hall.name ?? "Unnamed Hall")}</h3>
      <p>${escapeHtml(hall.description ?? "Observation category.")}</p>
      <small>${Array.isArray(hall.assignedGameNumbers) ? hall.assignedGameNumbers.length : 0} assigned / ${hall.capacity ?? 11} capacity</small>
    </article>
  `).join("");
}

function renderError(node, message) {
  if (node) {
    node.innerHTML = `<p class="archive-notice">${escapeHtml(message)}</p>`;
  }
}

function stat(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
