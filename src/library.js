import {
  filterGamesByModel,
  formatDate,
  getArchiveStats,
  getGameNumberLabel,
  getLibrarySelectionHref,
  getManifestHref,
  getMetadataHref,
  getMobileSupportInfo,
  getModelsFromGames,
  getObservationHref,
  getPlayGateHref,
  getScreenshotHref,
  getShortGameNumber,
  loadArchive,
  toTitle
} from "./archive-data.js";
import { bindPointerTilt, createSignalField } from "./archive-effects.js";

const modelAxis = document.querySelector("#model-axis");
const modelCount = document.querySelector("#model-count");
const libraryStatus = document.querySelector("#library-status");
const track = document.querySelector("#observation-track");
const timeline = document.querySelector("#observation-timeline");
const currentTitle = document.querySelector("#library-stage-title");
const currentReadout = document.querySelector("#current-readout");
const playSelected = document.querySelector("#play-selected");
const viewRecord = document.querySelector("#view-record");
const openMetadata = document.querySelector("#open-metadata");
const errorPanel = document.querySelector("#library-error");
const signalCanvas = document.querySelector("#library-signal");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const signalField = createSignalField(signalCanvas, { variant: "library", density: 26 });
const cardTilt = bindPointerTilt(track, ".observation-card[data-index]", { maxTilt: 5 });

const state = {
  manifest: null,
  games: [],
  filteredGames: [],
  models: [],
  selectedModel: "all",
  selectedSlug: "",
  selectedIndex: 0,
  notice: ""
};

const hasLibraryDom = [
  modelAxis,
  modelCount,
  libraryStatus,
  track,
  timeline,
  currentTitle,
  currentReadout,
  playSelected,
  viewRecord,
  openMetadata,
  errorPanel
].every(Boolean);

if (hasLibraryDom) {
  loadLibrary();
  signalField.start();
  bindLibraryEvents();
} else {
  signalField.destroy();
  cardTilt.destroy();
}

function bindLibraryEvents() {
  window.addEventListener("pagehide", () => {
    signalField.destroy();
    cardTilt.destroy();
  }, { once: true });

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectByOffset(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectByOffset(-1);
    } else if (event.key === "Enter") {
      const selected = getSelectedGame();
      if (selected) {
        window.location.href = getObservationHref(selected);
      }
    } else if (event.key === "Escape") {
      if (state.selectedModel !== "all") {
        selectModel("all");
      } else {
        window.location.href = "./";
      }
    }
  });

  window.addEventListener("hashchange", () => {
    syncSelectionFromHash();
  });
}

async function loadLibrary() {
  try {
    const { manifest, games } = await loadArchive();
    const stats = getArchiveStats(manifest, games);

    state.manifest = manifest;
    state.games = games;
    state.models = getModelsFromGames(games);
    state.selectedSlug = selectInitialSlug(games);
    applyInitialHash();
    state.filteredGames = filterGamesByModel(games, state.selectedModel);
    state.selectedIndex = findSelectedIndex();

    libraryStatus.textContent = `${stats.playableCount} playable / ${stats.targetCount} target slots`;
    modelCount.textContent = `${state.models.length} ${state.models.length === 1 ? "model" : "models"} / ${stats.observationCount} observations`;
    renderModels();
    renderLibrary();
  } catch (error) {
    showError(`The observation library could not load games/manifest.json. ${error.message}`);
  }
}

function renderModels() {
  const agents = new Set(state.models.flatMap((model) => [...model.agents]));
  const allButton = createModelButton({
    modelName: "All Models",
    games: state.games,
    agents,
    agentSummary: agents.size ? "All recorded agents" : "Agent unrecorded",
    countSummary: `${state.games.length} ${state.games.length === 1 ? "observation" : "observations"} / ${state.models.length} ${state.models.length === 1 ? "model" : "models"} / ${agents.size} ${agents.size === 1 ? "agent" : "agents"}`
  }, "all");

  const buttons = [
    allButton,
    ...state.models.map((model) => createModelButton(model, model.modelName))
  ];

  modelAxis.replaceChildren(...buttons);
}

function createModelButton(model, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `model-axis-item${state.selectedModel === value ? " active" : ""}`;
  button.dataset.model = value;
  button.setAttribute("role", "listitem");
  button.setAttribute("aria-pressed", state.selectedModel === value ? "true" : "false");
  if (state.selectedModel === value) {
    button.setAttribute("aria-current", "true");
  }
  button.setAttribute("aria-label", `${model.modelName}. ${model.countSummary ?? `${model.games.length} observations`}.`);
  button.addEventListener("click", () => selectModel(value));

  const icon = document.createElement("span");
  icon.className = "axis-icon";
  icon.textContent = value === "all" ? "99" : "AI";

  const copy = document.createElement("span");
  copy.className = "axis-copy";
  const agentNames = model.agentSummary ?? ([...model.agents].join(", ") || "Agent unrecorded");
  copy.append(
    createText("strong", "", model.modelName),
    createText("span", "axis-agent", agentNames),
    createText("small", "", model.countSummary ?? `${model.games.length} ${model.games.length === 1 ? "observation" : "observations"} / ${model.agents.size} ${model.agents.size === 1 ? "agent" : "agents"}`)
  );

  button.append(icon, copy);
  return button;
}

function renderLibrary() {
  state.filteredGames = filterGamesByModel(state.games, state.selectedModel);
  state.selectedIndex = findSelectedIndex();
  renderNotice();

  if (!state.filteredGames.length) {
    currentTitle.textContent = "No observations for this model";
    currentReadout.replaceChildren();
    track.replaceChildren(createNotice("No real observation samples match this model filter."));
    timeline.replaceChildren();
    playSelected.href = "./library.html";
    playSelected.textContent = "No playable sample";
    playSelected.className = "archive-button secondary";
    viewRecord.href = "./library.html";
    openMetadata.href = getManifestHref();
    return;
  }

  const cards = state.filteredGames.map((game, index) => createObservationCard(game, index));
  if (state.selectedModel === "all") {
    cards.push(createReservedCard());
  }
  track.replaceChildren(...cards);
  renderTimeline();
  updateSelection();
}

function createObservationCard(game, index) {
  const support = getMobileSupportInfo(game);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "observation-card";
  card.dataset.index = String(index);
  card.setAttribute("aria-label", `${getShortGameNumber(game)}. ${game.title ?? "Untitled observation"}. ${support.label}. Press Enter to open record.`);
  card.addEventListener("click", () => {
    window.location.href = getObservationHref(game);
  });
  card.addEventListener("focus", () => {
    if (state.selectedIndex !== index) {
      selectIndex(index, { scroll: false });
    }
  });

  const imageWrap = document.createElement("span");
  imageWrap.className = "card-image";
  const screenshot = getScreenshotHref(game);
  if (screenshot) {
    const img = document.createElement("img");
    img.src = screenshot;
    img.alt = `${game.title} verified screenshot`;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      imageWrap.replaceChildren(createText("span", "image-fallback", "No verified screenshot"));
    }, { once: true });
    imageWrap.append(img);
  } else {
    imageWrap.append(createText("span", "image-fallback", "No verified screenshot"));
  }

  const meta = document.createElement("span");
  meta.className = "card-meta";
  meta.append(
    createText("span", "number", getShortGameNumber(game)),
    createText("strong", "", game.title ?? "Untitled observation"),
    createText("small", "", game.hallName ?? game.hallId ?? "Hall unrecorded")
  );

  const facts = document.createElement("span");
  facts.className = "card-facts";
  facts.append(
    createFact("Model", game.provenance?.modelName),
    createFact("Agent", game.provenance?.agentName),
    createFact("Status", game.statusLabel ?? toTitle(game.status))
  );

  const badges = document.createElement("span");
  badges.className = "compact-badges";
  badges.append(
    createBadge(support.label, support.tone),
    createBadge(game.statusLabel ?? toTitle(game.status), "neutral")
  );

  card.append(imageWrap, meta, facts, badges);
  return card;
}

function createReservedCard() {
  const reservedCount = Math.max(0, (state.manifest?.targetGameCount ?? 99) - state.games.length);
  const card = document.createElement("div");
  card.className = "observation-card reserved-card";
  card.setAttribute("aria-label", "Reserved future observation slots. Not playable. No source yet.");
  card.append(
    createText("span", "reserved-mark", "Future"),
    createText("strong", "", `${reservedCount} reserved future observation slots`),
    createText("span", "", "Not playable"),
    createText("small", "", "No source yet")
  );
  return card;
}

function createFact(label, value) {
  const fact = document.createElement("span");
  fact.append(createText("b", "", label), createText("em", "", value ?? "Unrecorded"));
  return fact;
}

function renderTimeline() {
  const nodes = state.filteredGames.map((game, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "timeline-node";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", `Select ${getShortGameNumber(game)} timeline node for ${game.title ?? "untitled observation"}`);
    button.addEventListener("click", () => selectIndex(index));
    button.append(
      createText("strong", "", getShortGameNumber(game)),
      createText("span", "", formatDate(game.provenance?.createdDate)),
      createText("small", "", game.hallName ?? game.hallId ?? "Hall unrecorded")
    );
    return button;
  });

  const reserved = document.createElement("div");
  reserved.className = "timeline-node reserved-slot";
  reserved.append(
    createText("strong", "", `${String((state.manifest?.targetGameCount ?? 99) - state.games.length).padStart(2, "0")} reserved`),
    createText("span", "", "Future observation slots"),
    createText("small", "", "Empty / not playable")
  );

  timeline.replaceChildren(...nodes, reserved);
}

function updateSelection(options = {}) {
  const selected = getSelectedGame();
  if (!selected) {
    return;
  }

  state.selectedSlug = selected.slug;
  window.history.replaceState(null, "", getLibrarySelectionHref(selected));

  for (const card of track.querySelectorAll(".observation-card[data-index]")) {
    const active = Number(card.dataset.index) === state.selectedIndex;
    card.classList.toggle("active", active);
    card.setAttribute("aria-current", active ? "true" : "false");
    if (active && options.scroll !== false) {
      card.scrollIntoView({ behavior: reduceMotionQuery.matches ? "auto" : "smooth", inline: "center", block: "nearest" });
    }
  }

  for (const node of timeline.querySelectorAll(".timeline-node")) {
    const active = Number(node.dataset.index) === state.selectedIndex;
    node.classList.toggle("active", active);
    node.setAttribute("aria-current", active ? "true" : "false");
    if (active && options.scroll !== false) {
      node.scrollIntoView({ behavior: reduceMotionQuery.matches ? "auto" : "smooth", inline: "center", block: "nearest" });
    }
  }

  const support = getMobileSupportInfo(selected);
  currentTitle.textContent = selected.title ?? "Untitled observation";
  currentReadout.replaceChildren(
    createReadout("Observation", getGameNumberLabel(selected)),
    createReadout("Model", selected.provenance?.modelName),
    createReadout("Agent", selected.provenance?.agentName),
    createReadout("Created", formatDate(selected.provenance?.createdDate)),
    createReadout("Device", support.label),
    createReadout("Status", selected.statusLabel ?? toTitle(selected.status)),
    createReadout("Hall", selected.hallName ?? selected.hallId),
    createReadout("Source", selected.sourceCompleteness)
  );
  playSelected.href = getPlayGateHref(selected);
  playSelected.textContent = support.ctaLabel;
  playSelected.className = `archive-button ${support.key === "unsupported" ? "warning" : "primary"}`;
  viewRecord.href = getObservationHref(selected);
  openMetadata.href = getMetadataHref(selected);
}

function selectModel(modelName) {
  state.selectedModel = modelName;
  const filtered = filterGamesByModel(state.games, state.selectedModel);
  state.notice = "";
  if (!filtered.some((game) => game.slug === state.selectedSlug)) {
    state.selectedSlug = filtered[0]?.slug ?? "";
  }
  renderModels();
  renderLibrary();
}

function selectByOffset(offset) {
  if (!state.filteredGames.length) {
    return;
  }

  const next = Math.max(0, Math.min(state.filteredGames.length - 1, state.selectedIndex + offset));
  selectIndex(next);
}

function selectIndex(index, options = {}) {
  state.selectedIndex = index;
  state.selectedSlug = state.filteredGames[index]?.slug ?? state.selectedSlug;
  state.notice = "";
  renderNotice();
  updateSelection(options);
}

function syncSelectionFromHash() {
  const slug = readSlugFromHash();
  if (!slug || slug === state.selectedSlug) {
    return;
  }

  const gameExists = state.games.some((game) => game.slug === slug);
  if (!gameExists) {
    state.notice = `No observation exists for hash "${slug}". Showing the latest playable observation instead.`;
    state.selectedModel = "all";
    state.selectedSlug = selectInitialSlug(state.games);
    renderModels();
    renderLibrary();
    return;
  }

  state.selectedSlug = slug;
  state.notice = "";
  if (!filterGamesByModel(state.games, state.selectedModel).some((game) => game.slug === slug)) {
    state.selectedModel = "all";
    renderModels();
    renderLibrary();
    return;
  }

  state.filteredGames = filterGamesByModel(state.games, state.selectedModel);
  state.selectedIndex = findSelectedIndex();
  updateSelection();
}

function getSelectedGame() {
  return state.filteredGames[state.selectedIndex] ?? state.filteredGames[0] ?? null;
}

function findSelectedIndex() {
  const index = state.filteredGames.findIndex((game) => game.slug === state.selectedSlug);
  return index >= 0 ? index : 0;
}

function applyInitialHash() {
  const slug = readSlugFromHash();
  if (!slug) {
    return;
  }

  if (state.games.some((game) => game.slug === slug)) {
    state.selectedSlug = slug;
    return;
  }

  state.notice = `No observation exists for hash "${slug}". Showing the latest playable observation instead.`;
}

function selectInitialSlug(games) {
  const playable = games
    .filter((game) => game.status === "playable")
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0));
  return playable[0]?.slug ?? games[0]?.slug ?? "";
}

function readSlugFromHash() {
  return window.location.hash.replace(/^#/, "");
}

function createReadout(label, value) {
  const item = document.createElement("div");
  item.append(createText("dt", "", label), createText("dd", "", value ?? "Unrecorded"));
  return item;
}

function createBadge(text, tone) {
  const badge = document.createElement("span");
  badge.className = `archive-badge ${tone}`;
  badge.textContent = text ?? "Unrecorded";
  return badge;
}

function createNotice(message) {
  const notice = document.createElement("p");
  notice.className = "archive-notice";
  notice.textContent = message;
  return notice;
}

function renderNotice() {
  if (!state.notice) {
    errorPanel.textContent = "";
    errorPanel.classList.add("hidden");
    return;
  }

  errorPanel.textContent = state.notice;
  errorPanel.classList.remove("hidden");
}

function createText(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text ?? "";
  return element;
}

function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);
}

function showError(message) {
  errorPanel.textContent = message;
  errorPanel.classList.remove("hidden");
  libraryStatus.textContent = "Archive unavailable";
  track.replaceChildren(createNotice("No observation cards can be rendered until the manifest loads."));
  timeline.replaceChildren();
  currentReadout.replaceChildren();
  currentTitle.textContent = "Archive unavailable";
  playSelected.href = "./library.html";
  viewRecord.href = "./library.html";
  openMetadata.href = getManifestHref();
}
