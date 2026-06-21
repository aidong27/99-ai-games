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
  document.title = `${game.title} | Start Observation`;
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
    actions.append(createLink("Start Observation", getLaunchHref(game), "archive-button primary"));
  } else {
    const blocked = document.createElement("button");
    blocked.type = "button";
    blocked.className = "archive-button primary disabled";
    blocked.disabled = true;
    blocked.textContent = "Desktop recommended";
    actions.append(blocked);
  }

  if (launchState.needsExplicitOpen) {
    actions.append(createLink("Open anyway", getLaunchHref(game), "archive-button warning"));
  }

  actions.append(createLink("Back to Record", getObservationHref(game), "archive-button secondary"));
  actions.append(createLink("Promo Page", getPromoHref(game), "archive-button secondary"));
  return actions;
}

function createLink(label, href, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = href;
  link.textContent = label;
  return link;
}

function createText(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text ?? "";
  return element;
}

function renderError(message) {
  currentGate = null;
  root.replaceChildren(
    createText("p", "archive-kicker", "Observation gate unavailable"),
    createText("h1", "", "Record missing"),
    createText("p", "archive-notice", message),
    createActionGroup([
      createLink("Back to Library", "./library.html", "archive-button primary"),
      createLink("Open Manifest", getManifestHref(), "archive-button secondary")
    ])
  );
}

function createActionGroup(actions) {
  const group = document.createElement("div");
  group.className = "gate-actions";
  group.append(...actions);
  return group;
}
