import { ASSET_VERSION } from "./app/constants.js";
import { ROUTES, librarySelectionRoute, observationRoute, playGateRoute, promoRoute } from "./app/routes.js";
import { ensureTrailingSlash, fileStem, isExternalOrRootPath, normalizeRootPath } from "./data/paths.js";

export {
  getDeviceSupport,
  getMobileSupportInfo,
  getRuntimeLaunchState,
  isMobileRuntime
} from "./data/device-support.js";

export {
  filterGamesByModel,
  formatDate,
  getArchiveStats,
  getGameNumberLabel,
  getGameStatusLabel,
  getModelsFromGames,
  getShortGameNumber,
  selectFeaturedGame,
  toTitle
} from "./data/view-models.js";

export async function loadArchive() {
  const manifest = await fetchJson(ROUTES.manifest, "games/manifest.json");
  const entries = Array.isArray(manifest.games) ? manifest.games : [];
  const games = await Promise.all(entries.map((entry) => loadGame(entry)));

  return {
    manifest,
    games,
    playableGames: games.filter((game) => game.status === "playable")
  };
}

export async function loadHalls(manifest) {
  const href = normalizeRootPath(manifest?.hallsPath ?? ROUTES.halls);
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

export function getLaunchHref(game) {
  return ensureTrailingSlash(normalizeRootPath(game?.localPath ?? `./games/${game?.slug ?? ""}/`));
}

export function getPlayGateHref(game) {
  return playGateRoute(game?.slug);
}

export function getObservationHref(game) {
  return observationRoute(game?.slug);
}

export function getPromoHref(game) {
  return promoRoute(game?.slug);
}

export function getLibrarySelectionHref(gameOrSlug) {
  const slug = typeof gameOrSlug === "string" ? gameOrSlug : gameOrSlug?.slug;
  return librarySelectionRoute(slug);
}

export function getManifestHref() {
  return ROUTES.manifest;
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

// The launcher is a multi-page static app, so every navigation (title -> library
// -> observation -> play) used to refetch the manifest and every game.json. A
// per-session cache keyed by the deployed asset version removes that waterfall
// while staying fresh across deploys (the version changes when assets change).
// An in-memory promise map also dedupes concurrent requests within a page.
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
