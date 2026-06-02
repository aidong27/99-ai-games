const gameList = document.querySelector("#game-list");
const featuredGame = document.querySelector("#featured-game");
const collectionStatus = document.querySelector("#collection-status");
const filterSummary = document.querySelector("#filter-summary");
const completedCount = document.querySelector("#completed-count");
const targetCount = document.querySelector("#target-count");
const hallCount = document.querySelector("#hall-count");
const variantCount = document.querySelector("#variant-count");
const runCount = document.querySelector("#run-count");
const latestTitle = document.querySelector("#latest-title");
const scopeModel = document.querySelector("#scope-model");
const latestLaunch = document.querySelector("#latest-launch");
const hallFilter = document.querySelector("#hall-filter");
const statusFilter = document.querySelector("#status-filter");
const deviceFilter = document.querySelector("#device-filter");
const deviceDialog = document.querySelector("#device-dialog");
const deviceDialogTitle = document.querySelector("#device-dialog-title");
const deviceDialogCopy = document.querySelector("#device-dialog-copy");
const deviceDialogOpen = document.querySelector("#device-dialog-open");
const scopeCanvas = document.querySelector("#scope-canvas");
const scopeCtx = scopeCanvas?.getContext("2d");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileViewportQuery = window.matchMedia("(max-width: 740px)");

const archive = {
  manifest: null,
  games: [],
  filters: {
    hall: "all",
    status: "all",
    device: "all"
  }
};

const scopeNodes = Array.from({ length: 18 }, (_, index) => ({
  x: 58 + (index * 149) % 610,
  y: 52 + (index * 83) % 315,
  size: 3 + index % 4,
  phase: index * 0.61
}));

let scopeFrame = 0;

hallFilter?.addEventListener("change", () => {
  archive.filters.hall = hallFilter.value;
  renderGameList();
});

statusFilter?.addEventListener("change", () => {
  archive.filters.status = statusFilter.value;
  renderGameList();
});

deviceFilter?.addEventListener("change", () => {
  archive.filters.device = deviceFilter.value;
  renderGameList();
});

document.addEventListener("click", handleLaunchAction);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopScope();
  } else {
    startScope();
  }
});

mobileViewportQuery.addEventListener("change", () => {
  if (archive.manifest) {
    renderCollection(archive.manifest);
  }
});

reduceMotionQuery.addEventListener("change", () => {
  stopScope();
  startScope();
});

loadManifest();
startScope();

async function loadManifest() {
  try {
    const response = await fetch("./games/manifest.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Manifest request failed with HTTP ${response.status}`);
    }

    const manifest = await response.json();
    renderCollection(manifest);
  } catch (error) {
    renderError(error);
  }
}

function renderCollection(manifest) {
  const games = Array.isArray(manifest.games) ? manifest.games : [];
  const playable = games.filter((game) => game.status === "playable");
  const variants = games.reduce((total, game) => total + (game.variants?.length ?? 0), 0);
  const runs = games.reduce((total, game) => total + (game.runRecords?.length ?? 0), 0);
  const featured = selectFeaturedGame(games);

  archive.manifest = manifest;
  archive.games = games;

  completedCount.textContent = String(playable.length);
  targetCount.textContent = String(manifest.targetGameCount ?? 99);
  hallCount.textContent = String(manifest.hallCount ?? 9);
  variantCount.textContent = String(variants);
  runCount.textContent = String(runs);
  collectionStatus.textContent = `${pluralize(playable.length, "playable sample")}, ${pluralize(variants, "variant")}, ${pluralize(runs, "run record")}`;

  populateFilters(games);
  renderFeatured(featured);
  renderGameList();
}

function populateFilters(games) {
  replaceOptions(hallFilter, [
    ["all", "All halls"],
    ...uniqueBy(games, (game) => game.hallId).map((game) => [game.hallId, game.hallName ?? game.hallId])
  ], archive.filters.hall);

  replaceOptions(statusFilter, [
    ["all", "All statuses"],
    ...uniqueValues(games.map((game) => game.status)).map((status) => [status, toTitle(status)])
  ], archive.filters.status);
}

function replaceOptions(select, options, selected) {
  if (!select) {
    return;
  }

  const validValues = new Set(options.map(([value]) => value));
  if (!validValues.has(selected)) {
    selected = "all";
  }

  select.replaceChildren(...options.map(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === selected;
    return option;
  }));
}

function renderFeatured(game) {
  if (!game) {
    featuredGame.replaceChildren(createNotice("No playable observation samples are listed yet."));
    latestTitle.textContent = "No observation loaded";
    scopeModel.textContent = "Manifest has no playable games";
    latestLaunch.href = "#games";
    latestLaunch.textContent = "Browse archive";
    return;
  }

  const access = getDeviceAccess(game);
  featuredGame.replaceChildren(createGameCard(game, { featured: true }));
  latestTitle.textContent = game.title ?? "Untitled observation";
  scopeModel.textContent = `${game.provenance?.modelName ?? "Unknown model"} / ${game.provenance?.agentName ?? "Unknown agent"}`;

  if (access.kind === "allow") {
    latestLaunch.href = getLaunchHref(game);
    latestLaunch.textContent = isMobileContext() ? "Play selected game" : "Open selected game";
  } else {
    latestLaunch.href = "#featured";
    latestLaunch.textContent = access.kind === "warn" ? "Review mobile warning" : "Desktop recommended";
  }
}

function renderGameList() {
  const filtered = filterGames(archive.games);
  const total = archive.games.length;
  const label = filtered.length === total
    ? pluralize(total, "observation sample")
    : `${filtered.length} of ${pluralize(total, "observation sample")} shown`;

  filterSummary.textContent = label;

  if (!filtered.length) {
    gameList.replaceChildren(createNotice("No observation samples match the current filters."));
    return;
  }

  gameList.replaceChildren(...filtered.map((game) => createGameCard(game)));
}

function filterGames(games) {
  return games.filter((game) => {
    if (archive.filters.hall !== "all" && game.hallId !== archive.filters.hall) {
      return false;
    }
    if (archive.filters.status !== "all" && game.status !== archive.filters.status) {
      return false;
    }
    if (archive.filters.device !== "all" && getDeviceFilterState(game) !== archive.filters.device) {
      return false;
    }
    return true;
  });
}

function selectFeaturedGame(games) {
  const playable = games
    .filter((game) => game.status === "playable")
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0));

  if (!playable.length) {
    return games.slice().sort((a, b) => (b.number ?? 0) - (a.number ?? 0))[0] ?? null;
  }

  if (isMobileContext()) {
    return playable.find((game) => getDeviceAccess(game).kind === "allow")
      ?? playable.find((game) => getDeviceAccess(game).kind === "warn")
      ?? playable[0];
  }

  return playable[0];
}

function createGameCard(game, options = {}) {
  const access = getDeviceAccess(game);
  const article = document.createElement("article");
  article.className = options.featured ? "game-card featured-card" : "game-card";

  const thumb = createThumbnail(game);

  const body = document.createElement("div");
  body.className = "card-body";
  body.append(
    createText("span", "game-number", formatObservation(game.number)),
    createText(options.featured ? "h3" : "h3", "", game.title ?? "Untitled observation"),
    createText("p", "game-description", game.description ?? "No description recorded."),
    createBadgeRow(game, access),
    createMetadataBlock(game),
    createText("p", "mobile-note", getDeviceSupport(game).mobileNotes ?? "Device support notes are not recorded."),
    createActions(game, access)
  );

  article.append(thumb, body);
  return article;
}

function createThumbnail(game) {
  const wrapper = document.createElement("div");
  wrapper.className = "thumbnail";

  const thumbnailPath = resolveAssetPath(game, game.media?.thumbnail ?? game.screenshots?.[0]);
  if (!thumbnailPath) {
    wrapper.append(createThumbFallback("No verified screenshot listed"));
    return wrapper;
  }

  const img = document.createElement("img");
  img.src = thumbnailPath;
  img.alt = `${game.title ?? "Game"} verified screenshot thumbnail`;
  img.loading = "lazy";
  img.addEventListener("error", () => {
    wrapper.replaceChildren(createThumbFallback("Screenshot path missing"));
  }, { once: true });
  wrapper.append(img);
  return wrapper;
}

function createThumbFallback(text) {
  const fallback = document.createElement("div");
  fallback.className = "thumbnail-fallback";
  fallback.textContent = text;
  return fallback;
}

function createBadgeRow(game, access) {
  const row = document.createElement("div");
  row.className = "badge-row";
  row.append(
    createBadge(game.statusLabel ?? toTitle(game.status ?? "unknown"), "status"),
    createBadge(game.hallName ?? game.hallId ?? "Hall unknown", "hall"),
    createBadge(access.badge, access.tone),
    createBadge(game.provenance?.modelName ?? "Model unrecorded", "model")
  );
  return row;
}

function createBadge(text, tone) {
  const badge = document.createElement("span");
  badge.className = `badge ${tone}`;
  badge.textContent = text;
  return badge;
}

function createMetadataBlock(game) {
  const provenance = game.provenance ?? {};
  const metadata = document.createElement("dl");
  metadata.className = "metadata";
  metadata.append(
    createMetadata("Agent", provenance.agentName),
    createMetadata("Hall", game.hallName ?? game.hallId),
    createMetadata("Status", game.statusLabel ?? game.status),
    createMetadata("Variant", game.canonicalVariantId),
    createMetadata("Runs", String(game.runRecords?.length ?? 0)),
    createMetadata("Source", game.sourceCompleteness)
  );
  return metadata;
}

function createMetadata(label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value ?? "Unknown";
  row.append(term, description);
  return row;
}

function createActions(game, access) {
  const actions = document.createElement("div");
  actions.className = "card-actions";

  if (access.kind === "allow") {
    actions.append(createLink(isMobileContext() ? "Play" : "Open game", getLaunchHref(game), "button primary"));
  } else if (access.kind === "warn") {
    actions.append(createActionButton("Play with warning", "warn", game.slug, "button primary"));
  } else {
    const disabled = createActionButton(access.label, "blocked", game.slug, "button primary disabled");
    disabled.disabled = true;
    disabled.setAttribute("aria-disabled", "true");
    actions.append(disabled);
  }

  actions.append(createLink("Open metadata", getMetadataHref(game), "button secondary"));

  if (access.kind === "blocked") {
    actions.append(createActionButton("Open anyway", "open-anyway", game.slug, "button warning"));
  }

  return actions;
}

function createActionButton(label, action, slug, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.launchAction = action;
  button.dataset.gameSlug = slug ?? "";
  return button;
}

function createLink(label, href, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = href;
  link.textContent = label;
  return link;
}

function createNotice(message) {
  const notice = document.createElement("p");
  notice.className = "notice";
  notice.textContent = message;
  return notice;
}

function createText(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text ?? "";
  return element;
}

function handleLaunchAction(event) {
  const control = event.target.closest("[data-launch-action]");
  if (!control) {
    return;
  }

  const game = archive.games.find((item) => item.slug === control.dataset.gameSlug);
  if (!game) {
    return;
  }

  const action = control.dataset.launchAction;
  if (action === "warn" || action === "open-anyway") {
    event.preventDefault();
    showDeviceDialog(game, getDeviceAccess(game), action);
  }
}

function showDeviceDialog(game, access, action) {
  const support = getDeviceSupport(game);
  const title = action === "open-anyway" ? "This game is not mobile-ready" : "Mobile support is limited";
  const copy = support.mobileNotes ?? access.detail;
  const href = getLaunchHref(game);

  if (!deviceDialog || typeof deviceDialog.showModal !== "function") {
    if (window.confirm(`${title}\n\n${copy}\n\nOpen anyway?`)) {
      window.location.href = href;
    }
    return;
  }

  deviceDialogTitle.textContent = title;
  deviceDialogCopy.textContent = copy;
  deviceDialogOpen.href = href;
  deviceDialog.showModal();
}

function getDeviceAccess(game) {
  const support = getDeviceSupport(game);
  const status = isMobileContext() ? support.mobile : support.desktop;
  const policy = support.launcherPolicy;

  if (status === "unsupported" || (isMobileContext() && policy === "block")) {
    return {
      kind: "blocked",
      tone: "blocked",
      badge: isMobileContext() ? "Desktop recommended" : "Device unsupported",
      label: isMobileContext() ? "Desktop recommended" : "Unavailable",
      detail: support.mobileNotes ?? "This game is not ready for the current device."
    };
  }

  if (status === "limited" || (isMobileContext() && policy === "warn")) {
    return {
      kind: "warn",
      tone: "limited",
      badge: isMobileContext() ? "Mobile limited" : "Limited support",
      label: "Play with warning",
      detail: support.mobileNotes ?? "This game has limited support on the current device."
    };
  }

  return {
    kind: "allow",
    tone: isMobileContext() ? "supported" : "desktop",
    badge: isMobileContext() ? "Mobile supported" : "Desktop supported",
    label: "Play",
    detail: support.mobileNotes ?? "Device support is available."
  };
}

function getDeviceSupport(game) {
  return {
    desktop: game.deviceSupport?.desktop ?? "limited",
    mobile: game.deviceSupport?.mobile ?? "limited",
    minViewport: game.deviceSupport?.minViewport ?? { width: 390, height: 700 },
    inputs: Array.isArray(game.deviceSupport?.inputs) ? game.deviceSupport.inputs : [],
    mobileNotes: game.deviceSupport?.mobileNotes ?? "Device support metadata is incomplete.",
    launcherPolicy: game.deviceSupport?.launcherPolicy ?? "warn"
  };
}

function getDeviceFilterState(game) {
  const support = getDeviceSupport(game);
  if (support.mobile === "supported" && support.launcherPolicy === "allow") {
    return "mobile-supported";
  }
  if (support.mobile === "limited" || support.launcherPolicy === "warn") {
    return "mobile-limited";
  }
  return "desktop-recommended";
}

function getLaunchHref(game) {
  return game.localPath ?? `./games/${game.slug}/`;
}

function getMetadataHref(game) {
  return game.metadataPath ?? `${ensureTrailingSlash(getLaunchHref(game))}game.json`;
}

function resolveAssetPath(game, assetPath) {
  if (!assetPath) {
    return "";
  }
  if (/^(?:https?:)?\/\//.test(assetPath) || assetPath.startsWith("/") || assetPath.startsWith("./games/")) {
    return assetPath;
  }
  return `${ensureTrailingSlash(getLaunchHref(game))}${assetPath.replace(/^\.\//, "")}`;
}

function ensureTrailingSlash(path) {
  return path.endsWith("/") ? path : `${path}/`;
}

function isMobileContext() {
  return mobileViewportQuery.matches || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);
}

function formatObservation(number) {
  const label = String(number ?? "?").padStart(3, "0");
  return `Observation ${label} / Game ${label}`;
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function toTitle(value = "unknown") {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = getKey(item);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function renderError(error) {
  collectionStatus.textContent = "Archive manifest could not be loaded";
  filterSummary.textContent = "The game library is unavailable until games/manifest.json loads.";
  featuredGame.replaceChildren(createNotice(`The observatory could not read games/manifest.json. ${error.message}`));
  gameList.replaceChildren(createNotice("No game cards can be rendered without manifest metadata."));
  latestTitle.textContent = "Manifest load failed";
  scopeModel.textContent = "Check games/manifest.json";
}

function startScope() {
  if (!scopeCtx || !scopeCanvas || scopeFrame || document.hidden) {
    return;
  }

  if (reduceMotionQuery.matches) {
    drawScope(0);
    return;
  }

  scopeFrame = requestAnimationFrame(animateScope);
}

function stopScope() {
  if (scopeFrame) {
    cancelAnimationFrame(scopeFrame);
    scopeFrame = 0;
  }
}

function animateScope(now = 0) {
  drawScope(now);
  scopeFrame = requestAnimationFrame(animateScope);
}

function drawScope(now = 0) {
  if (!scopeCtx || !scopeCanvas) {
    return;
  }

  const width = scopeCanvas.width;
  const height = scopeCanvas.height;
  const time = now / 1000;

  scopeCtx.clearRect(0, 0, width, height);
  scopeCtx.fillStyle = "#070a10";
  scopeCtx.fillRect(0, 0, width, height);

  drawScopeGrid(width, height, time);
  drawScopeLinks(time);
  drawScopeSweep(width, height, time);
  drawScopeNodes(time);
  drawScopeLabels(width, height, time);
}

function drawScopeGrid(width, height, time) {
  scopeCtx.strokeStyle = "rgba(91, 242, 215, 0.12)";
  scopeCtx.lineWidth = 1;

  for (let x = -80; x < width + 80; x += 42) {
    const offset = Math.sin(time * 0.6 + x * 0.04) * 5;
    scopeCtx.beginPath();
    scopeCtx.moveTo(x + offset, 0);
    scopeCtx.lineTo(x - 58 + offset, height);
    scopeCtx.stroke();
  }

  for (let y = 18; y < height; y += 38) {
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, y + Math.cos(time + y * 0.02) * 2);
    scopeCtx.lineTo(width, y + Math.sin(time + y * 0.02) * 2);
    scopeCtx.stroke();
  }
}

function drawScopeLinks(time) {
  for (let i = 0; i < scopeNodes.length; i += 1) {
    const node = scopeNodes[i];
    const next = scopeNodes[(i * 5 + 4) % scopeNodes.length];
    const intensity = 0.1 + Math.sin(time * 1.5 + node.phase) * 0.06;
    scopeCtx.strokeStyle = `rgba(255, 206, 102, ${intensity})`;
    scopeCtx.lineWidth = 1 + i % 2;
    scopeCtx.beginPath();
    scopeCtx.moveTo(node.x, node.y);
    scopeCtx.lineTo(next.x, next.y);
    scopeCtx.stroke();
  }
}

function drawScopeSweep(width, height, time) {
  const sweepX = (time * 82) % (width + 160) - 80;
  scopeCtx.strokeStyle = "rgba(74, 226, 255, 0.24)";
  scopeCtx.lineWidth = 28;
  scopeCtx.beginPath();
  scopeCtx.moveTo(sweepX, height);
  scopeCtx.lineTo(sweepX + 170, 0);
  scopeCtx.stroke();
}

function drawScopeNodes(time) {
  for (const node of scopeNodes) {
    const pulse = 1 + Math.sin(time * 2.8 + node.phase) * 0.22;
    scopeCtx.fillStyle = "rgba(91, 242, 215, 0.96)";
    scopeCtx.beginPath();
    scopeCtx.rect(node.x - node.size * pulse, node.y - node.size * pulse, node.size * 2 * pulse, node.size * 2 * pulse);
    scopeCtx.fill();
    scopeCtx.strokeStyle = "rgba(244, 247, 255, 0.45)";
    scopeCtx.stroke();
  }
}

function drawScopeLabels(width, height, time) {
  scopeCtx.fillStyle = "rgba(244, 247, 255, 0.82)";
  scopeCtx.font = "700 14px ui-sans-serif, system-ui";
  scopeCtx.fillText("AI GAMES OBSERVATORY", 22, 32);
  scopeCtx.fillText(`ARCHIVE T+${Math.floor(time).toString().padStart(4, "0")}`, width - 150, height - 24);
}
