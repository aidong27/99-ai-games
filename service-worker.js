const CACHE_NAME = "99ag-shell-2026-07-14-resonance-loom";
const SHELL_PATHS = [
  "./",
  "./index.html",
  "./library.html",
  "./compare.html",
  "./press.html",
  "./log.html",
  "./observation.html",
  "./play.html",
  "./404.html",
  "./favicon.ico",
  "./manifest.webmanifest",
  "./games/manifest.json",
  "./halls/halls.json",
  "./styles/tokens.css?v=2026-07-14-resonance-loom",
  "./styles/base.css?v=2026-07-14-resonance-loom",
  "./styles/layout.css?v=2026-07-14-resonance-loom",
  "./styles/components.css?v=2026-07-14-resonance-loom",
  "./styles/archive-pages.css?v=2026-07-14-resonance-loom",
  "./styles/archive.css?v=2026-07-14-resonance-loom",
  "./styles/pages/home.css?v=2026-07-14-resonance-loom",
  "./src/theme.js?v=2026-07-14-resonance-loom",
  "./src/i18n.js?v=2026-07-14-resonance-loom",
  "./src/pwa.js?v=2026-07-14-resonance-loom",
  "./src/archive-data.js",
  "./src/archive-effects.js",
  "./src/main.js?v=2026-07-14-resonance-loom",
  "./src/library.js?v=2026-07-14-resonance-loom",
  "./src/compare.js?v=2026-07-14-resonance-loom",
  "./src/press.js?v=2026-07-14-resonance-loom",
  "./src/log.js?v=2026-07-14-resonance-loom",
  "./src/observation.js?v=2026-07-14-resonance-loom",
  "./src/play.js?v=2026-07-14-resonance-loom",
  "./src/share.js",
  "./src/app/constants.js",
  "./src/app/routes.js",
  "./src/data/device-support.js",
  "./src/data/media-evidence.js",
  "./src/data/model-families.js",
  "./src/data/paths.js",
  "./src/data/view-models.js",
  "./src/ui/badges.js",
  "./src/ui/buttons.js",
  "./src/ui/cards.js",
  "./src/ui/dom.js",
  "./src/ui/layout.js",
  "./src/ui/meta.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheArchiveShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./404.html"));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) ?? cache.match(fallbackPath);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached ?? Response.error());
  return cached ?? network;
}

async function precacheArchiveShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(SHELL_PATHS);
  const manifestResponse = await cache.match("./games/manifest.json");
  if (!manifestResponse) {
    return;
  }
  const manifest = await manifestResponse.json();
  const metadataPaths = (manifest.games ?? [])
    .map((game) => String(game.metadataPath ?? `./games/${game.slug}/game.json`).replace(/^\.\//, "./"));
  await cache.addAll(metadataPaths);
}
