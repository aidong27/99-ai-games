/*
 * Retired offline-shell migration.
 *
 * Existing installations may still request this path. Activate once, remove
 * every old 99 AI Games shell cache, unregister, and leave future requests to
 * the network so generated Protocol 99 evidence cannot be masked by stale data.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("99ag-shell-"))
        .map((key) => caches.delete(key))
    );
    await self.registration.unregister();
    await self.clients.claim();
  })());
});
