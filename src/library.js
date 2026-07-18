import {
  filterGamesByModel,
  formatDate,
  getArchiveStats,
  getGameNumberLabel,
  getGameStatusLabel,
  getManifestHref,
  getMetadataHref,
  getMobileSupportInfo,
  getModelFamiliesFromModels,
  getModelFamily,
  getModelFamilySelection,
  getModelsFromGames,
  getObservationHref,
  getPlayGateHref,
  getPosterHref,
  getPromoHref,
  getScreenshotHref,
  getShortGameNumber,
  loadArchive
} from "./archive-data.js";
import { bindPointerTilt } from "./archive-effects.js";
import { createBadge } from "./ui/badges.js";
import { createDefinitionItem, createNotice } from "./ui/cards.js";
import { createText } from "./ui/dom.js";
import { clearPanelMessage, showPanelMessage } from "./ui/layout.js";

const modelAxis = document.querySelector("#model-axis");
const modelCount = document.querySelector("#model-count");
const libraryStatus = document.querySelector("#library-status");
const track = document.querySelector("#observation-track");
const timeline = document.querySelector("#observation-timeline");
const currentTitle = document.querySelector("#library-stage-title");
const currentReadout = document.querySelector("#current-readout");
const currentPreview = document.querySelector("#current-preview");
const currentPreviewImage = document.querySelector("#current-preview-image");
const currentPreviewPlaceholder = document.querySelector("#current-preview-placeholder");
const playSelected = document.querySelector("#play-selected");
const viewRecord = document.querySelector("#view-record");
const viewPromo = document.querySelector("#view-promo");
const openMetadata = document.querySelector("#open-metadata");
const errorPanel = document.querySelector("#library-error");
const searchInput = document.querySelector("#library-search");
const hallFilter = document.querySelector("#library-hall-filter");
const sortSelect = document.querySelector("#library-sort");
const screenshotView = document.querySelector("#view-screenshots");
const posterView = document.querySelector("#view-posters");
const resultsSummary = document.querySelector("#library-results");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const cardTilt = bindPointerTilt(track, ".observation-card[data-index]", { maxTilt: 1.2 });

const state = {
  manifest: null,
  games: [],
  filteredGames: [],
  models: [],
  modelFamilies: [],
  selectedModel: "all",
  selectedSlug: "",
  selectedIndex: 0,
  selectedHall: "all",
  searchQuery: "",
  sortOrder: "number-desc",
  viewMode: "evidence",
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
  currentPreview,
  currentPreviewImage,
  currentPreviewPlaceholder,
  playSelected,
  viewRecord,
  viewPromo,
  openMetadata,
  errorPanel,
  searchInput,
  hallFilter,
  sortSelect,
  screenshotView,
  posterView,
  resultsSummary
].every(Boolean);

if (hasLibraryDom) {
  loadLibrary();
  bindLibraryEvents();
} else {
  cardTilt.destroy();
}

function bindLibraryEvents() {
  window.addEventListener("pagehide", () => {
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
      if (!hasDefaultFilters()) {
        state.selectedModel = "all";
        state.selectedHall = "all";
        state.searchQuery = "";
        renderModels();
        applyFilters();
      } else {
        window.location.href = "./";
      }
    }
  });

  window.addEventListener("hashchange", () => {
    syncSelectionFromHash();
  });

  const updateSearchQuery = () => {
    state.searchQuery = searchInput.value.trim();
    applyFilters();
  };
  searchInput.addEventListener("input", updateSearchQuery);
  searchInput.addEventListener("change", updateSearchQuery);
  searchInput.addEventListener("search", updateSearchQuery);
  hallFilter.addEventListener("change", () => {
    state.selectedHall = hallFilter.value;
    applyFilters();
  });
  sortSelect.addEventListener("change", () => {
    state.sortOrder = sortSelect.value;
    applyFilters();
  });
  screenshotView.addEventListener("click", () => setViewMode("evidence"));
  posterView.addEventListener("click", () => setViewMode("poster"));
}

async function loadLibrary() {
  try {
    const { manifest, games } = await loadArchive();
    const stats = getArchiveStats(manifest, games);

    state.manifest = manifest;
    state.games = games;
    state.models = getModelsFromGames(games);
    state.modelFamilies = getModelFamiliesFromModels(state.models);
    readFilterStateFromUrl();
    populateHallFilter(games);
    syncFilterControls();
    state.selectedSlug = selectInitialSlug(games);
    applyInitialHash();
    state.filteredGames = getFilteredGames();
    state.selectedIndex = findSelectedIndex();

    libraryStatus.textContent = `${stats.playableCount} playable / ${stats.targetCount} target slots`;
    modelCount.textContent = `${state.modelFamilies.length} ${state.modelFamilies.length === 1 ? "family" : "families"} / ${state.models.length} ${state.models.length === 1 ? "model" : "models"}`;
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
    countSummary: `${state.modelFamilies.length} ${state.modelFamilies.length === 1 ? "family" : "families"} / ${state.models.length} ${state.models.length === 1 ? "model" : "models"} / ${state.games.length} ${state.games.length === 1 ? "observation" : "observations"}`
  }, "all", { icon: "99", listItem: true });

  const entries = [
    allButton,
    ...state.modelFamilies.map((family) => createModelFamilyGroup(family))
  ];

  modelAxis.replaceChildren(...entries);
}

function createModelFamilyGroup(family) {
  const selection = getModelFamilySelection(family);
  const group = document.createElement("div");
  group.className = "model-family-group";
  group.setAttribute("role", "listitem");
  group.classList.toggle("contains-active", state.selectedModel === selection
    || family.models.some((model) => state.selectedModel === model.modelName));

  const familyButton = createModelButton({
    modelName: family.name,
    games: family.games,
    agents: family.agents,
    agentSummary: family.providerName,
    countSummary: `${family.models.length} ${family.models.length === 1 ? "model" : "models"} / ${family.games.length} ${family.games.length === 1 ? "observation" : "observations"}`
  }, selection, { icon: family.shortLabel, className: "model-family-button" });

  const models = document.createElement("div");
  models.className = "model-family-models";
  models.setAttribute("role", "group");
  models.setAttribute("aria-label", `${family.name} models by ${family.providerName}`);
  models.append(...family.models.map((model) => createModelButton(model, model.modelName, {
    icon: "AI",
    className: "model-axis-model"
  })));

  group.append(familyButton, models);
  return group;
}

function createModelButton(model, value, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `model-axis-item${options.className ? ` ${options.className}` : ""}${state.selectedModel === value ? " active" : ""}`;
  button.dataset.model = value;
  if (options.listItem) {
    button.setAttribute("role", "listitem");
  }
  button.setAttribute("aria-pressed", state.selectedModel === value ? "true" : "false");
  if (state.selectedModel === value) {
    button.setAttribute("aria-current", "true");
  }
  button.setAttribute("aria-label", `${model.modelName}. ${model.countSummary ?? `${model.games.length} observations`}.`);
  button.addEventListener("click", () => selectModel(value));

  const icon = document.createElement("span");
  icon.className = "axis-icon";
  icon.textContent = options.icon ?? "AI";

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
  state.filteredGames = getFilteredGames();
  state.selectedIndex = findSelectedIndex();
  renderNotice();
  syncFilterControls();
  resultsSummary.textContent = `${state.filteredGames.length} ${state.filteredGames.length === 1 ? "observation" : "observations"} shown`;

  if (!state.filteredGames.length) {
    window.history.replaceState(null, "", buildLibraryUrl());
    currentTitle.textContent = "No matching observations";
    currentReadout.replaceChildren();
    currentPreview.href = "./library.html";
    currentPreviewImage.hidden = true;
    currentPreviewImage.removeAttribute("src");
    currentPreviewPlaceholder.hidden = false;
    track.replaceChildren(createNotice("No real observation samples match the current filters."));
    timeline.replaceChildren();
    playSelected.href = "./library.html";
    playSelected.textContent = "No playable sample";
    playSelected.className = "archive-button secondary";
    viewRecord.href = "./library.html";
    viewPromo.href = "./library.html";
    openMetadata.href = getManifestHref();
    return;
  }

  const cards = state.filteredGames.map((game, index) => createObservationCard(game, index));
  if (hasDefaultFilters()) {
    cards.push(createReservedCard());
  }
  track.replaceChildren(...cards);
  renderTimeline();
  updateSelection({ scroll: false });
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
  const artwork = state.viewMode === "poster" ? getPosterHref(game) : getScreenshotHref(game);
  card.classList.toggle("poster-art", state.viewMode === "poster");
  if (artwork) {
    const img = document.createElement("img");
    img.src = artwork;
    img.alt = state.viewMode === "poster"
      ? `${game.title} promotional cover poster`
      : `${game.title} verified screenshot`;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      imageWrap.replaceChildren(createText("span", "image-fallback", state.viewMode === "poster" ? "Poster unavailable" : "No verified screenshot"));
    }, { once: true });
    imageWrap.append(img);
  } else {
    imageWrap.append(createText("span", "image-fallback", state.viewMode === "poster" ? "Poster unavailable" : "No verified screenshot"));
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
    createFact("Status", getGameStatusLabel(game))
  );

  const badges = document.createElement("span");
  badges.className = "compact-badges";
  badges.append(
    createBadge(support.label, support.tone),
    createBadge(getGameStatusLabel(game), "neutral")
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
  window.history.replaceState(null, "", buildLibraryUrl(selected.slug));

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
  const artwork = state.viewMode === "poster" ? getPosterHref(selected) : getScreenshotHref(selected);
  const playHref = getPlayGateHref(selected);
  currentTitle.textContent = selected.title ?? "Untitled observation";
  currentReadout.replaceChildren(
    createDefinitionItem("Observation", getGameNumberLabel(selected)),
    createDefinitionItem("Model", selected.provenance?.modelName),
    createDefinitionItem("Agent", selected.provenance?.agentName),
    createDefinitionItem("Created", formatDate(selected.provenance?.createdDate)),
    createDefinitionItem("Device", support.label),
    createDefinitionItem("Status", getGameStatusLabel(selected)),
    createDefinitionItem("Hall", selected.hallName ?? selected.hallId),
    createDefinitionItem("Source", selected.sourceCompleteness)
  );
  currentPreview.href = playHref;
  currentPreview.setAttribute("aria-label", `Play ${selected.title ?? "selected observation"}`);
  currentPreview.classList.toggle("poster-art", state.viewMode === "poster");
  if (artwork) {
    currentPreviewImage.hidden = false;
    currentPreviewImage.src = artwork;
    currentPreviewImage.alt = state.viewMode === "poster"
      ? `${selected.title ?? "Selected observation"} promotional cover poster`
      : `${selected.title ?? "Selected observation"} verified screenshot`;
    currentPreviewPlaceholder.hidden = true;
    currentPreviewImage.onerror = () => {
      currentPreviewImage.hidden = true;
      currentPreviewImage.removeAttribute("src");
      currentPreviewPlaceholder.hidden = false;
    };
  } else {
    currentPreviewImage.hidden = true;
    currentPreviewImage.removeAttribute("src");
    currentPreviewPlaceholder.hidden = false;
  }
  playSelected.href = playHref;
  playSelected.textContent = support.ctaLabel;
  playSelected.className = `archive-button ${support.key === "unsupported" ? "warning" : "primary"}`;
  viewRecord.href = getObservationHref(selected);
  viewPromo.href = getPromoHref(selected);
  openMetadata.href = getMetadataHref(selected);
}

function selectModel(modelName) {
  state.selectedModel = modelName;
  const filtered = getFilteredGames();
  state.notice = "";
  if (!filtered.some((game) => game.slug === state.selectedSlug)) {
    state.selectedSlug = filtered[0]?.slug ?? "";
  }
  renderModels();
  renderLibrary();
}

function applyFilters() {
  const filtered = getFilteredGames();
  state.notice = "";
  if (!filtered.some((game) => game.slug === state.selectedSlug)) {
    state.selectedSlug = filtered[0]?.slug ?? "";
  }
  renderLibrary();
}

function setViewMode(mode) {
  state.viewMode = mode === "poster" ? "poster" : "evidence";
  renderLibrary();
}

function getFilteredGames() {
  const query = state.searchQuery.toLocaleLowerCase();
  const filtered = filterGamesByModel(state.games, state.selectedModel)
    .filter((game) => state.selectedHall === "all" || game.hallId === state.selectedHall)
    .filter((game) => {
      if (!query) {
        return true;
      }
      const searchText = [
        game.title,
        game.description,
        game.hallName,
        game.hallId,
        ...getGameModelSearchTerms(game),
        ...(game.tags ?? [])
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      return searchText.includes(query);
    });

  return filtered.sort((a, b) => {
    if (state.sortOrder === "number-asc") {
      return (a.number ?? 0) - (b.number ?? 0);
    }
    if (state.sortOrder === "title-asc") {
      return String(a.title ?? "").localeCompare(String(b.title ?? ""));
    }
    if (state.sortOrder === "model-asc") {
      return String(a.provenance?.modelName ?? "").localeCompare(String(b.provenance?.modelName ?? ""));
    }
    return (b.number ?? 0) - (a.number ?? 0);
  });
}

function populateHallFilter(games) {
  const halls = [...new Map(games.map((game) => [game.hallId, game.hallName ?? game.hallId])).entries()]
    .filter(([id]) => id)
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const options = [new Option("All halls", "all")];
  options.push(...halls.map(([id, name]) => new Option(name, id)));
  hallFilter.replaceChildren(...options);
}

function readFilterStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const requestedModel = params.get("model") ?? "all";
  const validFamilySelection = state.modelFamilies.some((family) => getModelFamilySelection(family) === requestedModel);
  state.selectedModel = requestedModel === "all" || validFamilySelection || state.models.some((model) => model.modelName === requestedModel)
    ? requestedModel
    : "all";
  state.selectedHall = params.get("hall") ?? "all";
  state.searchQuery = (params.get("q") ?? "").trim();
  state.sortOrder = ["number-desc", "number-asc", "title-asc", "model-asc"].includes(params.get("sort"))
    ? params.get("sort")
    : "number-desc";
  state.viewMode = params.get("view") === "poster" ? "poster" : "evidence";
}

function getGameModelSearchTerms(game) {
  const entries = [
    [game.provenance?.modelName, game.provenance?.agentName],
    ...(game.variants ?? []).map((variant) => [variant.modelName, variant.agentName])
  ];

  return entries.flatMap(([modelName, agentName]) => {
    const family = getModelFamily(modelName);
    return [modelName, agentName, family.name, family.providerName];
  });
}

function syncFilterControls() {
  searchInput.value = state.searchQuery;
  hallFilter.value = [...hallFilter.options].some((option) => option.value === state.selectedHall)
    ? state.selectedHall
    : "all";
  if (hallFilter.value === "all" && state.selectedHall !== "all") {
    state.selectedHall = "all";
  }
  sortSelect.value = state.sortOrder;
  screenshotView.setAttribute("aria-pressed", state.viewMode === "evidence" ? "true" : "false");
  posterView.setAttribute("aria-pressed", state.viewMode === "poster" ? "true" : "false");
}

function buildLibraryUrl(slug = "") {
  const params = new URLSearchParams();
  if (state.selectedModel !== "all") {
    params.set("model", state.selectedModel);
  }
  if (state.selectedHall !== "all") {
    params.set("hall", state.selectedHall);
  }
  if (state.searchQuery) {
    params.set("q", state.searchQuery);
  }
  if (state.sortOrder !== "number-desc") {
    params.set("sort", state.sortOrder);
  }
  if (state.viewMode === "poster") {
    params.set("view", "poster");
  }
  const queryString = params.toString();
  const query = queryString ? `?${queryString}` : "";
  const hash = slug ? `#${encodeURIComponent(slug)}` : "";
  return `./library.html${query}${hash}`;
}

function hasDefaultFilters() {
  return state.selectedModel === "all" && state.selectedHall === "all" && !state.searchQuery;
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
  if (!getFilteredGames().some((game) => game.slug === slug)) {
    state.selectedModel = "all";
    state.selectedHall = "all";
    state.searchQuery = "";
    renderModels();
    renderLibrary();
    return;
  }

  state.filteredGames = getFilteredGames();
  state.selectedIndex = findSelectedIndex();
  updateSelection({ scroll: false });
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

function renderNotice() {
  if (!state.notice) {
    clearPanelMessage(errorPanel);
    return;
  }

  showPanelMessage(errorPanel, state.notice);
}

function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);
}

function showError(message) {
  showPanelMessage(errorPanel, message);
  libraryStatus.textContent = "Archive unavailable";
  track.replaceChildren(createNotice("No observation cards can be rendered until the manifest loads."));
  timeline.replaceChildren();
  currentReadout.replaceChildren();
  currentTitle.textContent = "Archive unavailable";
  playSelected.href = "./library.html";
  viewRecord.href = "./library.html";
  viewPromo.href = "./library.html";
  openMetadata.href = getManifestHref();
}
