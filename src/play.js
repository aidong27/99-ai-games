import {
  getGameBySlug,
  getGameNumberLabel,
  getLaunchHref,
  getManifestHref,
  getMobileSupportInfo,
  getObservationHref,
  getPromoHref,
  getRuntimeLaunchState,
  getSlugFromSearch
} from "./archive-data.js";
import { createSignalField } from "./archive-effects.js";
import { createActionGroup, createActionLink, createDisabledButton } from "./ui/buttons.js";
import { createText } from "./ui/dom.js";
import { setDocumentTitle } from "./ui/meta.js";

const root = document.querySelector("#play-root");
const signalCanvas = document.querySelector("#gate-signal");
const signalField = createSignalField(signalCanvas, { variant: "gate", density: 16 });
let currentGate = null;

if (root) {
  loadGate();
  signalField.start();
  window.addEventListener("pagehide", () => signalField.destroy(), { once: true });
} else {
  signalField.destroy();
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

  content.append(
    createText("p", "archive-kicker", getGameNumberLabel(game)),
    createText("h1", "", game.title ?? "Untitled observation"),
    createText("p", "gate-description", game.description ?? "No description recorded."),
    createText("p", "gate-philosophy", "The games are playable. The real exhibit is the AI that made them."),
    createSupportNote(launchState, mobile),
    createGateActions(game, launchState)
  );

  root.replaceChildren(content);
  setDocumentTitle(game.title, "Start Observation");
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
