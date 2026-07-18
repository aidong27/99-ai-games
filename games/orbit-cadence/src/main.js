const WIDTH = 1280;
const HEIGHT = 720;
const TRACK_DURATION = 90;
const LANE_COUNT = 4;
const APPROACH_TIME = 1.35;
const PERFECT_WINDOW = 0.07;
const GOOD_WINDOW = 0.14;
const MAX_INTEGRITY = 100;
const MISS_DAMAGE = 12;
const GOOD_DAMAGE = 0;
const COMBO_HOLD = 3.2;
const BPM_START = 96;
const HIGH_SCORE_KEY = "orbit-cadence-high-score-v1";

const LANE_COLORS = ["#7ad7ff", "#9b7bff", "#ff6ec7", "#ffce66"];
const LANE_KEYS = {
  KeyD: 0,
  KeyF: 1,
  KeyJ: 2,
  KeyK: 3,
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3
};

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
  pauseButton: document.querySelector("#pause-button"),
  restartButton: document.querySelector("#restart-button"),
  objective: document.querySelector("#objective-readout"),
  message: document.querySelector("#message-readout"),
  integrityMeter: document.querySelector("#integrity-meter"),
  accuracyMeter: document.querySelector("#accuracy-meter"),
  comboMeter: document.querySelector("#combo-meter"),
  runMeter: document.querySelector("#run-meter"),
  perfect: document.querySelector("#perfect-readout"),
  good: document.querySelector("#good-readout"),
  miss: document.querySelector("#miss-readout"),
  bestCombo: document.querySelector("#best-combo-readout"),
  accuracy: document.querySelector("#accuracy-readout"),
  highScore: document.querySelector("#high-score-readout"),
  lanePads: [...document.querySelectorAll(".lane-pad")]
};

const random = {
  seed: 0x0c4de5ce,
  reset(seed = 0x0c4de5ce) {
    this.seed = seed >>> 0;
  },
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  },
  range(min, max) {
    return min + (max - min) * this.next();
  },
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  },
  pick(list) {
    return list[this.int(0, list.length - 1)];
  }
};

const audio = {
  ctx: null,
  unlocked: false,
  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    return this.ctx;
  },
  tone(freq, duration = 0.08, type = "sine", gain = 0.08, delay = 0) {
    const ac = this.ensure();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  },
  metronome() {
    this.tone(880, 0.04, "square", 0.035);
  },
  hit(lane, perfect) {
    const base = [523.25, 587.33, 659.25, 783.99][lane] || 600;
    this.tone(base, perfect ? 0.1 : 0.08, perfect ? "triangle" : "sine", perfect ? 0.1 : 0.07);
    if (perfect) this.tone(base * 2, 0.06, "sine", 0.04, 0.02);
  },
  miss() {
    this.tone(120, 0.14, "sawtooth", 0.05);
    this.tone(90, 0.18, "square", 0.03, 0.02);
  },
  success() {
    this.tone(523.25, 0.12, "triangle", 0.08);
    this.tone(659.25, 0.14, "triangle", 0.07, 0.08);
    this.tone(783.99, 0.18, "sine", 0.08, 0.16);
  },
  fail() {
    this.tone(180, 0.2, "sawtooth", 0.06);
    this.tone(110, 0.28, "triangle", 0.05, 0.08);
  }
};

let rafId = 0;
let lastFrame = 0;
let highScore = readHighScore();

const layout = {
  playLeft: 120,
  playRight: WIDTH - 120,
  hitY: HEIGHT - 148,
  topY: 90,
  laneWidth: 0
};

layout.laneWidth = (layout.playRight - layout.playLeft) / LANE_COUNT;

const state = {
  mode: "title",
  elapsed: 0,
  score: 0,
  combo: 0,
  bestCombo: 0,
  comboTimer: 0,
  integrity: MAX_INTEGRITY,
  perfect: 0,
  good: 0,
  miss: 0,
  chart: [],
  notes: [],
  particles: [],
  judgments: [],
  laneFlash: [0, 0, 0, 0],
  beatTimer: 0,
  beatPeriod: 60 / BPM_START,
  shake: 0,
  message: "Timing windows, pattern memory, and clean audio feedback.",
  stars: makeStars(90)
};

if (!canvas || !ctx) {
  showStaticError();
} else {
  boot();
}

function boot() {
  canvas.tabIndex = 0;
  resetRun("title");
  bindInputs();
  lastFrame = performance.now();
  rafId = requestAnimationFrame(frame);
  updateUI();
}

function bindInputs() {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  ui.primaryAction?.addEventListener("click", onPrimaryAction);
  ui.pauseButton?.addEventListener("click", togglePause);
  ui.restartButton?.addEventListener("click", () => restartRun());
  ui.lanePads.forEach((pad) => {
    const fire = (event) => {
      event.preventDefault();
      const lane = Number(pad.dataset.lane);
      if (Number.isInteger(lane)) hitLane(lane);
    };
    pad.addEventListener("pointerdown", fire);
  });
  canvas.addEventListener("pointerdown", () => canvas.focus());
}

function onKeyDown(event) {
  if (event.repeat) return;
  if (event.code === "KeyP") {
    event.preventDefault();
    togglePause();
    return;
  }
  if (event.code === "KeyR") {
    event.preventDefault();
    restartRun();
    return;
  }
  if (event.code === "Enter" || event.code === "Space") {
    if (state.mode === "title" || state.mode === "complete" || state.mode === "failed" || state.mode === "paused") {
      event.preventDefault();
      onPrimaryAction();
      return;
    }
  }
  if (Object.prototype.hasOwnProperty.call(LANE_KEYS, event.code)) {
    event.preventDefault();
    hitLane(LANE_KEYS[event.code]);
  }
}

function onKeyUp() {
  // Reserved for future hold notes.
}

function onPrimaryAction() {
  audio.ensure();
  if (state.mode === "title" || state.mode === "complete" || state.mode === "failed") {
    startRun();
    return;
  }
  if (state.mode === "paused") {
    state.mode = "playing";
    setOverlay(false);
    state.message = "Cadence resumed.";
    updateUI();
  }
}

function togglePause() {
  if (state.mode === "playing") {
    state.mode = "paused";
    showOverlay(
      "Paused",
      "Orbit locked. Resume when ready.",
      "The chart freezes in place. Integrity and combo are held.",
      "Resume"
    );
    state.message = "Paused — press P, Enter, or Resume.";
    updateUI();
    return;
  }
  if (state.mode === "paused") {
    state.mode = "playing";
    setOverlay(false);
    state.message = "Cadence resumed.";
    updateUI();
  }
}

function restartRun() {
  audio.ensure();
  startRun();
}

function startRun() {
  resetRun("playing");
  setOverlay(false);
  canvas.focus();
  state.message = "Ride the orbital pulse. Hit the ring.";
  updateUI();
}

function resetRun(mode) {
  random.reset(0x0c4de5ce ^ Math.floor(Date.now() % 100000));
  state.mode = mode;
  state.elapsed = 0;
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.comboTimer = 0;
  state.integrity = MAX_INTEGRITY;
  state.perfect = 0;
  state.good = 0;
  state.miss = 0;
  state.chart = buildChart();
  state.notes = state.chart.map((entry) => ({ ...entry, resolved: false, hit: false }));
  state.particles = [];
  state.judgments = [];
  state.laneFlash = [0, 0, 0, 0];
  state.beatTimer = 0;
  state.beatPeriod = 60 / BPM_START;
  state.shake = 0;
  if (mode === "title") {
    showOverlay(
      "Lock onto the orbital pulse",
      "Observation 008 / Game 008",
      "Notes travel down four lanes. Hit D F J K (or the pads) when they reach the bright ring. Perfect and Good keep combo and integrity; Misses drain integrity.",
      "Start run"
    );
  }
}

function buildChart() {
  const chart = [];
  const introBeats = 4;
  let beat = introBeats;
  let time = (60 / BPM_START) * introBeats;
  let bpm = BPM_START;
  let lastLane = 1;

  while (time < TRACK_DURATION - 1.5) {
    const progress = time / TRACK_DURATION;
    bpm = BPM_START + progress * 42;
    const beatDur = 60 / bpm;
    const density = progress < 0.2 ? 0.55 : progress < 0.45 ? 0.75 : progress < 0.7 ? 0.9 : 1.05;
    const patternRoll = random.next();

    if (patternRoll < 0.42 * density) {
      // Single note
      let lane = random.int(0, LANE_COUNT - 1);
      if (lane === lastLane && random.next() < 0.55) {
        lane = (lane + random.int(1, 3)) % LANE_COUNT;
      }
      chart.push({ time, lane, id: chart.length });
      lastLane = lane;
    } else if (patternRoll < 0.7 * Math.min(1, density)) {
      // Two-step
      const a = random.int(0, LANE_COUNT - 1);
      const b = (a + (random.next() < 0.5 ? 1 : 2)) % LANE_COUNT;
      chart.push({ time, lane: a, id: chart.length });
      chart.push({ time: time + beatDur * 0.5, lane: b, id: chart.length + 1 });
      lastLane = b;
      time += beatDur * 0.5;
      beat += 0.5;
    } else if (patternRoll < 0.88 && progress > 0.25) {
      // Chord (two simultaneous)
      const a = random.int(0, 1);
      const b = a + 2;
      chart.push({ time, lane: a, id: chart.length });
      chart.push({ time, lane: b, id: chart.length + 1 });
      lastLane = b;
    } else {
      // Skip beat — breathing room
    }

    time += beatDur;
    beat += 1;

    // Occasional 16th flurry late in the track
    if (progress > 0.55 && random.next() < 0.18 * density) {
      const burstLane = random.int(0, LANE_COUNT - 1);
      for (let i = 0; i < 3; i += 1) {
        const t = time + beatDur * 0.25 * i;
        if (t >= TRACK_DURATION - 1.2) break;
        const lane = (burstLane + i) % LANE_COUNT;
        chart.push({ time: t, lane, id: chart.length });
        lastLane = lane;
      }
    }
  }

  chart.sort((a, b) => a.time - b.time || a.lane - b.lane);
  chart.forEach((note, index) => {
    note.id = index;
  });
  return chart;
}

function hitLane(lane) {
  if (lane < 0 || lane >= LANE_COUNT) return;
  audio.ensure();
  state.laneFlash[lane] = 0.12;
  flashPad(lane);

  if (state.mode !== "playing") return;

  const candidates = state.notes
    .filter((note) => !note.resolved && note.lane === lane)
    .map((note) => ({ note, delta: Math.abs(note.time - state.elapsed) }))
    .filter((item) => item.delta <= GOOD_WINDOW + 0.02)
    .sort((a, b) => a.delta - b.delta);

  if (!candidates.length) {
    // Empty hit — small audio only, no miss penalty (prevents spam-fail).
    audio.tone(220, 0.04, "sine", 0.02);
    return;
  }

  const { note, delta } = candidates[0];
  note.resolved = true;
  note.hit = true;

  if (delta <= PERFECT_WINDOW) {
    registerJudgment(note, "perfect", delta);
  } else if (delta <= GOOD_WINDOW) {
    registerJudgment(note, "good", delta);
  } else {
    registerJudgment(note, "miss", delta);
  }
}

function registerJudgment(note, kind, delta) {
  const x = laneCenterX(note.lane);
  const y = layout.hitY;

  if (kind === "perfect") {
    state.perfect += 1;
    state.combo += 1;
    state.comboTimer = COMBO_HOLD;
    state.score += Math.round(1000 * (1 + state.combo * 0.05));
    state.message = "Perfect lock.";
    audio.hit(note.lane, true);
    spawnBurst(x, y, LANE_COLORS[note.lane], 14, 1.2);
    pushJudgment(x, y - 36, "PERFECT", LANE_COLORS[note.lane]);
  } else if (kind === "good") {
    state.good += 1;
    state.combo += 1;
    state.comboTimer = COMBO_HOLD;
    state.score += Math.round(550 * (1 + state.combo * 0.03));
    state.integrity = Math.max(0, state.integrity - GOOD_DAMAGE);
    state.message = "Good — stay in the window.";
    audio.hit(note.lane, false);
    spawnBurst(x, y, LANE_COLORS[note.lane], 9, 0.9);
    pushJudgment(x, y - 36, "GOOD", "#d8e7ff");
  } else {
    applyMiss(note.lane, "Late / early miss");
  }

  state.bestCombo = Math.max(state.bestCombo, state.combo);
  if (state.score > highScore) {
    highScore = state.score;
    writeHighScore(highScore);
  }

  if (state.integrity <= 0) {
    failRun();
  }

  updateUI();
  void delta;
}

function applyMiss(lane, reason) {
  state.miss += 1;
  state.combo = 0;
  state.comboTimer = 0;
  state.integrity = Math.max(0, state.integrity - MISS_DAMAGE);
  state.shake = Math.min(10, state.shake + 5);
  state.message = reason || "Miss — integrity drained.";
  audio.miss();
  const x = laneCenterX(lane);
  pushJudgment(x, layout.hitY - 36, "MISS", varBad());
  spawnBurst(x, layout.hitY, varBad(), 8, 0.7);
  if (state.integrity <= 0) {
    failRun();
  }
}

function failRun() {
  if (state.mode !== "playing") return;
  state.mode = "failed";
  audio.fail();
  showOverlay(
    "Signal collapsed",
    "Observation 008 / Game 008",
    `Integrity failed at ${formatTime(state.elapsed)}. Score ${state.score} · Accuracy ${accuracyPercent()}% · Best chain ${state.bestCombo}.`,
    "Retry run"
  );
  state.message = "Integrity zero. Retry the cadence.";
  updateUI();
}

function completeRun() {
  if (state.mode !== "playing") return;
  state.mode = "complete";
  if (state.score > highScore) {
    highScore = state.score;
    writeHighScore(highScore);
  }
  audio.success();
  const grade = gradeFromAccuracy(accuracyPercent());
  showOverlay(
    "Extraction complete",
    "Observation 008 / Game 008",
    `Track finished. Grade ${grade} · Score ${state.score} · Accuracy ${accuracyPercent()}% · Perfect ${state.perfect} · Good ${state.good} · Miss ${state.miss}.`,
    "Run again"
  );
  state.message = "Cadence held through extraction.";
  updateUI();
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0);
  lastFrame = now;

  if (state.mode === "playing") {
    updatePlaying(dt);
  } else {
    // Soft idle motion for particles/judgments on menus
    updateFx(dt * 0.5);
  }

  for (let i = 0; i < state.laneFlash.length; i += 1) {
    state.laneFlash[i] = Math.max(0, state.laneFlash[i] - dt);
  }

  draw();
  rafId = requestAnimationFrame(frame);
}

function updatePlaying(dt) {
  state.elapsed += dt;
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.combo > 0 && state.comboTimer <= 0) {
    // Soft combo decay only when idle too long between hits
    // (misses still hard-reset combo)
  }
  state.shake = Math.max(0, state.shake - dt * 18);

  // Metronome tick
  state.beatPeriod = 60 / (BPM_START + (state.elapsed / TRACK_DURATION) * 42);
  state.beatTimer += dt;
  if (state.beatTimer >= state.beatPeriod) {
    state.beatTimer -= state.beatPeriod;
    if (state.elapsed > 0.4) audio.metronome();
  }

  // Auto-miss notes that pass the window
  for (const note of state.notes) {
    if (note.resolved) continue;
    if (state.elapsed - note.time > GOOD_WINDOW) {
      note.resolved = true;
      note.hit = false;
      applyMiss(note.lane, "Missed note");
    }
  }

  updateFx(dt);

  if (state.mode === "playing" && state.elapsed >= TRACK_DURATION) {
    completeRun();
  } else {
    updateUI();
  }
}

function updateFx(dt) {
  state.particles = state.particles.filter((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 40 * dt;
    return p.life > 0;
  });
  state.judgments = state.judgments.filter((j) => {
    j.life -= dt;
    j.y -= 28 * dt;
    return j.life > 0;
  });
}

function draw() {
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;

  ctx.save();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.translate(shakeX, shakeY);

  drawBackdrop();
  drawLanes();
  drawHitRing();
  drawNotes();
  drawParticles();
  drawJudgments();
  drawHudChrome();

  ctx.restore();
}

function drawBackdrop() {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, "#0a1222");
  g.addColorStop(0.55, "#0b1428");
  g.addColorStop(1, "#070b14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of state.stars) {
    const twinkle = 0.45 + 0.55 * Math.sin(state.elapsed * star.speed + star.phase);
    ctx.globalAlpha = star.a * twinkle;
    ctx.fillStyle = "#dce9ff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Soft nebula
  const neb = ctx.createRadialGradient(WIDTH * 0.7, HEIGHT * 0.2, 20, WIDTH * 0.7, HEIGHT * 0.2, 360);
  neb.addColorStop(0, "rgba(155, 123, 255, 0.16)");
  neb.addColorStop(1, "rgba(155, 123, 255, 0)");
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const neb2 = ctx.createRadialGradient(WIDTH * 0.25, HEIGHT * 0.7, 10, WIDTH * 0.25, HEIGHT * 0.7, 300);
  neb2.addColorStop(0, "rgba(92, 225, 255, 0.1)");
  neb2.addColorStop(1, "rgba(92, 225, 255, 0)");
  ctx.fillStyle = neb2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawLanes() {
  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    const x0 = layout.playLeft + lane * layout.laneWidth;
    const x1 = x0 + layout.laneWidth;
    const flash = state.laneFlash[lane];

    ctx.fillStyle = flash > 0 ? `rgba(255,255,255,${0.04 + flash * 0.25})` : "rgba(255,255,255,0.02)";
    ctx.fillRect(x0 + 8, layout.topY, layout.laneWidth - 16, layout.hitY - layout.topY + 40);

    ctx.strokeStyle = flash > 0 ? LANE_COLORS[lane] : "rgba(140, 170, 220, 0.18)";
    ctx.lineWidth = flash > 0 ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo((x0 + x1) / 2, layout.topY);
    ctx.lineTo((x0 + x1) / 2, layout.hitY + 48);
    ctx.stroke();

    // Lane label
    ctx.fillStyle = LANE_COLORS[lane];
    ctx.globalAlpha = 0.85;
    ctx.font = "700 18px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(["D", "F", "J", "K"][lane], (x0 + x1) / 2, HEIGHT - 42);
    ctx.globalAlpha = 1;
  }

  // Side rails
  ctx.strokeStyle = "rgba(92, 225, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.playLeft, layout.topY - 10, layout.playRight - layout.playLeft, layout.hitY - layout.topY + 70);
}

function drawHitRing() {
  const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * Math.PI * 2 * (1 / Math.max(0.25, state.beatPeriod)));
  ctx.save();
  ctx.strokeStyle = `rgba(92, 225, 255, ${0.35 + pulse * 0.35})`;
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(92, 225, 255, 0.55)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(layout.playLeft + 12, layout.hitY);
  ctx.lineTo(layout.playRight - 12, layout.hitY);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 206, 102, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(layout.playLeft + 12, layout.hitY - 28);
  ctx.lineTo(layout.playRight - 12, layout.hitY - 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(layout.playLeft + 12, layout.hitY + 28);
  ctx.lineTo(layout.playRight - 12, layout.hitY + 28);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.fillStyle = "rgba(232, 240, 255, 0.7)";
  ctx.font = "600 14px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HIT RING", layout.playLeft + 16, layout.hitY - 38);
}

function drawNotes() {
  for (const note of state.notes) {
    if (note.resolved) continue;
    const t = note.time - state.elapsed;
    if (t > APPROACH_TIME || t < -GOOD_WINDOW) continue;

    const progress = 1 - t / APPROACH_TIME;
    const y = layout.topY + (layout.hitY - layout.topY) * clamp(progress, 0, 1.15);
    const x = laneCenterX(note.lane);
    const color = LANE_COLORS[note.lane];
    const near = Math.abs(t) < GOOD_WINDOW;
    const radius = near ? 22 : 18;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = near ? 22 : 12;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.95;
    roundedDiamond(x, y, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(8, 12, 22, 0.85)";
    roundedDiamond(x, y, radius * 0.45);
    ctx.fill();
    ctx.restore();
  }
}

function roundedDiamond(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawJudgments() {
  for (const j of state.judgments) {
    ctx.globalAlpha = clamp(j.life / j.maxLife, 0, 1);
    ctx.fillStyle = j.color;
    ctx.font = "800 22px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(j.text, j.x, j.y);
  }
  ctx.globalAlpha = 1;
}

function drawHudChrome() {
  ctx.fillStyle = "rgba(232, 240, 255, 0.9)";
  ctx.font = "700 20px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ORBIT CADENCE", 36, 42);

  ctx.font = "500 14px Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(143, 163, 196, 0.95)";
  ctx.fillText("Grok 4.5 · Rhythm Audio Hall · Observation 008", 36, 64);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(232, 240, 255, 0.9)";
  ctx.font = "700 18px Segoe UI, sans-serif";
  ctx.fillText(`${accuracyPercent()}% ACC`, WIDTH - 36, 42);
  ctx.font = "500 14px Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(143, 163, 196, 0.95)";
  ctx.fillText(`x${state.combo} combo`, WIDTH - 36, 64);

  // Progress bar
  const px = 36;
  const py = HEIGHT - 22;
  const pw = WIDTH - 72;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(px, py, pw, 6);
  ctx.fillStyle = "rgba(92, 225, 255, 0.85)";
  ctx.fillRect(px, py, pw * clamp(state.elapsed / TRACK_DURATION, 0, 1), 6);
}

function spawnBurst(x, y, color, count, force) {
  for (let i = 0; i < count; i += 1) {
    const angle = random.range(0, Math.PI * 2);
    const speed = random.range(40, 160) * force;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      r: random.range(1.5, 3.5),
      color,
      life: random.range(0.25, 0.55),
      maxLife: 0.55
    });
  }
}

function pushJudgment(x, y, text, color) {
  state.judgments.push({
    x,
    y,
    text,
    color,
    life: 0.55,
    maxLife: 0.55
  });
}

function flashPad(lane) {
  const pad = ui.lanePads[lane];
  if (!pad) return;
  pad.classList.add("is-flash");
  window.setTimeout(() => pad.classList.remove("is-flash"), 100);
}

function laneCenterX(lane) {
  return layout.playLeft + layout.laneWidth * lane + layout.laneWidth / 2;
}

function accuracyPercent() {
  const total = state.perfect + state.good + state.miss;
  if (!total) return 100;
  const weighted = state.perfect * 1 + state.good * 0.65;
  return Math.round((weighted / total) * 1000) / 10;
}

function gradeFromAccuracy(acc) {
  if (acc >= 97) return "S";
  if (acc >= 90) return "A";
  if (acc >= 80) return "B";
  if (acc >= 70) return "C";
  return "D";
}

function updateUI() {
  const remaining = Math.max(0, TRACK_DURATION - state.elapsed);
  setText(ui.time, remaining.toFixed(1));
  setText(ui.score, String(Math.floor(state.score)));
  setText(ui.combo, `x${state.combo}`);
  setText(ui.integrity, `${Math.round(state.integrity)}%`);
  setText(ui.perfect, String(state.perfect));
  setText(ui.good, String(state.good));
  setText(ui.miss, String(state.miss));
  setText(ui.bestCombo, String(state.bestCombo));
  setText(ui.accuracy, `${accuracyPercent()}%`);
  setText(ui.highScore, String(Math.floor(highScore)));
  setText(ui.message, state.message);

  setMeter(ui.integrityMeter, state.integrity / MAX_INTEGRITY);
  setMeter(ui.accuracyMeter, accuracyPercent() / 100);
  setMeter(ui.comboMeter, state.combo > 0 ? clamp(state.comboTimer / COMBO_HOLD, 0.08, 1) : 0);
  setMeter(ui.runMeter, clamp(state.elapsed / TRACK_DURATION, 0, 1));

  if (state.mode === "title") {
    setText(ui.objective, "Awaiting launch");
  } else if (state.mode === "playing") {
    const phase =
      state.elapsed < 20 ? "Warm-up orbit" : state.elapsed < 50 ? "Rising density" : state.elapsed < 75 ? "Peak cadence" : "Extraction window";
    setText(ui.objective, phase);
  } else if (state.mode === "paused") {
    setText(ui.objective, "Paused");
  } else if (state.mode === "complete") {
    setText(ui.objective, "Extraction complete");
  } else if (state.mode === "failed") {
    setText(ui.objective, "Signal collapsed");
  }
}

function showOverlay(title, kicker, copy, actionLabel) {
  setText(ui.overlayTitle, title);
  setText(ui.overlayKicker, kicker);
  setText(ui.overlayCopy, copy);
  setText(ui.primaryAction, actionLabel);
  setOverlay(true);
}

function setOverlay(visible) {
  if (!ui.overlay) return;
  if (visible) ui.overlay.removeAttribute("hidden");
  else ui.overlay.setAttribute("hidden", "");
}

function setText(el, value) {
  if (el && el.textContent !== value) el.textContent = value;
}

function setMeter(el, ratio) {
  if (!el) return;
  el.style.transform = `scaleX(${clamp(ratio, 0, 1)})`;
}

function makeStars(count) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.55 + 0.2,
      speed: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2
    });
  }
  return stars;
}

function formatTime(seconds) {
  return `${seconds.toFixed(1)}s`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function readHighScore() {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeHighScore(value) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(value)));
  } catch {
    // Ignore private-mode storage failures.
  }
}

function showStaticError() {
  document.body.innerHTML =
    "<main style='font-family:sans-serif;padding:2rem;color:#e8f0ff;background:#070b14;min-height:100vh'>" +
    "<h1>Orbit Cadence</h1><p>Canvas is unavailable in this environment.</p></main>";
}

function varBad() {
  return "#ff6b8a";
}

// Silence unused raff guard in some environments
void rafId;
