const MANIFEST_HREF = "./games/manifest.json";
const DEFAULT_TARGET_COUNT = 99;

export async function loadArchive() {
  const manifest = await fetchJson(MANIFEST_HREF, "games/manifest.json");
  const entries = Array.isArray(manifest.games) ? manifest.games : [];
  const games = await Promise.all(entries.map((entry) => loadGame(entry)));

  return {
    manifest,
    games,
    playableGames: games.filter((game) => game.status === "playable")
  };
}

export async function loadHalls(manifest) {
  const href = normalizeRootPath(manifest?.hallsPath ?? "./halls/halls.json");
  try {
    const data = await fetchJson(href, "halls.json");
    return Array.isArray(data?.halls) ? data.halls : [];
  } catch {
    return [];
  }
}

export async function getGameBySlug(slug) {
  const archive = await loadArchive();
  const game = archive.games.find((entry) => entry.slug === slug);
  return { ...archive, game };
}

export async function loadRunRecords(game) {
  const records = Array.isArray(game?.runRecords) ? game.runRecords : [];
  const loaded = await Promise.all(records.map(async (runPath, index) => {
    const href = getRunRecordHref(game, runPath);
    try {
      const record = await fetchJson(href, href);
      return {
        ...record,
        _href: href,
        _index: index,
        _runId: record.runId ?? fileStem(href)
      };
    } catch (error) {
      return {
        _href: href,
        _index: index,
        _runId: fileStem(href),
        _loadError: error.message
      };
    }
  }));

  return loaded;
}

export function getArchiveStats(manifest, games) {
  const playableCount = games.filter((game) => game.status === "playable").length;
  const mobileSupportedCount = games.filter((game) => getMobileSupportInfo(game).key === "supported").length;
  const variantCount = games.reduce((total, game) => total + (game.variants?.length ?? 0), 0);
  const runCount = games.reduce((total, game) => total + (game.runRecords?.length ?? 0), 0);
  const targetCount = manifest.targetGameCount ?? DEFAULT_TARGET_COUNT;

  return {
    observationCount: games.length,
    playableCount,
    mobileSupportedCount,
    variantCount,
    runCount,
    targetCount,
    reservedCount: Math.max(0, targetCount - games.length)
  };
}

export function getModelsFromGames(games) {
  const models = new Map();

  for (const game of games) {
    registerModel(models, game.provenance?.modelName, game.provenance?.agentName, game);

    for (const variant of game.variants ?? []) {
      registerModel(models, variant.modelName, variant.agentName, game);
    }
  }

  return [...models.values()].sort((a, b) => {
    const firstNumber = Math.min(...a.games.map((game) => game.number ?? 999));
    const secondNumber = Math.min(...b.games.map((game) => game.number ?? 999));
    return firstNumber - secondNumber || a.modelName.localeCompare(b.modelName);
  });
}

export function filterGamesByModel(games, modelName) {
  if (!modelName || modelName === "all") {
    return games;
  }

  return games.filter((game) => {
    if (game.provenance?.modelName === modelName) {
      return true;
    }
    return (game.variants ?? []).some((variant) => variant.modelName === modelName);
  });
}

export function selectFeaturedGame(games) {
  const playable = games
    .filter((game) => game.status === "playable")
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0));

  if (!playable.length) {
    return [...games].sort((a, b) => (b.number ?? 0) - (a.number ?? 0))[0] ?? null;
  }

  if (isMobileRuntime()) {
    return playable.find((game) => getMobileSupportInfo(game).key === "supported")
      ?? playable.find((game) => getMobileSupportInfo(game).key === "limited")
      ?? playable[0];
  }

  return playable[0];
}

export function getGameNumberLabel(game) {
  const label = String(game?.number ?? "?").padStart(3, "0");
  return `Observation ${label} / Game ${label}`;
}

export function getShortGameNumber(game) {
  return `OBS ${String(game?.number ?? "?").padStart(3, "0")}`;
}

export function getLaunchHref(game) {
  return ensureTrailingSlash(normalizeRootPath(game?.localPath ?? `./games/${game?.slug ?? ""}/`));
}

export function getPlayGateHref(game) {
  return `./play.html?slug=${encodeURIComponent(game?.slug ?? "")}`;
}

export function getObservationHref(game) {
  return `./observation.html?slug=${encodeURIComponent(game?.slug ?? "")}`;
}

export function getLibrarySelectionHref(gameOrSlug) {
  const slug = typeof gameOrSlug === "string" ? gameOrSlug : gameOrSlug?.slug;
  return slug ? `./library.html#${encodeURIComponent(slug)}` : "./library.html";
}

export function getManifestHref() {
  return MANIFEST_HREF;
}

export function getSlugFromSearch(search = globalThis.window?.location?.search ?? "") {
  return new URLSearchParams(search).get("slug") ?? "";
}

export function getMetadataHref(game) {
  return normalizeRootPath(game?.metadataPath ?? `${getLaunchHref(game)}game.json`);
}

export function getRunRecordHref(game, runPath) {
  if (!runPath) {
    return "";
  }
  if (isExternalOrRootPath(runPath)) {
    return normalizeRootPath(runPath);
  }

  const clean = String(runPath).replace(/^\.\//, "");
  if (clean.startsWith("games/")) {
    return `./${clean}`;
  }

  return `${getLaunchHref(game)}${clean}`;
}

export function getVariantHref(game, variantPath) {
  if (!variantPath) {
    return "";
  }
  if (isExternalOrRootPath(variantPath)) {
    return normalizeRootPath(variantPath);
  }

  const clean = String(variantPath).replace(/^\.\//, "");
  if (clean.startsWith("games/")) {
    return `./${clean}`;
  }

  return `${getLaunchHref(game)}${clean}`;
}

export function getScreenshotHref(game, preferredPath) {
  const path = preferredPath
    ?? game?.media?.thumbnail
    ?? game?.media?.screenshots?.[0]
    ?? game?.screenshots?.[0];
  return resolveGameAsset(game, path);
}

export function getScreenshotList(game) {
  const screenshots = game?.media?.screenshots ?? game?.screenshots ?? [];
  return screenshots.map((path) => ({
    path,
    href: resolveGameAsset(game, path)
  })).filter((entry) => entry.href);
}

export function resolveGameAsset(game, assetPath) {
  if (!assetPath) {
    return "";
  }

  if (isExternalOrRootPath(assetPath)) {
    return normalizeRootPath(assetPath);
  }

  const clean = String(assetPath).replace(/^\.\//, "");
  if (clean.startsWith("games/")) {
    return `./${clean}`;
  }

  return `${getLaunchHref(game)}${clean}`;
}

export function getDeviceSupport(game) {
  const support = game?.deviceSupport ?? {};
  return {
    desktop: support.desktop ?? "limited",
    mobile: support.mobile ?? "limited",
    minViewport: support.minViewport ?? { width: 390, height: 700 },
    inputs: Array.isArray(support.inputs) ? support.inputs : [],
    mobileNotes: support.mobileNotes ?? "Device support metadata is incomplete.",
    launcherPolicy: support.launcherPolicy ?? "warn"
  };
}

export function getMobileSupportInfo(game) {
  const support = getDeviceSupport(game);

  if (support.mobile === "unsupported" || support.launcherPolicy === "block") {
    return {
      key: "unsupported",
      label: "Desktop recommended",
      shortLabel: "Desktop",
      tone: "danger",
      ctaLabel: "Desktop recommended",
      requiresWarning: true,
      blocksMobileStart: true,
      note: support.mobileNotes
    };
  }

  if (support.mobile === "limited" || support.launcherPolicy === "warn") {
    return {
      key: "limited",
      label: "Mobile limited",
      shortLabel: "Limited",
      tone: "warning",
      ctaLabel: "Play with warning",
      requiresWarning: true,
      blocksMobileStart: false,
      note: support.mobileNotes
    };
  }

  return {
    key: "supported",
    label: "Mobile supported",
    shortLabel: "Mobile ready",
    tone: "accent",
    ctaLabel: "Play",
    requiresWarning: false,
    blocksMobileStart: false,
    note: support.mobileNotes
  };
}

export function getRuntimeLaunchState(game) {
  const support = getDeviceSupport(game);
  if (!isMobileRuntime()) {
    return {
      key: support.desktop === "unsupported" ? "unsupported" : support.desktop,
      label: support.desktop === "unsupported" ? "Device unsupported" : "Desktop supported",
      canStart: support.desktop !== "unsupported",
      needsExplicitOpen: false,
      note: support.mobileNotes
    };
  }

  const mobile = getMobileSupportInfo(game);
  return {
    key: mobile.key,
    label: mobile.label,
    canStart: !mobile.blocksMobileStart,
    needsExplicitOpen: mobile.blocksMobileStart,
    note: mobile.note
  };
}

export function formatDate(value) {
  if (!value) {
    return "Date unrecorded";
  }
  return String(value);
}

export function toTitle(value = "unknown") {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function isMobileRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const narrow = window.matchMedia?.("(max-width: 740px)").matches ?? window.innerWidth <= 740;
  const touchTablet = (navigator.maxTouchPoints ?? 0) > 0 && window.innerWidth <= 1024;
  return narrow || touchTablet;
}

async function loadGame(entry) {
  const metadataHref = getMetadataHref(entry);

  try {
    const gameJson = await fetchJson(metadataHref, metadataHref);
    return normalizeGame({ ...entry, ...gameJson }, entry, metadataHref);
  } catch (error) {
    return normalizeGame({
      ...entry,
      _metadataError: error.message
    }, entry, metadataHref);
  }
}

function normalizeGame(game, manifestEntry = {}, metadataHref = "") {
  const slug = game.slug ?? manifestEntry.slug;
  const localPath = game.localPath ?? manifestEntry.localPath ?? `./games/${slug}/`;
  const metadataPath = game.metadataPath ?? manifestEntry.metadataPath ?? metadataHref;

  return {
    ...game,
    slug,
    localPath: ensureTrailingSlash(normalizeRootPath(localPath)),
    metadataPath: normalizeRootPath(metadataPath),
    _manifestEntry: manifestEntry,
    _metadataHref: metadataHref
  };
}

function registerModel(models, modelName, agentName, game) {
  if (!modelName) {
    return;
  }

  if (!models.has(modelName)) {
    models.set(modelName, {
      modelName,
      agents: new Set(),
      games: []
    });
  }

  const model = models.get(modelName);
  if (agentName) {
    model.agents.add(agentName);
  }
  if (!model.games.some((entry) => entry.slug === game.slug)) {
    model.games.push(game);
  }
}

// The launcher is a multi-page static app, so every navigation (title -> library
// -> observation -> play) used to refetch the manifest and every game.json. A
// per-session cache keyed by the deployed asset version removes that waterfall
// while staying fresh across deploys (the version changes when assets change).
// An in-memory promise map also dedupes concurrent requests within a page.
const ASSET_VERSION = "2026-06-14-claude4";
const memoryCache = new Map();

function cacheKey(href) {
  return `aa:${ASSET_VERSION}:${href}`;
}

function readSessionCache(href) {
  try {
    const raw = globalThis.sessionStorage?.getItem(cacheKey(href));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(href, value) {
  try {
    globalThis.sessionStorage?.setItem(cacheKey(href), JSON.stringify(value));
  } catch {
    // Storage may be unavailable or full; the in-memory cache still applies.
  }
}

function fetchJson(href, label) {
  if (memoryCache.has(href)) {
    return memoryCache.get(href);
  }

  const cached = readSessionCache(href);
  if (cached) {
    const resolved = Promise.resolve(cached);
    memoryCache.set(href, resolved);
    return resolved;
  }

  const request = fetch(href, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`${label} failed with HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((value) => {
      writeSessionCache(href, value);
      return value;
    })
    .catch((error) => {
      memoryCache.delete(href);
      throw error;
    });

  memoryCache.set(href, request);
  return request;
}

function normalizeRootPath(value) {
  if (!value) {
    return "";
  }

  const path = String(value);
  if (/^(?:https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("./")) {
    return path;
  }
  return `./${path}`;
}

function isExternalOrRootPath(value) {
  const path = String(value);
  return /^(?:https?:)?\/\//.test(path)
    || path.startsWith("/")
    || path.startsWith("./games/")
    || path.startsWith("games/");
}

function ensureTrailingSlash(path) {
  return path.endsWith("/") ? path : `${path}/`;
}

function fileStem(href) {
  const fileName = String(href).split("/").pop() ?? "run-record";
  return fileName.replace(/\.json$/, "");
}
