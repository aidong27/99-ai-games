/* ═══════════════════════════════════════════════════
   Deepforge Miner — Game 006 src/main.js
   Self-contained ES module. No framework imports.
   DeepSeek v4 Pro / Claude Code  •  2026-06-24
   ═══════════════════════════════════════════════════ */

// ── DOM bindings ──────────────────────────────────
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  oreReadout:    document.getElementById("ore-readout"),
  opsReadout:    document.getElementById("ops-readout"),
  droneReadout:  document.getElementById("drone-readout"),
  prestigeReadout: document.getElementById("prestige-readout"),
  overlay:       document.getElementById("overlay"),
  overlayKicker: document.getElementById("overlay-kicker"),
  overlayTitle:  document.getElementById("overlay-title"),
  overlayCopy:   document.getElementById("overlay-copy"),
  overlayActions: document.getElementById("overlay-actions"),
  mineButton:    document.getElementById("mine-button"),
  droneButton:   document.getElementById("drone-button"),
  upgradeButton: document.getElementById("upgrade-button"),
  prestigeButton: document.getElementById("prestige-button"),
  resourceName:  document.getElementById("resource-name"),
  resourceTierNote: document.getElementById("resource-tier-note"),
  upgradeName:   document.getElementById("upgrade-name"),
  upgradeLevelLabel: document.getElementById("upgrade-level-label"),
  upgradeCostLabel: document.getElementById("upgrade-cost-label"),
  upgradeMeter:  document.getElementById("upgrade-meter"),
  droneStatus:   document.getElementById("drone-status"),
  droneCostLabel: document.getElementById("drone-cost-label"),
  prestigeStatus: document.getElementById("prestige-status"),
  prestigeThresholdLabel: document.getElementById("prestige-threshold-label"),
};

// ── Constants ─────────────────────────────────────
const WIDTH = 1280;
const HEIGHT = 720;
const ASTEROID_X = WIDTH * 0.35;
const ASTEROID_Y = HEIGHT * 0.48;
const ASTEROID_BASE_R = 90;
const PARTICLE_CAP = 200;
const FLOAT_CAP = 60;
const MAX_VISIBLE_DRONES = 24;

const RESOURCE_TIERS = [
  { name: "Copper Ore",  color: "#e8a440", veinColor: "#c47e2a", valueMul: 1 },
  { name: "Iron Ore",    color: "#b0b0b8", veinColor: "#8e8e96", valueMul: 1 },
  { name: "Gold Ore",    color: "#f5d742", veinColor: "#c4a820", valueMul: 1 },
  { name: "Diamond",     color: "#b8f5f5", veinColor: "#88d4d4", valueMul: 1 },
  { name: "Dark Matter", color: "#9b59ff", veinColor: "#6d28d9", valueMul: 1 },
];

const UPGRADE_TIERS = [
  { name: "Rusty Pickaxe",    clickPower: 1,    baseCost: 0 },
  { name: "Laser Cutter",     clickPower: 10,   baseCost: 100 },
  { name: "Plasma Drill",     clickPower: 100,  baseCost: 5000 },
  { name: "Quantum Extractor",clickPower: 1000, baseCost: 250000 },
];

const DRONE_BASE_COST = 50;
const DRONE_COST_SCALE = 1.15;
const DRONE_BASE_OPS = 1;
const PRESTIGE_BASE_THRESHOLD = 1_000_000;
const PRESTIGE_BONUS_PER_LEVEL = 0.25;
const WIN_PRESTIGE_COUNT = 5;
const WIN_RESOURCE_INDEX = 4;

// ── State ─────────────────────────────────────────
function freshState() {
  return {
    mode: "menu",           // menu | playing | paused | won
    resourceIndex: 0,       // 0=copper, 1=iron, 2=gold, 3=diamond, 4=darkmatter
    ore: 0,
    totalOreEver: 0,
    upgradeLevel: 0,        // 0-3
    drones: 0,
    prestigeCount: 0,
    prestigeBonus: 0,       // cumulative 0.25 per prestige
    orePerSecond: 0,
    clicks: 0,
    // Animation
    particles: [],          // { x, y, vx, vy, life, maxLife, r, color }
    floats: [],             // { x, y, vy, life, maxLife, text, color }
    clickRings: [],         // { x, y, life, maxLife, maxR }
    asteroidShakeX: 0,
    asteroidShakeY: 0,
    asteroidR: ASTEROID_BASE_R,
    // Drone orbit angles (pre-computed offsets for visual spread)
    droneBaseAngle: 0,
    frameCount: 0,
    // Auto-mine (space held)
    spaceHeld: false,
    autoMineTimer: 0,
    autoMineInterval: 0.125,
    // Upgrade meter
    upgradeMeterPct: 0,
    // Prestige threshold tracking
    nextPrestigeAt: PRESTIGE_BASE_THRESHOLD,
  };
}

let state = freshState();

// ── Derived helpers ───────────────────────────────
function clickPower() {
  const tier = UPGRADE_TIERS[state.upgradeLevel];
  return tier.clickPower * (1 + state.prestigeBonus);
}

function droneOPS() {
  return state.drones * DRONE_BASE_OPS * (1 + state.prestigeBonus);
}

function droneCost() {
  return Math.floor(DRONE_BASE_COST * Math.pow(DRONE_COST_SCALE, state.drones));
}

function upgradeCost() {
  if (state.upgradeLevel >= UPGRADE_TIERS.length - 1) return Infinity;
  const next = UPGRADE_TIERS[state.upgradeLevel + 1];
  return Math.floor(next.baseCost * Math.max(0.4, 1 - state.prestigeBonus * 0.1));
}

function prestigeThreshold() {
  return Math.floor(PRESTIGE_BASE_THRESHOLD * Math.pow(2, state.prestigeCount));
}

function canPrestige() {
  return state.totalOreEver >= prestigeThreshold();
}

function prestigeBonusPct() {
  return Math.round(state.prestigeBonus * 100);
}

function resourceTier() {
  return RESOURCE_TIERS[Math.min(state.resourceIndex, RESOURCE_TIERS.length - 1)];
}

function upgradeTier() {
  return UPGRADE_TIERS[state.upgradeLevel];
}

function nextUpgradeTier() {
  if (state.upgradeLevel >= UPGRADE_TIERS.length - 1) return null;
  return UPGRADE_TIERS[state.upgradeLevel + 1];
}

// ── Actions ───────────────────────────────────────
function addOre(amount) {
  state.ore += amount;
  state.totalOreEver += amount;
}

function spawnMine(x, y) {
  if (state.mode !== "playing") return;

  const power = clickPower();
  addOre(power);
  state.clicks++;

  // Shake asteroid
  state.asteroidShakeX = (Math.random() - 0.5) * 6;
  state.asteroidShakeY = (Math.random() - 0.5) * 6;

  // Particles
  const tier = resourceTier();
  const count = 5 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= PARTICLE_CAP) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 180;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.8,
      maxLife: 1.2,
      r: 1.5 + Math.random() * 3,
      color: tier.color,
    });
  }

  // Floating text
  if (state.floats.length < FLOAT_CAP) {
    state.floats.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y - 10,
      vy: -40 - Math.random() * 30,
      life: 0,
      maxLife: 0.8 + Math.random() * 0.4,
      text: "+" + power,
      color: tier.color,
    });
  }

  // Click ring
  state.clickRings.push({
    x, y,
    life: 0,
    maxLife: 0.4,
    maxR: 20 + power * 0.5,
  });
}

function buyDrone() {
  const cost = droneCost();
  if (state.ore < cost) return false;
  state.ore -= cost;
  state.drones++;
  return true;
}

function buyUpgrade() {
  const cost = upgradeCost();
  if (cost === Infinity || state.ore < cost) return false;
  state.ore -= cost;
  state.upgradeLevel++;
  // Visual feedback
  state.asteroidShakeX = (Math.random() - 0.5) * 10;
  state.asteroidShakeY = (Math.random() - 0.5) * 10;
  return true;
}

function prestige() {
  if (!canPrestige()) return false;

  state.prestigeCount++;
  state.prestigeBonus += PRESTIGE_BONUS_PER_LEVEL;

  // Advance resource tier if appropriate
  if (state.resourceIndex < RESOURCE_TIERS.length - 1) {
    state.resourceIndex = Math.min(state.prestigeCount, RESOURCE_TIERS.length - 1);
  }

  // Reset progress
  state.ore = 0;
  state.totalOreEver = 0;
  state.upgradeLevel = 0;
  state.drones = 0;
  state.clicks = 0;
  state.particles = [];
  state.floats = [];
  state.clickRings = [];
  state.asteroidR = ASTEROID_BASE_R + state.prestigeCount * 10;
  state.nextPrestigeAt = prestigeThreshold();

  // Check win
  if (state.resourceIndex >= WIN_RESOURCE_INDEX && state.prestigeCount >= WIN_PRESTIGE_COUNT) {
    state.mode = "won";
    showOverlay({
      kicker: "All Resources Mastered",
      title: "Mining Empire Complete",
      copy: "You've unlocked Dark Matter and achieved " + state.prestigeCount + " prestige cycles with a permanent " + prestigeBonusPct() + "% bonus. The deepforge is yours.",
    });
  } else {
    state.mode = "playing";
    hideOverlay();
    updateUI();
  }

  return true;
}

// ── Game loop ─────────────────────────────────────
let lastFrame = 0;
let rafId = 0;

function startLoop() {
  lastFrame = performance.now();
  rafId = requestAnimationFrame(frame);
}

function frame(now) {
  const rawDt = (now - lastFrame) / 1000;
  const dt = Math.min(rawDt, 0.05);
  lastFrame = now;

  if (state.mode === "playing") {
    update(dt);
  }
  render();
  rafId = requestAnimationFrame(frame);
}

function update(dt) {
  state.frameCount++;

  // Drone production
  const ops = droneOPS();
  state.orePerSecond = ops;
  if (ops > 0) {
    const production = ops * dt;
    state.ore += production;
    state.totalOreEver += production;
  }

  // Auto-mine (space held)
  if (state.spaceHeld) {
    state.autoMineTimer += dt;
    while (state.autoMineTimer >= state.autoMineInterval) {
      state.autoMineTimer -= state.autoMineInterval;
      // Mine at asteroid center with slight offset
      const mx = ASTEROID_X + (Math.random() - 0.5) * state.asteroidR;
      const my = ASTEROID_Y + (Math.random() - 0.5) * state.asteroidR;
      spawnMine(mx, my);
    }
  }

  // Decay asteroid shake
  state.asteroidShakeX *= Math.pow(0.02, dt);
  state.asteroidShakeY *= Math.pow(0.02, dt);
  if (Math.abs(state.asteroidShakeX) < 0.1) state.asteroidShakeX = 0;
  if (Math.abs(state.asteroidShakeY) < 0.1) state.asteroidShakeY = 0;

  // Update particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life += dt;
    if (p.life >= p.maxLife) {
      state.particles.splice(i, 1);
    }
  }

  // Update floating text
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.y += f.vy * dt;
    f.life += dt;
    if (f.life >= f.maxLife) {
      state.floats.splice(i, 1);
    }
  }

  // Update click rings
  for (let i = state.clickRings.length - 1; i >= 0; i--) {
    const r = state.clickRings[i];
    r.life += dt;
    if (r.life >= r.maxLife) {
      state.clickRings.splice(i, 1);
    }
  }

  // Update drone orbit angle
  state.droneBaseAngle += dt * 0.8;

  // Update upgrade meter
  const cost = upgradeCost();
  state.upgradeMeterPct = cost === Infinity ? 100 : Math.min(100, (state.ore / cost) * 100);

  // Update prestige threshold
  state.nextPrestigeAt = prestigeThreshold();

  // Update UI periodically (every 4 frames for performance)
  if (state.frameCount % 4 === 0) {
    updateUI();
  }
}

// ── Rendering ─────────────────────────────────────
let starCache = null;

function buildStarCache() {
  const off = document.createElement("canvas");
  off.width = WIDTH;
  off.height = HEIGHT;
  const oc = off.getContext("2d");

  // Space gradient
  const grad = oc.createRadialGradient(WIDTH * 0.35, HEIGHT * 0.45, 40, WIDTH * 0.5, HEIGHT * 0.5, WIDTH);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(0.5, "#060b18");
  grad.addColorStop(1, "#020617");
  oc.fillStyle = grad;
  oc.fillRect(0, 0, WIDTH, HEIGHT);

  // Stars
  for (let i = 0; i < 160; i++) {
    const sx = Math.random() * WIDTH;
    const sy = Math.random() * HEIGHT;
    const sr = 0.3 + Math.random() * 1.2;
    const alpha = 0.3 + Math.random() * 0.7;
    oc.fillStyle = `rgba(255,255,255,${alpha})`;
    oc.beginPath();
    oc.arc(sx, sy, sr, 0, Math.PI * 2);
    oc.fill();
  }

  starCache = off;
}

function render() {
  if (!starCache) buildStarCache();

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(starCache, 0, 0);

  // Asteroid shake offset
  const ax = ASTEROID_X + state.asteroidShakeX;
  const ay = ASTEROID_Y + state.asteroidShakeY;
  const ar = state.asteroidR;

  // ── Asteroid glow ──
  const tier = resourceTier();
  const glowGrad = ctx.createRadialGradient(ax, ay, ar * 0.7, ax, ay, ar * 1.6);
  glowGrad.addColorStop(0, tier.color + "20");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(ax, ay, ar * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // ── Asteroid body ──
  const bodyGrad = ctx.createRadialGradient(ax - ar * 0.25, ay - ar * 0.25, ar * 0.1, ax, ay, ar);
  bodyGrad.addColorStop(0, "#4a5568");
  bodyGrad.addColorStop(0.5, "#2d3748");
  bodyGrad.addColorStop(1, "#1a202c");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  // Irregular asteroid shape
  drawAsteroidShape(ctx, ax, ay, ar, state.frameCount * 0.003);
  ctx.fill();

  // ── Ore veins ──
  ctx.fillStyle = tier.veinColor + "60";
  const veinCount = 5 + state.resourceIndex * 2;
  for (let i = 0; i < veinCount; i++) {
    const vAngle = (i / veinCount) * Math.PI * 2 + state.frameCount * 0.001;
    const vDist = ar * (0.3 + 0.5 * ((i * 0.37) % 1));
    const vx = ax + Math.cos(vAngle) * vDist;
    const vy = ay + Math.sin(vAngle) * vDist;
    const vr = ar * (0.08 + 0.06 * Math.sin(i * 2.7));
    ctx.beginPath();
    ctx.arc(vx, vy, vr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brighter vein highlights
  ctx.fillStyle = tier.color + "40";
  for (let i = 0; i < veinCount; i++) {
    const vAngle = (i / veinCount) * Math.PI * 2 + 0.3;
    const vDist = ar * (0.25 + 0.45 * ((i * 0.61) % 1));
    const vx = ax + Math.cos(vAngle) * vDist;
    const vy = ay + Math.sin(vAngle) * vDist;
    ctx.beginPath();
    ctx.arc(vx, vy, ar * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Asteroid rim highlight ──
  ctx.strokeStyle = tier.color + "30";
  ctx.lineWidth = 2;
  ctx.beginPath();
  drawAsteroidShape(ctx, ax, ay, ar, state.frameCount * 0.003);
  ctx.stroke();

  // ── Click rings ──
  for (const r of state.clickRings) {
    const progress = r.life / r.maxLife;
    const alpha = 1 - progress;
    const radius = r.maxR * progress;
    ctx.strokeStyle = tier.color + Math.floor(alpha * 80).toString(16).padStart(2, "0");
    ctx.lineWidth = 2 * (1 - progress);
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Particles ──
  for (const p of state.particles) {
    const alpha = 1 - p.life / p.maxLife;
    ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, "0");
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Drones ──
  const visibleDrones = Math.min(state.drones, MAX_VISIBLE_DRONES);
  if (visibleDrones > 0) {
    for (let i = 0; i < visibleDrones; i++) {
      const orbitR = ar + 30 + i * 4.5;
      const orbitSpeed = 1.2 - i * 0.03;
      const angle = state.droneBaseAngle * orbitSpeed + (i * Math.PI * 2) / visibleDrones;
      const dx = ax + Math.cos(angle) * orbitR;
      const dy = ay + Math.sin(angle) * orbitR;

      // Glow
      const dglow = ctx.createRadialGradient(dx, dy, 2, dx, dy, 10);
      dglow.addColorStop(0, "#38bdf880");
      dglow.addColorStop(1, "transparent");
      ctx.fillStyle = dglow;
      ctx.beginPath();
      ctx.arc(dx, dy, 10, 0, Math.PI * 2);
      ctx.fill();

      // Triangle drone
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      const sz = 5;
      ctx.moveTo(dx + Math.cos(angle) * sz, dy + Math.sin(angle) * sz);
      ctx.lineTo(dx + Math.cos(angle + 2.4) * sz, dy + Math.sin(angle + 2.4) * sz);
      ctx.lineTo(dx + Math.cos(angle - 2.4) * sz, dy + Math.sin(angle - 2.4) * sz);
      ctx.closePath();
      ctx.fill();

      // Orbit trail (faint)
      ctx.strokeStyle = "#38bdf815";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(ax, ay, orbitR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // "+N more" indicator
    if (state.drones > MAX_VISIBLE_DRONES) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+" + (state.drones - MAX_VISIBLE_DRONES) + " more", ax, ay + ar + 50);
    }
  }

  // ── Floating text ──
  for (const f of state.floats) {
    const progress = f.life / f.maxLife;
    const alpha = 1 - progress;
    ctx.fillStyle = f.color + Math.floor(alpha * 220).toString(16).padStart(2, "0");
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
  }

  // ── Canvas HUD ──
  // Ore counter (top-left of canvas)
  ctx.fillStyle = "#e8e6e3";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(formatNumber(state.ore) + " " + tier.name, 20, 36);

  // OPS (top-right of canvas)
  if (state.orePerSecond > 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(formatNumber(state.orePerSecond) + " / sec", WIDTH - 20, 36);
  }

  // Prestige badge (top-right, below OPS)
  if (state.prestigeCount > 0) {
    ctx.fillStyle = "#34d399";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("P" + state.prestigeCount + " · +" + prestigeBonusPct() + "%", WIDTH - 20, 54);
  }
}

function drawAsteroidShape(ctx, cx, cy, r, phase) {
  const segments = 18;
  ctx.beginPath();
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const noise = 0.82 + 0.18 * Math.sin(i * 3.7 + phase) * Math.cos(i * 2.3 + phase * 1.7);
    const rr = r * noise;
    const px = cx + Math.cos(angle) * rr;
    const py = cy + Math.sin(angle) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ── Overlay system ────────────────────────────────
function showOverlay({ kicker, title, copy, actions }) {
  ui.overlayKicker.textContent = kicker || "";
  ui.overlayTitle.textContent = title || "";
  ui.overlayCopy.textContent = copy || "";
  ui.overlayActions.innerHTML = "";

  if (actions && actions.length) {
    for (const a of actions) {
      const btn = document.createElement("button");
      btn.className = "button" + (a.primary ? " primary" : "") + (a.accent ? " accent" : "");
      btn.type = "button";
      btn.textContent = a.label;
      btn.addEventListener("click", a.handler);
      ui.overlayActions.appendChild(btn);
    }
  }

  ui.overlay.removeAttribute("hidden");
}

function hideOverlay() {
  ui.overlay.setAttribute("hidden", "");
}

// ── UI update ─────────────────────────────────────
function updateUI() {
  const tier = resourceTier();
  const uptier = upgradeTier();
  const nextUp = nextUpgradeTier();
  const dCost = droneCost();
  const uCost = upgradeCost();

  ui.oreReadout.textContent = formatNumber(state.ore);
  ui.opsReadout.textContent = formatNumber(Math.round(state.orePerSecond));
  ui.droneReadout.textContent = state.drones;
  ui.prestigeReadout.textContent = state.prestigeCount + " (+" + prestigeBonusPct() + "%)";

  ui.resourceName.textContent = tier.name;
  if (state.resourceIndex >= WIN_RESOURCE_INDEX) {
    ui.resourceTierNote.textContent = "Final tier. Prestige " + (WIN_PRESTIGE_COUNT - state.prestigeCount) + " more time(s) to win.";
  } else {
    const nextRes = RESOURCE_TIERS[Math.min(state.resourceIndex + 1, RESOURCE_TIERS.length - 1)];
    ui.resourceTierNote.textContent = "Next tier: " + nextRes.name + " (prestige to unlock)";
  }

  ui.upgradeName.textContent = uptier.name;
  ui.upgradeLevelLabel.textContent = "Level " + state.upgradeLevel + " / " + (UPGRADE_TIERS.length - 1);
  if (nextUp) {
    ui.upgradeCostLabel.textContent = "Next: " + nextUp.name + " (" + formatNumber(uCost) + " ore)";
  } else {
    ui.upgradeCostLabel.textContent = "Max upgrade reached";
  }
  ui.upgradeMeter.style.width = state.upgradeMeterPct + "%";

  ui.droneStatus.textContent = state.drones + " drone" + (state.drones !== 1 ? "s" : "") + " active";
  ui.droneCostLabel.textContent = "Next drone: " + formatNumber(dCost) + " ore";

  ui.prestigeStatus.textContent = state.prestigeCount + " prestige" + (state.prestigeCount !== 1 ? "s" : "") + " · +" + prestigeBonusPct() + "% bonus";
  ui.prestigeThresholdLabel.textContent = "Prestige at " + formatNumber(state.nextPrestigeAt) + " total ore";

  // Button states
  ui.droneButton.textContent = "Buy Drone (" + formatNumber(dCost) + ")";
  ui.droneButton.disabled = state.ore < dCost;

  if (nextUp) {
    ui.upgradeButton.textContent = "Upgrade to " + nextUp.name + " (" + formatNumber(uCost) + ")";
    ui.upgradeButton.disabled = state.ore < uCost;
  } else {
    ui.upgradeButton.textContent = "Max Upgrade";
    ui.upgradeButton.disabled = true;
  }

  const canP = canPrestige();
  ui.prestigeButton.disabled = !canP;
  if (canP) {
    ui.prestigeButton.textContent = "Prestige! (+" + (prestigeBonusPct() + 25) + "% bonus)";
    ui.prestigeButton.classList.add("accent");
  } else {
    ui.prestigeButton.textContent = "Prestige (need " + formatNumber(state.nextPrestigeAt) + ")";
    ui.prestigeButton.classList.remove("accent");
  }
}

// ── Input handling ────────────────────────────────
const keys = new Set();

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function isOnAsteroid(cx, cy) {
  const ar = state.asteroidR;
  const dx = cx - ASTEROID_X;
  const dy = cy - ASTEROID_Y;
  return Math.sqrt(dx * dx + dy * dy) <= ar * 1.4;
}

canvas.addEventListener("pointerdown", (e) => {
  if (state.mode !== "playing") return;
  const { x, y } = getCanvasPos(e);
  if (isOnAsteroid(x, y)) {
    spawnMine(x, y);
  }
});

canvas.addEventListener("touchstart", (e) => {
  if (state.mode !== "playing") return;
  e.preventDefault();
  const touch = e.touches[0];
  if (touch) {
    const { x, y } = getCanvasPos(touch);
    if (isOnAsteroid(x, y)) {
      spawnMine(x, y);
    }
  }
}, { passive: false });

window.addEventListener("keydown", (e) => {
  if (e.repeat && e.code === "Space") return; // let our own repeat handle it
  keys.add(e.code);

  if (e.code === "Space") {
    e.preventDefault();
    if (state.mode === "playing") {
      state.spaceHeld = true;
      state.autoMineTimer = 0;
    }
  }

  if (e.code === "KeyD" && state.mode === "playing") {
    buyDrone();
    updateUI();
  }

  if (e.code === "KeyU" && state.mode === "playing") {
    buyUpgrade();
    updateUI();
  }

  if (e.code === "KeyP" && state.mode === "playing") {
    if (canPrestige()) {
      showOverlay({
        kicker: "Prestige Reset",
        title: "Prestige available!",
        copy: "Reset all progress for a permanent +" + (prestigeBonusPct() + 25) + "% ore production bonus. You will unlock " + RESOURCE_TIERS[Math.min(state.resourceIndex + 1, RESOURCE_TIERS.length - 1)].name + ". Current bonus: +" + prestigeBonusPct() + "%.",
        actions: [
          { label: "Prestige!", accent: true, handler: () => { hideOverlay(); prestige(); } },
          { label: "Cancel", handler: hideOverlay },
        ],
      });
    }
  }

  if (e.code === "Escape") {
    if (state.mode === "playing") {
      state.mode = "paused";
      showOverlay({
        kicker: "Game Paused",
        title: "Deepforge Miner",
        copy: "Take a break. Your drones keep working when you come back. Ore: " + formatNumber(state.ore) + " · OPS: " + formatNumber(Math.round(state.orePerSecond)),
        actions: [
          { label: "Resume", primary: true, handler: () => { state.mode = "playing"; hideOverlay(); updateUI(); } },
          { label: "Restart", handler: () => { restart(); } },
        ],
      });
    } else if (state.mode === "paused") {
      state.mode = "playing";
      hideOverlay();
      updateUI();
    }
  }

  if (e.code === "KeyR") {
    if (state.mode === "playing" || state.mode === "paused") {
      showOverlay({
        kicker: "Restart",
        title: "Start over?",
        copy: "This will reset all progress including prestige bonuses. This cannot be undone.",
        actions: [
          { label: "Restart", handler: () => { restart(); } },
          { label: "Cancel", handler: () => { state.mode = "playing"; hideOverlay(); updateUI(); } },
        ],
      });
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Space") {
    state.spaceHeld = false;
    state.autoMineTimer = 0;
  }
});

// ── Button handlers ───────────────────────────────
ui.mineButton.addEventListener("pointerdown", () => {
  if (state.mode !== "playing") return;
  const mx = ASTEROID_X + (Math.random() - 0.5) * state.asteroidR;
  const my = ASTEROID_Y + (Math.random() - 0.5) * state.asteroidR;
  spawnMine(mx, my);
});

ui.droneButton.addEventListener("click", () => {
  if (state.mode !== "playing") return;
  buyDrone();
  updateUI();
});

ui.upgradeButton.addEventListener("click", () => {
  if (state.mode !== "playing") return;
  buyUpgrade();
  updateUI();
});

ui.prestigeButton.addEventListener("click", () => {
  if (state.mode !== "playing" || !canPrestige()) return;
  showOverlay({
    kicker: "Prestige Reset",
    title: "Prestige available!",
    copy: "Reset all progress for a permanent +" + (prestigeBonusPct() + 25) + "% ore production bonus. You will unlock " + RESOURCE_TIERS[Math.min(state.resourceIndex + 1, RESOURCE_TIERS.length - 1)].name + ". Current bonus: +" + prestigeBonusPct() + "%.",
    actions: [
      { label: "Prestige!", accent: true, handler: () => { hideOverlay(); prestige(); } },
      { label: "Cancel", handler: hideOverlay },
    ],
  });
});

// ── Start / restart ───────────────────────────────
function start() {
  state.mode = "playing";
  state.spaceHeld = false;
  state.autoMineTimer = 0;
  hideOverlay();
  updateUI();
}

function restart() {
  state = freshState();
  state.mode = "playing";
  hideOverlay();
  updateUI();
}

// ── Utility ───────────────────────────────────────
function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

// ── Boot ──────────────────────────────────────────
function boot() {
  updateUI();
  showOverlay({
    kicker: "Observation 009 / Game 009",
    title: "Deepforge Miner",
    copy: "A space mining incremental clicker. Click the asteroid to mine ore, purchase automated drones, upgrade from pickaxe to quantum extractor, and prestige to unlock rare resources with permanent bonuses.",
    actions: [
      { label: "Start Mining", primary: true, handler: start },
    ],
  });
  startLoop();
}

boot();

// ── QA hooks ──────────────────────────────────────
window.__deepforgeMinerQA = {
  getSnapshot() {
    return {
      mode: state.mode,
      ore: state.ore,
      totalOreEver: state.totalOreEver,
      orePerSecond: state.orePerSecond,
      upgradeLevel: state.upgradeLevel,
      drones: state.drones,
      prestigeCount: state.prestigeCount,
      prestigeBonus: state.prestigeBonus,
      resourceIndex: state.resourceIndex,
      clicks: state.clicks,
    };
  },
  start,
  restart,
  clickMine() {
    const mx = ASTEROID_X + (Math.random() - 0.5) * 20;
    const my = ASTEROID_Y + (Math.random() - 0.5) * 20;
    spawnMine(mx, my);
    updateUI();
  },
  forceOre(n) {
    state.ore = n;
    state.totalOreEver = Math.max(state.totalOreEver, n);
    updateUI();
  },
  forcePrestige() {
    state.totalOreEver = prestigeThreshold();
    prestige();
    updateUI();
  },
  forceWin() {
    state.resourceIndex = WIN_RESOURCE_INDEX;
    state.prestigeCount = WIN_PRESTIGE_COUNT;
    state.prestigeBonus = WIN_PRESTIGE_COUNT * PRESTIGE_BONUS_PER_LEVEL;
    state.mode = "won";
    showOverlay({
      kicker: "All Resources Mastered",
      title: "Mining Empire Complete",
      copy: "You've unlocked Dark Matter and achieved " + state.prestigeCount + " prestige cycles.",
    });
  },
};
