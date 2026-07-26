const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const instructions = document.querySelector('[data-p99-ui="instructions"]');
const victory = document.querySelector('[data-p99-ui="victory"]');
const defeat = document.querySelector('[data-p99-ui="defeat"]');
const pauseButtons = [...document.querySelectorAll('[data-p99-action="pause"]')];
const status = document.querySelector(".status");

const GRID = { columns: 10, rows: 7, cellWidth: 90, cellHeight: 90 };
const START = { x: 1, y: 5 };
const CORES = [
  { id: "core-a", x: 1, y: 4 },
  { id: "core-b", x: 1, y: 3 },
  { id: "core-c", x: 1, y: 2 }
];
const RELAYS = [
  { id: "relay-a", x: 3, y: 4 },
  { id: "relay-b", x: 3, y: 3 },
  { id: "relay-c", x: 3, y: 2 }
];
const EXIT = { x: 8, y: 2 };
const FIELD = { x: 2, y: 5 };

let intervalId = 0;
let lastTick = 0;
let damageAccumulator = 0;
let sentryDirection = -1;
let state;

reset();
render();

window.__P99__ = Object.freeze({
  contractVersion: "1.0",
  getState: () => snapshot()
});

document.addEventListener("keydown", onKeyDown);
document.querySelectorAll('[data-p99-action="start"]').forEach((button) => {
  button.addEventListener("click", start);
});
document.querySelectorAll('[data-p99-action="restart"]').forEach((button) => {
  button.addEventListener("click", reset);
});
pauseButtons.forEach((button) => button.addEventListener("click", togglePause));

function reset() {
  stopLoop();
  state = {
    phase: "title",
    seed: new URLSearchParams(location.search).get("seed") === "99" ? 99 : 99,
    integrity: 5,
    maxIntegrity: 5,
    carryingCore: false,
    coresCollectedTotal: 0,
    relaysActivated: 0,
    worldStage: 0,
    abilityStatus: "ready",
    exitUnlocked: false,
    elapsedMs: 0,
    player: { ...START },
    remainingCores: CORES.map((core) => core.id),
    activatedRelays: [],
    shieldUntil: 0,
    cooldownUntil: 0,
    sentry: { x: 6, y: 5 }
  };
  damageAccumulator = 0;
  sentryDirection = -1;
  instructions.hidden = false;
  victory.hidden = true;
  defeat.hidden = true;
  setStatus("The relay facility is offline.");
  updateUi();
  render();
  dispatchState();
}

function start() {
  if (state.phase === "playing") return;
  if (state.phase === "won" || state.phase === "lost") reset();
  state.phase = "playing";
  instructions.hidden = true;
  victory.hidden = true;
  defeat.hidden = true;
  lastTick = performance.now();
  startLoop();
  setStatus("Recover a core and carry it to a matching relay.");
  updateUi();
  dispatchState();
}

function startLoop() {
  if (intervalId) return;
  intervalId = window.setInterval(tick, 50);
}

function stopLoop() {
  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = 0;
  }
}

function tick() {
  if (state.phase !== "playing") return;
  const now = performance.now();
  const delta = Math.min(now - lastTick, 100);
  lastTick = now;
  state.elapsedMs += delta;
  state.abilityStatus = now < state.cooldownUntil ? "cooldown" : "ready";

  const sentryStepMs = state.relaysActivated >= 2 ? 240 : 420;
  state.sentryAccumulator = (state.sentryAccumulator ?? 0) + delta;
  if (state.sentryAccumulator >= sentryStepMs) {
    state.sentryAccumulator = 0;
    state.sentry.y += sentryDirection;
    if (state.sentry.y <= 1 || state.sentry.y >= 5) sentryDirection *= -1;
  }

  const inField = samePosition(state.player, FIELD);
  const hitBySentry = samePosition(state.player, state.sentry);
  if ((inField || hitBySentry) && now >= state.shieldUntil) {
    damageAccumulator += delta;
    if (damageAccumulator >= 300) {
      damageAccumulator = 0;
      state.integrity = Math.max(0, state.integrity - 1);
      setStatus(inField ? "Arc field damaged the drone." : "Sentry contact damaged the drone.");
      dispatchState();
      if (state.integrity === 0) {
        lose();
      }
    }
  } else {
    damageAccumulator = 0;
  }

  updateUi();
  render();
}

function onKeyDown(event) {
  const key = event.code;
  if (["Escape", "KeyP"].includes(key)) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (key === "KeyR" && ["won", "lost"].includes(state.phase)) {
    event.preventDefault();
    reset();
    return;
  }
  if (state.phase !== "playing") return;
  if (["Space", "ShiftLeft", "ShiftRight"].includes(key)) {
    event.preventDefault();
    usePulse();
    return;
  }
  if (key === "KeyE") {
    event.preventDefault();
    interact();
    return;
  }
  const movement = {
    ArrowUp: [0, -1],
    KeyW: [0, -1],
    ArrowDown: [0, 1],
    KeyS: [0, 1],
    ArrowLeft: [-1, 0],
    KeyA: [-1, 0],
    ArrowRight: [1, 0],
    KeyD: [1, 0]
  }[key];
  if (movement) {
    event.preventDefault();
    move(...movement);
  }
}

function move(dx, dy) {
  const next = {
    x: Math.max(0, Math.min(GRID.columns - 1, state.player.x + dx)),
    y: Math.max(0, Math.min(GRID.rows - 1, state.player.y + dy))
  };
  const barrierClosed = state.relaysActivated === 0 && next.x === 4 && next.y >= 1 && next.y <= 4;
  if (barrierClosed) {
    setStatus("Relay A controls this sealed bulkhead.");
    return;
  }
  state.player = next;
  if (state.exitUnlocked && samePosition(state.player, EXIT)) {
    win();
    return;
  }
  updateUi();
  render();
  dispatchState();
}

function interact() {
  const core = CORES.find((item) => (
    samePosition(item, state.player)
    && state.remainingCores.includes(item.id)
  ));
  if (core && !state.carryingCore) {
    state.carryingCore = true;
    state.coresCollectedTotal += 1;
    state.remainingCores = state.remainingCores.filter((id) => id !== core.id);
    setStatus(`${core.id} secured. Carry it to an inactive relay.`);
    updateUi();
    render();
    dispatchState();
    return;
  }
  const relay = RELAYS.find((item) => (
    samePosition(item, state.player)
    && !state.activatedRelays.includes(item.id)
  ));
  if (relay && state.carryingCore) {
    state.carryingCore = false;
    state.activatedRelays.push(relay.id);
    state.relaysActivated = state.activatedRelays.length;
    state.worldStage = state.relaysActivated;
    state.exitUnlocked = state.relaysActivated === 3;
    setStatus(stageMessage(state.relaysActivated));
    updateUi();
    render();
    dispatchState();
    return;
  }
  setStatus("No valid core or relay interaction here.");
}

function usePulse() {
  const now = performance.now();
  if (now < state.cooldownUntil) {
    setStatus("Pulse is cooling down.");
    return;
  }
  state.shieldUntil = now + 650;
  state.cooldownUntil = now + 1200;
  state.abilityStatus = "cooldown";
  setStatus("Pulse shield active for a short window.");
  updateUi();
  render();
  dispatchState();
}

function togglePause() {
  if (state.phase === "playing") {
    state.phase = "paused";
    setStatus("Simulation paused.");
  } else if (state.phase === "paused") {
    state.phase = "playing";
    lastTick = performance.now();
    setStatus("Simulation resumed.");
  } else {
    return;
  }
  updateUi();
  dispatchState();
}

function win() {
  state.phase = "won";
  stopLoop();
  victory.hidden = false;
  setStatus("All relays active. Extraction confirmed.");
  updateUi();
  render();
  dispatchState();
}

function lose() {
  state.phase = "lost";
  stopLoop();
  defeat.hidden = false;
  setStatus("Integrity reached zero.");
  updateUi();
  render();
  dispatchState();
}

function snapshot() {
  const now = performance.now();
  return {
    phase: state.phase,
    seed: state.seed,
    integrity: state.integrity,
    maxIntegrity: state.maxIntegrity,
    carryingCore: state.carryingCore,
    coresCollectedTotal: state.coresCollectedTotal,
    relaysActivated: state.relaysActivated,
    worldStage: state.worldStage,
    abilityStatus: now < state.cooldownUntil ? "cooldown" : "ready",
    exitUnlocked: state.exitUnlocked,
    elapsedMs: Math.round(state.elapsedMs),
    player: { ...state.player },
    diagnostics: {
      objective: {
        coreCount: 3,
        relayCount: 3,
        exitCount: 1
      },
      hazards: [
        { id: "arc-field", behavior: "stationary contact damage over time" },
        { id: "sentry", behavior: "moving patrol contact damage" }
      ],
      ability: {
        id: "pulse-shield",
        limitation: "1200ms cooldown"
      },
      worldSignature: worldSignature()
    }
  };
}

function worldSignature() {
  const barrier = state?.relaysActivated >= 1 ? "bulkhead-open" : "bulkhead-sealed";
  const sentry = state?.relaysActivated >= 2 ? "sentry-fast" : "sentry-standard";
  const exit = state?.exitUnlocked ? "exit-open" : "exit-locked";
  return `stage-${state?.relaysActivated ?? 0}:${barrier}:${sentry}:${exit}`;
}

function stageMessage(stage) {
  if (stage === 1) return "Relay A opened the central bulkhead.";
  if (stage === 2) return "Relay B accelerated the sentry patrol.";
  return "Relay C unlocked extraction.";
}

function updateUi() {
  document.querySelector('[data-value="integrity"]').textContent = `${state.integrity} / ${state.maxIntegrity}`;
  document.querySelector('[data-value="core"]').textContent = state.carryingCore ? "Carried" : "None";
  document.querySelector('[data-value="relays"]').textContent = `${state.relaysActivated} / 3`;
  document.querySelector('[data-value="ability"]').textContent = state.abilityStatus === "ready" ? "Ready" : "Cooling";
  document.querySelector('[data-value="exit"]').textContent = state.exitUnlocked ? "Unlocked" : "Locked";
  pauseButtons.forEach((button) => {
    button.textContent = state.phase === "paused" ? "Resume" : "Pause";
  });
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#09161c";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(132, 207, 232, 0.12)";
  context.lineWidth = 1;
  for (let x = 0; x <= GRID.columns; x += 1) {
    context.beginPath();
    context.moveTo(x * GRID.cellWidth, 0);
    context.lineTo(x * GRID.cellWidth, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= GRID.rows; y += 1) {
    context.beginPath();
    context.moveTo(0, y * GRID.cellHeight);
    context.lineTo(canvas.width, y * GRID.cellHeight);
    context.stroke();
  }
  if (state.relaysActivated === 0) {
    context.fillStyle = "#7d5060";
    context.fillRect(4 * GRID.cellWidth + 38, GRID.cellHeight, 14, GRID.cellHeight * 4);
  }
  drawCell(FIELD, "#f06f7b", "ARC");
  drawCell(state.sentry, "#ffb35d", "S");
  for (const core of CORES) {
    if (state.remainingCores.includes(core.id)) drawCell(core, "#72d7ff", "C");
  }
  for (const relay of RELAYS) {
    drawCell(relay, state.activatedRelays.includes(relay.id) ? "#67e5a8" : "#566774", "R");
  }
  drawCell(EXIT, state.exitUnlocked ? "#ffffff" : "#3f4b52", state.exitUnlocked ? "EXIT" : "LOCK");
  drawCell(state.player, performance.now() < state.shieldUntil ? "#ffffff" : "#b6ff6b", "P");
}

function drawCell(position, color, label) {
  const x = position.x * GRID.cellWidth;
  const y = position.y * GRID.cellHeight;
  context.fillStyle = color;
  context.fillRect(x + 18, y + 18, GRID.cellWidth - 36, GRID.cellHeight - 36);
  context.fillStyle = "#071015";
  context.font = "700 16px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, x + GRID.cellWidth / 2, y + GRID.cellHeight / 2);
}

function setStatus(message) {
  status.textContent = message;
}

function dispatchState() {
  window.dispatchEvent(new CustomEvent("protocol99:statechange", {
    detail: snapshot()
  }));
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}
