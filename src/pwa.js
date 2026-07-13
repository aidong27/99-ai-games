const serviceWorkerUrl = new URL("../service-worker.js", import.meta.url);
const serviceWorkerScope = new URL("../", import.meta.url).pathname;
let installPrompt = null;

if ("serviceWorker" in navigator && (window.isSecureContext || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(serviceWorkerUrl, { scope: serviceWorkerScope }).catch(() => {
      // Offline support is progressive enhancement; the static site remains usable.
    });
  }, { once: true });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  setupInstallButtons();
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  updateInstallButtons();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupInstallButtons, { once: true });
} else {
  setupInstallButtons();
}

function setupInstallButtons() {
  for (const button of document.querySelectorAll("[data-install-app]")) {
    if (!button.dataset.installBound) {
      button.dataset.installBound = "true";
      button.addEventListener("click", installApp);
    }
  }
  updateInstallButtons();
}

function updateInstallButtons() {
  for (const button of document.querySelectorAll("[data-install-app]")) {
    button.hidden = !installPrompt;
  }
}

async function installApp() {
  if (!installPrompt) {
    return;
  }
  const prompt = installPrompt;
  installPrompt = null;
  await prompt.prompt();
  await prompt.userChoice;
  updateInstallButtons();
}
