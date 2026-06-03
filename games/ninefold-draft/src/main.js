/*
 * Ninefold Draft
 * Observation 004 / Game 004 — Card Strategy Hall
 *
 * A short PC-first card strategy benchmark. Across a fixed number of cycles the
 * player drafts one protocol card per cycle, installs an engine or plays one-shot
 * actions, and manages Energy / Focus / Integrity while a telegraphed hazard track
 * applies pressure. Reach the Alignment objective before the cycles run out.
 *
 * Everything is deterministic for a given seed: the draft offers and the hazard
 * order are fixed, so strategy (not luck) decides the outcome. The hazard for the
 * current and next cycle is always shown, so risk is readable and plannable.
 */

const CARDS = {
  relay: { code: "GEN-01", name: "Relay", cost: 1, kind: "install", genAlignment: 3, text: "Install. +3 Alignment each cycle." },
  lattice: { code: "GEN-02", name: "Lattice Node", cost: 2, kind: "install", genAlignment: 5, text: "Install. +5 Alignment each cycle." },
  amplifier: { code: "AMP-01", name: "Amplifier", cost: 2, kind: "install", amp: true, text: "Install. +2 Alignment per generator each cycle." },
  capacitor: { code: "PWR-01", name: "Capacitor", cost: 2, kind: "install", energyCap: 1, text: "Install. +1 Energy capacity each cycle." },
  array: { code: "FOC-01", name: "Focus Array", cost: 1, kind: "install", genFocus: 2, text: "Install. +2 Focus each cycle." },
  converter: { code: "CNV-01", name: "Converter", cost: 1, kind: "action", needsFocus: 3, text: "Action. Spend 3 Focus: +12 Alignment now." },
  shield: { code: "DEF-01", name: "Shield Wall", cost: 2, kind: "install", shield: 2, text: "Install. Reduce hazard damage by 2 each cycle." },
  overclock: { code: "PWR-02", name: "Overclock", cost: 1, kind: "action", text: "Action. +4 Energy this cycle." },
  purge: { code: "DEF-02", name: "Purge", cost: 2, kind: "action", text: "Action. Cancel this cycle's hazard." }
};

const CARD_POOL = ["relay", "lattice", "amplifier", "capacitor", "array", "converter", "shield", "overclock", "purge"];

const HAZARDS = {
  calm: { name: "Calm", tone: "calm", text: "No effect. A quiet cycle." },
  drain: { name: "Drain", tone: "warn", text: "Next cycle: -1 Energy capacity." },
  surge: { name: "Surge", tone: "danger", text: "-3 Integrity (Shield reduces)." },
  static: { name: "Static", tone: "warn", text: "-6 Alignment." },
  flux: { name: "Flux", tone: "danger", text: "-2 Integrity (Shield) and -2 Alignment." }
};

// Deterministic, telegraphed, escalating hazard track (index by cycle - 1).
const HAZARD_SEQUENCE = ["calm", "drain", "surge", "static", "flux", "surge", "static", "flux"];

const CONFIG = {
  maxTurns: 8,
  target: 60,
  baseEnergyCap: 3,
  startIntegrity: 20,
  engineSlots: 6,
  seed: 0x4e1f9d2b
};

const ui = {
  turn: document.querySelector("#turn-readout"),
  alignment: document.querySelector("#alignment-readout"),
  integrity: document.querySelector("#integrity-readout"),
  energy: document.querySelector("#energy-readout"),
  focus: document.querySelector("#focus-readout"),
  alignmentMeter: document.querySelector("#alignment-meter"),
  integrityMeter: document.querySelector("#integrity-meter"),
  targetLabel: document.querySelector("#target-label"),
  hazardCurrent: document.querySelector("#hazard-current"),
  hazardNext: document.querySelector("#hazard-next"),
  engineZone: document.querySelector("#engine-zone"),
  engineCount: document.querySelector("#engine-count"),
  draftZone: document.querySelector("#draft-zone"),
  draftHint: document.querySelector("#draft-hint"),
  handZone: document.querySelector("#hand-zone"),
  logList: document.querySelector("#log-list"),
  endTurnButton: document.querySelector("#endturn-button"),
  undoButton: document.querySelector("#undo-button"),
  restartButton: document.querySelector("#restart-button"),
  helpButton: document.querySelector("#help-button"),
  overlay: document.querySelector("#overlay"),
  overlayKicker: document.querySelector("#overlay-kicker"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayCopy: document.querySelector("#overlay-copy"),
  overlayActions: document.querySelector("#overlay-actions")
};

let state = freshState();
let undoStack = [];

function freshState() {
  return {
    mode: "menu",
    turn: 1,
    maxTurns: CONFIG.maxTurns,
    target: CONFIG.target,
    baseEnergyCap: CONFIG.baseEnergyCap,
    energyCap: CONFIG.baseEnergyCap,
    energy: CONFIG.baseEnergyCap,
    focus: 0,
    integrity: CONFIG.startIntegrity,
    alignment: 0,
    drainPenalty: 0,
    engine: [],
    hand: [],
    discard: [],
    draftOffer: [],
    draftedThisTurn: false,
    hazardCancelled: false,
    log: [],
    score: 0,
    won: false,
    lost: false
  };
}

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function offerFor(turn) {
  const rng = mulberry32(CONFIG.seed + turn * 0x9e37);
  const offer = [];
  // Cycle 1 always includes a starter generator so the engine can begin.
  if (turn === 1) {
    offer.push("relay");
  }
  while (offer.length < 3) {
    offer.push(CARD_POOL[Math.floor(rng() * CARD_POOL.length)]);
  }
  return offer;
}

function log(message) {
  state.log.unshift(`C${state.turn}: ${message}`);
  state.log = state.log.slice(0, 8);
}

function snapshot() {
  const { log: _log, ...rest } = state;
  undoStack.push(JSON.stringify(rest));
}

function isGenerator(id) {
  return (CARDS[id].genAlignment ?? 0) > 0;
}

function shieldReduction() {
  return state.engine.reduce((total, id) => total + (CARDS[id].shield ?? 0), 0);
}

function start() {
  state = freshState();
  undoStack = [];
  state.mode = "playing";
  state.turn = 1;
  state.energyCap = CONFIG.baseEnergyCap;
  state.energy = state.energyCap;
  state.draftOffer = offerFor(1);
  state.draftedThisTurn = false;
  log("Cycle 1 online. Draft a protocol.");
  hideOverlay();
  renderAll();
}

function restart() {
  start();
}

function beginTurn() {
  // Engine production resolves at the start of each cycle (cards installed last
  // cycle now produce).
  let gen = 0;
  let genCount = 0;
  let ampCount = 0;
  let focusGain = 0;
  let capBonus = 0;
  for (const id of state.engine) {
    const card = CARDS[id];
    if (card.genAlignment) {
      gen += card.genAlignment;
      genCount += 1;
    }
    if (card.amp) {
      ampCount += 1;
    }
    if (card.genFocus) {
      focusGain += card.genFocus;
    }
    if (card.energyCap) {
      capBonus += card.energyCap;
    }
  }
  const ampBonus = ampCount * 2 * genCount;
  state.alignment += gen + ampBonus;
  state.focus += focusGain;
  state.energyCap = Math.max(1, state.baseEnergyCap + capBonus - state.drainPenalty);
  state.drainPenalty = 0;
  state.energy = state.energyCap;
  state.draftOffer = offerFor(state.turn);
  state.draftedThisTurn = false;
  state.hazardCancelled = false;
  undoStack = [];

  if (gen + ampBonus > 0 || focusGain > 0) {
    log(`Engine produced +${gen + ampBonus} Alignment${focusGain ? `, +${focusGain} Focus` : ""}.`);
  }
}

function draftCard(index) {
  if (state.mode !== "playing" || state.draftedThisTurn) {
    return false;
  }
  if (index < 0 || index >= state.draftOffer.length) {
    return false;
  }
  snapshot();
  const picked = state.draftOffer[index];
  state.hand.push(picked);
  for (let i = 0; i < state.draftOffer.length; i += 1) {
    if (i !== index) {
      state.discard.push(state.draftOffer[i]);
    }
  }
  state.draftOffer = [];
  state.draftedThisTurn = true;
  log(`Drafted ${CARDS[picked].name}.`);
  renderAll();
  return true;
}

function playCard(index) {
  if (state.mode !== "playing") {
    return false;
  }
  if (index < 0 || index >= state.hand.length) {
    return false;
  }
  const id = state.hand[index];
  const card = CARDS[id];

  if (state.energy < card.cost) {
    log(`Not enough Energy for ${card.name}.`);
    renderLog();
    flashButton(ui.endTurnButton);
    return false;
  }
  if (card.kind === "install" && state.engine.length >= CONFIG.engineSlots) {
    log("Engine is full. No open slots.");
    renderLog();
    return false;
  }
  if (card.needsFocus && state.focus < card.needsFocus) {
    log(`${card.name} needs ${card.needsFocus} Focus.`);
    renderLog();
    return false;
  }

  snapshot();
  state.energy -= card.cost;
  state.hand.splice(index, 1);

  if (card.kind === "install") {
    state.engine.push(id);
    log(`Installed ${card.name}.`);
  } else {
    resolveAction(id);
    state.discard.push(id);
  }

  if (state.alignment >= state.target) {
    winGame();
    return true;
  }

  renderAll();
  return true;
}

function resolveAction(id) {
  if (id === "converter") {
    state.focus -= CARDS.converter.needsFocus;
    state.alignment += 12;
    log("Converter: 3 Focus -> +12 Alignment.");
  } else if (id === "overclock") {
    state.energy += 4;
    log("Overclock: +4 Energy this cycle.");
  } else if (id === "purge") {
    state.hazardCancelled = true;
    log("Purge armed: this cycle's hazard is cancelled.");
  }
}

function endTurn() {
  if (state.mode !== "playing") {
    return;
  }

  const hazardId = HAZARD_SEQUENCE[state.turn - 1] ?? "calm";
  resolveHazard(hazardId);

  if (state.integrity <= 0) {
    state.integrity = 0;
    loseGame("Integrity collapsed under hazard pressure.");
    return;
  }
  if (state.alignment >= state.target) {
    winGame();
    return;
  }

  if (state.turn >= state.maxTurns) {
    loseGame(`Cycles exhausted at ${state.alignment} / ${state.target} Alignment.`);
    return;
  }

  state.turn += 1;
  beginTurn();

  if (state.alignment >= state.target) {
    winGame();
    return;
  }

  renderAll();
}

function resolveHazard(hazardId) {
  const hazard = HAZARDS[hazardId];
  if (state.hazardCancelled && hazardId !== "calm") {
    log(`${hazard.name} purged. No effect.`);
    return;
  }

  const reduce = shieldReduction();
  if (hazardId === "surge") {
    const dmg = Math.max(0, 3 - reduce);
    state.integrity -= dmg;
    log(`Surge: -${dmg} Integrity${reduce ? ` (Shield -${Math.min(3, reduce)})` : ""}.`);
  } else if (hazardId === "static") {
    const before = state.alignment;
    state.alignment = Math.max(0, state.alignment - 6);
    log(`Static: -${before - state.alignment} Alignment.`);
  } else if (hazardId === "flux") {
    const dmg = Math.max(0, 2 - reduce);
    state.integrity -= dmg;
    const before = state.alignment;
    state.alignment = Math.max(0, state.alignment - 2);
    log(`Flux: -${dmg} Integrity, -${before - state.alignment} Alignment.`);
  } else if (hazardId === "drain") {
    state.drainPenalty += 1;
    log("Drain: -1 Energy capacity next cycle.");
  } else {
    log("Calm cycle. No hazard.");
  }
}

function undo() {
  if (state.mode !== "playing" || undoStack.length === 0) {
    return;
  }
  const snap = JSON.parse(undoStack.pop());
  const keptLog = state.log;
  state = { ...snap, log: keptLog };
  log("Undid last action.");
  renderAll();
}

function computeScore() {
  const turnsLeft = Math.max(0, state.maxTurns - state.turn);
  return 100 + turnsLeft * 15 + state.integrity * 3 + state.focus * 2 + state.engine.length * 2;
}

function winGame() {
  state.mode = "won";
  state.won = true;
  state.score = computeScore();
  log(`Objective reached. Score ${state.score}.`);
  renderAll();
  showOverlay({
    kicker: "Objective synchronized",
    title: "Archive aligned",
    copy: `You reached ${state.alignment} / ${state.target} Alignment on cycle ${state.turn} with ${state.integrity} Integrity. Score ${state.score}.`,
    actions: [{ label: "Run a new draft", primary: true, fn: restart }]
  });
}

function loseGame(reason) {
  state.mode = "lost";
  state.lost = true;
  state.score = 0;
  log(`Run failed: ${reason}`);
  renderAll();
  showOverlay({
    kicker: "Synchronization failed",
    title: "Archive misaligned",
    copy: `${reason} Final Alignment ${state.alignment} / ${state.target}.`,
    actions: [{ label: "Try again", primary: true, fn: restart }]
  });
}

function forceWin() {
  if (state.mode !== "playing") {
    start();
  }
  state.alignment = state.target;
  winGame();
}

function forceLose() {
  if (state.mode !== "playing") {
    start();
  }
  state.integrity = 0;
  loseGame("Integrity forced to zero (QA).");
}

// Rendering ----------------------------------------------------------------

function renderAll() {
  renderResources();
  renderHazards();
  renderEngine();
  renderDraft();
  renderHand();
  renderLog();
  updateButtons();
}

function renderResources() {
  ui.turn.textContent = `${Math.min(state.turn, state.maxTurns)} / ${state.maxTurns}`;
  ui.alignment.textContent = `${state.alignment} / ${state.target}`;
  ui.integrity.textContent = String(state.integrity);
  ui.energy.textContent = `${state.energy} / ${state.energyCap}`;
  ui.focus.textContent = String(state.focus);
  ui.targetLabel.textContent = `${state.alignment} / ${state.target}`;
  ui.alignmentMeter.style.width = `${clamp(state.alignment / state.target * 100, 0, 100)}%`;
  ui.integrityMeter.style.width = `${clamp(state.integrity / CONFIG.startIntegrity * 100, 0, 100)}%`;
}

function renderHazards() {
  const current = HAZARD_SEQUENCE[state.turn - 1] ?? "calm";
  const next = state.turn < state.maxTurns ? HAZARD_SEQUENCE[state.turn] : null;
  ui.hazardCurrent.replaceChildren(hazardCard(current, "This cycle", state.hazardCancelled));
  ui.hazardNext.replaceChildren(next ? hazardCard(next, "Next cycle", false) : emptyHazard());
}

function hazardCard(hazardId, label, cancelled) {
  const hazard = HAZARDS[hazardId];
  const el = document.createElement("div");
  el.className = `hazard tone-${hazard.tone}${cancelled ? " cancelled" : ""}`;
  el.append(
    text("span", "hazard-label", label),
    text("strong", "hazard-name", cancelled ? `${hazard.name} (purged)` : hazard.name),
    text("span", "hazard-text", hazard.text)
  );
  return el;
}

function emptyHazard() {
  const el = document.createElement("div");
  el.className = "hazard tone-calm empty";
  el.append(text("span", "hazard-label", "Next cycle"), text("strong", "hazard-name", "—"), text("span", "hazard-text", "Final cycle."));
  return el;
}

function renderEngine() {
  ui.engineCount.textContent = `${state.engine.length} / ${CONFIG.engineSlots}`;
  if (state.engine.length === 0) {
    ui.engineZone.replaceChildren(emptyNote("No protocols installed yet. Install cards to build your engine."));
    return;
  }
  ui.engineZone.replaceChildren(...state.engine.map((id) => cardEl(id, "engine")));
}

function renderDraft() {
  if (state.draftedThisTurn || state.draftOffer.length === 0) {
    ui.draftHint.textContent = "Drafted this cycle. Play cards, then end the cycle.";
    ui.draftZone.replaceChildren(emptyNote("Draft locked until next cycle."));
    return;
  }
  ui.draftHint.textContent = "Choose one protocol to add to your hand.";
  ui.draftZone.replaceChildren(...state.draftOffer.map((id, index) => cardEl(id, "draft", index)));
}

function renderHand() {
  if (state.hand.length === 0) {
    ui.handZone.replaceChildren(emptyNote("Hand empty. Draft a protocol each cycle."));
    return;
  }
  ui.handZone.replaceChildren(...state.hand.map((id, index) => cardEl(id, "hand", index)));
}

function cardEl(id, context, index) {
  const card = CARDS[id];
  const el = document.createElement(context === "engine" ? "div" : "button");
  el.className = `card kind-${card.kind}`;
  if (context !== "engine") {
    el.type = "button";
  }

  const affordable = state.energy >= card.cost
    && !(card.kind === "install" && state.engine.length >= CONFIG.engineSlots)
    && !(card.needsFocus && state.focus < card.needsFocus);

  if (context === "hand" && !affordable) {
    el.classList.add("disabled");
  }
  if (context === "engine") {
    el.classList.add("installed");
  }

  const head = document.createElement("div");
  head.className = "card-head";
  head.append(text("span", "card-code", card.code), text("span", "card-cost", `${card.cost}⚡`));

  el.append(
    head,
    text("strong", "card-name", card.name),
    text("span", "card-tag", card.kind === "install" ? "Install" : "Action"),
    text("span", "card-text", card.text)
  );

  if (context === "draft") {
    el.addEventListener("click", () => draftCard(index));
    el.setAttribute("aria-label", `Draft ${card.name}, ${card.text}`);
  } else if (context === "hand") {
    el.addEventListener("click", () => playCard(index));
    el.setAttribute("aria-label", `Play ${card.name}, cost ${card.cost} energy, ${card.text}`);
  }
  return el;
}

function renderLog() {
  ui.logList.replaceChildren(...state.log.map((line) => text("li", "", line)));
}

function updateButtons() {
  const playing = state.mode === "playing";
  ui.endTurnButton.disabled = !playing;
  ui.undoButton.disabled = !playing || undoStack.length === 0;
}

function emptyNote(message) {
  return text("p", "zone-empty", message);
}

function text(tag, className, content) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  el.textContent = content ?? "";
  return el;
}

function flashButton(button) {
  button.classList.remove("flash");
  void button.offsetWidth;
  button.classList.add("flash");
}

function showOverlay({ kicker, title, copy, actions }) {
  ui.overlay.classList.remove("hidden");
  ui.overlayKicker.textContent = kicker ?? "";
  ui.overlayTitle.textContent = title ?? "";
  ui.overlayCopy.textContent = copy ?? "";
  const buttons = (actions ?? []).map((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.primary ? "button primary" : "button";
    button.textContent = action.label;
    button.addEventListener("click", action.fn);
    return button;
  });
  ui.overlayActions.replaceChildren(...buttons);
}

function hideOverlay() {
  ui.overlay.classList.add("hidden");
}

function showHelp() {
  if (state.mode === "won" || state.mode === "lost") {
    return;
  }
  const wasPlaying = state.mode === "playing";
  showOverlay({
    kicker: "Protocol briefing",
    title: "How to align the archive",
    copy: `Reach ${CONFIG.target} Alignment within ${CONFIG.maxTurns} cycles without losing all Integrity. Each cycle: draft one protocol, spend Energy to install engine cards or play actions, then end the cycle to resolve the telegraphed hazard. Installed generators produce Alignment every cycle; amplifiers scale them; Focus fuels the Converter. Plan around the hazard shown for this cycle and the next.`,
    actions: [{ label: wasPlaying ? "Back to the draft" : "Close", primary: true, fn: () => { if (wasPlaying) { hideOverlay(); } else { hideOverlay(); } } }]
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Input --------------------------------------------------------------------

ui.endTurnButton.addEventListener("click", endTurn);
ui.undoButton.addEventListener("click", undo);
ui.restartButton.addEventListener("click", restart);
ui.helpButton.addEventListener("click", showHelp);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ([" ", "u", "r", "p"].includes(key)) {
    event.preventDefault();
  }

  if (state.mode === "menu") {
    if (key === " " || key === "enter") {
      start();
    }
    return;
  }
  if (state.mode === "won" || state.mode === "lost") {
    if (key === " " || key === "enter") {
      const primary = ui.overlayActions.querySelector(".button.primary");
      primary?.click();
    }
    return;
  }

  if (key === " ") {
    if (!ui.overlay.classList.contains("hidden")) {
      hideOverlay();
    } else {
      endTurn();
    }
  } else if (key === "u") {
    undo();
  } else if (key === "r") {
    restart();
  } else if (key === "p") {
    if (ui.overlay.classList.contains("hidden")) {
      showHelp();
    } else {
      hideOverlay();
    }
  }
});

// QA hooks -----------------------------------------------------------------

window.__ninefoldDraftQA = {
  start,
  restart,
  draftCard: (index) => draftCard(index),
  playCard: (index) => playCard(index),
  endTurn,
  forceWin,
  forceLose,
  getSnapshot() {
    return {
      mode: state.mode,
      turn: state.turn,
      maxTurns: state.maxTurns,
      target: state.target,
      alignment: state.alignment,
      integrity: state.integrity,
      energy: state.energy,
      energyCap: state.energyCap,
      focus: state.focus,
      engine: state.engine.map((id) => CARDS[id].name),
      hand: state.hand.map((id) => CARDS[id].name),
      draftOffer: state.draftOffer.map((id) => CARDS[id].name),
      draftedThisTurn: state.draftedThisTurn,
      currentHazard: (HAZARD_SEQUENCE[state.turn - 1] ?? "calm"),
      nextHazard: state.turn < state.maxTurns ? HAZARD_SEQUENCE[state.turn] : null,
      score: state.score,
      won: state.won,
      lost: state.lost
    };
  }
};

// Boot ---------------------------------------------------------------------

renderAll();
showOverlay({
  kicker: "Observation 004 / Game 004 · Card Strategy Hall",
  title: "Ninefold Draft",
  copy: `Draft protocols, build a small engine, and reach ${CONFIG.target} Alignment within ${CONFIG.maxTurns} cycles. Manage Energy, Focus, and Integrity against a telegraphed hazard track. Strategy decides the run — the draft and hazards are deterministic.`,
  actions: [
    { label: "Start draft", primary: true, fn: start },
    { label: "How to play", primary: false, fn: showHelp }
  ]
});
