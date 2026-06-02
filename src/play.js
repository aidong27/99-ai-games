import {
  getGameBySlug,
  getGameNumberLabel,
  getLaunchHref,
  getMobileSupportInfo,
  getObservationHref,
  getRuntimeLaunchState
} from "./archive-data.js";

const root = document.querySelector("#play-root");

loadGate();

async function loadGate() {
  const slug = new URLSearchParams(window.location.search).get("slug");
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
  note.append(
    createText("strong", "", launchState.label),
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
  root.replaceChildren(
    createText("p", "archive-kicker", "Observation gate unavailable"),
    createText("h1", "", "Record missing"),
    createText("p", "archive-notice", message),
    createLink("Back to Library", "./library.html", "archive-button primary")
  );
}
