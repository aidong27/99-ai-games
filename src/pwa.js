/*
 * Protocol 99 cache migration.
 *
 * The earlier archive shipped an offline shell whose fixed cache key could keep
 * launcher scripts older than generated benchmark data. Protocol 99 favors
 * current, verifiable evidence over offline installation, so this module
 * removes the legacy worker and its caches. It can be deleted after deployed
 * clients have had a reasonable migration window.
 */
void clearLegacyOfflineShell();

for (const button of document.querySelectorAll("[data-install-app]")) {
  button.hidden = true;
}

async function clearLegacyOfflineShell() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys().catch(() => []);
    await Promise.all(
      keys
        .filter((key) => key.startsWith("99ag-shell-"))
        .map((key) => caches.delete(key))
    );
  }
}
