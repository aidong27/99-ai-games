const WIDTH = 1280;
const HEIGHT = 720;
const RUN_DURATION = 75;
const PLAYER_RADIUS = 14;
const BASE_SPEED = 305;
const DASH_SPEED = 880;
const DASH_TIME = 0.2;
const DASH_COOLDOWN = 1.15;
const COMBO_HOLD = 4.2;
const MAX_INTEGRITY = 100;

const canvas = document.querySelector("#game-canvas");
const ctx = canvas?.getContext("2d");

const ui = {
  overlay: document.querySelector("#overlay"),
  overlayKicker: document.querySelector("#overlay-kicker"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayCopy: document.querySelector("#overlay-copy"),
  primaryAction: document.querySelector("#primary-action"),
  time: document.querySelector("#time-readout"),
  score: document.querySelector("#score-readout"),
  combo: document.querySelector("#combo-readout"),
  integrity: document.querySelector("#integrity-readout"),
  dashButton: document.querySelector("#dash-button"),
  dashReadout: document.querySelector("#dash-readout"),
  pauseButton: document.querySelector("#pause-button"),
  restartButton: document.querySelector("#restart-button"),
  objective: document.querySelector("#objective-readout"),
  message: document.querySelector("#message-readout"),
  integrityMeter: document.querySelector("#integrity-meter"),
  dashMeter: document.querySelector("#dash-meter"),
  comboMeter: document.querySelector("#combo-meter"),
  runMeter: document.querySelector("#run-meter"),
  parcelReadout: document.querySelector("#parcel-readout"),
  threat: document.querySelector("#threat-readout"),
  bestCombo: document.querySelector("#best-combo-readout"),
  highScore: document.querySelector("#high-score-readout")
};

const keyState = new Set();
const pointerState = {
  active: false,
  target: null
};

const random = {
  seed: 90210,
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  },
  range(min, max) {
    return min + (max - min) * this.next();
  },
  pick(items) {
    return items[Math.floor(this.next() * items.length)];
  }
};

let rafId = 0;
let lastFrame = 0;
let highScore = readHighScore();

const state = {
  mode: "title",
  elapsed: 0,
  score: 0,
  combo: 1,
  bestCombo: 0,
  comboTimer: 0,
  parcelsCollected: 0,
  parcelSpawnTimer: 0,
  integrity: MAX_INTEGRITY,
  damageGrace: 0,
  shake: 0,
  message: "Short loops, sharp warnings, and clean recovery windows.",
  player: {
    x: 170,
    y: HEIGHT / 2,
    vx: 0,
    vy: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDx: 1,
    dashDy: 0
  },
  parcels: [],
  barriers: [],
  particles: []
};

if (!canvas || !ctx) {
  showStaticError();
} else {
  boot();
}

function boot() {
  canvas.tabIndex = 0;
  initBarriers();
  resetRun("title");
  bindInputs();
  render(0);
  updateUi();
  startLoop();
}

function showStaticError() {
  if (ui.overlayTitle) ui.overlayTitle.textContent = "Canvas unavailable";
  if (ui.overlayCopy) ui.overlayCopy.textContent = "This browser could not create the game canvas.";
}

function bindInputs() {
  ui.primaryAction?.addEventListener("click", () => {
    if (state.mode === "title" || state.mode === "failed" || state.mode === "complete") {
      startRun();
    } else if (state.mode === "paused") {
      resumeRun();
    }
  });

  ui.dashButton?.addEventListener("click", () => triggerDash());
  ui.pauseButton?.addEventListener("click", () => togglePause());
  ui.restartButton?.addEventListener("click", () => restartRun());

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar"].includes(key)) {
      event.preventDefault();
    }

    if (key === "enter" && (state.mode === "title" || state.mode === "complete" || state.mode === "failed")) {
      startRun();
      return;
    }

    if (key === "p") {
      togglePause();
      return;
    }

    if (key === "r") {
      restartRun();
      return;
    }

    if (key === " " || key === "spacebar") {
      triggerDash();
      return;
    }

    keyState.add(key);
  });

  window.addEventListener("keyup", (event) => {
    keyState.delete(event.key.toLowerCase());
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (state.mode === "title" || state.mode === "complete" || state.mode === "failed") {
      startRun();
    }
    pointerState.active = true;
    pointerState.target = screenToWorld(event);
    canvas.setPointerCapture?.(event.pointerId);
    canvas.focus();
    event.preventDefault();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerState.active) return;
    pointerState.target = screenToWorld(event);
    event.preventDefault();
  });

  canvas.addEventListener("pointerup", (event) => {
    pointerState.active = false;
    pointerState.target = screenToWorld(event);
  });

  canvas.addEventListener("pointercancel", clearPointerState);
  canvas.addEventListener("lostpointercapture", clearPointerState);

  window.addEventListener("blur", () => {
    keyState.clear();
    clearPointerState();
    if (state.mode === "running") pauseRun("Window focus lost. Run paused.");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
      if (state.mode === "running") pauseRun("Run paused while the page was hidden.");
    } else {
      startLoop();
    }
  });
}

function startLoop() {
  if (rafId || document.hidden) return;
  lastFrame = performance.now();
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = 0;
}

function loop(now) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(0.033, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;

  if (state.mode === "running") {
    update(dt);
  }

  render(now / 1000);
  updateUi();
}

function resetRun(mode = "title") {
  random.seed = 90210;
  state.mode = mode;
  state.elapsed = 0;
  state.score = 0;
  state.combo = 1;
  state.bestCombo = 0;
  state.comboTimer = 0;
  state.parcelsCollected = 0;
  state.parcelSpawnTimer = 0.15;
  state.integrity = MAX_INTEGRITY;
  state.damageGrace = 0;
  state.shake = 0;
  state.message = "Collect parcels, keep the chain alive, and survive until extraction.";
  state.player.x = 170;
  state.player.y = HEIGHT / 2;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.dashTimer = 0;
  state.player.dashCooldown = 0;
  state.player.dashDx = 1;
  state.player.dashDy = 0;
  state.parcels = [];
  state.particles = [];
  pointerState.target = null;
  pointerState.active = false;
  initBarriers();
  for (let i = 0; i < 5; i += 1) spawnParcel();
  syncOverlay();
}

function initBarriers() {
  state.barriers = [
    makeBarrier("vertical", 292, 0.2, 3.3, 110, 160, 0.8),
    makeBarrier("vertical", 538, 1.1, 3.05, 190, 130, 1.15),
    makeBarrier("vertical", 784, 1.8, 2.85, 300, 140, 0.95),
    makeBarrier("vertical", 1022, 2.4, 2.65, 230, 120, 1.35),
    makeBarrier("horizontal", 214, 0.75, 3.15, 410, 180, 1.1),
    makeBarrier("horizontal", 512, 1.65, 2.95, 630, 170, 0.9)
  ];
}

function makeBarrier(axis, position, phase, period, gapBase, gapAmp, gapSpeed) {
  return {
    axis,
    position,
    phase,
    period,
    gapBase,
    gapAmp,
    gapSpeed,
    gapSize: axis === "vertical" ? 155 : 205,
    thickness: 28,
    activeDuration: 0.42,
    warningDuration: 0.68
  };
}

function startRun() {
  resetRun("running");
  hideOverlay();
  canvas?.focus();
}

function restartRun() {
  startRun();
}

function pauseRun(message = "Run paused.") {
  if (state.mode !== "running") return;
  state.mode = "paused";
  state.message = message;
  syncOverlay();
}

function resumeRun() {
  if (state.mode !== "paused") return;
  state.mode = "running";
  hideOverlay();
}

function togglePause() {
  if (state.mode === "running") {
    pauseRun();
  } else if (state.mode === "paused") {
    resumeRun();
  }
}

function triggerDash() {
  if (state.mode !== "running") return;
  const player = state.player;
  if (player.dashCooldown > 0 || player.dashTimer > 0) return;

  const input = getMovementInput();
  let dx = input.x;
  let dy = input.y;

  if (Math.hypot(dx, dy) < 0.01 && pointerState.target) {
    dx = pointerState.target.x - player.x;
    dy = pointerState.target.y - player.y;
  }

  const length = Math.hypot(dx, dy) || 1;
  player.dashDx = dx / length;
  player.dashDy = dy / length;
  player.dashTimer = DASH_TIME;
  player.dashCooldown = DASH_COOLDOWN;
  state.message = "Dash window committed.";
  burst(player.x, player.y, "dash", 18);
}

function update(dt) {
  state.elapsed += dt;
  state.damageGrace = Math.max(0, state.damageGrace - dt);
  state.shake = Math.max(0, state.shake - dt * 1.9);

  const difficulty = getDifficulty();
  updatePlayer(dt);
  updateParcels(dt, difficulty);
  updateBarriers(dt, difficulty);
  updateParticles(dt);
  updateCombo(dt);

  if (state.elapsed >= RUN_DURATION) {
    completeRun();
  }
}

function updatePlayer(dt) {
  const player = state.player;
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);

  const input = getMovementInput();
  let moveX = input.x;
  let moveY = input.y;
  const keyMoving = Math.hypot(moveX, moveY) > 0;

  if (!keyMoving && pointerState.target) {
    const dx = pointerState.target.x - player.x;
    const dy = pointerState.target.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 6) {
      moveX = dx / distance;
      moveY = dy / distance;
    }
  }

  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.vx = player.dashDx * DASH_SPEED;
    player.vy = player.dashDy * DASH_SPEED;
  } else {
    player.vx += (moveX * BASE_SPEED - player.vx) * Math.min(1, dt * 12);
    player.vy += (moveY * BASE_SPEED - player.vy) * Math.min(1, dt * 12);
    if (Math.hypot(moveX, moveY) > 0.01) {
      const length = Math.hypot(moveX, moveY);
      player.dashDx = moveX / length;
      player.dashDy = moveY / length;
    }
  }

  player.x = clamp(player.x + player.vx * dt, 36, WIDTH - 36);
  player.y = clamp(player.y + player.vy * dt, 36, HEIGHT - 36);
}

function getMovementInput() {
  let x = 0;
  let y = 0;
  if (keyState.has("a") || keyState.has("arrowleft")) x -= 1;
  if (keyState.has("d") || keyState.has("arrowright")) x += 1;
  if (keyState.has("w") || keyState.has("arrowup")) y -= 1;
  if (keyState.has("s") || keyState.has("arrowdown")) y += 1;

  const length = Math.hypot(x, y);
  if (length > 0) {
    x /= length;
    y /= length;
  }
  return { x, y };
}

function updateParcels(dt, difficulty) {
  state.parcelSpawnTimer -= dt;
  const targetCount = 5 + Math.floor(difficulty * 3);
  if (state.parcelSpawnTimer <= 0 || state.parcels.length < targetCount) {
    spawnParcel();
    state.parcelSpawnTimer = Math.max(0.42, 1.35 - difficulty * 0.48);
  }

  for (const parcel of state.parcels) {
    parcel.life -= dt;
    parcel.pulse += dt * 4.2;
  }

  for (let i = state.parcels.length - 1; i >= 0; i -= 1) {
    const parcel = state.parcels[i];
    const distance = Math.hypot(parcel.x - state.player.x, parcel.y - state.player.y);
    if (distance < parcel.radius + PLAYER_RADIUS) {
      collectParcelAt(i);
    } else if (parcel.life <= 0) {
      state.parcels.splice(i, 1);
      if (state.combo > 1) {
        state.combo = Math.max(1, Math.floor(state.combo * 0.6));
        state.comboTimer = Math.min(state.comboTimer, 1.2);
        state.message = "Parcel decayed. Combo chain weakened.";
      }
    }
  }
}

function spawnParcel() {
  let x = 0;
  let y = 0;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    x = random.range(130, WIDTH - 80);
    y = random.range(72, HEIGHT - 72);
    const playerDistance = Math.hypot(x - state.player.x, y - state.player.y);
    if (playerDistance > 140 && !isInsideActiveWall(x, y)) break;
  }
  state.parcels.push({
    x,
    y,
    radius: 17,
    life: random.range(7.5, 10.5),
    pulse: random.range(0, Math.PI * 2),
    value: 100 + Math.floor(getDifficulty() * 80)
  });
}

function collectParcelAt(index) {
  const parcel = state.parcels[index];
  if (!parcel) return;

  const multiplier = Math.min(8, state.combo);
  const urgencyBonus = Math.max(0, Math.floor(parcel.life * 5));
  const gained = Math.round((parcel.value + urgencyBonus) * multiplier);
  state.score += gained;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo - 1);
  state.comboTimer = COMBO_HOLD;
  state.parcelsCollected += 1;
  state.message = `Parcel delivered +${gained}. Combo x${state.combo}.`;
  burst(parcel.x, parcel.y, "parcel", 22);
  state.parcels.splice(index, 1);
}

function updateBarriers(dt, difficulty) {
  for (const barrier of state.barriers) {
    barrier.period = Math.max(1.65, barrier.period - dt * 0.012 * (0.65 + difficulty));
    barrier.activeDuration = Math.min(0.78, barrier.activeDuration + dt * 0.004 * difficulty);
    barrier.gapSize = Math.max(barrier.axis === "vertical" ? 112 : 154, barrier.gapSize - dt * 0.7 * difficulty);

    const barrierState = getBarrierState(barrier);
    if (barrierState.mode === "active" && playerHitsBarrier(barrier, barrierState) && !isPlayerInvulnerable()) {
      damage(18 + Math.floor(difficulty * 10), "Pulse barrier clipped the courier.");
    }
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - dt * 1.2;
    particle.vy *= 1 - dt * 1.2;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateCombo(dt) {
  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0 && state.combo > 1) {
      state.combo = 1;
      state.message = "Combo chain reset.";
    }
  }
}

function damage(amount, message) {
  if (state.damageGrace > 0) return;
  state.integrity = Math.max(0, state.integrity - amount);
  state.damageGrace = 0.55;
  state.shake = 1;
  state.combo = Math.max(1, Math.floor(state.combo * 0.5));
  state.comboTimer = 0;
  state.message = message;
  burst(state.player.x, state.player.y, "hit", 20);

  if (state.integrity <= 0) {
    failRun();
  }
}

function completeRun() {
  if (state.mode !== "running") return;
  state.mode = "complete";
  highScore = Math.max(highScore, state.score);
  writeHighScore(highScore);
  state.message = "Extraction window reached. Courier signal archived.";
  syncOverlay();
}

function failRun() {
  state.mode = "failed";
  state.integrity = 0;
  state.message = "Courier signal collapsed before extraction.";
  syncOverlay();
}

function getDifficulty() {
  return clamp(state.elapsed / RUN_DURATION, 0, 1);
}

function getBarrierState(barrier) {
  const cycle = (state.elapsed + barrier.phase) % barrier.period;
  const gapRange = barrier.axis === "vertical" ? HEIGHT : WIDTH;
  const gapCenter = clamp(
    barrier.gapBase + Math.sin((state.elapsed + barrier.phase) * barrier.gapSpeed) * barrier.gapAmp,
    barrier.gapSize * 0.5 + 34,
    gapRange - barrier.gapSize * 0.5 - 34
  );

  if (cycle < barrier.activeDuration) {
    return { mode: "active", progress: cycle / barrier.activeDuration, gapCenter };
  }
  if (cycle < barrier.activeDuration + barrier.warningDuration) {
    const warningProgress = (cycle - barrier.activeDuration) / barrier.warningDuration;
    return { mode: "warning", progress: warningProgress, gapCenter };
  }
  return { mode: "idle", progress: cycle / barrier.period, gapCenter };
}

function playerHitsBarrier(barrier, barrierState) {
  const gapMin = barrierState.gapCenter - barrier.gapSize * 0.5;
  const gapMax = barrierState.gapCenter + barrier.gapSize * 0.5;
  if (barrier.axis === "vertical") {
    const inLine = Math.abs(state.player.x - barrier.position) <= barrier.thickness * 0.5 + PLAYER_RADIUS;
    const outsideGap = state.player.y < gapMin || state.player.y > gapMax;
    return inLine && outsideGap;
  }
  const inLine = Math.abs(state.player.y - barrier.position) <= barrier.thickness * 0.5 + PLAYER_RADIUS;
  const outsideGap = state.player.x < gapMin || state.player.x > gapMax;
  return inLine && outsideGap;
}

function isInsideActiveWall(x, y) {
  for (const barrier of state.barriers) {
    const barrierState = getBarrierState(barrier);
    if (barrierState.mode !== "active") continue;
    const gapMin = barrierState.gapCenter - barrier.gapSize * 0.5;
    const gapMax = barrierState.gapCenter + barrier.gapSize * 0.5;
    if (barrier.axis === "vertical") {
      if (Math.abs(x - barrier.position) < barrier.thickness && (y < gapMin || y > gapMax)) return true;
    } else if (Math.abs(y - barrier.position) < barrier.thickness && (x < gapMin || x > gapMax)) {
      return true;
    }
  }
  return false;
}

function isPlayerInvulnerable() {
  return state.player.dashTimer > 0;
}

function render(time) {
  if (!ctx) return;

  const shakeX = state.shake > 0 ? (random.next() - 0.5) * state.shake * 8 : 0;
  const shakeY = state.shake > 0 ? (random.next() - 0.5) * state.shake * 8 : 0;

  ctx.save();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.translate(shakeX, shakeY);
  drawBackground(time);
  drawExtraction(time);
  drawParcels(time);
  drawBarriers(time);
  drawPointerTarget(time);
  drawParticles();
  drawPlayer(time);
  drawForeground(time);
  ctx.restore();
}

function drawBackground(time) {
  ctx.fillStyle = "#020304";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const gradient = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.52, 80, WIDTH * 0.5, HEIGHT * 0.52, 760);
  gradient.addColorStop(0, "rgba(72, 227, 237, 0.12)");
  gradient.addColorStop(0.42, "rgba(216, 247, 95, 0.035)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 64) {
    ctx.strokeStyle = x % 256 === 0 ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 64) {
    ctx.strokeStyle = y % 256 === 0 ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(216,247,95,0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const radius = 120 + ((time * 42 + i * 170) % 520);
    ctx.beginPath();
    ctx.arc(WIDTH * 0.5, HEIGHT * 0.5, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawExtraction(time) {
  const progress = clamp(state.elapsed / RUN_DURATION, 0, 1);
  const alpha = 0.15 + progress * 0.65;
  const x = WIDTH - 56;
  ctx.save();
  ctx.strokeStyle = `rgba(216,247,95,${alpha})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.lineDashOffset = -time * 36;
  ctx.beginPath();
  ctx.moveTo(x, 56);
  ctx.lineTo(x, HEIGHT - 56);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(216,247,95,${0.08 + progress * 0.1})`;
  ctx.fillRect(WIDTH - 78, 56, 42, HEIGHT - 112);
  ctx.restore();
}

function drawParcels(time) {
  for (const parcel of state.parcels) {
    const pulse = 1 + Math.sin(parcel.pulse + time * 3) * 0.12;
    const warn = parcel.life < 2.1;
    ctx.save();
    ctx.translate(parcel.x, parcel.y);
    ctx.rotate(Math.PI * 0.25 + time * 0.7);
    ctx.fillStyle = warn ? "rgba(226,184,92,0.9)" : "rgba(216,247,95,0.9)";
    ctx.strokeStyle = warn ? "rgba(226,184,92,0.45)" : "rgba(72,227,237,0.45)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = warn ? "rgba(226,184,92,0.35)" : "rgba(216,247,95,0.28)";
    const size = parcel.radius * pulse;
    ctx.beginPath();
    ctx.rect(-size * 0.5, -size * 0.5, size, size);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = warn ? "rgba(226,184,92,0.22)" : "rgba(216,247,95,0.18)";
    ctx.beginPath();
    ctx.arc(parcel.x, parcel.y, parcel.radius + parcel.life * 1.8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBarriers(time) {
  for (const barrier of state.barriers) {
    const barrierState = getBarrierState(barrier);
    const gapMin = barrierState.gapCenter - barrier.gapSize * 0.5;
    const gapMax = barrierState.gapCenter + barrier.gapSize * 0.5;
    const color = barrierState.mode === "active"
      ? "rgba(200,106,106,0.88)"
      : barrierState.mode === "warning"
        ? "rgba(226,184,92,0.62)"
        : "rgba(255,255,255,0.09)";
    const glow = barrierState.mode === "active" ? 18 : barrierState.mode === "warning" ? 10 : 0;

    ctx.save();
    ctx.lineWidth = barrier.thickness;
    ctx.lineCap = "butt";
    ctx.strokeStyle = color;
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;

    if (barrier.axis === "vertical") {
      drawBarrierSegment(barrier.position, 0, barrier.position, gapMin);
      drawBarrierSegment(barrier.position, gapMax, barrier.position, HEIGHT);
      drawGapMarker(barrier.position, gapMin, barrier.position, gapMax, "vertical", time);
    } else {
      drawBarrierSegment(0, barrier.position, gapMin, barrier.position);
      drawBarrierSegment(gapMax, barrier.position, WIDTH, barrier.position);
      drawGapMarker(gapMin, barrier.position, gapMax, barrier.position, "horizontal", time);
    }
    ctx.restore();
  }
}

function drawBarrierSegment(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawGapMarker(x1, y1, x2, y2, axis, time) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(216,247,95,0.34)";
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = -time * 26;
  ctx.beginPath();
  if (axis === "vertical") {
    ctx.moveTo(x1 - 18, y1);
    ctx.lineTo(x2 - 18, y2);
    ctx.moveTo(x1 + 18, y1);
    ctx.lineTo(x2 + 18, y2);
  } else {
    ctx.moveTo(x1, y1 - 18);
    ctx.lineTo(x2, y2 - 18);
    ctx.moveTo(x1, y1 + 18);
    ctx.lineTo(x2, y2 + 18);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPointerTarget(time) {
  if (!pointerState.target) return;
  const target = pointerState.target;
  ctx.save();
  ctx.strokeStyle = "rgba(72,227,237,0.45)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = -time * 28;
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(target.x, target.y, 18 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color.replace("ALPHA", alpha.toFixed(3));
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(time) {
  const player = state.player;
  const angle = Math.atan2(player.dashDy || player.vy, player.dashDx || player.vx);
  const dashAlpha = isPlayerInvulnerable() ? 0.75 : 0.18;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Number.isFinite(angle) ? angle : 0);

  ctx.fillStyle = `rgba(72,227,237,${dashAlpha})`;
  ctx.beginPath();
  ctx.ellipse(-16, 0, 32, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f4f1e8";
  ctx.strokeStyle = "#48e3ed";
  ctx.lineWidth = 2;
  ctx.shadowBlur = isPlayerInvulnerable() ? 26 : 12;
  ctx.shadowColor = "rgba(72,227,237,0.5)";
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-14, -13);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-14, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#d8f75f";
  ctx.beginPath();
  ctx.arc(-4, 0, 4 + Math.sin(time * 8) * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawForeground(time) {
  const progress = clamp(state.elapsed / RUN_DURATION, 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(244,241,232,0.74)";
  ctx.font = "700 13px SFMono-Regular, Consolas, monospace";
  ctx.fillText("EXTRACTION SIGNAL", WIDTH - 198, 34);
  ctx.fillText(`${Math.round(progress * 100)}%`, WIDTH - 66, 34);

  if (state.mode === "running") {
    const danger = getThreatLabel();
    ctx.fillStyle = danger === "High" ? "rgba(200,106,106,0.82)" : danger === "Rising" ? "rgba(226,184,92,0.82)" : "rgba(216,247,95,0.78)";
    ctx.fillText(`THREAT ${danger.toUpperCase()}`, 34, 34);
  }
  ctx.restore();
}

function burst(x, y, kind, count) {
  const color = kind === "hit"
    ? "rgba(200,106,106,ALPHA)"
    : kind === "dash"
      ? "rgba(72,227,237,ALPHA)"
      : "rgba(216,247,95,ALPHA)";
  for (let i = 0; i < count; i += 1) {
    const angle = random.range(0, Math.PI * 2);
    const speed = random.range(60, kind === "dash" ? 260 : 190);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: random.range(2.5, 7),
      life: random.range(0.35, 0.85),
      maxLife: 0.85,
      color
    });
  }
}

function syncOverlay() {
  if (!ui.overlay || !ui.overlayTitle || !ui.overlayCopy || !ui.primaryAction || !ui.overlayKicker) return;
  ui.overlay.hidden = false;

  if (state.mode === "title") {
    ui.overlayKicker.textContent = "Observation 003 / Game 003";
    ui.overlayTitle.textContent = "Deliver through the pulse field";
    ui.overlayCopy.textContent = "Collect parcels for score and combo. Pulse barriers warn before firing. Dash through tight windows, then reach extraction.";
    ui.primaryAction.textContent = "Start run";
  } else if (state.mode === "paused") {
    ui.overlayKicker.textContent = "Run suspended";
    ui.overlayTitle.textContent = "Pulse field paused";
    ui.overlayCopy.textContent = state.message;
    ui.primaryAction.textContent = "Continue";
  } else if (state.mode === "failed") {
    ui.overlayKicker.textContent = "Courier signal lost";
    ui.overlayTitle.textContent = "Run failed";
    ui.overlayCopy.textContent = `Final score ${formatNumber(state.score)}. Best chain x${state.bestCombo}. Restart and preserve the combo window.`;
    ui.primaryAction.textContent = "Restart run";
  } else if (state.mode === "complete") {
    ui.overlayKicker.textContent = "Extraction complete";
    ui.overlayTitle.textContent = "Courier archived";
    ui.overlayCopy.textContent = `Score ${formatNumber(state.score)} with best chain x${state.bestCombo}. High score ${formatNumber(highScore)}.`;
    ui.primaryAction.textContent = "Run again";
  }
}

function hideOverlay() {
  if (ui.overlay) ui.overlay.hidden = true;
}

function updateUi() {
  const remaining = Math.max(0, RUN_DURATION - state.elapsed);
  const dashCharge = state.player.dashCooldown <= 0 ? 1 : 1 - state.player.dashCooldown / DASH_COOLDOWN;
  const comboHold = state.comboTimer <= 0 ? 0 : state.comboTimer / COMBO_HOLD;
  const runProgress = clamp(state.elapsed / RUN_DURATION, 0, 1);
  const threat = getThreatLabel();

  setText(ui.time, remaining.toFixed(1));
  setText(ui.score, formatNumber(state.score));
  setText(ui.combo, `x${state.combo}`);
  setText(ui.integrity, `${Math.ceil(state.integrity)}%`);
  setText(ui.dashReadout, dashCharge >= 1 ? "Ready" : `${Math.ceil(dashCharge * 100)}%`);
  setText(ui.objective, getObjective());
  setText(ui.message, state.message);
  setText(ui.parcelReadout, String(state.parcelsCollected));
  setText(ui.threat, threat);
  setText(ui.bestCombo, `x${state.bestCombo}`);
  setText(ui.highScore, formatNumber(highScore));

  setMeter(ui.integrityMeter, state.integrity / MAX_INTEGRITY);
  setMeter(ui.dashMeter, dashCharge);
  setMeter(ui.comboMeter, comboHold);
  setMeter(ui.runMeter, runProgress);

  if (ui.dashButton) {
    ui.dashButton.disabled = state.mode !== "running" || dashCharge < 1;
  }
  if (ui.pauseButton) {
    ui.pauseButton.textContent = state.mode === "paused" ? "Continue" : "Pause";
  }
}

function getObjective() {
  if (state.mode === "title") return "Awaiting launch";
  if (state.mode === "paused") return "Run paused";
  if (state.mode === "failed") return "Signal lost";
  if (state.mode === "complete") return "Extraction complete";
  if (state.elapsed > RUN_DURATION * 0.78) return "Final pulse cycle: survive";
  if (state.combo >= 6) return "Hold the combo chain";
  return "Collect parcels and avoid barriers";
}

function getThreatLabel() {
  const difficulty = getDifficulty();
  if (difficulty > 0.68) return "High";
  if (difficulty > 0.34) return "Rising";
  return "Low";
}

function setText(node, text) {
  if (node) node.textContent = text;
}

function setMeter(node, value) {
  if (node) node.style.width = `${clamp(value, 0, 1) * 100}%`;
}

function screenToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * WIDTH, 0, WIDTH),
    y: clamp(((event.clientY - rect.top) / rect.height) * HEIGHT, 0, HEIGHT)
  };
}

function clearPointerState() {
  pointerState.active = false;
}

function readHighScore() {
  try {
    return Number.parseInt(localStorage.getItem("neonPulseCourierHighScore") ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function writeHighScore(value) {
  try {
    localStorage.setItem("neonPulseCourierHighScore", String(value));
  } catch {
    // Local storage can be unavailable in constrained browser contexts.
  }
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("en-US");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSnapshot() {
  return {
    mode: state.mode,
    timeRemaining: Number(Math.max(0, RUN_DURATION - state.elapsed).toFixed(2)),
    elapsed: Number(state.elapsed.toFixed(2)),
    score: state.score,
    combo: state.combo,
    bestCombo: state.bestCombo,
    integrity: Number(state.integrity.toFixed(1)),
    parcelsCollected: state.parcelsCollected,
    parcelsActive: state.parcels.length,
    dashReady: state.player.dashCooldown <= 0,
    player: {
      x: Number(state.player.x.toFixed(1)),
      y: Number(state.player.y.toFixed(1))
    },
    objective: getObjective(),
    threat: getThreatLabel(),
    completed: state.mode === "complete",
    failed: state.mode === "failed"
  };
}

function setPlayerPosition(x, y) {
  state.player.x = clamp(Number(x) || state.player.x, 36, WIDTH - 36);
  state.player.y = clamp(Number(y) || state.player.y, 36, HEIGHT - 36);
  pointerState.target = null;
}

function collectParcel() {
  if (state.mode === "title" || state.mode === "failed" || state.mode === "complete") {
    startRun();
  } else if (state.mode === "paused") {
    resumeRun();
  }
  state.parcels.unshift({
    x: clamp(state.player.x + 22, 60, WIDTH - 60),
    y: state.player.y,
    radius: 17,
    life: 9,
    pulse: 0,
    value: 120 + Math.floor(getDifficulty() * 80)
  });
  collectParcelAt(0);
  updateUi();
  return getSnapshot();
}

function triggerFailure() {
  if (state.mode === "title") startRun();
  state.integrity = 0;
  failRun();
  return getSnapshot();
}

function forceCompleteRun() {
  if (state.mode === "title") startRun();
  state.elapsed = RUN_DURATION;
  completeRun();
  return getSnapshot();
}

window.__neonPulseCourierQA = {
  start: startRun,
  pause: togglePause,
  restart: restartRun,
  getSnapshot,
  setPlayerPosition,
  collectParcel,
  triggerFailure,
  forceCompleteRun
};
