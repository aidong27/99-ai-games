const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  sector: document.querySelector("#sector-readout"),
  fragments: document.querySelector("#fragment-readout"),
  integrity: document.querySelector("#integrity-readout"),
  beacons: document.querySelector("#beacon-readout"),
  integrityMeter: document.querySelector("#integrity-meter"),
  mappingMeter: document.querySelector("#mapping-meter"),
  overlay: document.querySelector("#overlay"),
  overlayKicker: document.querySelector("#overlay-kicker"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayCopy: document.querySelector("#overlay-copy"),
  primaryAction: document.querySelector("#primary-action")
};

const WORLD = { width: 960, height: 600 };
const keys = new Set();
const touchDirs = new Set();
const pointer = { active: false, x: 0, y: 0 };

const upgrades = [
  {
    title: "Signal Dampers",
    copy: "Reduce incoming interference by 18%.",
    apply: () => state.damageScale *= 0.82
  },
  {
    title: "Vector Thrusters",
    copy: "Increase cursor speed by 12%.",
    apply: () => state.speed *= 1.12
  },
  {
    title: "Beacon Cache",
    copy: "Add two beacons and widen their safe radius.",
    apply: () => {
      state.maxBeacons += 2;
      state.beaconRadius += 12;
    }
  }
];

let state = createInitialState();
let lastTime = performance.now();

function createInitialState() {
  return {
    mode: "menu",
    sector: 1,
    maxSector: 3,
    integrity: 100,
    speed: 178,
    damageScale: 1,
    maxBeacons: 4,
    beaconRadius: 74,
    beacons: 4,
    player: { x: 78, y: WORLD.height / 2, r: 12 },
    exit: { x: WORLD.width - 72, y: WORLD.height / 2, r: 30, open: false },
    fragments: [],
    zones: [],
    drones: [],
    droppedBeacons: [],
    particles: [],
    time: 0,
    message: "Collect fragments to unlock the exit.",
    pendingUpgrades: []
  };
}

function buildSector(keepProgress = false) {
  const sector = state.sector;
  const rng = mulberry32(991 + sector * 6151);
  const fragments = [];
  const fragmentCount = 3 + sector;

  for (let i = 0; i < fragmentCount; i += 1) {
    fragments.push({
      x: 200 + rng() * 560,
      y: 76 + rng() * 448,
      r: 13,
      phase: rng() * Math.PI * 2,
      collected: false
    });
  }

  state.player = { x: 78, y: WORLD.height / 2, r: 12 };
  state.exit = { x: WORLD.width - 72, y: WORLD.height / 2, r: 30, open: false };
  state.fragments = fragments;
  state.zones = Array.from({ length: 2 + sector }, (_, index) => ({
    x: 250 + rng() * 520,
    y: 84 + rng() * 432,
    r: 46 + rng() * 34,
    pulse: rng() * Math.PI * 2,
    drift: index % 2 === 0 ? 1 : -1
  }));
  state.drones = Array.from({ length: 1 + sector }, (_, index) => ({
    x: 230 + rng() * 510,
    y: 96 + rng() * 408,
    r: 15,
    phase: rng() * Math.PI * 2,
    speed: 0.45 + rng() * 0.42,
    orbit: 48 + rng() * 54,
    index
  }));
  state.droppedBeacons = [];
  state.particles = [];
  state.beacons = keepProgress ? Math.min(state.maxBeacons, state.beacons + 1) : state.maxBeacons;
  state.time = 0;
  state.mode = "running";
  state.message = `Sector ${sector}: recover every signal fragment.`;
  hideOverlay();
}

function update(dt) {
  if (state.mode !== "running") {
    return;
  }

  state.time += dt;
  movePlayer(dt);
  updateHazards(dt);
  collectFragments();
  checkExit();
  updateParticles(dt);

  if (state.integrity <= 0) {
    state.integrity = 0;
    state.mode = "lost";
    showOverlay("Run collapsed", "Signal integrity reached zero. Reboot the chart and try a cleaner route.", "Restart run", restart);
  }
}

function movePlayer(dt) {
  const input = getInputVector();
  let dx = input.x;
  let dy = input.y;

  if (pointer.active && dx === 0 && dy === 0) {
    const target = screenToWorld(pointer.x, pointer.y);
    dx = target.x - state.player.x;
    dy = target.y - state.player.y;
  }

  const length = Math.hypot(dx, dy);
  if (length > 0.01) {
    state.player.x += (dx / length) * state.speed * dt;
    state.player.y += (dy / length) * state.speed * dt;
  }

  state.player.x = clamp(state.player.x, 20, WORLD.width - 20);
  state.player.y = clamp(state.player.y, 20, WORLD.height - 20);
}

function getInputVector() {
  const left = keys.has("arrowleft") || keys.has("a") || touchDirs.has("left");
  const right = keys.has("arrowright") || keys.has("d") || touchDirs.has("right");
  const up = keys.has("arrowup") || keys.has("w") || touchDirs.has("up");
  const down = keys.has("arrowdown") || keys.has("s") || touchDirs.has("down");
  return {
    x: Number(right) - Number(left),
    y: Number(down) - Number(up)
  };
}

function applyKeyImpulse(key) {
  if (state.mode !== "running") {
    return;
  }

  const impulse = 16;
  if (key === "arrowleft" || key === "a") {
    state.player.x -= impulse;
  }
  if (key === "arrowright" || key === "d") {
    state.player.x += impulse;
  }
  if (key === "arrowup" || key === "w") {
    state.player.y -= impulse;
  }
  if (key === "arrowdown" || key === "s") {
    state.player.y += impulse;
  }

  state.player.x = clamp(state.player.x, 20, WORLD.width - 20);
  state.player.y = clamp(state.player.y, 20, WORLD.height - 20);
}

function updateHazards(dt) {
  let damage = 0;
  const safeFactor = beaconSafetyFactor();

  for (const zone of state.zones) {
    zone.pulse += dt * 1.3;
    zone.x += Math.sin(state.time * 0.22 + zone.pulse) * zone.drift * dt * 10;
    const dist = distance(state.player, zone);
    if (dist < zone.r) {
      damage += (zone.r - dist) / zone.r * 11 * dt;
      addParticle(state.player.x, state.player.y, "corrupt");
    }
  }

  for (const drone of state.drones) {
    drone.phase += dt * drone.speed;
    const hx = drone.x + Math.cos(drone.phase) * drone.orbit;
    const hy = drone.y + Math.sin(drone.phase * 1.33) * drone.orbit * 0.62;
    drone.currentX = hx;
    drone.currentY = hy;
    const dist = Math.hypot(state.player.x - hx, state.player.y - hy);
    if (dist < 34) {
      damage += (34 - dist) / 34 * 16 * dt;
      addParticle(hx, hy, "noise");
    }
  }

  const waveDistance = Math.abs(((state.time * 150 + state.player.x + state.player.y * 0.42) % 240) - 120);
  if (waveDistance < 18) {
    damage += (18 - waveDistance) / 18 * 18 * dt;
    addParticle(state.player.x, state.player.y, "wave");
  }

  state.integrity -= damage * state.damageScale * safeFactor;
}

function beaconSafetyFactor() {
  let factor = 1;
  for (const beacon of state.droppedBeacons) {
    const dist = distance(state.player, beacon);
    if (dist < state.beaconRadius) {
      factor = Math.min(factor, 0.42 + dist / state.beaconRadius * 0.38);
    }
  }
  return factor;
}

function collectFragments() {
  for (const fragment of state.fragments) {
    if (!fragment.collected && distance(state.player, fragment) < state.player.r + fragment.r + 6) {
      fragment.collected = true;
      state.integrity = Math.min(100, state.integrity + 8);
      state.message = "Fragment mapped. Integrity stabilized.";
      burst(fragment.x, fragment.y, "fragment");
    }
  }

  state.exit.open = state.fragments.every((fragment) => fragment.collected);
}

function checkExit() {
  if (!state.exit.open) {
    return;
  }

  if (distance(state.player, state.exit) < state.exit.r + state.player.r) {
    if (state.sector >= state.maxSector) {
      state.mode = "won";
      showOverlay("Route archived", "All three sectors are mapped. Signal Cartographer joins the 99 AI Games archive.", "Play again", restart);
      return;
    }

    state.mode = "upgrade";
    state.pendingUpgrades = chooseUpgrades();
    showUpgradeOverlay();
  }
}

function deployBeacon() {
  if (state.mode !== "running" || state.beacons <= 0) {
    return;
  }

  state.beacons -= 1;
  state.droppedBeacons.push({ x: state.player.x, y: state.player.y, age: 0 });
  state.message = "Beacon deployed. Nearby interference softened.";
  burst(state.player.x, state.player.y, "beacon");
}

function chooseUpgrades() {
  const offset = state.sector % upgrades.length;
  return [upgrades[offset], upgrades[(offset + 1) % upgrades.length], upgrades[(offset + 2) % upgrades.length]];
}

function showUpgradeOverlay() {
  ui.overlay.classList.remove("hidden");
  ui.overlayKicker.textContent = `Sector ${state.sector} mapped`;
  ui.overlayTitle.textContent = "Choose a calibration";
  ui.overlayCopy.textContent = "The next field is more unstable. Pick one AI charting adjustment.";
  ui.primaryAction.replaceWith(ui.primaryAction.cloneNode(true));
  ui.primaryAction = document.querySelector("#primary-action");
  ui.primaryAction.textContent = state.pendingUpgrades[0].title;

  const container = document.createElement("div");
  container.className = "upgrade-list";

  for (const upgrade of state.pendingUpgrades) {
    const button = document.createElement("button");
    button.className = "upgrade-choice";
    button.type = "button";
    button.innerHTML = `<strong>${upgrade.title}</strong><span>${upgrade.copy}</span>`;
    button.addEventListener("click", () => {
      upgrade.apply();
      state.sector += 1;
      buildSector(true);
    });
    container.append(button);
  }

  const card = ui.overlay.querySelector(".overlay-card");
  card.querySelectorAll(".upgrade-list").forEach((list) => list.remove());
  ui.primaryAction.addEventListener("click", () => {
    state.pendingUpgrades[0].apply();
    state.sector += 1;
    buildSector(true);
  });
  card.append(container);
}

function render() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackground();
  drawExit();
  drawBeacons();
  drawFragments();
  drawHazards();
  drawParticles();
  drawPlayer();
  drawHudText();
  updateUi();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  gradient.addColorStop(0, "#07111f");
  gradient.addColorStop(0.55, "#080912");
  gradient.addColorStop(1, "#170b1d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.strokeStyle = "rgba(61, 242, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(state.time + x * 0.02) * 10, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y + Math.cos(state.time + y * 0.02) * 10);
    ctx.stroke();
  }

  const wave = (state.time * 150) % 240;
  ctx.strokeStyle = "rgba(255, 78, 210, 0.22)";
  ctx.lineWidth = 22;
  for (let i = -2; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 240 - wave, WORLD.height);
    ctx.lineTo(i * 240 + 260 - wave, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 2;
  for (let i = -2; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 240 - wave, WORLD.height);
    ctx.lineTo(i * 240 + 260 - wave, 0);
    ctx.stroke();
  }
}

function drawHazards() {
  for (const zone of state.zones) {
    const radius = zone.r + Math.sin(zone.pulse) * 6;
    const gradient = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, radius);
    gradient.addColorStop(0, "rgba(255, 78, 210, 0.32)");
    gradient.addColorStop(1, "rgba(255, 78, 210, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 78, 210, 0.35)";
    ctx.stroke();
  }

  for (const drone of state.drones) {
    const x = drone.currentX ?? drone.x;
    const y = drone.currentY ?? drone.y;
    ctx.fillStyle = "rgba(255, 209, 102, 0.9)";
    ctx.beginPath();
    ctx.arc(x, y, drone.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.stroke();
  }
}

function drawFragments() {
  for (const fragment of state.fragments) {
    if (fragment.collected) {
      continue;
    }

    const pulse = 1 + Math.sin(state.time * 4 + fragment.phase) * 0.16;
    ctx.fillStyle = "rgba(61, 242, 255, 0.92)";
    ctx.beginPath();
    ctx.arc(fragment.x, fragment.y, fragment.r * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(168, 255, 120, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawBeacons() {
  for (const beacon of state.droppedBeacons) {
    beacon.age += 0.016;
    ctx.strokeStyle = "rgba(168, 255, 120, 0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, state.beaconRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(168, 255, 120, 0.92)";
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, 7 + Math.sin(beacon.age * 4) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit() {
  ctx.save();
  ctx.translate(state.exit.x, state.exit.y);
  ctx.strokeStyle = state.exit.open ? "rgba(168, 255, 120, 0.92)" : "rgba(174, 184, 202, 0.28)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, state.exit.r + Math.sin(state.time * 3) * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = state.exit.open ? "rgba(168, 255, 120, 0.18)" : "rgba(255, 255, 255, 0.05)";
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(state.player.x, state.player.y);
  ctx.fillStyle = "#f4f7ff";
  ctx.strokeStyle = "#3df2ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHudText() {
  ctx.fillStyle = "rgba(244, 247, 255, 0.78)";
  ctx.font = "700 16px ui-sans-serif, system-ui";
  ctx.fillText(state.message, 24, WORLD.height - 24);
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt * 1.7;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function addParticle(x, y, type) {
  if (state.particles.length > 90) {
    return;
  }
  const palette = {
    corrupt: "rgba(255, 78, 210, 0.7)",
    noise: "rgba(255, 209, 102, 0.75)",
    wave: "rgba(255, 255, 255, 0.65)",
    fragment: "rgba(61, 242, 255, 0.9)",
    beacon: "rgba(168, 255, 120, 0.9)"
  };
  state.particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 80,
    vy: (Math.random() - 0.5) * 80,
    size: 2 + Math.random() * 4,
    life: 0.35 + Math.random() * 0.32,
    color: palette[type] ?? palette.wave
  });
}

function burst(x, y, type) {
  for (let i = 0; i < 18; i += 1) {
    addParticle(x, y, type);
  }
}

function updateUi() {
  const collected = state.fragments.filter((fragment) => fragment.collected).length;
  const total = state.fragments.length || 1;
  ui.sector.textContent = `${state.sector} / ${state.maxSector}`;
  ui.fragments.textContent = `${collected} / ${state.fragments.length}`;
  ui.integrity.textContent = `${Math.ceil(state.integrity)}%`;
  ui.beacons.textContent = `${state.beacons}`;
  ui.integrityMeter.style.width = `${clamp(state.integrity, 0, 100)}%`;
  ui.mappingMeter.style.width = `${Math.round(collected / total * 100)}%`;
  canvas.dataset.mode = state.mode;
  canvas.dataset.playerX = state.player.x.toFixed(1);
  canvas.dataset.playerY = state.player.y.toFixed(1);
  canvas.dataset.fragmentsCollected = String(collected);
  canvas.dataset.fragmentsTotal = String(state.fragments.length);
  canvas.dataset.exitOpen = String(state.exit.open);
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function showOverlay(title, copy, actionText, action) {
  ui.overlay.classList.remove("hidden");
  ui.overlayKicker.textContent = "Signal Cartographer";
  ui.overlayTitle.textContent = title;
  ui.overlayCopy.textContent = copy;
  ui.primaryAction.replaceWith(ui.primaryAction.cloneNode(true));
  ui.primaryAction = document.querySelector("#primary-action");
  ui.primaryAction.textContent = actionText;
  ui.overlay.querySelectorAll(".upgrade-list").forEach((list) => list.remove());
  ui.primaryAction.addEventListener("click", action);
}

function hideOverlay() {
  ui.overlay.classList.add("hidden");
}

function restart() {
  state = createInitialState();
  buildSector(false);
}

function togglePause() {
  if (state.mode === "running") {
    state.mode = "paused";
    showOverlay("Chart paused", "The signal field is frozen. Resume when ready.", "Resume", () => {
      state.mode = "running";
      hideOverlay();
    });
  } else if (state.mode === "paused") {
    state.mode = "running";
    hideOverlay();
  }
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width * WORLD.width,
    y: (clientY - rect.top) / rect.height * WORLD.height
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);
  applyKeyImpulse(key);
  if (key === " ") {
    deployBeacon();
  }
  if (key === "r") {
    restart();
  }
  if (key === "p") {
    togglePause();
  }
  if (key === "enter" && state.mode === "menu") {
    restart();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) {
    return;
  }
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

canvas.addEventListener("pointerup", (event) => {
  pointer.active = false;
  canvas.releasePointerCapture(event.pointerId);
});

for (const button of document.querySelectorAll(".pad-button")) {
  const direction = button.dataset.dir;
  if (direction) {
    button.addEventListener("pointerdown", () => touchDirs.add(direction));
    button.addEventListener("pointerup", () => touchDirs.delete(direction));
    button.addEventListener("pointercancel", () => touchDirs.delete(direction));
    button.addEventListener("pointerleave", () => touchDirs.delete(direction));
  }
  if (button.dataset.action === "beacon") {
    button.addEventListener("click", deployBeacon);
  }
}

ui.primaryAction.addEventListener("click", restart);
window.__signalCartographerQA = {
  start: restart,
  deployBeacon,
  getSnapshot() {
    return {
      mode: state.mode,
      sector: state.sector,
      integrity: state.integrity,
      beacons: state.beacons,
      player: { ...state.player },
      fragmentsCollected: state.fragments.filter((fragment) => fragment.collected).length,
      fragmentsTotal: state.fragments.length,
      exitOpen: state.exit.open
    };
  },
  setPlayerPosition(x, y) {
    state.player.x = clamp(Number(x), 20, WORLD.width - 20);
    state.player.y = clamp(Number(y), 20, WORLD.height - 20);
  },
  completeCurrentSector() {
    for (const fragment of state.fragments) {
      fragment.collected = true;
    }
    state.exit.open = true;
  }
};
showOverlay("Map the dark signal", "Collect every fragment, avoid interference, then cross the open exit gate.", "Start run", restart);
requestAnimationFrame(loop);
