import {
  getGameBySlug,
  getGameNumberLabel,
  getLaunchHref,
  getManifestHref,
  getMobileSupportInfo,
  getObservationHref,
  getPlayGateHref,
  getPromoHref,
  getRuntimeLaunchState,
  getScreenshotHref,
  getSlugFromSearch
} from "./archive-data.js";
import { createActionGroup, createActionLink, createDisabledButton } from "./ui/buttons.js";
import { createText } from "./ui/dom.js";
import { setDocumentMeta } from "./ui/meta.js";

const root = document.querySelector("#play-root");
let currentGate = null;

if (root) {
  loadGate();
}

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.key === "Escape" && currentGate?.recordHref) {
    event.preventDefault();
    window.location.href = currentGate.recordHref;
  }

  if (event.key === "Enter" && currentGate?.canStart && currentGate?.launchHref) {
    event.preventDefault();
    window.location.href = currentGate.launchHref;
  }
});

async function loadGate() {
  const slug = getSlugFromSearch();
  if (!slug) {
    renderError("No observation slug was provided.");
    return;
  }

  try {
    const { game } = await getGameBySlug(slug);
    if (!game) {
      renderError(`No observation sample exists for slug "${slug}".`);
      return;
    }
    renderGate(game);
  } catch (error) {
    renderError(`The observation gate could not load. ${error.message}`);
  }
}

function renderGate(game) {
  const launchState = getRuntimeLaunchState(game);
  const mobile = getMobileSupportInfo(game);
  currentGate = {
    canStart: launchState.canStart,
    launchHref: getLaunchHref(game),
    recordHref: getObservationHref(game)
  };

  const content = document.createElement("section");
  content.className = "play-gate-content";

  const copy = document.createElement("div");
  copy.className = "gate-copy";

  copy.append(
    createText("p", "archive-kicker", getGameNumberLabel(game)),
    createText("h1", "", game.title ?? "Untitled observation"),
    createText("p", "gate-description", game.description ?? "No description recorded."),
    createText("p", "gate-philosophy", "The games are playable. The real exhibit is the AI that made them."),
    createSupportNote(launchState, mobile),
    createGateActions(game, launchState)
  );

  content.append(createGateMedia(game, launchState), copy);

  root.replaceChildren(content);
  setDocumentMeta({
    title: game.title ?? "Untitled observation",
    section: "Start Observation",
    description: game.description ?? "Review device support before starting this playable AI game-making observation.",
    canonicalPath: getPlayGateHref(game),
    socialImagePath: `assets/social/games/${encodeURIComponent(game.slug)}.png`
  });
}

function createGateMedia(game, launchState) {
  const canOpen = launchState.canStart || launchState.needsExplicitOpen;
  const media = document.createElement(canOpen ? "a" : "div");
  media.className = "gate-media";
  if (canOpen) {
    media.href = getLaunchHref(game);
    media.setAttribute("aria-label", `Start ${game.title ?? "observation"}`);
  }

  const screenshot = getScreenshotHref(game);
  if (!screenshot) {
    media.append(createText("span", "image-fallback", "No verified screenshot"));
    return media;
  }

  const image = document.createElement("img");
  image.src = screenshot;
  image.alt = `${game.title ?? "Observation"} verified screenshot`;
  image.decoding = "async";
  image.addEventListener("error", () => {
    media.replaceChildren(createText("span", "image-fallback", "No verified screenshot"));
  }, { once: true });
  media.append(image);
  return media;
}

function createSupportNote(launchState, mobile) {
  const note = document.createElement("div");
  note.className = `gate-support ${mobile.tone}`;
  const label = mobile.key === "supported"
    ? "Mobile ready"
    : mobile.key === "limited"
      ? "Play with warning"
      : "Desktop recommended";
  note.append(
    createText("strong", "", launchState.needsExplicitOpen ? "Desktop recommended" : label),
    createText("span", "", launchState.note)
  );
  return note;
}

function createGateActions(game, launchState) {
  const actions = document.createElement("div");
  actions.className = "gate-actions";

  if (launchState.canStart) {
    actions.append(createActionLink("Start Observation", getLaunchHref(game), "primary"));
  } else {
    actions.append(createDisabledButton("Desktop recommended"));
  }

  if (launchState.needsExplicitOpen) {
    actions.append(createActionLink("Open anyway", getLaunchHref(game), "warning"));
  }

  actions.append(createActionLink("Back to Record", getObservationHref(game), "secondary"));
  actions.append(createActionLink("Promo Page", getPromoHref(game), "secondary"));
  return actions;
}

function renderError(message) {
  currentGate = null;
  root.replaceChildren(
    createText("p", "archive-kicker", "Observation gate unavailable"),
    createText("h1", "", "Record missing"),
    createText("p", "archive-notice", message),
    createActionGroup([
      createActionLink("Back to Library", "./library.html", "primary"),
      createActionLink("Open Manifest", getManifestHref(), "secondary")
    ], "gate-actions")
  );
}
