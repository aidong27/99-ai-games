import {
  getArchiveStats,
  loadArchive,
  selectFeaturedGame
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
const canvas = document.querySelector("#title-signal");
const signalField = createSignalField(canvas, { variant: "title", density: 32 });

loadTitleData();
signalField.start();
setupShareControls();

document.addEventListener("keydown", (event) => {
  const active = document.activeElement;
  const isBodyFocus = !active || active === document.body || active === document.documentElement;
  if (!isBodyFocus || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    window.location.href = enterLink?.href ?? "./library.html";
  }
});

window.addEventListener("pagehide", () => signalField.destroy(), { once: true });

async function loadTitleData() {
  try {
    const { manifest, games } = await loadArchive();
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
  } catch (error) {
    setText(titleFeatured, `Manifest unavailable: ${error.message}`);
  }
}

function setText(element, value) {
  if (element) {
    element.textContent = String(value);
  }
}
