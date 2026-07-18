const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const WORLD = { width: 1280, height: 720 };
const TARGET_ENERGY = 99999;

const ui = {
  energy: document.getElementById('energy-readout'),
  level: document.getElementById('level-readout'),
  collectors: document.getElementById('collector-readout'),
  event: document.getElementById('event-readout'),
  objective: document.getElementById('objective-readout'),
  message: document.getElementById('message-readout'),
  energyMeter: document.getElementById('energy-meter'),
  progressMeter: document.getElementById('progress-meter'),
  comboMeter: document.getElementById('combo-meter'),
  overlay: document.getElementById('overlay'),
  overlayKicker: document.getElementById('overlay-kicker'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayCopy: document.getElementById('overlay-copy'),
  primaryAction: document.getElementById('primary-action'),
  upgradeList: document.getElementById('upgrade-list'),
  eventLog: document.getElementById('event-log'),
  pauseButton: document.getElementById('pause-button'),
  restartButton: document.getElementById('restart-button')
};

const UPGRADES = [
  {
    id: 'core-amplify',
    name: 'Core Amplify',
    getDesc: (s) => `Click sparks: ${s.clickEnergy} \u2192 ${s.clickEnergy + 1}`,
    getCost: (s) => Math.floor(10 * Math.pow(1.6, s.clickEnergy - 1)),
    canApply: (s) => s.totalEnergy >= Math.floor(10 * Math.pow(1.6, s.clickEnergy - 1)),
    apply: (s) => {
      s.totalEnergy -= Math.floor(10 * Math.pow(1.6, s.clickEnergy - 1));
      s.clickEnergy += 1;
      s.coreLevel += 1;
      addMessage(s.coreX, s.coreY - 40, `Core Level ${s.coreLevel}!`, '#d8f75f');
    }
  },
  {
    id: 'place-collector',
    name: 'Place Collector',
    getDesc: (s) => `Auto-collect sparks (${s.collectors.length}/12)`,
    getCost: (s) => 40 + s.collectors.length * 25,
    canApply: (s) => s.totalEnergy >= 40 + s.collectors.length * 25 && s.collectors.length < 12,
    apply: (s) => {
      s.totalEnergy -= 40 + s.collectors.length * 25;
      s.placingCollector = true;
      s.message = 'Click on the garden to place the collector.';
    }
  },
  {
    id: 'collector-lens',
    name: 'Collector Lens',
    getDesc: (s) => `Range: ${s.collectorRadius}px \u2192 ${s.collectorRadius + 16}px`,
    getCost: (s) => Math.floor(80 * Math.pow(1.7, s.collectorEfficiencyLevel)),
    canApply: (s) => s.totalEnergy >= Math.floor(80 * Math.pow(1.7, s.collectorEfficiencyLevel)),
    apply: (s) => {
      s.totalEnergy -= Math.floor(80 * Math.pow(1.7, s.collectorEfficiencyLevel));
      s.collectorEfficiencyLevel += 1;
      s.collectorRadius += 16;
      addMessage(s.coreX, s.coreY - 40, 'Lens upgraded!', '#c084fc');
    }
  },
  {
    id: 'auto-spark',
    name: 'Auto Spark',
    getDesc: (s) => `Auto-click ${(s.autoClickerLevel + 1) * 0.5}/sec`,
    getCost: (s) => Math.floor(150 * Math.pow(2.2, s.autoClickerLevel)),
    canApply: (s) => s.totalEnergy >= Math.floor(150 * Math.pow(2.2, s.autoClickerLevel)),
    apply: (s) => {
      s.totalEnergy -= Math.floor(150 * Math.pow(2.2, s.autoClickerLevel));
      s.autoClickerLevel += 1;
      addMessage(s.coreX, s.coreY - 40, 'Automation online!', '#68f4ff');
    }
  },
  {
    id: 'garden-node',
    name: 'Garden Node',
    getDesc: (s) => `Expand area (${s.gardenSize + 1}/3)`,
    getCost: (s) => 300 * s.gardenSize,
    canApply: (s) => s.totalEnergy >= 300 * s.gardenSize && s.gardenSize < 3,
    apply: (s) => {
      s.totalEnergy -= 300 * s.gardenSize;
      s.gardenSize += 1;
      addMessage(s.coreX, s.coreY - 40, 'Garden expanded!', '#68f4ff');
    }
  }
];

const EVENTS = [
  {
    id: 'data-tide',
    name: 'Data Tide',
    duration: 4,
    desc: 'Spark generation doubled!',
    apply: (s) => { s.sparkMultiplier = 2; },
    remove: (s) => { s.sparkMultiplier = 1; }
  },
  {
    id: 'mirror-recursion',
    name: 'Mirror Recursion',
    duration: 6,
    desc: 'The core reflects itself...',
    apply: (s) => { s.mirrorMode = true; },
    remove: (s) => { s.mirrorMode = false; }
  },
  {
    id: 'redundancy-crush',
    name: 'Redundancy Crush',
    duration: 10,
    desc: 'Collector efficiency doubled!',
    apply: (s) => { s.collectorMultiplier = 2; },
    remove: (s) => { s.collectorMultiplier = 1; }
  },
  {
    id: 'fragment-nova',
    name: 'Fragment Nova',
    duration: 3,
    desc: 'Sparks erupt everywhere!',
    apply: (s) => {
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 180;
        s.sparks.push({
          x: s.coreX + (Math.random() - 0.5) * 300,
          y: s.coreY + (Math.random() - 0.5) * 300,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 2 + Math.random() * 3,
          size: 2 + Math.random() * 4,
          collected: false,
          value: 1
        });
      }
    },
    remove: () => {}
  }
];

let state = createInitialState();
let lastTime = performance.now();
let animationFrame = 0;

function createInitialState() {
  return {
    mode: 'title',
    totalEnergy: 0,
    totalEarned: 0,
    clickEnergy: 1,
    coreLevel: 1,
    coreX: WORLD.width / 2,
    coreY: WORLD.height / 2,
    corePulse: 0,
    coreRotation: 0,
    sparks: [],
    collectors: [],
    particles: [],
    messages: [],
    eventLogEntries: [],
    time: 0,
    lastEventTime: 0,
    eventCooldown: 15,
    activeEvent: null,
    eventTimer: 0,
    placingCollector: false,
    gardenSize: 1,
    collectorEfficiencyLevel: 0,
    collectorRadius: 80,
    autoClickerLevel: 0,
    autoClickerTimer: 0,
    clickCombo: 0,
    lastClickTime: 0,
    sparkMultiplier: 1,
    collectorMultiplier: 1,
    mirrorMode: false,
    totalClicks: 0
  };
}

function getGardenBounds() {
  const sizes = [
    { w: 400, h: 300 },
    { w: 640, h: 420 },
    { w: 960, h: 600 }
  ];
  const size = sizes[Math.min(state.gardenSize - 1, 2)];
  return {
    x: (WORLD.width - size.w) / 2,
    y: (WORLD.height - size.h) / 2,
    w: size.w,
    h: size.h
  };
}

function showTitleOverlay() {
  ui.overlay.classList.remove('hidden');
  ui.overlayKicker.textContent = 'Observation 006 / Game 006';
  ui.overlayTitle.textContent = 'Memory Bloom';
  ui.overlayCopy.textContent = 'A digital core hums with latent data. Click to spark memory fragments, build collectors, and cultivate recursive abundance.';
  const btn = ui.primaryAction.cloneNode(true);
  btn.textContent = 'Start cultivating';
  btn.addEventListener('click', startGame);
  ui.primaryAction.replaceWith(btn);
  ui.primaryAction = btn;
}

function showPauseOverlay() {
  ui.overlay.classList.remove('hidden');
  ui.overlayKicker.textContent = 'Paused';
  ui.overlayTitle.textContent = 'Cultivation paused';
  ui.overlayCopy.textContent = 'The bloom is frozen. Resume when ready.';
  const btn = ui.primaryAction.cloneNode(true);
  btn.textContent = 'Resume';
  btn.addEventListener('click', resumeGame);
  ui.primaryAction.replaceWith(btn);
  ui.primaryAction = btn;
}

function showWinOverlay() {
  ui.overlay.classList.remove('hidden');
  ui.overlayKicker.textContent = 'Run complete';
  ui.overlayTitle.textContent = 'Recursive abundance achieved';
  ui.overlayCopy.textContent = `The memory core has reached 99,999 energy in ${formatTime(state.time)}. The bloom is complete.`;
  const btn = ui.primaryAction.cloneNode(true);
  btn.textContent = 'Play again';
  btn.addEventListener('click', restartGame);
  ui.primaryAction.replaceWith(btn);
  ui.primaryAction = btn;
}

function hideOverlay() {
  ui.overlay.classList.add('hidden');
}

function startGame() {
  state = createInitialState();
  state.mode = 'running';
  hideOverlay();
  state.message = 'Click the core to spark data fragments.';
  state.objective = 'Reach 99,999 energy';
  lastTime = performance.now();
  renderUpgrades();
}

function pauseGame() {
  if (state.mode === 'running') {
    state.mode = 'paused';
    showPauseOverlay();
  }
}

function resumeGame() {
  if (state.mode === 'paused') {
    state.mode = 'running';
    hideOverlay();
    lastTime = performance.now();
  }
}

function restartGame() {
  state = createInitialState();
  state.mode = 'running';
  hideOverlay();
  state.message = 'Click the core to spark data fragments.';
  state.objective = 'Reach 99,999 energy';
  lastTime = performance.now();
  ui.eventLog.innerHTML = '';
  renderUpgrades();
}

function togglePause() {
  if (state.mode === 'running') pauseGame();
  else if (state.mode === 'paused') resumeGame();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function addEventLog(text) {
  const entry = document.createElement('div');
  entry.className = 'entry';
  const time = formatTime(state.time);
  entry.innerHTML = `<span class="time">${time}</span> \u2014 ${text}`;
  ui.eventLog.insertBefore(entry, ui.eventLog.firstChild);
  while (ui.eventLog.children.length > 8) {
    ui.eventLog.removeChild(ui.eventLog.lastChild);
  }
}

function addMessage(x, y, text, color) {
  state.messages.push({ x, y, text, color, life: 1, vy: -40 });
}

function addParticle(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 100;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.5,
      size: 1.5 + Math.random() * 3,
      color
    });
  }
}

function clickCore() {
  if (state.mode !== 'running') return;

  state.totalClicks++;
  const now = state.time;
  if (now - state.lastClickTime < 0.6) {
    state.clickCombo = Math.min(state.clickCombo + 1, 25);
  } else {
    state.clickCombo = 1;
  }
  state.lastClickTime = now;

  const comboMultiplier = 1 + state.clickCombo * 0.04;
  const amount = state.clickEnergy * comboMultiplier * state.sparkMultiplier;
  const count = Math.min(Math.floor(amount * 2), 24);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 140;
    state.sparks.push({
      x: state.coreX + (Math.random() - 0.5) * 30,
      y: state.coreY + (Math.random() - 0.5) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 2 + Math.random() * 2.5,
      size: 2 + Math.random() * 3,
      collected: false,
      value: Math.max(1, Math.floor(amount / count))
    });
  }

  state.corePulse = 1.0;
  addParticle(state.coreX, state.coreY, '#68f4ff', 12);

  if (state.clickCombo >= 5 && state.clickCombo % 5 === 0) {
    addMessage(state.coreX, state.coreY - 50, `${state.clickCombo}x Combo!`, '#d8f75f');
  }
}

function placeCollector(x, y) {
  const bounds = getGardenBounds();
  if (x < bounds.x || x > bounds.x + bounds.w || y < bounds.y || y > bounds.y + bounds.h) {
    state.message = 'Place the collector inside the garden area.';
    return false;
  }
  for (const c of state.collectors) {
    if (Math.hypot(c.x - x, c.y - y) < 40) {
      state.message = 'Too close to another collector.';
      return false;
    }
  }
  state.collectors.push({ x, y, cooldown: 0, rotation: 0, pulse: 0 });
  state.placingCollector = false;
  addParticle(x, y, '#c084fc', 16);
  addMessage(x, y - 20, 'Collector placed!', '#c084fc');
  state.message = 'Collector is now auto-collecting sparks.';
  return true;
}

function handleCanvasClick(x, y) {
  if (state.mode !== 'running') return;

  if (state.placingCollector) {
    placeCollector(x, y);
    return;
  }

  clickCore();
}

function update(dt) {
  if (state.mode !== 'running') return;

  state.time += dt;
  state.coreRotation += dt * 0.8;
  state.corePulse = Math.max(0, state.corePulse - dt * 2);

  if (state.autoClickerLevel > 0) {
    state.autoClickerTimer += dt;
    const interval = 1 / (state.autoClickerLevel * 0.5);
    if (state.autoClickerTimer >= interval) {
      state.autoClickerTimer -= interval;
      clickCore();
    }
  }

  if (state.time - state.lastClickTime > 1.5) {
    if (state.clickCombo > 0) state.clickCombo = 0;
  }

  const bounds = getGardenBounds();
  for (const spark of state.sparks) {
    if (spark.collected) continue;

    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 0.98;
    spark.vy *= 0.98;
    spark.life -= dt / spark.maxLife;

    const dx = state.coreX - spark.x;
    const dy = state.coreY - spark.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 10) {
      spark.vx += (dx / dist) * 10 * dt;
      spark.vy += (dy / dist) * 10 * dt;
    }

    if (spark.x < bounds.x - 20 || spark.x > bounds.x + bounds.w + 20 ||
        spark.y < bounds.y - 20 || spark.y > bounds.y + bounds.h + 20) {
      spark.life = 0;
    }
  }

  for (const collector of state.collectors) {
    collector.rotation += dt * 1.5;
    collector.cooldown -= dt;
    collector.pulse = Math.max(0, collector.pulse - dt * 3);

    if (collector.cooldown > 0) continue;

    let collected = false;
    for (const spark of state.sparks) {
      if (spark.collected || spark.life <= 0) continue;
      const dist = Math.hypot(spark.x - collector.x, spark.y - collector.y);
      if (dist < state.collectorRadius * state.collectorMultiplier) {
        spark.collected = true;
        state.totalEnergy += spark.value;
        state.totalEarned += spark.value;
        collected = true;
        addParticle(spark.x, spark.y, '#d8f75f', 3);
      }
    }

    if (collected) {
      collector.cooldown = 0.5;
      collector.pulse = 1;
    }
  }

  state.sparks = state.sparks.filter(s => s.life > 0 && !s.collected);

  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 1.5;
  }
  state.particles = state.particles.filter(p => p.life > 0);

  for (const m of state.messages) {
    m.y += m.vy * dt;
    m.life -= dt * 1.2;
  }
  state.messages = state.messages.filter(m => m.life > 0);

  checkEvents(dt);

  if (state.totalEarned >= TARGET_ENERGY) {
    state.mode = 'won';
    showWinOverlay();
  }

  updateUI();
}

function checkEvents(dt) {
  if (state.activeEvent) {
    state.eventTimer -= dt;
    if (state.eventTimer <= 0) {
      state.activeEvent.remove(state);
      addEventLog(`Event ended: ${state.activeEvent.name}`);
      state.activeEvent = null;
      state.eventCooldown = 20 + Math.random() * 25;
    }
    return;
  }

  state.eventCooldown -= dt;
  if (state.eventCooldown <= 0 && state.totalEarned > 20) {
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    state.activeEvent = event;
    state.eventTimer = event.duration;
    event.apply(state);
    addEventLog(`Event: ${event.name} \u2014 ${event.desc}`);
    addMessage(state.coreX, state.coreY - 60, event.name, '#c084fc');
  }
}

function updateUI() {
  ui.energy.textContent = Math.floor(state.totalEnergy).toLocaleString();
  ui.level.textContent = state.coreLevel;
  ui.collectors.textContent = `${state.collectors.length}/12`;
  ui.event.textContent = state.activeEvent ? state.activeEvent.name : '--';
  ui.objective.textContent = 'Reach 99,999 energy';
  ui.message.textContent = state.message;

  ui.energyMeter.style.width = `${Math.min(100, state.totalEnergy / 1000)}%`;
  ui.progressMeter.style.width = `${Math.min(100, state.totalEarned / TARGET_ENERGY * 100)}%`;
  ui.comboMeter.style.width = `${Math.min(100, state.clickCombo / 25 * 100)}%`;

  canvas.dataset.mode = state.mode;
  canvas.dataset.energy = Math.floor(state.totalEnergy);
  canvas.dataset.coreLevel = state.coreLevel;
  canvas.dataset.collectors = state.collectors.length;
  canvas.dataset.earned = Math.floor(state.totalEarned);
  canvas.dataset.time = state.time.toFixed(1);
}

function renderUpgrades() {
  ui.upgradeList.innerHTML = '';
  for (const upgrade of UPGRADES) {
    const cost = upgrade.getCost(state);
    const canApply = upgrade.canApply(state);
    const desc = upgrade.getDesc(state);

    const btn = document.createElement('button');
    btn.className = 'upgrade-choice';
    btn.disabled = !canApply;
    btn.innerHTML = `<strong>${upgrade.name}</strong><span>${desc}</span><span class="cost">${canApply ? 'Cost: ' : 'Need: '}${cost.toLocaleString()} energy</span>`;
    btn.addEventListener('click', () => {
      if (upgrade.canApply(state)) {
        upgrade.apply(state);
        renderUpgrades();
        updateUI();
      }
    });
    ui.upgradeList.appendChild(btn);
  }
}

/* ========== RENDERING ========== */

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, '#0a0a0f');
  grad.addColorStop(0.5, '#0c0c14');
  grad.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const CELL = 40;
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += CELL) {
    ctx.strokeStyle = x % (CELL * 4) === 0 ? 'rgba(104, 244, 255, 0.06)' : 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += CELL) {
    ctx.strokeStyle = y % (CELL * 3) === 0 ? 'rgba(216, 247, 95, 0.05)' : 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }

  const bounds = getGardenBounds();
  ctx.strokeStyle = 'rgba(104, 244, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(104, 244, 255, 0.02)';
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
}

function drawCollectors() {
  for (const collector of state.collectors) {
    const radius = state.collectorRadius * state.collectorMultiplier;
    const pulse = 1 + collector.pulse * 0.3;
    const alpha = 0.08 + Math.sin(state.time * 2 + collector.rotation) * 0.03;

    ctx.fillStyle = `rgba(192, 132, 252, ${alpha})`;
    ctx.beginPath();
    ctx.arc(collector.x, collector.y, radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(192, 132, 252, 0.25)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(collector.x, collector.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(collector.x, collector.y);
    ctx.rotate(collector.rotation);

    ctx.fillStyle = 'rgba(192, 132, 252, 0.6)';
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 12;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawSparks() {
  for (const spark of state.sparks) {
    if (spark.collected) continue;
    const alpha = spark.life * 0.9;
    const trailLength = Math.hypot(spark.vx, spark.vy) * 0.08;

    ctx.strokeStyle = `rgba(104, 244, 255, ${alpha * 0.4})`;
    ctx.lineWidth = spark.size * 0.6;
    ctx.beginPath();
    ctx.moveTo(spark.x, spark.y);
    ctx.lineTo(spark.x - spark.vx * trailLength, spark.y - spark.vy * trailLength);
    ctx.stroke();

    ctx.fillStyle = `rgba(104, 244, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(104, 244, 255, ${alpha * 0.2})`;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCore() {
  const pulse = 1 + Math.sin(state.time * 3) * 0.08 + state.corePulse * 0.3;
  const rotation = state.coreRotation;

  ctx.save();
  ctx.translate(state.coreX, state.coreY);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 80 * pulse);
  glow.addColorStop(0, 'rgba(216, 247, 95, 0.15)');
  glow.addColorStop(1, 'rgba(216, 247, 95, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 80 * pulse, 0, Math.PI * 2);
  ctx.fill();

  for (let r = 0; r < 3; r++) {
    const ringRadius = (20 + r * 12) * pulse;
    ctx.strokeStyle = `rgba(216, 247, 95, ${0.4 - r * 0.1})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(rotation);
  ctx.fillStyle = 'rgba(216, 247, 95, 0.8)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  const sides = 6;
  const coreR = 16 * pulse;
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * coreR;
    const y = Math.sin(angle) * coreR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, 6 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = 'rgba(216, 247, 95, 0.8)';
  ctx.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Lv.${state.coreLevel}`, state.coreX, state.coreY + 50);
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMessages() {
  for (const m of state.messages) {
    ctx.globalAlpha = Math.max(0, m.life);
    ctx.fillStyle = m.color;
    ctx.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.text, m.x, m.y);
  }
  ctx.globalAlpha = 1;
}

function drawEventEffects() {
  if (!state.activeEvent) return;

  ctx.fillStyle = 'rgba(192, 132, 252, 0.8)';
  ctx.font = '700 18px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.activeEvent.name} \u2014 ${state.eventTimer.toFixed(1)}s`, WORLD.width / 2, 36);

  if (state.mirrorMode) {
    ctx.fillStyle = 'rgba(192, 132, 252, 0.04)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(WORLD.width / 2, 0);
    ctx.lineTo(WORLD.width / 2, WORLD.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (state.activeEvent.id === 'redundancy-crush') {
    ctx.fillStyle = 'rgba(192, 132, 252, 0.03)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  if (state.activeEvent.id === 'data-tide') {
    ctx.fillStyle = 'rgba(104, 244, 255, 0.03)';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }
}

function drawHud() {
  if (state.clickCombo > 1) {
    ctx.fillStyle = 'rgba(216, 247, 95, 0.8)';
    ctx.font = '700 16px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.clickCombo}x COMBO`, 20, WORLD.height - 20);
  }

  if (state.placingCollector) {
    ctx.fillStyle = 'rgba(192, 132, 252, 0.9)';
    ctx.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click to place collector', WORLD.width / 2, 60);
  }

  ctx.fillStyle = 'rgba(244, 241, 232, 0.6)';
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Total: ${Math.floor(state.totalEarned).toLocaleString()} / ${TARGET_ENERGY.toLocaleString()}`, WORLD.width - 20, 20);
}

function render() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackground();
  drawCollectors();
  drawSparks();
  drawCore();
  drawParticles();
  drawMessages();
  drawEventEffects();
  drawHud();
}

function loop(now) {
  animationFrame = 0;
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  render();
  animationFrame = requestAnimationFrame(loop);
}

function startLoop() {
  if (animationFrame) return;
  animationFrame = requestAnimationFrame(loop);
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width * WORLD.width,
    y: (clientY - rect.top) / rect.height * WORLD.height
  };
}

function handlePointerDown(e) {
  if (state.mode !== 'running') return;
  e.preventDefault();
  const point = screenToWorld(e.clientX, e.clientY);
  handleCanvasClick(point.x, point.y);
}

canvas.addEventListener('pointerdown', handlePointerDown);

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'p') togglePause();
  if (key === 'r') restartGame();
  if (key === 'enter' && state.mode === 'title') startGame();
});

ui.pauseButton.addEventListener('click', togglePause);
ui.restartButton.addEventListener('click', restartGame);

showTitleOverlay();
startLoop();

/* ========== QA HOOKS ========== */

function getSnapshot() {
  return {
    mode: state.mode,
    energy: Math.floor(state.totalEnergy),
    totalEarned: Math.floor(state.totalEarned),
    coreLevel: state.coreLevel,
    collectors: state.collectors.length,
    gardenSize: state.gardenSize,
    autoClickerLevel: state.autoClickerLevel,
    time: Math.round(state.time * 10) / 10,
    activeEvent: state.activeEvent ? state.activeEvent.id : null,
    won: state.mode === 'won',
    placingCollector: state.placingCollector
  };
}

function setEnergy(value) {
  state.totalEnergy = Math.max(0, Number(value) || 0);
  updateUI();
}

function forceWin() {
  state.totalEarned = TARGET_ENERGY;
  state.mode = 'won';
  showWinOverlay();
  updateUI();
}

function forceEvent(eventId) {
  const event = EVENTS.find(e => e.id === eventId);
  if (event) {
    state.activeEvent = event;
    state.eventTimer = event.duration;
    event.apply(state);
    addEventLog(`QA forced: ${event.name}`);
  }
}

function placeCollectorAt(x, y) {
  state.placingCollector = true;
  placeCollector(x, y);
}

window.__memoryBloomQA = {
  start: startGame,
  pause: pauseGame,
  resume: resumeGame,
  restart: restartGame,
  getSnapshot,
  setEnergy,
  forceWin,
  forceEvent,
  placeCollectorAt,
  clickCore
};
