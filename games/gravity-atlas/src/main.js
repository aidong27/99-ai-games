/*
 * Gravity Atlas — page logic.
 * All physics comes from ./engine.js, the same module that
 * scripts/verify-gravity-atlas.mjs replays in Node to prove completability.
 */
import {
  WORLD,
  DT,
  LEVELS,
  PROBE_RADIUS,
  POWER_CAP,
  REFERENCE_SOLUTIONS,
  createShot,
  simulateShot,
  clampPower
} from "./engine.js";

const canvas = document.querySelector("#atlas-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  plate: document.querySelector("#plate-readout"),
  shots: document.querySelector("#shots-readout"),
  par: document.querySelector("#par-readout"),
  score: document.querySelector("#score-readout"),
  plateName: document.querySelector("#plate-name"),
  plateNote: document.querySelector("#plate-note"),
  outcomeLine: document.querySelector("#outcome-line"),
  powerMeter: document.querySelector("#power-meter"),
  powerLabel: document.querySelector("#power-label"),
  fireButton: document.querySelector("#fire-button"),
  restartButton: document.querySelector("#restart-button"),
  helpButton: document.querySelector("#help-button"),
  overlay: document.querySelector("#overlay"),
  overlayKicker: document.querySelector("#overlay-kicker"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayCopy: document.querySelector("#overlay-copy"),
  overlayActions: document.querySelector("#overlay-actions")
};

const OUTCOME_TEXT = {
  target: "Target ring reached.",
  well: "Probe fell into a mass core.",
  void: "Probe erased by a void zone.",
  bounds: "Probe left the plate.",
  timeout: "Probe drifted too long. Shot retired."
};

let state = freshState();
let lastFrame = performance.now();
let accumulator = 0;

function freshState() {
  return {
    mode: "menu", // menu | aiming | flying | cleared | won | lost | paused
    level: 0,
    shotsLeft: LEVELS[0].budget,
    shotsUsed: 0,
    score: 0,
    aim: { vx: 420, vy: 0 },
    shot: null,
    trail: [],
    ghost: null,
    lastOutcome: null,
    flash: 0,
    won: false,
    lost: false,
    pausedFrom: null
  };
}

function start() {
  state = freshState();
  enterLevel(0);
  hideOverlay();
}

function restart() {
  start();
}

function enterLevel(index) {
  state.level = index;
  state.shotsLeft = LEVELS[index].budget;
  state.shotsUsed = 0;
  state.shot = null;
  state.trail = [];
  state.ghost = null;
  state.lastOutcome = null;
  state.mode = "aiming";
  const solution = REFERENCE_SOLUTIONS[index];
  state.aim = { vx: solution.vx * 0.55, vy: solution.vy * 0.55 };
  updateHud();
}

function fire() {
  if (state.mode !== "aiming" || state.shotsLeft <= 0) {
    return false;
  }
  const { vx, vy } = clampPower(state.aim.vx, state.aim.vy);
  state.shot = createShot(state.level, vx, vy);
  state.trail = [{ x: state.shot.state.x, y: state.shot.state.y }];
  state.mode = "flying";
  state.shotsLeft -= 1;
  state.shotsUsed += 1;
  updateHud();
  return true;
}

function fireVector(vx, vy) {
  if (state.mode !== "aiming") {
    return false;
  }
  state.aim = clampPower(vx, vy);
  return fire();
}

function settleShot(outcome) {
  state.lastOutcome = outcome;
  state.ghost = state.trail.slice();
  state.shot = null;
  state.flash = outcome === "target" ? 0.9 : 0.45;

  if (outcome === "target") {
    const level = LEVELS[state.level];
    const plateScore = 100 + state.shotsLeft * 25 + (state.shotsUsed <= level.par ? 40 : 0);
    state.score += plateScore;
    if (state.level >= LEVELS.length - 1) {
      state.mode = "won";
      state.won = true;
      updateHud();
      showOverlay({
        kicker: "Atlas complete",
        title: "Every plate is charted",
        copy: `All ${LEVELS.length} gravity plates are solved. Final score ${state.score}. The reference trajectories in the engine prove each plate was completable — but you found your own.`,
        actions: [{ label: "Chart again", primary: true, fn: restart }]
      });
    } else {
      state.mode = "cleared";
      updateHud();
      const next = LEVELS[state.level + 1];
      showOverlay({
        kicker: `${LEVELS[state.level].name} cleared`,
        title: `+${plateScore} points`,
        copy: `${state.shotsUsed} shot${state.shotsUsed === 1 ? "" : "s"} used (par ${LEVELS[state.level].par}). Next: ${next.name}. ${next.note}`,
        actions: [{ label: "Next plate", primary: true, fn: () => { enterLevel(state.level + 1); hideOverlay(); } }]
      });
    }
    return;
  }

  if (state.shotsLeft <= 0) {
    state.mode = "lost";
    state.lost = true;
    updateHud();
    showOverlay({
      kicker: "Plate failed",
      title: "Shot budget exhausted",
      copy: `${OUTCOME_TEXT[outcome]} No shots remain on ${LEVELS[state.level].name}. Score ${state.score}.`,
      actions: [{ label: "Restart the atlas", primary: true, fn: restart }]
    });
    return;
  }

  state.mode = "aiming";
  updateHud();
}

function togglePause() {
  if (state.mode === "aiming" || state.mode === "flying") {
    state.pausedFrom = state.mode;
    state.mode = "paused";
    showOverlay({
      kicker: "Atlas paused",
      title: "Paused",
      copy: "Drag from the launch pad to aim — the dotted plotter shows the first moments of the path. Release or press Space to fire. Masses curve the probe, bright masses push, void zones erase it. Reach the ring within the shot budget.",
      actions: [
        { label: "Resume", primary: true, fn: resume },
        { label: "Restart atlas", primary: false, fn: restart }
      ]
    });
    updateHud();
  } else if (state.mode === "paused") {
    resume();
  }
}

function resume() {
  state.mode = state.pausedFrom ?? "aiming";
  state.pausedFrom = null;
  hideOverlay();
  updateHud();
}

// Rendering -----------------------------------------------------------------

function frame(now) {
  const elapsed = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.mode === "flying" && state.shot) {
    accumulator += elapsed;
    while (accumulator >= DT && state.shot) {
      accumulator -= DT;
      const outcome = state.shot.step();
      state.trail.push({ x: state.shot.state.x, y: state.shot.state.y });
      if (state.trail.length > 2200) {
        state.trail.shift();
      }
      if (outcome) {
        settleShot(outcome);
        break;
      }
    }
  } else {
    accumulator = 0;
  }

  if (state.flash > 0) {
    state.flash = Math.max(0, state.flash - elapsed * 1.4);
  }

  render(now / 1000);
  requestAnimationFrame(frame);
}

function render(time) {
  const level = LEVELS[state.level];
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);

  drawBackground(time);
  drawVoids(level, time);
  drawWells(level, time);
  drawTarget(level, time);
  drawGhost();
  drawTrail();
  drawPad(level);
  if (state.mode === "aiming") {
    drawAimPlot(level, time);
  }
  if (state.shot) {
    drawProbe(state.shot.state.x, state.shot.state.y);
  }
  if (state.flash > 0) {
    ctx.fillStyle = state.lastOutcome === "target"
      ? `rgba(216, 247, 95, ${state.flash * 0.16})`
      : `rgba(200, 106, 106, ${state.flash * 0.14})`;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }
}

function drawBackground(time) {
  const gradient = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  gradient.addColorStop(0, "#08090b");
  gradient.addColorStop(1, "#040506");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.strokeStyle = "rgba(244, 241, 232, 0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
}

function drawWells(level, time) {
  for (const well of level.wells) {
    const repulsor = well.pull < 0;
    const base = repulsor ? "247, 220, 111" : "216, 247, 95";
    for (let ring = 3; ring >= 1; ring -= 1) {
      const radius = well.core + ring * 26 + Math.sin(time * 1.6 + ring) * 3;
      ctx.strokeStyle = `rgba(${base}, ${0.05 * ring})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(well.x, well.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(well.x, well.y, 2, well.x, well.y, well.core);
    glow.addColorStop(0, `rgba(${base}, ${repulsor ? 0.85 : 0.55})`);
    glow.addColorStop(1, `rgba(${base}, 0.08)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(well.x, well.y, well.core, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${base}, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawVoids(level, time) {
  for (const zone of level.voids) {
    const pulse = 1 + Math.sin(time * 1.3 + zone.x) * 0.012;
    const gradient = ctx.createRadialGradient(zone.x, zone.y, zone.r * 0.2, zone.x, zone.y, zone.r * pulse);
    gradient.addColorStop(0, "rgba(200, 106, 106, 0.16)");
    gradient.addColorStop(1, "rgba(200, 106, 106, 0.02)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = "rgba(200, 106, 106, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawTarget(level, time) {
  const pulse = 1 + Math.sin(time * 2.4) * 0.06;
  ctx.strokeStyle = "rgba(244, 241, 232, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(level.target.x, level.target.y, level.target.r * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(127, 233, 224, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(level.target.x, level.target.y, level.target.r * pulse + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(127, 233, 224, 0.9)";
  ctx.beginPath();
  ctx.arc(level.target.x, level.target.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPad(level) {
  ctx.strokeStyle = "rgba(244, 241, 232, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(level.pad.x, level.pad.y, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(244, 241, 232, 0.9)";
  ctx.beginPath();
  ctx.arc(level.pad.x, level.pad.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawProbe(x, y) {
  ctx.fillStyle = "rgba(127, 233, 224, 0.95)";
  ctx.beginPath();
  ctx.arc(x, y, PROBE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(244, 241, 232, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawTrail() {
  if (state.trail.length < 2) {
    return;
  }
  ctx.strokeStyle = "rgba(127, 233, 224, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.trail[0].x, state.trail[0].y);
  for (const point of state.trail) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function drawGhost() {
  if (!state.ghost || state.ghost.length < 2) {
    return;
  }
  ctx.strokeStyle = "rgba(244, 241, 232, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(state.ghost[0].x, state.ghost[0].y);
  for (const point of state.ghost) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function drawAimPlot(level, time) {
  const { vx, vy } = clampPower(state.aim.vx, state.aim.vy);
  const preview = createShot(state.level, vx, vy);
  ctx.fillStyle = "rgba(216, 247, 95, 0.75)";
  const previewSteps = 78; // 0.65s of honest plotter preview; the rest is discovery
  for (let i = 0; i < previewSteps; i += 1) {
    if (preview.step()) {
      break;
    }
    if (i % 6 === 0) {
      ctx.beginPath();
      ctx.arc(preview.state.x, preview.state.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const mag = Math.sqrt(vx * vx + vy * vy);
  const ux = mag > 0 ? vx / mag : 1;
  const uy = mag > 0 ? vy / mag : 0;
  ctx.strokeStyle = "rgba(216, 247, 95, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(level.pad.x, level.pad.y);
  ctx.lineTo(level.pad.x + ux * (26 + mag * 0.06), level.pad.y + uy * (26 + mag * 0.06));
  ctx.stroke();
}

// HUD -----------------------------------------------------------------------

function updateHud() {
  const level = LEVELS[state.level];
  ui.plate.textContent = `${state.level + 1} / ${LEVELS.length}`;
  ui.shots.textContent = String(state.shotsLeft);
  ui.par.textContent = String(level.par);
  ui.score.textContent = String(state.score);
  ui.plateName.textContent = level.name;
  ui.plateNote.textContent = level.note;
  ui.outcomeLine.textContent = state.lastOutcome
    ? OUTCOME_TEXT[state.lastOutcome]
    : "Drag from the pad to aim, release to fire.";

  const mag = Math.min(POWER_CAP, Math.sqrt(state.aim.vx * state.aim.vx + state.aim.vy * state.aim.vy));
  ui.powerMeter.style.width = `${Math.round(mag / POWER_CAP * 100)}%`;
  ui.powerLabel.textContent = `${Math.round(mag)} / ${POWER_CAP}`;

  ui.fireButton.disabled = state.mode !== "aiming";

  canvas.dataset.mode = state.mode;
  canvas.dataset.level = String(state.level + 1);
  canvas.dataset.shotsLeft = String(state.shotsLeft);
  canvas.dataset.score = String(state.score);
  canvas.dataset.lastOutcome = state.lastOutcome ?? "";
}

// Overlay ---------------------------------------------------------------------

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

// Input -----------------------------------------------------------------------

let aimingPointer = null;

function pointToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width * WORLD.width,
    y: (event.clientY - rect.top) / rect.height * WORLD.height
  };
}

function aimFromPoint(point) {
  const level = LEVELS[state.level];
  const dx = point.x - level.pad.x;
  const dy = point.y - level.pad.y;
  state.aim = clampPower(dx * 1.45, dy * 1.45);
  updateHud();
}

canvas.addEventListener("pointerdown", (event) => {
  if (state.mode !== "aiming") {
    return;
  }
  event.preventDefault();
  aimingPointer = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  aimFromPoint(pointToWorld(event));
});

canvas.addEventListener("pointermove", (event) => {
  if (aimingPointer !== event.pointerId || state.mode !== "aiming") {
    return;
  }
  aimFromPoint(pointToWorld(event));
});

canvas.addEventListener("pointerup", (event) => {
  if (aimingPointer !== event.pointerId) {
    return;
  }
  aimingPointer = null;
  try {
    canvas.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer may already be released.
  }
  if (state.mode === "aiming") {
    fire();
  }
});

canvas.addEventListener("pointercancel", () => {
  aimingPointer = null;
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "r", "p", "h"].includes(key)) {
    event.preventDefault();
  }

  if (state.mode === "menu") {
    if (key === " " || key === "enter") {
      start();
    }
    return;
  }
  if (state.mode === "won" || state.mode === "lost" || state.mode === "cleared") {
    if (key === " " || key === "enter") {
      ui.overlayActions.querySelector(".button.primary")?.click();
    }
    return;
  }
  if (key === "p" || (state.mode === "paused" && key === " ")) {
    togglePause();
    return;
  }
  if (state.mode === "paused") {
    return;
  }
  if (key === "h") {
    togglePause();
    return;
  }

  if (state.mode === "aiming") {
    const mag = Math.sqrt(state.aim.vx * state.aim.vx + state.aim.vy * state.aim.vy) || 1;
    let angle = Math.atan2(state.aim.vy, state.aim.vx);
    let power = mag;
    if (key === "arrowleft") {
      angle -= 0.03;
    } else if (key === "arrowright") {
      angle += 0.03;
    } else if (key === "arrowup") {
      power = Math.min(POWER_CAP, power + 12);
    } else if (key === "arrowdown") {
      power = Math.max(40, power - 12);
    } else if (key === " ") {
      fire();
      return;
    } else if (key === "r") {
      restart();
      return;
    } else {
      return;
    }
    state.aim = { vx: Math.cos(angle) * power, vy: Math.sin(angle) * power };
    updateHud();
    return;
  }

  if (key === "r") {
    restart();
  }
});

ui.fireButton.addEventListener("click", fire);
ui.restartButton.addEventListener("click", restart);
ui.helpButton.addEventListener("click", togglePause);

// QA hooks ----------------------------------------------------------------------

window.__gravityAtlasQA = {
  start,
  restart,
  fire,
  fireVector,
  setAim(vx, vy) {
    state.aim = clampPower(Number(vx), Number(vy));
    updateHud();
  },
  // Fires the embedded reference solution for the current plate. The vector is
  // proven by scripts/verify-gravity-atlas.mjs against the same engine.
  autoSolveShot() {
    const solution = REFERENCE_SOLUTIONS[state.level];
    return fireVector(solution.vx, solution.vy);
  },
  simulate(levelIndex, vx, vy) {
    return simulateShot(levelIndex, vx, vy);
  },
  forceWin() {
    if (state.mode === "menu") {
      start();
    }
    state.level = LEVELS.length - 1;
    state.shotsLeft = 1;
    state.shotsUsed = LEVELS[state.level].par;
    state.trail = [];
    settleShot("target");
  },
  forceLose() {
    if (state.mode === "menu") {
      start();
    }
    state.shotsLeft = 0;
    state.trail = [];
    settleShot("bounds");
  },
  getSnapshot() {
    return {
      mode: state.mode,
      level: state.level + 1,
      levelCount: LEVELS.length,
      plateName: LEVELS[state.level].name,
      shotsLeft: state.shotsLeft,
      shotsUsed: state.shotsUsed,
      par: LEVELS[state.level].par,
      score: state.score,
      aim: { ...state.aim },
      probeActive: Boolean(state.shot),
      probe: state.shot ? { x: state.shot.state.x, y: state.shot.state.y } : null,
      lastOutcome: state.lastOutcome,
      won: state.won,
      lost: state.lost
    };
  }
};

// Boot ----------------------------------------------------------------------------

updateHud();
showOverlay({
  kicker: "Observation 005 / Game 005 · Physics Experiment Hall",
  title: "Gravity Atlas",
  copy: `Chart ${LEVELS.length} gravity plates. Drag from the launch pad to aim, release to fire, and curve the probe through masses, repulsors, and void zones into the target ring — within each plate's shot budget. The physics is deterministic, and every plate is provably completable.`,
  actions: [
    { label: "Open the atlas", primary: true, fn: start },
    { label: "How to play", primary: false, fn: () => { start(); togglePause(); } }
  ]
});
requestAnimationFrame(frame);
