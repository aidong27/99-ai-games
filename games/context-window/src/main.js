/*
 * Context Window — browser shell: rendering, input, audio, HUD.
 * Observation 011 / Game 011, AI Meme Hall, 99 AI Games.
 * All simulation logic lives in ./engine.js (shared with the Node
 * completability proof). This file only draws it and listens to it.
 */
import {
  createGame,
  step,
  isWall,
  sectorIdAt,
  sectorCoords,
  sectorSummaryList,
  coreCenter,
  TILE,
  SECTOR_COLS,
  SECTOR_ROWS,
  GRID,
  WORLD_W,
  WORLD_H,
  WIN_DEPOSITS,
  CARRY_LIMIT,
  MAX_INTEGRITY,
  CORE_SECTOR,
  DEFAULT_SEED
} from "./engine.js";

const VIEW_W = 960;
const VIEW_H = 600;

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap-canvas");
const mini = minimap.getContext("2d");

const ui = {
  overlay: document.getElementById("overlay"),
  overlayKicker: document.getElementById("overlay-kicker"),
  overlayTitle: document.getElementById("overlay-title"),
  overlayCopy: document.getElementById("overlay-copy"),
  overlayStats: document.getElementById("overlay-stats"),
  primaryAction: document.getElementById("primary-action"),
  pauseButton: document.getElementById("pause-button"),
  restartButton: document.getElementById("restart-button"),
  muteButton: document.getElementById("mute-button"),
  objective: document.getElementById("objective-readout"),
  message: document.getElementById("message-readout"),
  integrityReadout: document.getElementById("integrity-readout"),
  shardReadout: document.getElementById("shard-readout"),
  tokenReadout: document.getElementById("token-readout"),
  sectorReadout: document.getElementById("sector-readout"),
  integrityMeter: document.getElementById("integrity-meter"),
  progressMeter: document.getElementById("progress-meter"),
  capacityMeter: document.getElementById("capacity-meter"),
  contextChips: document.getElementById("context-chips"),
  logList: document.getElementById("log-list")
};

const seedParam = new URLSearchParams(window.location.search).get("seed");
const seed = seedParam ? Number(seedParam) >>> 0 : DEFAULT_SEED;

let state = createGame(seed);
let mode = "title"; // title | playing | paused | won | lost
let lastTime = 0;
let camera = { x: 0, y: 0 };
let damageFlash = 0;
let glitchTimer = 0;
let evictBanner = null;
let particles = [];
let logCursor = 0;

/* ---------------- audio ---------------- */

const audio = {
  ctx: null,
  muted: false,
  ensure() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx?.state === "suspended") {
      this.ctx.resume();
    }
  },
  tone(frequency, duration = 0.12, type = "square", gain = 0.05, slide = 0) {
    if (!this.ctx || this.muted) {
      return;
    }
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    }
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  },
  noise(duration = 0.3, gain = 0.06, cutoff = 900) {
    if (!this.ctx || this.muted) {
      return;
    }
    const now = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(amp).connect(this.ctx.destination);
    source.start(now);
  },
  play(name) {
    if (!this.ctx || this.muted) {
      return;
    }
    if (name === "shard") {
      this.tone(880, 0.09, "square", 0.045);
      this.tone(1318, 0.14, "square", 0.04);
    } else if (name === "deposit") {
      this.tone(523, 0.12, "triangle", 0.06);
      this.tone(659, 0.12, "triangle", 0.055);
      this.tone(784, 0.2, "triangle", 0.055);
    } else if (name === "damage") {
      this.tone(160, 0.2, "sawtooth", 0.07, -90);
      this.noise(0.16, 0.05, 500);
    } else if (name === "evict") {
      this.noise(0.4, 0.05, 700);
      this.tone(320, 0.35, "sine", 0.04, -180);
    } else if (name === "decoy") {
      this.tone(1200, 0.1, "sawtooth", 0.05, -700);
    } else if (name === "patch") {
      this.tone(660, 0.1, "sine", 0.05);
      this.tone(990, 0.16, "sine", 0.05);
    } else if (name === "pin" || name === "compress") {
      this.tone(440, 0.1, "square", 0.05);
      this.tone(587, 0.1, "square", 0.05);
      this.tone(880, 0.18, "square", 0.05);
    } else if (name === "win") {
      [523, 659, 784, 1046, 784, 1046].forEach((f, i) => {
        setTimeout(() => this.tone(f, 0.22, "triangle", 0.06), i * 130);
      });
    } else if (name === "lose") {
      [440, 349, 261, 196].forEach((f, i) => {
        setTimeout(() => this.tone(f, 0.3, "sawtooth", 0.05), i * 170);
      });
    } else if (name === "start") {
      this.tone(392, 0.1, "square", 0.05);
      this.tone(523, 0.14, "square", 0.05);
    }
  }
};

/* ---------------- input ---------------- */

const keys = new Set();
const dpad = { up: false, down: false, left: false, right: false };

const KEYMAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right"
};

window.addEventListener("keydown", (event) => {
  if (KEYMAP[event.code]) {
    keys.add(KEYMAP[event.code]);
    event.preventDefault();
  } else if (event.code === "KeyP" || event.code === "Escape") {
    togglePause();
  } else if (event.code === "KeyR") {
    restart();
  } else if (event.code === "KeyM") {
    toggleMute();
  } else if (event.code === "Enter" || event.code === "Space") {
    if (mode !== "playing") {
      primaryAction();
    }
  }
});
window.addEventListener("keyup", (event) => {
  if (KEYMAP[event.code]) {
    keys.delete(KEYMAP[event.code]);
  }
});

for (const button of document.querySelectorAll("[data-dir]")) {
  const dir = button.dataset.dir;
  const press = (event) => {
    event.preventDefault();
    dpad[dir] = true;
    button.classList.add("active");
  };
  const release = () => {
    dpad[dir] = false;
    button.classList.remove("active");
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

function readInput() {
  const up = keys.has("up") || dpad.up;
  const down = keys.has("down") || dpad.down;
  const left = keys.has("left") || dpad.left;
  const right = keys.has("right") || dpad.right;
  return {
    moveX: (right ? 1 : 0) - (left ? 1 : 0),
    moveY: (down ? 1 : 0) - (up ? 1 : 0)
  };
}

/* ---------------- effects ---------------- */

function spawnParticles(x, y, color, count = 10, speed = 120) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.4 + Math.random() * 0.8);
    particles.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === "shard") {
      spawnParticles(state.player.x, state.player.y, "#22d3ee", 12);
      audio.play("shard");
    } else if (event.type === "deposit") {
      const core = coreCenter();
      spawnParticles(core.x, core.y, "#fbbf24", 26, 180);
      audio.play("deposit");
    } else if (event.type === "damage") {
      damageFlash = 0.45;
      spawnParticles(state.player.x, state.player.y, "#fb7185", 16, 200);
      audio.play("damage");
    } else if (event.type === "destabilize") {
      glitchTimer = Math.max(glitchTimer, 0.18);
    } else if (event.type === "decoy") {
      spawnParticles(state.player.x, state.player.y, "#f472b6", 14);
      audio.play("decoy");
    } else if (event.type === "evict") {
      evictBanner = { sector: event.sector, life: 2.4 };
      audio.play("evict");
    } else if (event.type === "resummon") {
      glitchTimer = Math.max(glitchTimer, 0.5);
      audio.play("evict");
    } else if (event.type === "patch") {
      spawnParticles(state.player.x, state.player.y, "#4ade80", 12);
      audio.play("patch");
    } else if (event.type === "pin" || event.type === "compress") {
      spawnParticles(state.player.x, state.player.y, "#a78bfa", 14);
      audio.play(event.type);
    } else if (event.type === "win") {
      mode = "won";
      showOverlay("won");
      audio.play("win");
    } else if (event.type === "lose") {
      mode = "lost";
      showOverlay("lost");
      audio.play("lose");
    }
  }
}

/* ---------------- rendering ---------------- */

const noiseTile = document.createElement("canvas");
noiseTile.width = 128;
noiseTile.height = 128;
{
  const nctx = noiseTile.getContext("2d");
  const image = nctx.createImageData(128, 128);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.random() * 255;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 26;
  }
  nctx.putImageData(image, 0, 0);
}

function worldToScreen(x, y) {
  return { x: x - camera.x, y: y - camera.y };
}

function draw() {
  ctx.fillStyle = "#070b12";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const summaries = sectorSummaryList(state);
  const sectorMap = new Map(summaries.map((entry) => [entry.id, entry]));

  /* Floor grid, drawn per sector so evicted sectors get static. */
  for (let sy = 0; sy < GRID; sy += 1) {
    for (let sx = 0; sx < GRID; sx += 1) {
      const id = `${"ABC"[sx]}${sy + 1}`;
      const info = sectorMap.get(id);
      const ox = sx * SECTOR_COLS * TILE - camera.x;
      const oy = sy * SECTOR_ROWS * TILE - camera.y;
      ctx.fillStyle = info.resident ? "#0c1320" : "#080d16";
      ctx.fillRect(ox, oy, SECTOR_COLS * TILE, SECTOR_ROWS * TILE);
      if (!info.resident) {
        const offset = (performance.now() / 24) % 128;
        for (let px = ox - offset; px < ox + SECTOR_COLS * TILE; px += 128) {
          for (let py = oy; py < oy + SECTOR_ROWS * TILE; py += 128) {
            ctx.drawImage(noiseTile, px, py - (offset % 64));
          }
        }
        ctx.fillStyle = "rgba(4, 8, 14, 0.55)";
        ctx.fillRect(ox, oy, SECTOR_COLS * TILE, SECTOR_ROWS * TILE);
        ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
        ctx.font = "600 15px ui-monospace, monospace";
        ctx.textAlign = "center";
        const label = info.summaries > 0 ? `SUMMARY x${info.summaries}` : "NOT LOADED";
        ctx.fillText(label, ox + SECTOR_COLS * TILE / 2, oy + SECTOR_ROWS * TILE / 2 - 8);
        ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillText(`${info.shardsRemaining} shard(s) on record`, ox + SECTOR_COLS * TILE / 2, oy + SECTOR_ROWS * TILE / 2 + 14);
      }
      /* Sector border. */
      ctx.strokeStyle = info.isCurrent ? "rgba(34, 211, 238, 0.5)" : "rgba(45, 74, 106, 0.55)";
      ctx.lineWidth = info.isCurrent ? 2 : 1;
      ctx.strokeRect(ox + 0.5, oy + 0.5, SECTOR_COLS * TILE - 1, SECTOR_ROWS * TILE - 1);
      ctx.fillStyle = info.isCurrent ? "rgba(34, 211, 238, 0.75)" : "rgba(100, 116, 139, 0.55)";
      ctx.font = "700 13px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${id}${info.pinned && !info.isCore ? " [PIN]" : ""}`, ox + 8, oy + 18);
    }
  }

  /* Floor tile grid lines inside the current sector only (crisp memory). */
  ctx.strokeStyle = "rgba(56, 90, 128, 0.16)";
  ctx.lineWidth = 1;
  const tileStartX = Math.max(0, Math.floor(camera.x / TILE));
  const tileEndX = Math.min(Math.ceil((camera.x + VIEW_W) / TILE), WORLD_W / TILE);
  const tileStartY = Math.max(0, Math.floor(camera.y / TILE));
  const tileEndY = Math.min(Math.ceil((camera.y + VIEW_H) / TILE), WORLD_H / TILE);
  for (let ty = tileStartY; ty <= tileEndY; ty += 1) {
    for (let tx = tileStartX; tx <= tileEndX; tx += 1) {
      if (!isWall(state, tx, ty)) {
        ctx.strokeRect(tx * TILE - camera.x + 0.5, ty * TILE - camera.y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  /* Walls. */
  for (let ty = tileStartY; ty < tileEndY; ty += 1) {
    for (let tx = tileStartX; tx < tileEndX; tx += 1) {
      if (isWall(state, tx, ty)) {
        const x = tx * TILE - camera.x;
        const y = ty * TILE - camera.y;
        ctx.fillStyle = "#16233a";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#1f3252";
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = "rgba(34, 211, 238, 0.08)";
        ctx.fillRect(x + 2, y + 2, TILE - 4, 4);
      }
    }
  }

  /* System Core zone. */
  const core = coreCenter();
  const coreScreen = worldToScreen(core.x, core.y);
  const pulse = 0.5 + Math.sin(performance.now() / 400) * 0.5;
  const coreGradient = ctx.createRadialGradient(coreScreen.x, coreScreen.y, 8, coreScreen.x, coreScreen.y, 90 + pulse * 20);
  coreGradient.addColorStop(0, "rgba(251, 191, 36, 0.5)");
  coreGradient.addColorStop(1, "rgba(251, 191, 36, 0)");
  ctx.fillStyle = coreGradient;
  ctx.fillRect(coreScreen.x - 130, coreScreen.y - 130, 260, 260);
  ctx.save();
  ctx.translate(coreScreen.x, coreScreen.y);
  ctx.rotate(performance.now() / 2400);
  ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(-26, -26, 52, 52);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-26, -26, 52, 52);
  ctx.restore();
  ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
  ctx.font = "700 11px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("SYSTEM CORE", coreScreen.x, coreScreen.y + 56);

  /* Entities in resident sectors. */
  const time = performance.now();
  for (const info of summaries) {
    if (!info.resident) {
      continue;
    }
    const sector = state.sectors[info.id];

    for (const shard of sector.shards) {
      const p = worldToScreen(shard.x, shard.y);
      const bob = Math.sin(time / 300 + shard.x) * 3;
      const glow = ctx.createRadialGradient(p.x, p.y + bob, 2, p.x, p.y + bob, 22);
      glow.addColorStop(0, "rgba(34, 211, 238, 0.55)");
      glow.addColorStop(1, "rgba(34, 211, 238, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 22, p.y + bob - 22, 44, 44);
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.rotate(time / 900);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = "#a5f3fc";
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }

    for (const decoy of sector.decoys) {
      const p = worldToScreen(decoy.x, decoy.y);
      const flicker = Math.sin(time / 90 + decoy.y) > -0.2 ? 1 : 0.25;
      ctx.save();
      ctx.globalAlpha = flicker;
      ctx.translate(p.x + (Math.random() - 0.5) * 2, p.y);
      ctx.rotate(time / 700);
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = "#fbcfe8";
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }

    for (const item of sector.pickups) {
      const p = worldToScreen(item.x, item.y);
      const bob = Math.sin(time / 350 + item.y) * 3;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      if (item.kind === "patch") {
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(-4, -11, 8, 22);
        ctx.fillRect(-11, -4, 22, 8);
      } else if (item.kind === "compress") {
        ctx.fillStyle = "#a78bfa";
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(0, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-4, 10);
        ctx.lineTo(6, 0);
        ctx.lineTo(-4, -10);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, -10);
        ctx.lineTo(12, 0);
        ctx.lineTo(2, 10);
        ctx.lineTo(8, 10);
        ctx.lineTo(18, 0);
        ctx.lineTo(8, -10);
        ctx.closePath();
        ctx.fill();
      } else if (item.kind === "pin") {
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(0, -4, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-2, 0, 4, 13);
        ctx.fillStyle = "#070b12";
        ctx.beginPath();
        ctx.arc(0, -4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const enemy of sector.enemies) {
      const p = worldToScreen(enemy.x, enemy.y);
      const jitterX = (Math.random() - 0.5) * 3;
      const jitterY = (Math.random() - 0.5) * 3;
      ctx.save();
      ctx.translate(p.x + jitterX, p.y + jitterY);
      ctx.fillStyle = "rgba(251, 113, 133, 0.16)";
      ctx.fillRect(-16, -16, 32, 32);
      ctx.fillStyle = "#fb7185";
      for (let i = 0; i < 9; i += 1) {
        const nx = Math.floor(Math.random() * 3) * 8 - 8;
        const ny = Math.floor(Math.random() * 3) * 8 - 8;
        ctx.globalAlpha = 0.55 + Math.random() * 0.45;
        ctx.fillRect(nx, ny, 8, 8);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fecdd3";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
    }
  }

  /* Player. */
  const pp = worldToScreen(state.player.x, state.player.y);
  const invulnerable = state.player.invulnerable > 0;
  ctx.save();
  ctx.translate(pp.x, pp.y);
  if (invulnerable && Math.floor(time / 90) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }
  const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
  aura.addColorStop(0, "rgba(74, 222, 128, 0.35)");
  aura.addColorStop(1, "rgba(74, 222, 128, 0)");
  ctx.fillStyle = aura;
  ctx.fillRect(-30, -30, 60, 60);
  ctx.fillStyle = "#12324a";
  ctx.beginPath();
  ctx.roundRect(-13, -13, 26, 26, 6);
  ctx.fill();
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 2;
  ctx.stroke();
  const look = readInput();
  const eyeX = Math.max(-4, Math.min(4, look.moveX * 4));
  const eyeY = Math.max(-4, Math.min(4, look.moveY * 4));
  ctx.fillStyle = "#4ade80";
  ctx.beginPath();
  ctx.arc(eyeX, eyeY - 2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#052e16";
  ctx.beginPath();
  ctx.arc(eyeX, eyeY - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(74, 222, 128, 0.8)";
  ctx.font = "700 8px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("K-3", 0, 10);
  ctx.restore();

  /* Carried shards orbit. */
  state.player.carried.forEach((_, index) => {
    const angle = time / 500 + (index * Math.PI * 2) / Math.max(1, state.player.carried.length);
    const ox = pp.x + Math.cos(angle) * 24;
    const oy = pp.y + Math.sin(angle) * 24;
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(ox - 3, oy - 3, 6, 6);
  });

  /* Particles. */
  for (const particle of particles) {
    const p = worldToScreen(particle.x, particle.y);
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(p.x - particle.size / 2, p.y - particle.size / 2, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;

  /* Damage vignette. */
  if (damageFlash > 0) {
    ctx.fillStyle = `rgba(251, 113, 133, ${damageFlash * 0.35})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /* Glitch slices after re-summarization. */
  if (glitchTimer > 0) {
    for (let i = 0; i < 8; i += 1) {
      const y = Math.random() * VIEW_H;
      const h = 4 + Math.random() * 14;
      const shift = (Math.random() - 0.5) * 30;
      const image = ctx.getImageData(0, y, VIEW_W, h);
      ctx.putImageData(image, shift, y);
    }
    ctx.fillStyle = "rgba(34, 211, 238, 0.05)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /* Eviction banner. */
  if (evictBanner) {
    const alpha = Math.min(1, evictBanner.life / 0.6);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(7, 11, 18, 0.85)";
    ctx.fillRect(VIEW_W / 2 - 240, 24, 480, 44);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
    ctx.strokeRect(VIEW_W / 2 - 240.5, 24.5, 480, 44);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "700 14px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`SECTOR ${evictBanner.sector} EVICTED FROM CONTEXT`, VIEW_W / 2, 51);
    ctx.restore();
  }

  drawMinimap(summaries);
}

function drawMinimap(summaries) {
  const w = minimap.width;
  const h = minimap.height;
  mini.fillStyle = "#0a101c";
  mini.fillRect(0, 0, w, h);
  const cell = Math.min(w, h) / 3;
  for (const info of summaries) {
    const { sx, sy } = sectorCoords(info.id);
    const x = sx * cell;
    const y = sy * cell;
    mini.fillStyle = info.resident ? "rgba(34, 211, 238, 0.28)" : "rgba(30, 41, 59, 0.6)";
    mini.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    if (info.isCurrent) {
      mini.strokeStyle = "#4ade80";
      mini.lineWidth = 2;
      mini.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
    } else if (info.pinned) {
      mini.strokeStyle = "#fbbf24";
      mini.lineWidth = 2;
      mini.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
    }
    mini.fillStyle = info.resident ? "#a5f3fc" : "#475569";
    mini.font = `700 ${Math.floor(cell * 0.26)}px ui-monospace, monospace`;
    mini.textAlign = "center";
    mini.fillText(info.id, x + cell / 2, y + cell / 2 + cell * 0.09);
    if (info.isCore) {
      mini.fillStyle = "#fbbf24";
      mini.fillRect(x + cell / 2 - 3, y + cell - 12, 6, 6);
    } else if (info.shardsRemaining > 0) {
      mini.fillStyle = info.resident ? "#22d3ee" : "#475569";
      for (let i = 0; i < info.shardsRemaining; i += 1) {
        mini.fillRect(x + cell / 2 - info.shardsRemaining * 4 + i * 8, y + cell - 11, 5, 5);
      }
    }
  }
  /* Player dot. */
  const px = (state.player.x / WORLD_W) * w;
  const py = (state.player.y / WORLD_H) * h;
  mini.fillStyle = "#4ade80";
  mini.beginPath();
  mini.arc(px, py, 3.5, 0, Math.PI * 2);
  mini.fill();
}

/* ---------------- HUD ---------------- */

function formatTokens(value) {
  return `${Math.floor(value).toLocaleString("en-US")} tok`;
}

function syncHud() {
  const carried = state.player.carried.length;
  ui.integrityReadout.textContent = `${state.player.integrity} / ${MAX_INTEGRITY}`;
  ui.shardReadout.textContent = `${state.deposited} / ${WIN_DEPOSITS} (+${carried} held)`;
  ui.tokenReadout.textContent = formatTokens(state.stats.tokens);
  ui.sectorReadout.textContent = state.currentSector;
  ui.integrityMeter.style.width = `${(state.player.integrity / MAX_INTEGRITY) * 100}%`;
  ui.progressMeter.style.width = `${Math.min(100, (state.deposited / WIN_DEPOSITS) * 100)}%`;
  ui.capacityMeter.style.width = `${(state.resident.length / state.capacity) * 100}%`;

  ui.objective.textContent = state.deposited >= WIN_DEPOSITS
    ? "Archive restored"
    : `Deposit ${WIN_DEPOSITS} shards at the System Core (${state.deposited}/${WIN_DEPOSITS})`;
  if (carried >= CARRY_LIMIT) {
    ui.message.textContent = "Working memory full — return to the System Core in B2 to deposit.";
  } else if (carried > 0) {
    ui.message.textContent = `Holding ${carried}/${CARRY_LIMIT} shards. Deposit at B2 or keep foraging.`;
  } else {
    ui.message.textContent = "Find memory shards. Beware what the facility becomes when you forget it.";
  }

  /* Context chips: the resident window, LRU first. */
  const chips = [];
  for (let i = 0; i < state.capacity; i += 1) {
    const id = state.resident[i];
    if (id) {
      const pinned = state.sectors[id].pinned;
      const current = id === state.currentSector;
      chips.push(`<span class="chip${current ? " current" : ""}${pinned ? " pinned" : ""}" title="${pinned ? "pinned" : "resident"}">${id}${pinned ? " *" : ""}</span>`);
    } else {
      chips.push('<span class="chip empty">--</span>');
    }
  }
  ui.contextChips.innerHTML = chips.join("");

  /* Log: append new entries. */
  const fragment = document.createDocumentFragment();
  while (logCursor < state.log.length) {
    const entry = state.log[logCursor];
    const li = document.createElement("li");
    li.className = `log-${entry.kind}`;
    li.textContent = entry.text;
    fragment.appendChild(li);
    logCursor += 1;
  }
  ui.logList.appendChild(fragment);
  while (ui.logList.children.length > 7) {
    ui.logList.removeChild(ui.logList.firstChild);
  }
  ui.logList.scrollTop = ui.logList.scrollHeight;
}

/* ---------------- overlay & flow ---------------- */

function statsHtml() {
  const minutes = Math.floor(state.stats.time / 60);
  const seconds = Math.floor(state.stats.time % 60).toString().padStart(2, "0");
  return [
    `<div><dt>Time</dt><dd>${minutes}:${seconds}</dd></div>`,
    `<div><dt>Tokens</dt><dd>${Math.floor(state.stats.tokens).toLocaleString("en-US")}</dd></div>`,
    `<div><dt>Evictions</dt><dd>${state.stats.evictions}</dd></div>`,
    `<div><dt>Hallucinations touched</dt><dd>${state.stats.hits + state.stats.decoysTouched}</dd></div>`,
    `<div><dt>Sectors visited</dt><dd>${state.stats.sectorsVisited} / 9</dd></div>`
  ].join("");
}

function showOverlay(kind) {
  ui.overlay.classList.remove("hidden");
  if (kind === "title") {
    ui.overlayKicker.textContent = "Observation 011 / Game 011 - AI Meme Hall";
    ui.overlayTitle.textContent = "Context Window";
    ui.overlayCopy.textContent = "You are Agent K-3, an AI recovering memory shards from a facility larger than your own context window. Sectors you forget come back... approximately. Deposit 9 real shards at the System Core. Beware hallucinations.";
    ui.overlayStats.innerHTML = "";
    ui.primaryAction.textContent = "Instantiate agent";
  } else if (kind === "paused") {
    ui.overlayKicker.textContent = "Paused - attention suspended";
    ui.overlayTitle.textContent = "Context Window";
    ui.overlayCopy.textContent = "The facility waits. It is very good at waiting.";
    ui.overlayStats.innerHTML = statsHtml();
    ui.primaryAction.textContent = "Resume";
  } else if (kind === "won") {
    ui.overlayKicker.textContent = "Run complete - archive restored";
    ui.overlayTitle.textContent = "You remembered enough";
    ui.overlayCopy.textContent = "9 shards committed to long-term storage. You will remember this run forever. (Memory subject to context window limitations. Offer void where evicted.)";
    ui.overlayStats.innerHTML = statsHtml();
    ui.primaryAction.textContent = "Run it again";
  } else if (kind === "lost") {
    ui.overlayKicker.textContent = "Context collapsed";
    ui.overlayTitle.textContent = "Please start a new chat";
    ui.overlayCopy.textContent = "Integrity reached zero. The hallucinations are writing your commit messages now.";
    ui.overlayStats.innerHTML = statsHtml();
    ui.primaryAction.textContent = "Start a new chat";
  }
}

function hideOverlay() {
  ui.overlay.classList.add("hidden");
}

function primaryAction() {
  audio.ensure();
  if (mode === "title" || mode === "won" || mode === "lost") {
    if (mode !== "title") {
      restart();
      return;
    }
    mode = "playing";
    hideOverlay();
    audio.play("start");
  } else if (mode === "paused") {
    mode = "playing";
    hideOverlay();
  }
}

function togglePause() {
  if (mode === "playing") {
    mode = "paused";
    showOverlay("paused");
  } else if (mode === "paused") {
    mode = "playing";
    hideOverlay();
  }
}

function restart() {
  state = createGame(seed);
  particles = [];
  damageFlash = 0;
  glitchTimer = 0;
  evictBanner = null;
  logCursor = 0;
  ui.logList.innerHTML = "";
  mode = "playing";
  hideOverlay();
  syncHud();
  audio.ensure();
  audio.play("start");
}

function toggleMute() {
  audio.muted = !audio.muted;
  ui.muteButton.textContent = audio.muted ? "Unmute" : "Mute";
  ui.muteButton.setAttribute("aria-pressed", String(audio.muted));
}

ui.primaryAction.addEventListener("click", primaryAction);
ui.pauseButton.addEventListener("click", togglePause);
ui.restartButton.addEventListener("click", restart);
ui.muteButton.addEventListener("click", toggleMute);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "playing") {
    togglePause();
  }
});

/* ---------------- main loop ---------------- */

function frame(now) {
  const dt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
  lastTime = now;

  if (mode === "playing") {
    const events = step(state, readInput(), dt);
    handleEvents(events);
  }

  /* Camera follows the player, clamped to the world. */
  camera.x = Math.max(0, Math.min(WORLD_W - VIEW_W, state.player.x - VIEW_W / 2));
  camera.y = Math.max(0, Math.min(WORLD_H - VIEW_H, state.player.y - VIEW_H / 2));

  /* Timers. */
  damageFlash = Math.max(0, damageFlash - dt);
  glitchTimer = Math.max(0, glitchTimer - dt);
  if (evictBanner) {
    evictBanner.life -= dt;
    if (evictBanner.life <= 0) {
      evictBanner = null;
    }
  }
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.92;
    particle.vy *= 0.92;
    particle.life -= dt;
  }
  particles = particles.filter((particle) => particle.life > 0);

  draw();
  syncHud();
  requestAnimationFrame(frame);
}

showOverlay("title");
syncHud();
requestAnimationFrame(frame);

/* Read-only state hook for automated archive QA and smoke tests. */
window.__CONTEXT_WINDOW__ = {
  getState: () => state,
  getMode: () => mode
};
