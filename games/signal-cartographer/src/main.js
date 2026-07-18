const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  sector: document.querySelector("#sector-readout"),
  integrity: document.querySelector("#integrity-readout"),
  fragments: document.querySelector("#fragment-readout"),
  scan: document.querySelector("#scan-readout"),
  beacons: document.querySelector("#beacon-readout"),
  threat: document.querySelector("#threat-readout"),
  storm: document.querySelector("#storm-readout"),
  exit: document.querySelector("#exit-readout"),
  objective: document.querySelector("#objective-readout"),
  message: document.querySelector("#message-readout"),
  integrityMeter: document.querySelector("#integrity-meter"),
  scanMeter: document.querySelector("#scan-meter"),
  mappingMeter: document.querySelector("#mapping-meter"),
  overlay: document.querySelector("#overlay"),
  overlayKicker: document.querySelector("#overlay-kicker"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayCopy: document.querySelector("#overlay-copy"),
  primaryAction: document.querySelector("#primary-action"),
  upgradeList: document.querySelector("#upgrade-list"),
  scanButton: document.querySelector("#scan-button"),
  beaconButton: document.querySelector("#beacon-button"),
  beaconButtonCount: document.querySelector("#beacon-button-count"),
  pauseButton: document.querySelector("#pause-button"),
  restartButton: document.querySelector("#restart-button")
};

const WORLD = { width: 1280, height: 720 };
const CELL = 40;
const GRID = { cols: WORLD.width / CELL, rows: WORLD.height / CELL };
const MAX_SECTOR = 3;
const SCAN_COST = 28;
const BASE_REVEAL_RADIUS = 110;
const keys = new Set();
const pointer = { active: false, id: null, target: null };

const upgrades = [
  {
    id: "beacon-chain",
    title: "Beacon Chain",
    copy: "Gain one beacon and expand all beacon safe fields.",
    apply: () => {
      state.maxBeacons += 1;
      state.beacons = Math.min(state.maxBeacons, state.beacons + 1);
      state.beaconRadius += 14;
    }
  },
  {
    id: "survey-lens",
    title: "Survey Lens",
    copy: "Increase scan capacity and start the next sector with extra energy.",
    apply: () => {
      state.maxScan += 18;
      state.scanEnergy = Math.min(state.maxScan, state.scanEnergy + 34);
    }
  },
  {
    id: "dampers",
    title: "Signal Dampers",
    copy: "Reduce all interference damage for the rest of this run.",
    apply: () => {
      state.damageScale *= 0.84;
    }
  },
  {
    id: "field-drive",
    title: "Field Drive",
    copy: "Increase probe speed and make route corrections tighter.",
    apply: () => {
      state.speed += 16;
      state.turnAssist += 0.08;
    }
  }
];

let state = createInitialState();
let lastTime = performance.now();
let animationFrame = 0;

prepareSector(1, "title");
showOverlay({
  kicker: "Observation 001 / Game 001 remake",
  title: "Enter the deep field",
  copy: "Scan before committing. Beacons buy safe routes, but every sector tightens the signal storm.",
  actionText: "Start run",
  action: startRun
});
startLoop();
installQaHooks();

function createInitialState() {
  return {
    mode: "title",
    sector: 1,
    integrity: 100,
    maxIntegrity: 100,
    maxBeacons: 3,
    beacons: 3,
    beaconRadius: 96,
    maxScan: 100,
    scanEnergy: 100,
    scanRegen: 13,
    speed: 214,
    turnAssist: 0.62,
    damageScale: 1,
    player: { x: 92, y: WORLD.height / 2, r: 13 },
    exit: { x: WORLD.width - 92, y: WORLD.height / 2, r: 34, open: false, revealed: false },
    fragments: [],
    zones: [],
    drones: [],
    beaconsDropped: [],
    particles: [],
    scanPulses: [],
    revealed: new Set(),
    routeTarget: null,
    pendingUpgrades: [],
    time: 0,
    sectorTime: 0,
    objective: "Start the field run",
    message: "Use scan pulses to reveal risk before choosing a route.",
    threatLevel: "Low",
    stormLabel: "Dormant"
  };
}

function prepareSector(sector, mode = "running", keepResources = false) {
  const rng = mulberry32(4409 + sector * 9091);
  const fragmentCount = 3 + sector;
  const zoneCount = 3 + sector;
  const droneCount = 1 + sector;

  state.sector = sector;
  state.mode = mode;
  state.time = 0;
  state.sectorTime = 0;
  state.player = { x: 92, y: WORLD.height / 2, r: 13 };
  state.exit = {
    x: WORLD.width - 92,
    y: 120 + rng() * (WORLD.height - 240),
    r: 34,
    open: false,
    revealed: false
  };
  state.fragments = Array.from({ length: fragmentCount }, (_, index) => {
    const lane = index / Math.max(1, fragmentCount - 1);
    return {
      x: 250 + lane * 650 + (rng() - 0.5) * 120,
      y: 92 + rng() * (WORLD.height - 184),
      r: 13,
      phase: rng() * Math.PI * 2,
      collected: false,
      revealed: index === 0
    };
  });
  state.zones = Array.from({ length: zoneCount }, (_, index) => ({
    x: 270 + rng() * 710,
    y: 88 + rng() * (WORLD.height - 176),
    baseX: 270 + rng() * 710,
    baseY: 88 + rng() * (WORLD.height - 176),
    r: 62 + rng() * 42 + sector * 3,
    phase: rng() * Math.PI * 2,
    drift: 0.22 + rng() * 0.22,
    revealed: index < 2
  }));
  for (const zone of state.zones) {
    zone.baseX = zone.x;
    zone.baseY = zone.y;
  }
  state.drones = Array.from({ length: droneCount }, (_, index) => ({
    anchorX: 310 + rng() * 650,
    anchorY: 120 + rng() * (WORLD.height - 240),
    x: 0,
    y: 0,
    r: 16,
    orbit: 52 + rng() * 60,
    speed: 0.62 + rng() * 0.28 + sector * 0.08,
    phase: rng() * Math.PI * 2,
    revealed: index === 0
  }));
  state.beaconsDropped = [];
  state.particles = [];
  state.scanPulses = [];
  state.revealed = new Set();
  state.routeTarget = null;
  state.pendingUpgrades = [];
  state.objective = `Map sector ${sector}: collect every fragment`;
  state.message = "Unknown lanes are dangerous. Scan, then commit.";
  state.threatLevel = "Low";
  state.stormLabel = "Dormant";
  if (!keepResources) {
    state.maxBeacons = 3;
    state.beacons = 3;
    state.beaconRadius = 96;
    state.maxScan = 100;
    state.scanEnergy = state.maxScan;
    state.scanRegen = 13;
    state.speed = 214;
    state.turnAssist = 0.62;
    state.damageScale = 1;
    state.integrity = state.maxIntegrity;
  } else {
    state.beacons = Math.min(state.maxBeacons, state.beacons + 1);
    state.scanEnergy = Math.min(state.maxScan, state.scanEnergy + 30);
  }
  revealAround(state.player.x, state.player.y, BASE_REVEAL_RADIUS);
  revealAround(state.fragments[0].x, state.fragments[0].y, 74);
  updateUi();
}

function startRun() {
  clearInput();
  state = createInitialState();
  prepareSector(1, "running", false);
  hideOverlay();
  lastTime = performance.now();
}

function restart() {
  startRun();
}

function togglePause() {
  if (state.mode === "running") {
    state.mode = "paused";
    clearInput();
    showOverlay({
      kicker: `Sector ${state.sector} paused`,
      title: "Chart paused",
      copy: "The field is frozen. Continue when the route is clear.",
      actionText: "Continue",
      action: () => {
        state.mode = "running";
        hideOverlay();
        lastTime = performance.now();
      }
    });
    return;
  }

  if (state.mode === "paused") {
    state.mode = "running";
    hideOverlay();
    lastTime = performance.now();
  }
}

function update(dt) {
  if (state.mode !== "running") {
    return;
  }

  state.time += dt;
  state.sectorTime += dt;
  state.scanEnergy = Math.min(state.maxScan, state.scanEnergy + state.scanRegen * dt);
  movePlayer(dt);
  updateField(dt);
  collectFragments();
  checkExit();
  updateParticles(dt);
  updateScanPulses(dt);
  revealAround(state.player.x, state.player.y, 54);

  if (state.integrity <= 0) {
    state.integrity = 0;
    state.mode = "lost";
    clearInput();
    showOverlay({
      kicker: "Run failed",
      title: "Signal integrity collapsed",
      copy: "The field punished the route. Restart and spend scans before crossing unknown lanes.",
      actionText: "Restart run",
      action: restart
    });
  }
}

function movePlayer(dt) {
  const keyVector = getKeyVector();
  let dx = keyVector.x;
  let dy = keyVector.y;

  if (dx === 0 && dy === 0 && state.routeTarget) {
    const targetDx = state.routeTarget.x - state.player.x;
    const targetDy = state.routeTarget.y - state.player.y;
    const dist = Math.hypot(targetDx, targetDy);
    if (dist < 10) {
      state.routeTarget = null;
    } else {
      dx = targetDx / Math.max(1, dist) * state.turnAssist;
      dy = targetDy / Math.max(1, dist) * state.turnAssist;
    }
  }

  const length = Math.hypot(dx, dy);
  if (length > 0.01) {
    state.player.x += dx / length * state.speed * dt;
    state.player.y += dy / length * state.speed * dt;
  }

  state.player.x = clamp(state.player.x, 24, WORLD.width - 24);
  state.player.y = clamp(state.player.y, 24, WORLD.height - 24);
}

function getKeyVector() {
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const up = keys.has("arrowup") || keys.has("w");
  const down = keys.has("arrowdown") || keys.has("s");
  return {
    x: Number(right) - Number(left),
    y: Number(down) - Number(up)
  };
}

function updateField(dt) {
  let damage = 0;
  let threat = 0;
  const safe = beaconSafety();

  for (const zone of state.zones) {
    zone.phase += dt * zone.drift;
    zone.x = zone.baseX + Math.sin(zone.phase * 1.2) * (24 + state.sector * 6);
    zone.y = zone.baseY + Math.cos(zone.phase * 0.9) * (18 + state.sector * 4);
    if (isRevealed(zone.x, zone.y, zone.r * 0.75)) {
      zone.revealed = true;
    }
    const dist = distance(state.player, zone);
    if (dist < zone.r) {
      const pressure = (zone.r - dist) / zone.r;
      damage += pressure * (15 + state.sector * 3) * dt;
      threat += pressure * 0.42;
      addParticle(state.player.x, state.player.y, "interference");
    }
  }

  for (const drone of state.drones) {
    drone.phase += dt * drone.speed;
    drone.x = drone.anchorX + Math.cos(drone.phase) * drone.orbit;
    drone.y = drone.anchorY + Math.sin(drone.phase * 1.27) * drone.orbit * 0.62;
    if (isRevealed(drone.x, drone.y, 44)) {
      drone.revealed = true;
    }
    const dist = Math.hypot(state.player.x - drone.x, state.player.y - drone.y);
    if (dist < 42) {
      const pressure = (42 - dist) / 42;
      damage += pressure * (22 + state.sector * 2) * dt;
      threat += pressure * 0.5;
      addParticle(drone.x, drone.y, "drone");
    }
  }

  const storm = getStorm();
  const stormDistance = Math.abs(state.player.x - storm.x);
  if (stormDistance < storm.width) {
    const pressure = (storm.width - stormDistance) / storm.width;
    damage += pressure * (17 + state.sector * 4) * dt;
    threat += pressure * 0.58;
    addParticle(state.player.x, state.player.y, "storm");
  }

  state.integrity -= damage * state.damageScale * safe;
  state.threatLevel = threat > 0.78 ? "Critical" : threat > 0.36 ? "High" : threat > 0.12 ? "Rising" : "Low";
  state.stormLabel = stormDistance < storm.width * 1.6 ? "Crossing" : storm.x < WORLD.width * 0.15 ? "Incoming" : "Active";
}

function getStorm() {
  const period = Math.max(9.5, 15.5 - state.sector * 1.9);
  const phase = (state.sectorTime % period) / period;
  return {
    x: phase * (WORLD.width + 220) - 110,
    width: 28 + state.sector * 5
  };
}

function beaconSafety() {
  let factor = 1;
  for (const beacon of state.beaconsDropped) {
    const dist = distance(state.player, beacon);
    if (dist < state.beaconRadius) {
      factor = Math.min(factor, 0.34 + dist / state.beaconRadius * 0.42);
    }
  }
  return factor;
}

function collectFragments() {
  for (const fragment of state.fragments) {
    if (fragment.collected) {
      continue;
    }
    if (isRevealed(fragment.x, fragment.y, 46)) {
      fragment.revealed = true;
    }
    if (distance(state.player, fragment) < state.player.r + fragment.r + 8) {
      fragment.collected = true;
      fragment.revealed = true;
      state.integrity = Math.min(state.maxIntegrity, state.integrity + 5);
      state.message = "Fragment recovered. The exit signal is resolving.";
      burst(fragment.x, fragment.y, "fragment");
    }
  }

  state.exit.open = state.fragments.every((fragment) => fragment.collected);
  if (state.exit.open) {
    state.exit.revealed = true;
    revealAround(state.exit.x, state.exit.y, 112);
    state.objective = `Exit sector ${state.sector}`;
    state.message = "All fragments mapped. Cross the open exit gate.";
  }
}

function checkExit() {
  if (!state.exit.open) {
    return;
  }
  if (distance(state.player, state.exit) < state.exit.r + state.player.r) {
    completeSector();
  }
}

function completeSector() {
  if (state.sector >= MAX_SECTOR) {
    state.mode = "won";
    clearInput();
    showOverlay({
      kicker: "Run archived",
      title: "Deep Field route complete",
      copy: "All three sectors are mapped. Signal Cartographer now has a canonical Deep Field remake in the archive.",
      actionText: "Play again",
      action: restart
    });
    return;
  }

  state.mode = "upgrade";
  clearInput();
  state.pendingUpgrades = chooseUpgrades();
  showUpgradeOverlay();
}

function chooseUpgrades() {
  const start = state.sector % upgrades.length;
  return [
    upgrades[start],
    upgrades[(start + 1) % upgrades.length],
    upgrades[(start + 2) % upgrades.length]
  ];
}

function showUpgradeOverlay() {
  showOverlay({
    kicker: `Sector ${state.sector} mapped`,
    title: "Choose a calibration",
    copy: "The next field is more unstable. Pick one route-planning advantage before continuing.",
    actionText: `Continue: ${state.pendingUpgrades[0].title}`,
    action: () => applyUpgrade(state.pendingUpgrades[0])
  });
  ui.upgradeList.hidden = false;
  ui.upgradeList.replaceChildren(...state.pendingUpgrades.map((upgrade) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-choice";
    button.innerHTML = `<strong>${upgrade.title}</strong><span>${upgrade.copy}</span>`;
    button.addEventListener("click", () => applyUpgrade(upgrade));
    return button;
  }));
}

function applyUpgrade(upgrade) {
  upgrade.apply();
  prepareSector(state.sector + 1, "running", true);
  hideOverlay();
  lastTime = performance.now();
}

function scanField() {
  if (state.mode !== "running" || state.scanEnergy < SCAN_COST) {
    if (state.mode === "running") {
      state.message = "Scan energy is recharging. Hold the route.";
    }
    return false;
  }

  state.scanEnergy -= SCAN_COST;
  const radius = 190 + state.sector * 12;
  revealAround(state.player.x, state.player.y, radius);
  state.scanPulses.push({ x: state.player.x, y: state.player.y, r: 18, max: radius, life: 1 });
  state.message = "Scan pulse resolved nearby fragments, drones, and storm lanes.";
  burst(state.player.x, state.player.y, "scan");
  return true;
}

function deployBeacon() {
  if (state.mode !== "running" || state.beacons <= 0) {
    return false;
  }
  state.beacons -= 1;
  state.beaconsDropped.push({ x: state.player.x, y: state.player.y, age: 0 });
  revealAround(state.player.x, state.player.y, state.beaconRadius * 0.85);
  state.message = "Beacon anchored. Interference damage is reduced inside its field.";
  burst(state.player.x, state.player.y, "beacon");
  return true;
}

function revealAround(x, y, radius) {
  const minCol = clamp(Math.floor((x - radius) / CELL), 0, GRID.cols - 1);
  const maxCol = clamp(Math.floor((x + radius) / CELL), 0, GRID.cols - 1);
  const minRow = clamp(Math.floor((y - radius) / CELL), 0, GRID.rows - 1);
  const maxRow = clamp(Math.floor((y + radius) / CELL), 0, GRID.rows - 1);
  for (let col = minCol; col <= maxCol; col += 1) {
    for (let row = minRow; row <= maxRow; row += 1) {
      const cx = col * CELL + CELL / 2;
      const cy = row * CELL + CELL / 2;
      if (Math.hypot(cx - x, cy - y) <= radius + CELL * 0.7) {
        state.revealed.add(`${col}:${row}`);
      }
    }
  }
  for (const fragment of state.fragments) {
    if (Math.hypot(fragment.x - x, fragment.y - y) <= radius + 20) {
      fragment.revealed = true;
    }
  }
  for (const zone of state.zones) {
    if (Math.hypot(zone.x - x, zone.y - y) <= radius + zone.r) {
      zone.revealed = true;
    }
  }
  for (const drone of state.drones) {
    if (Math.hypot(drone.x - x, drone.y - y) <= radius + 40) {
      drone.revealed = true;
    }
  }
  if (Math.hypot(state.exit.x - x, state.exit.y - y) <= radius + 60) {
    state.exit.revealed = true;
  }
}

function isRevealed(x, y, radius = 0) {
  const col = clamp(Math.floor(x / CELL), 0, GRID.cols - 1);
  const row = clamp(Math.floor(y / CELL), 0, GRID.rows - 1);
  if (state.revealed.has(`${col}:${row}`)) {
    return true;
  }
  if (!radius) {
    return false;
  }
  for (let c = Math.max(0, col - 1); c <= Math.min(GRID.cols - 1, col + 1); c += 1) {
    for (let r = Math.max(0, row - 1); r <= Math.min(GRID.rows - 1, row + 1); r += 1) {
      if (state.revealed.has(`${c}:${r}`)) {
        return true;
      }
    }
  }
  return false;
}

function render() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackground();
  drawStorm();
  drawBeacons();
  drawZones();
  drawExit();
  drawFragments();
  drawDrones();
  drawRoute();
  drawScanPulses();
  drawParticles();
  drawPlayer();
  drawFog();
  drawHudMarks();
  updateUi();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  gradient.addColorStop(0, "#07100f");
  gradient.addColorStop(0.55, "#050607");
  gradient.addColorStop(1, "#0f1114");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += CELL) {
    ctx.strokeStyle = x % (CELL * 4) === 0 ? "rgba(216, 247, 95, 0.075)" : "rgba(255, 255, 255, 0.045)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(state.time + x * 0.01) * 6, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += CELL) {
    ctx.strokeStyle = y % (CELL * 3) === 0 ? "rgba(104, 244, 255, 0.075)" : "rgba(255, 255, 255, 0.04)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y + Math.cos(state.time + y * 0.01) * 5);
    ctx.stroke();
  }
}

function drawStorm() {
  const storm = getStorm();
  const alpha = state.mode === "title" ? 0.18 : 0.34;
  const grad = ctx.createLinearGradient(storm.x - storm.width, 0, storm.x + storm.width, 0);
  grad.addColorStop(0, "rgba(226, 184, 92, 0)");
  grad.addColorStop(0.5, `rgba(226, 184, 92, ${alpha})`);
  grad.addColorStop(1, "rgba(226, 184, 92, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(storm.x - storm.width * 1.9, 0, storm.width * 3.8, WORLD.height);
  ctx.strokeStyle = "rgba(226, 184, 92, 0.48)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(storm.x, 0);
  ctx.lineTo(storm.x + Math.sin(state.time) * 16, WORLD.height);
  ctx.stroke();
}

function drawZones() {
  for (const zone of state.zones) {
    if (!zone.revealed && state.mode !== "title") {
      continue;
    }
    const pulse = 1 + Math.sin(state.time * 2 + zone.phase) * 0.05;
    const r = zone.r * pulse;
    const gradient = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, r);
    gradient.addColorStop(0, "rgba(216, 116, 116, 0.28)");
    gradient.addColorStop(1, "rgba(216, 116, 116, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(216, 116, 116, 0.48)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawDrones() {
  for (const drone of state.drones) {
    if (!drone.revealed && state.mode !== "title") {
      continue;
    }
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.strokeStyle = "rgba(226, 184, 92, 0.75)";
    ctx.fillStyle = "rgba(226, 184, 92, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, drone.r + Math.sin(state.time * 5 + drone.phase) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(13, 0);
    ctx.moveTo(0, -13);
    ctx.lineTo(0, 13);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFragments() {
  for (const fragment of state.fragments) {
    if (fragment.collected || (!fragment.revealed && state.mode !== "title")) {
      continue;
    }
    const pulse = 1 + Math.sin(state.time * 4 + fragment.phase) * 0.16;
    ctx.fillStyle = "rgba(104, 244, 255, 0.9)";
    ctx.strokeStyle = "rgba(216, 247, 95, 0.86)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fragment.x, fragment.y, fragment.r * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawBeacons() {
  for (const beacon of state.beaconsDropped) {
    beacon.age += 0.016;
    ctx.strokeStyle = "rgba(216, 247, 95, 0.34)";
    ctx.fillStyle = "rgba(216, 247, 95, 0.045)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, state.beaconRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(216, 247, 95, 0.88)";
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, 7 + Math.sin(beacon.age * 4) * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit() {
  if (!state.exit.revealed && !state.exit.open && state.mode !== "title") {
    return;
  }
  ctx.save();
  ctx.translate(state.exit.x, state.exit.y);
  ctx.strokeStyle = state.exit.open ? "rgba(216, 247, 95, 0.95)" : "rgba(157, 161, 156, 0.42)";
  ctx.fillStyle = state.exit.open ? "rgba(216, 247, 95, 0.12)" : "rgba(255, 255, 255, 0.045)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, state.exit.r + Math.sin(state.time * 3) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(state.time * 0.35);
  ctx.strokeRect(-18, -18, 36, 36);
  ctx.restore();
}

function drawRoute() {
  if (!state.routeTarget || state.mode !== "running") {
    return;
  }
  ctx.strokeStyle = "rgba(104, 244, 255, 0.35)";
  ctx.setLineDash([7, 9]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y);
  ctx.lineTo(state.routeTarget.x, state.routeTarget.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(104, 244, 255, 0.8)";
  ctx.beginPath();
  ctx.arc(state.routeTarget.x, state.routeTarget.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawScanPulses() {
  for (const pulse of state.scanPulses) {
    ctx.strokeStyle = `rgba(104, 244, 255, ${pulse.life * 0.56})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, pulse.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  ctx.save();
  ctx.translate(state.player.x, state.player.y);
  const angle = state.routeTarget
    ? Math.atan2(state.routeTarget.y - state.player.y, state.routeTarget.x - state.player.x)
    : 0;
  ctx.rotate(angle);
  ctx.fillStyle = "#f4f1e8";
  ctx.strokeStyle = "#68f4ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-11, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-11, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFog() {
  if (state.mode === "title") {
    ctx.fillStyle = "rgba(2, 3, 4, 0.18)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    return;
  }
  for (let col = 0; col < GRID.cols; col += 1) {
    for (let row = 0; row < GRID.rows; row += 1) {
      if (!state.revealed.has(`${col}:${row}`)) {
        ctx.fillStyle = "rgba(1, 2, 3, 0.68)";
        ctx.fillRect(col * CELL, row * CELL, CELL + 1, CELL + 1);
      }
    }
  }
}

function drawHudMarks() {
  ctx.fillStyle = "rgba(244, 241, 232, 0.76)";
  ctx.font = "700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText(state.message, 22, WORLD.height - 22);
  ctx.fillStyle = "rgba(216, 247, 95, 0.86)";
  ctx.fillText(`SECTOR ${state.sector} / ${MAX_SECTOR}`, 22, 30);
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt * 1.8;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateScanPulses(dt) {
  for (const pulse of state.scanPulses) {
    pulse.r += (pulse.max - pulse.r) * Math.min(1, dt * 5.4);
    pulse.life -= dt * 1.15;
  }
  state.scanPulses = state.scanPulses.filter((pulse) => pulse.life > 0);
}

function addParticle(x, y, type) {
  if (state.particles.length > 120) {
    return;
  }
  const colors = {
    interference: "rgba(216, 116, 116, 0.72)",
    drone: "rgba(226, 184, 92, 0.8)",
    storm: "rgba(244, 241, 232, 0.62)",
    fragment: "rgba(104, 244, 255, 0.9)",
    beacon: "rgba(216, 247, 95, 0.9)",
    scan: "rgba(104, 244, 255, 0.78)"
  };
  state.particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 86,
    vy: (Math.random() - 0.5) * 86,
    size: 1.8 + Math.random() * 3.8,
    life: 0.34 + Math.random() * 0.32,
    color: colors[type] ?? colors.scan
  });
}

function burst(x, y, type) {
  for (let index = 0; index < 16; index += 1) {
    addParticle(x, y, type);
  }
}

function updateUi() {
  const collected = getCollectedCount();
  const total = state.fragments.length || 1;
  ui.sector.textContent = `${state.sector} / ${MAX_SECTOR}`;
  ui.integrity.textContent = `${Math.ceil(state.integrity)}%`;
  ui.fragments.textContent = `${collected} / ${state.fragments.length}`;
  ui.scan.textContent = `${Math.floor(state.scanEnergy)}%`;
  ui.beacons.textContent = String(state.beacons);
  ui.threat.textContent = state.threatLevel;
  ui.storm.textContent = state.stormLabel;
  ui.exit.textContent = state.exit.open ? "Open" : "Locked";
  ui.objective.textContent = state.objective;
  ui.message.textContent = state.message;
  ui.integrityMeter.style.width = `${clamp(state.integrity, 0, 100)}%`;
  ui.scanMeter.style.width = `${clamp(state.scanEnergy / state.maxScan * 100, 0, 100)}%`;
  ui.mappingMeter.style.width = `${clamp(collected / total * 100, 0, 100)}%`;
  ui.scanButton.disabled = state.mode !== "running" || state.scanEnergy < SCAN_COST;
  ui.beaconButton.disabled = state.mode !== "running" || state.beacons <= 0;
  ui.beaconButtonCount.textContent = state.beacons === 1 ? "1 left" : `${state.beacons} left`;
  ui.pauseButton.disabled = !["running", "paused"].includes(state.mode);
  ui.pauseButton.textContent = state.mode === "paused" ? "Continue" : "Pause";
  canvas.dataset.mode = state.mode;
  canvas.dataset.sector = String(state.sector);
  canvas.dataset.playerX = state.player.x.toFixed(1);
  canvas.dataset.playerY = state.player.y.toFixed(1);
  canvas.dataset.fragmentsCollected = String(collected);
  canvas.dataset.fragmentsTotal = String(state.fragments.length);
  canvas.dataset.exitOpen = String(state.exit.open);
}

function showOverlay({ kicker, title, copy, actionText, action }) {
  ui.overlay.classList.remove("hidden");
  ui.overlayKicker.textContent = kicker;
  ui.overlayTitle.textContent = title;
  ui.overlayCopy.textContent = copy;
  ui.upgradeList.hidden = true;
  ui.upgradeList.replaceChildren();
  const button = ui.primaryAction.cloneNode(true);
  button.textContent = actionText;
  button.addEventListener("click", action);
  ui.primaryAction.replaceWith(button);
  ui.primaryAction = button;
}

function hideOverlay() {
  ui.overlay.classList.add("hidden");
  ui.upgradeList.hidden = true;
  ui.upgradeList.replaceChildren();
}

function getCollectedCount() {
  return state.fragments.filter((fragment) => fragment.collected).length;
}

function getSnapshot() {
  return {
    mode: state.mode,
    sector: state.sector,
    integrity: Math.round(state.integrity * 10) / 10,
    fragmentsCollected: getCollectedCount(),
    fragmentsTotal: state.fragments.length,
    beacons: state.beacons,
    scanEnergy: Math.round(state.scanEnergy * 10) / 10,
    player: {
      x: Math.round(state.player.x * 10) / 10,
      y: Math.round(state.player.y * 10) / 10
    },
    exitOpen: state.exit.open,
    objective: state.objective,
    won: state.mode === "won",
    lost: state.mode === "lost"
  };
}

function setPlayerPosition(x, y) {
  state.player.x = clamp(Number(x) || 0, 24, WORLD.width - 24);
  state.player.y = clamp(Number(y) || 0, 24, WORLD.height - 24);
  revealAround(state.player.x, state.player.y, 92);
  updateUi();
}

function collectAllFragments() {
  for (const fragment of state.fragments) {
    fragment.collected = true;
    fragment.revealed = true;
  }
  state.exit.open = true;
  state.exit.revealed = true;
  revealAround(state.exit.x, state.exit.y, 120);
  state.objective = `Exit sector ${state.sector}`;
  state.message = "QA mapped every fragment. Exit is open.";
  updateUi();
}

function openExit() {
  state.exit.open = true;
  state.exit.revealed = true;
  revealAround(state.exit.x, state.exit.y, 120);
  state.objective = `Exit sector ${state.sector}`;
  state.message = "Exit gate forced open for QA.";
  updateUi();
}

function completeCurrentSector() {
  collectAllFragments();
  setPlayerPosition(state.exit.x, state.exit.y);
  completeSector();
  updateUi();
}

function autoWinIfPossible() {
  if (state.mode === "title" || state.mode === "lost") {
    startRun();
  }
  state.sector = MAX_SECTOR;
  prepareSector(MAX_SECTOR, "running", true);
  collectAllFragments();
  setPlayerPosition(state.exit.x, state.exit.y);
  completeSector();
  updateUi();
}

function forceLose() {
  state.integrity = 0;
  state.mode = "lost";
  showOverlay({
    kicker: "QA loss state",
    title: "Signal integrity collapsed",
    copy: "QA forced the loss state for smoke validation.",
    actionText: "Restart run",
    action: restart
  });
  updateUi();
}

function installQaHooks() {
  window.__signalCartographerQA = {
    start: startRun,
    pause: togglePause,
    restart,
    getSnapshot,
    setPlayerPosition,
    collectAllFragments,
    openExit,
    completeCurrentSector,
    autoWinIfPossible,
    forceLose
  };
}

function startLoop() {
  if (animationFrame) {
    return;
  }
  animationFrame = requestAnimationFrame(loop);
}

function loop(now) {
  animationFrame = 0;
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  render();
  animationFrame = requestAnimationFrame(loop);
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width * WORLD.width,
    y: (clientY - rect.top) / rect.height * WORLD.height
  };
}

function setRouteTarget(event) {
  const point = screenToWorld(event.clientX, event.clientY);
  state.routeTarget = {
    x: clamp(point.x, 24, WORLD.width - 24),
    y: clamp(point.y, 24, WORLD.height - 24)
  };
  revealAround(state.routeTarget.x, state.routeTarget.y, 46);
}

function clearInput() {
  keys.clear();
  pointer.active = false;
  pointer.id = null;
  state.routeTarget = null;
}

function releasePointer(target, pointerId) {
  try {
    target.releasePointerCapture(pointerId);
  } catch {
    // The pointer may already be released by the browser.
  }
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
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    keys.add(key);
  }
  if (key === " " && state.mode === "running") {
    deployBeacon();
  }
  if (key === "e") {
    scanField();
  }
  if (key === "p") {
    togglePause();
  }
  if (key === "r") {
    restart();
  }
  if (key === "enter" && state.mode === "title") {
    startRun();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  if (state.mode !== "running") {
    return;
  }
  event.preventDefault();
  pointer.active = true;
  pointer.id = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  setRouteTarget(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active || pointer.id !== event.pointerId || state.mode !== "running") {
    return;
  }
  event.preventDefault();
  setRouteTarget(event);
});

canvas.addEventListener("pointerup", (event) => {
  if (pointer.id === event.pointerId) {
    event.preventDefault();
    pointer.active = false;
    pointer.id = null;
  }
  releasePointer(canvas, event.pointerId);
});

canvas.addEventListener("pointercancel", (event) => {
  if (pointer.id === event.pointerId) {
    pointer.active = false;
    pointer.id = null;
  }
  releasePointer(canvas, event.pointerId);
});

canvas.addEventListener("lostpointercapture", (event) => {
  if (pointer.id === event.pointerId) {
    pointer.active = false;
    pointer.id = null;
  }
});

ui.scanButton.addEventListener("click", scanField);
ui.beaconButton.addEventListener("click", deployBeacon);
ui.pauseButton.addEventListener("click", togglePause);
ui.restartButton.addEventListener("click", restart);

window.addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInput();
  }
});
