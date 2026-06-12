/*
 * Observatory front hall.
 *
 * The title page is no longer a splash screen: it renders the actual archive —
 * every playable observation (the shelf), the nine capability halls (the floor
 * plan), and the model axis — entirely from games/manifest.json and
 * halls/halls.json. Nothing is mocked; open halls render as open.
 */
import {
  loadArchive,
  loadHalls,
  getArchiveStats,
  getModelsFromGames,
  getMobileSupportInfo,
  getObservationHref,
  getPlayGateHref,
  getShortGameNumber,
  selectFeaturedGame,
  toTitle
} from "./archive-data.js";
import { createSignalField } from "./archive-effects.js";
import { setupShareControls } from "./share.js";

const enterLink = document.querySelector("#enter-observatory");
const observationCount = document.querySelector("#observation-count");
const targetCount = document.querySelector("#target-count");
const playableCount = document.querySelector("#playable-count");
const mobileCount = document.querySelector("#mobile-count");
const runCount = document.querySelector("#run-count");
const titleFeatured = document.querySelector("#title-featured");
const shelfEl = document.querySelector("#observation-shelf");
const hallMapEl = document.querySelector("#hall-map");
const modelStripEl = document.querySelector("#model-strip");
const canvas = document.querySelector("#title-signal");
const signalField = createSignalField(canvas, { variant: "title", density: 32 });

loadFrontHall();
signalField.start();
setupShareControls();

document.addEventListener("keydown", (event) => {
  const active = document.activeElement;
  const isBodyFocus = !active || active === document.body || active === document.documentElement;
  if (!isBodyFocus || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    window.location.href = enterLink?.href ?? "./library.html";
  }
});

window.addEventListener("pagehide", () => signalField.destroy(), { once: true });

async function loadFrontHall() {
  try {
    const { manifest, games } = await loadArchive();
    const halls = await loadHalls(manifest);
    const stats = getArchiveStats(manifest, games);
    const featured = selectFeaturedGame(games);

    setText(observationCount, stats.observationCount);
    setText(targetCount, stats.targetCount);
    setText(playableCount, stats.playableCount);
    setText(mobileCount, stats.mobileSupportedCount);
    setText(runCount, stats.runCount);
    setText(titleFeatured, featured
      ? `Latest playable signal: ${featured.title}`
      : "No playable observation samples are listed yet.");

    renderShelf(games);
    renderHallMap(halls, games);
    renderModelStrip(games);
  } catch (error) {
    setText(titleFeatured, `Manifest unavailable: ${error.message}`);
    shelfEl?.replaceChildren(el("li", "shelf-empty", `The shelf could not load the manifest. ${error.message}`));
  }
}

/* The observation shelf -------------------------------------------------- */

function renderShelf(games) {
  const ordered = [...games].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  if (!ordered.length) {
    shelfEl.replaceChildren(el("li", "shelf-empty", "No observations are recorded yet."));
    return;
  }

  shelfEl.replaceChildren(...ordered.map((game) => {
    const item = el("li", "shelf-row");

    const plate = el("span", "shelf-plate", getShortGameNumber(game));
    plate.setAttribute("aria-hidden", "true");

    const copy = el("div", "shelf-copy");
    copy.append(
      el("h3", "shelf-title", game.title ?? game.slug),
      el("p", "shelf-meta", `${game.hallName ?? toTitle(game.hallId)} · ${game.provenance?.modelName ?? "Model unrecorded"} / ${game.provenance?.agentName ?? "Tool unrecorded"}`)
    );
    if (game.description) {
      copy.append(el("p", "shelf-description", game.description));
    }

    const badges = el("div", "shelf-badges");
    badges.append(badge(game.slotType ?? "sample", ""));
    const mobile = getMobileSupportInfo(game);
    badges.append(badge(mobile.shortLabel, mobile.tone === "accent" ? "accent" : mobile.tone === "warning" ? "warning" : "danger"));
    if (game.status === "playable") {
      badges.append(badge("Playable", "accent"));
    }

    const actions = el("div", "shelf-actions");
    actions.append(
      link("Record", getObservationHref(game), "archive-button compact secondary"),
      link("Play", getPlayGateHref(game), "archive-button compact primary")
    );

    item.append(plate, copy, badges, actions);
    return item;
  }));
}

/* The hall floor plan ----------------------------------------------------- */

function renderHallMap(halls, games) {
  if (!halls.length) {
    hallMapEl.replaceChildren(el("li", "shelf-empty", "Hall index unavailable."));
    return;
  }

  const byHall = new Map();
  for (const game of games) {
    if (!byHall.has(game.hallId)) {
      byHall.set(game.hallId, []);
    }
    byHall.get(game.hallId).push(game);
  }

  hallMapEl.replaceChildren(...halls.map((hall) => {
    const entries = (byHall.get(hall.id) ?? []).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const item = el("li", `hall-cell ${entries.length ? "covered" : "open"}`);

    item.append(
      el("span", "hall-cell-number", String(hall.number ?? "").padStart(2, "0")),
      el("h3", "hall-cell-name", (hall.name ?? toTitle(hall.id)).replace(/\s*Hall$/, "")),
      el("p", "hall-cell-description", hall.description ?? "")
    );

    if (entries.length) {
      const list = el("div", "hall-cell-games");
      list.append(...entries.map((game) => link(`${getShortGameNumber(game)} ${game.title}`, getObservationHref(game), "hall-cell-link")));
      item.append(list);
    } else {
      item.append(el("p", "hall-cell-open", "Open"));
    }
    return item;
  }));
}

/* The model axis strip ------------------------------------------------------ */

function renderModelStrip(games) {
  const models = getModelsFromGames(games);
  if (!models.length) {
    modelStripEl.replaceChildren(el("li", "shelf-empty", "No models recorded yet."));
    return;
  }

  modelStripEl.replaceChildren(...models.map((model) => {
    const item = el("li", "model-node");
    item.append(
      el("strong", "model-node-name", model.modelName),
      el("span", "model-node-agent", [...model.agents].join(", ") || "Tool unrecorded"),
      el("span", "model-node-count", `${model.games.length} observation${model.games.length === 1 ? "" : "s"}`)
    );
    const links = el("span", "model-node-games");
    links.append(...model.games
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
      .map((game) => link(getShortGameNumber(game), getObservationHref(game), "model-node-link")));
    item.append(links);
    return item;
  }));
}

/* Helpers ------------------------------------------------------------------- */

function badge(text, tone) {
  return el("span", `archive-badge ${tone}`.trim(), text);
}

function link(text, href, className) {
  const a = document.createElement("a");
  a.href = href;
  a.className = className;
  a.textContent = text;
  return a;
}

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (content != null) {
    node.textContent = String(content);
  }
  return node;
}

function setText(element, value) {
  if (element) {
    element.textContent = String(value);
  }
}
