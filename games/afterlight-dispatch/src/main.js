import {
  EVIDENCE_CATALOG,
  REFERENCE_PATH,
  SCENE_COUNT,
  applyChoice,
  createInitialState,
  getCurrentScene,
  getEnding,
  getMetricSnapshot,
  getSignalLabel,
  hasEvidence
} from "./engine.js";

const elements = {
  signalLabel: document.querySelector("#signal-label"),
  roundLabel: document.querySelector("#round-label"),
  channelLabel: document.querySelector("#channel-label"),
  districtLabel: document.querySelector("#district-label"),
  title: document.querySelector("#transmission-title"),
  speaker: document.querySelector("#speaker-label"),
  waveform: document.querySelector("#waveform"),
  transmission: document.querySelector("#transmission-text"),
  memory: document.querySelector("#memory-text"),
  choices: document.querySelector("#choice-list"),
  transcript: document.querySelector("#transcript-list"),
  restart: document.querySelector("#restart-button"),
  help: document.querySelector("#help-button"),
  map: document.querySelector("#signal-map"),
  evidenceCount: document.querySelector("#evidence-count"),
  evidenceList: document.querySelector("#evidence-list"),
  overlay: document.querySelector("#game-overlay"),
  overlayKicker: document.querySelector("#overlay-kicker"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayCopy: document.querySelector("#overlay-copy"),
  overlayDetails: document.querySelector("#overlay-details"),
  overlayActions: document.querySelector("#overlay-actions")
};

const resourceElements = Object.fromEntries(
  ["clarity", "trust", "time", "interference"].map((name) => [
    name,
    {
      value: document.querySelector(`#${name}-value`),
      meter: document.querySelector(`#${name}-meter`)
    }
  ])
);

const resourceMaximums = {
  clarity: 6,
  trust: 6,
  time: 8,
  interference: 6
};

let state = createInitialState();
let started = false;
let overlayMode = "intro";

buildWaveform();
wireInitialControls();
render();

function buildWaveform() {
  const heights = [18, 34, 56, 27, 72, 44, 83, 31, 64, 92, 48, 70, 38, 86, 58, 24, 68, 42, 78, 35, 61, 88, 49, 73, 29, 57, 81, 40];
  const fragment = document.createDocumentFragment();

  heights.forEach((height, index) => {
    const bar = document.createElement("i");
    bar.style.setProperty("--wave-height", `${height}%`);
    bar.style.setProperty("--wave-index", String(index));
    fragment.append(bar);
  });

  elements.waveform.replaceChildren(fragment);
}

function wireInitialControls() {
  document.querySelector("#start-button")?.addEventListener("click", () => startGame());
  elements.restart.addEventListener("click", restartGame);
  elements.help.addEventListener("click", showProtocol);
  document.addEventListener("keydown", handleKeydown);
}

function startGame({ focusChoice = false } = {}) {
  started = true;
  overlayMode = "closed";
  hideOverlay();
  render();
  if (focusChoice) {
    focusFirstChoice();
  }
}

function restartGame() {
  state = createInitialState();
  started = true;
  overlayMode = "closed";
  hideOverlay();
  render();
  focusFirstChoice();
}

function handleChoice(choiceId, { focusNext = false } = {}) {
  if (!started || state.outcome) {
    return;
  }

  state = applyChoice(state, choiceId);
  render();

  if (state.outcome) {
    showEnding();
  } else if (focusNext) {
    focusFirstChoice();
  }
}

function render() {
  renderResources();
  renderEvidence();
  renderTranscript();
  renderMap();

  const scene = getCurrentScene(state);
  if (!scene) {
    elements.waveform.classList.remove("transmitting");
    return;
  }

  elements.signalLabel.textContent = getSignalLabel(state);
  elements.roundLabel.textContent = `${state.sceneIndex + 1} / ${SCENE_COUNT}`;
  elements.channelLabel.textContent = scene.channel;
  elements.districtLabel.textContent = scene.district;
  elements.title.textContent = scene.title;
  elements.speaker.textContent = scene.speaker;
  elements.transmission.textContent = scene.text;
  elements.memory.textContent = scene.memory;
  elements.waveform.classList.toggle("transmitting", started);
  renderChoices(scene.choices);
}

function renderChoices(choices) {
  const fragment = document.createDocumentFragment();

  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.style.setProperty("--choice-index", String(index));
    button.dataset.choiceId = choice.id;

    const number = document.createElement("span");
    number.className = "choice-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const copy = document.createElement("span");
    copy.className = "choice-copy";
    const label = document.createElement("strong");
    label.textContent = choice.label;
    const detail = document.createElement("small");
    detail.textContent = choice.detail;
    copy.append(label, detail);

    const arrow = document.createElement("span");
    arrow.className = "choice-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = ">";

    button.append(number, copy, arrow);
    button.addEventListener("click", () => handleChoice(choice.id));
    fragment.append(button);
  });

  elements.choices.replaceChildren(fragment);
}

function renderResources() {
  const snapshot = getMetricSnapshot(state);

  Object.entries(resourceElements).forEach(([name, refs]) => {
    const value = snapshot[name];
    const maximum = resourceMaximums[name];
    refs.value.textContent = String(value);
    refs.meter.style.setProperty("--meter-width", `${(value / maximum) * 100}%`);
    refs.meter.parentElement.setAttribute("aria-valuenow", String(value));
  });

  elements.signalLabel.textContent = getSignalLabel(state);
}

function renderEvidence() {
  const count = state.evidence.length;
  elements.evidenceCount.textContent = `${count} ${count === 1 ? "fragment" : "fragments"}`;

  if (!count) {
    elements.evidenceList.replaceChildren(createTextItem("No fragments verified yet.", "evidence-empty"));
    return;
  }

  const fragment = document.createDocumentFragment();
  state.evidence.forEach((evidenceId) => {
    const evidence = EVIDENCE_CATALOG[evidenceId];
    const item = createTextItem(evidence.shortLabel);
    item.title = evidence.description;
    fragment.append(item);
  });
  elements.evidenceList.replaceChildren(fragment);
}

function renderTranscript() {
  if (!state.history.length) {
    elements.transcript.replaceChildren(createTextItem("Your decisions will be recorded here.", "transcript-empty"));
    return;
  }

  const fragment = document.createDocumentFragment();
  state.history.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "transcript-entry";

    const marker = document.createElement("span");
    marker.className = "transcript-index";
    marker.textContent = `TX ${String(index + 1).padStart(2, "0")} / ${entry.speaker}`;

    const copy = document.createElement("div");
    const choice = document.createElement("p");
    choice.className = "transcript-choice";
    choice.textContent = entry.choiceLabel;
    const response = document.createElement("p");
    response.className = "transcript-response";
    response.textContent = entry.response;
    copy.append(choice, response);

    item.append(marker, copy);
    fragment.append(item);
  });

  elements.transcript.replaceChildren(fragment);
  elements.transcript.scrollTop = elements.transcript.scrollHeight;
}

function renderMap() {
  const currentScene = getCurrentScene(state)?.id;
  const visited = new Set(state.history.map((entry) => entry.sceneId));

  elements.map.querySelectorAll("[data-node]").forEach((node) => {
    const nodeId = node.dataset.node;
    const active = nodeId === currentScene
      || (currentScene === "floodline" && (nodeId === "breakwater" || nodeId === "tramline"));
    node.classList.toggle("visited", visited.has(nodeId) || (nodeId === "last-route" && Boolean(state.outcome)));
    node.classList.toggle("active", active);
  });

  elements.map.querySelectorAll("[data-route]").forEach((route) => {
    const routeId = route.dataset.route;
    route.classList.toggle("available", routeIsSupported(routeId));
    route.classList.toggle("selected", state.flags.finalRoute === routeId);
  });
}

function routeIsSupported(routeId) {
  if (routeId === "glass") {
    return hasEvidence(state, "causeway-key") || hasEvidence(state, "archive-map");
  }
  if (routeId === "tram") {
    return hasEvidence(state, "lamp-sequence") || hasEvidence(state, "tram-clearance");
  }
  return !hasEvidence(state, "tide-code") && !hasEvidence(state, "ghost-mismatch");
}

function showProtocol() {
  const returnToIntro = !started;
  overlayMode = "protocol";
  setOverlayTone("");
  elements.overlayKicker.textContent = "Operator reference / P";
  elements.overlayTitle.textContent = "Dispatch protocol";
  elements.overlayCopy.textContent = "The system is deterministic. It remembers choices, changes later transmissions, and evaluates the final route against the record you built.";
  replaceOverlayDetails([
    "Clarity measures whether the network carries one coherent account.",
    "Trust rises when public promises and later actions agree.",
    "Evidence unlocks defensible routes. Interference makes every claim harder to verify."
  ]);

  const close = createButton(returnToIntro ? "Return to briefing" : "Return to dispatch", "primary-button", () => {
    if (returnToIntro) {
      showIntro();
    } else {
      overlayMode = "closed";
      hideOverlay();
      focusFirstChoice();
    }
  });
  elements.overlayActions.replaceChildren(close);
  showOverlay(close);
}

function showIntro() {
  started = false;
  overlayMode = "intro";
  setOverlayTone("");
  elements.overlayKicker.textContent = "Observation 007 / Text Adventure Hall";
  elements.overlayTitle.textContent = "Afterlight Dispatch";
  elements.overlayCopy.textContent = "Six transmissions. Three possible final routes. The network remembers every promise you make and every fact you fail to verify.";
  replaceOverlayDetails([
    "Keep Clarity, Trust, and Time above zero.",
    "Collect evidence before the final dispatch.",
    "Keyboard: 1-3 choose, R restarts, P opens protocol."
  ]);
  const start = createButton("Begin night watch", "primary-button", () => startGame());
  elements.overlayActions.replaceChildren(start);
  showOverlay(start);
}

function showEnding() {
  const ending = getEnding(state);
  if (!ending) {
    return;
  }

  overlayMode = "ending";
  setOverlayTone(ending.tone);
  elements.overlayKicker.textContent = ending.kicker;
  elements.overlayTitle.textContent = ending.title;
  elements.overlayCopy.textContent = ending.copy;
  replaceOverlayDetails([
    `Carrier: ${state.clarity} clarity / ${state.interference} interference`,
    `Network: ${state.trust} trust / ${state.time} intervals`,
    `${state.evidence.length} coherent evidence ${state.evidence.length === 1 ? "fragment" : "fragments"}`
  ]);

  const replay = createButton("Replay night watch", "primary-button", restartGame);
  const record = document.createElement("a");
  record.className = "secondary-button";
  record.href = "../../observation.html?slug=afterlight-dispatch";
  record.textContent = "Observation record";
  elements.overlayActions.replaceChildren(replay, record);
  showOverlay(replay);
}

function replaceOverlayDetails(lines) {
  elements.overlayDetails.replaceChildren(...lines.map((line) => {
    const span = document.createElement("span");
    span.textContent = line;
    return span;
  }));
}

function setOverlayTone(tone) {
  elements.overlay.classList.remove("success", "partial", "failure");
  if (tone) {
    elements.overlay.classList.add(tone);
  }
}

function showOverlay(focusTarget) {
  elements.overlay.hidden = false;
  requestAnimationFrame(() => focusTarget?.focus());
}

function hideOverlay() {
  elements.overlay.hidden = true;
  setOverlayTone("");
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createTextItem(text, className = "") {
  const item = document.createElement("li");
  item.className = className;
  item.textContent = text;
  return item;
}

function focusFirstChoice() {
  requestAnimationFrame(() => elements.choices.querySelector("button")?.focus({ preventScroll: true }));
}

function handleKeydown(event) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "p") {
    event.preventDefault();
    showProtocol();
    return;
  }

  if (key === "escape" && overlayMode === "protocol") {
    event.preventDefault();
    if (started) {
      overlayMode = "closed";
      hideOverlay();
      focusFirstChoice();
    } else {
      showIntro();
    }
    return;
  }

  if (key === "r") {
    event.preventDefault();
    restartGame();
    return;
  }

  if (key === "enter" && overlayMode === "intro") {
    event.preventDefault();
    startGame({ focusChoice: true });
    return;
  }

  if (!started || overlayMode !== "closed" || state.outcome || !["1", "2", "3"].includes(key)) {
    return;
  }

  const choice = getCurrentScene(state)?.choices[Number(key) - 1];
  if (choice) {
    event.preventDefault();
    handleChoice(choice.id, { focusNext: true });
  }
}

window.__afterlightDispatchQA = {
  referencePath: [...REFERENCE_PATH],
  start: startGame,
  restart: restartGame,
  choose(choiceId) {
    handleChoice(choiceId);
    return this.getSnapshot();
  },
  playReferencePath() {
    state = createInitialState();
    started = true;
    overlayMode = "closed";
    for (const choiceId of REFERENCE_PATH) {
      state = applyChoice(state, choiceId);
    }
    hideOverlay();
    render();
    showEnding();
    return this.getSnapshot();
  },
  getSnapshot() {
    return {
      ...getMetricSnapshot(state),
      sceneIndex: state.sceneIndex,
      evidence: [...state.evidence],
      outcome: state.outcome,
      overlayMode
    };
  }
};
