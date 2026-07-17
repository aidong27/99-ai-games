/*
 * Context Window — pure simulation core.
 * Observation 011 / Game 011, AI Meme Hall, 99 AI Games.
 *
 * This module is deliberately DOM-free so the browser build
 * (src/main.js) and the Node completability proof
 * (scripts/verify-context-window.mjs) share one deterministic engine.
 *
 * The joke that is also the mechanic: the facility is larger than the
 * agent's context window. Only a few sectors stay "resident" in memory.
 * Evicted sectors are replaced by lossy summaries — when re-entered,
 * their details are resampled: shards drift, walls are misremembered,
 * and some objects are now hallucinations.
 */

export const TILE = 48;
export const SECTOR_COLS = 16;
export const SECTOR_ROWS = 10;
export const GRID = 3;
export const WORLD_COLS = SECTOR_COLS * GRID;
export const WORLD_ROWS = SECTOR_ROWS * GRID;
export const WORLD_W = WORLD_COLS * TILE;
export const WORLD_H = WORLD_ROWS * TILE;

export const CORE_SECTOR = "B2";
export const WIN_DEPOSITS = 9;
export const CARRY_LIMIT = 3;
export const BASE_CAPACITY = 4; // resident sectors, core included
export const MAX_CAPACITY = 6;
export const MAX_INTEGRITY = 5;
export const PLAYER_SPEED = 160; // px per second
export const PLAYER_HALF = 12; // collision half-extent
export const ENEMY_HALF = 12;
export const INVULN_SECONDS = 1.2;
export const DEFAULT_SEED = 20260717;

const SECTOR_LETTERS = "ABC";

/* Real shards per outer sector. Twelve exist; nine must be deposited. */
const SHARD_PLAN = { A1: 2, B1: 1, C1: 2, A2: 1, C2: 1, A3: 2, B3: 1, C3: 2 };

/* One-time pickups. Once taken they are permanent facts of the run. */
const PICKUP_PLAN = {
  A1: ["patch"],
  B1: ["compress"],
  C1: ["patch"],
  A3: ["pin"],
  B3: ["compress"],
  C3: ["pin", "patch"]
};

/*
 * Interior wall variants, in sector-local tile coordinates.
 * Every variant keeps the door approach zones clear: local x 0..2 and
 * 13..15 near rows 3..6, and local y 0..2 and 7..9 near columns 6..9.
 * Higher summary counts prefer the weirder variants — the facility is
 * literally misremembered.
 */
const WALL_VARIANTS = [
  [{ x: 5, y: 3, w: 1, h: 4 }, { x: 10, y: 3, w: 1, h: 4 }],
  [{ x: 5, y: 4, w: 6, h: 2 }],
  [{ x: 4, y: 3, w: 1, h: 1 }, { x: 11, y: 3, w: 1, h: 1 }, { x: 4, y: 6, w: 1, h: 1 }, { x: 11, y: 6, w: 1, h: 1 }],
  [{ x: 4, y: 2, w: 2, h: 1 }, { x: 10, y: 2, w: 2, h: 1 }, { x: 7, y: 5, w: 2, h: 1 }, { x: 4, y: 7, w: 2, h: 1 }, { x: 10, y: 7, w: 2, h: 1 }]
];

export const EVICTION_QUIPS = [
  "Sector {id} evicted. {tokens} tokens -> 12 tokens. Summary: 'a room, presumably.'",
  "Sector {id} compressed. Retained: 'walls (some), vibes (most).'",
  "We no longer remember Sector {id}. We have decided it was blue.",
  "Sector {id} summarized by a smaller model. It did its best.",
  "Sector {id} left the context window. It left no forwarding address.",
  "Sector {id} is now a bullet point. One bullet. The point is 'room'.",
  "Attention over Sector {id} dropped to zero. It attends no more.",
  "Sector {id} was truncated mid-thought. The thought was load-bearing."
];

export const RESUMMON_QUIPS = [
  "Sector {id} reconstructed from summary. Details may have been improvised.",
  "Re-entered Sector {id}. The walls look confident. They should not be.",
  "Sector {id} restored from 12 tokens. Some of those tokens were 'door?'.",
  "Sector {id} regenerated. Anything unfamiliar was always like that."
];

export const DECOY_QUIPS = [
  "That shard was a hallucination. Of course it was.",
  "Fake shard. It cited a source that does not exist.",
  "You grabbed a hallucination. It filed a complaint.",
  "That shard was confabulated. The glitter was overconfident."
];

export const DAMAGE_QUIPS = [
  "Touched a hallucination. It had opinions.",
  "The hallucination knew your training data. It hurt.",
  "Integrity -1. The phantom quoted you out of context.",
  "A glitch drone intersected you. This is fine."
];

function sectorId(sx, sy) {
  return `${SECTOR_LETTERS[sx]}${sy + 1}`;
}

export function sectorCoords(id) {
  return { sx: SECTOR_LETTERS.indexOf(id[0]), sy: Number(id[1]) - 1 };
}

export function sectorIdAt(px, py) {
  const sx = Math.max(0, Math.min(GRID - 1, Math.floor(px / (SECTOR_COLS * TILE))));
  const sy = Math.max(0, Math.min(GRID - 1, Math.floor(py / (SECTOR_ROWS * TILE))));
  return sectorId(sx, sy);
}

/* Deterministic RNG: mulberry32 with state stored inside game state. */
function nextRandom(state) {
  let a = state.rngState | 0;
  a = (a + 0x6d2b79f5) | 0;
  state.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randInt(state, n) {
  return Math.floor(nextRandom(state) * n);
}

function pick(state, list) {
  return list[randInt(state, list.length)];
}

export function isWall(state, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) {
    return true;
  }
  return state.walls[ty * WORLD_COLS + tx] === 1;
}

function buildStaticWalls(state) {
  state.walls = new Uint8Array(WORLD_COLS * WORLD_ROWS);
  for (let x = 0; x < WORLD_COLS; x += 1) {
    state.walls[x] = 1;
    state.walls[(WORLD_ROWS - 1) * WORLD_COLS + x] = 1;
  }
  for (let y = 0; y < WORLD_ROWS; y += 1) {
    state.walls[y * WORLD_COLS] = 1;
    state.walls[y * WORLD_COLS + WORLD_COLS - 1] = 1;
  }
  /* Vertical dividers between sector columns, with 2-tile doors. */
  for (const dividerX of [SECTOR_COLS, SECTOR_COLS * 2]) {
    for (let y = 1; y < WORLD_ROWS - 1; y += 1) {
      state.walls[y * WORLD_COLS + dividerX] = 1;
    }
    for (let sy = 0; sy < GRID; sy += 1) {
      for (const dy of [4, 5]) {
        state.walls[(sy * SECTOR_ROWS + dy) * WORLD_COLS + dividerX] = 0;
      }
    }
  }
  /* Horizontal dividers between sector rows, with 2-tile doors. */
  for (const dividerY of [SECTOR_ROWS, SECTOR_ROWS * 2]) {
    for (let x = 1; x < WORLD_COLS - 1; x += 1) {
      state.walls[dividerY * WORLD_COLS + x] = 1;
    }
    for (let sx = 0; sx < GRID; sx += 1) {
      for (const dx of [7, 8]) {
        state.walls[dividerY * WORLD_COLS + sx * SECTOR_COLS + dx] = 0;
      }
    }
  }
}

function applyWallVariant(state, id, variantIndex) {
  const { sx, sy } = sectorCoords(id);
  const originX = sx * SECTOR_COLS;
  const originY = sy * SECTOR_ROWS;
  /* Clear previous interior, then stamp the variant. */
  for (let y = 1; y < SECTOR_ROWS - 1; y += 1) {
    for (let x = 1; x < SECTOR_COLS - 1; x += 1) {
      state.walls[(originY + y) * WORLD_COLS + originX + x] = 0;
    }
  }
  for (const rect of WALL_VARIANTS[variantIndex]) {
    for (let y = 0; y < rect.h; y += 1) {
      for (let x = 0; x < rect.w; x += 1) {
        state.walls[(originY + rect.y + y) * WORLD_COLS + originX + rect.x + x] = 1;
      }
    }
  }
  /* The System Core's heart is never misremembered: the spawn and
     deposit zone stays walkable in every variant. */
  if (id === CORE_SECTOR) {
    for (let y = 3; y <= 6; y += 1) {
      for (let x = 6; x <= 9; x += 1) {
        state.walls[(originY + y) * WORLD_COLS + originX + x] = 0;
      }
    }
  }
}

function isDoorApproach(lx, ly) {
  const nearVerticalDoor = (lx <= 2 || lx >= SECTOR_COLS - 3) && ly >= 3 && ly <= 6;
  const nearHorizontalDoor = (ly <= 2 || ly >= SECTOR_ROWS - 3) && lx >= 6 && lx <= 9;
  return nearVerticalDoor || nearHorizontalDoor;
}

function freeTiles(state, id) {
  const { sx, sy } = sectorCoords(id);
  const tiles = [];
  for (let ly = 1; ly < SECTOR_ROWS - 1; ly += 1) {
    for (let lx = 1; lx < SECTOR_COLS - 1; lx += 1) {
      const tx = sx * SECTOR_COLS + lx;
      const ty = sy * SECTOR_ROWS + ly;
      if (!isWall(state, tx, ty) && !isDoorApproach(lx, ly)) {
        tiles.push({ tx, ty, lx, ly });
      }
    }
  }
  return tiles;
}

function tileCenter(tile) {
  return { x: tile.tx * TILE + TILE / 2, y: tile.ty * TILE + TILE / 2 };
}

function farFromOthers(candidate, placed, minDistance) {
  const px = candidate.tx * TILE + TILE / 2;
  const py = candidate.ty * TILE + TILE / 2;
  return placed.every((other) => {
    const dx = other.x - px;
    const dy = other.y - py;
    return Math.hypot(dx, dy) >= minDistance;
  });
}

/*
 * (Re)generates a sector's dynamic contents. Permanent facts survive:
 * how many real shards remain and which pickups were taken. Everything
 * else — positions, wall variant, decoys, drones — is resampled from
 * the summary. First visits have no decoys: hallucinations are born
 * from forgetting, not from the original data.
 */
function generateSector(state, id) {
  const summaries = state.summaries[id];
  const sector = state.sectors[id];
  const variantIndex = summaries === 0
    ? randInt(state, WALL_VARIANTS.length - 1)
    : randInt(state, WALL_VARIANTS.length);
  applyWallVariant(state, id, variantIndex);
  sector.wallVariant = variantIndex;
  sector.shards = [];
  sector.decoys = [];
  sector.enemies = [];
  sector.pickups = [];

  const tiles = freeTiles(state, id);
  const placed = [];
  const take = (minDistance) => {
    const candidates = tiles.filter((tile) => farFromOthers(tile, placed, minDistance));
    if (candidates.length === 0) {
      return null;
    }
    const tile = pick(state, candidates);
    const point = tileCenter(tile);
    placed.push(point);
    return point;
  };

  for (let i = 0; i < state.shardsRemaining[id]; i += 1) {
    const point = take(90);
    if (point) {
      sector.shards.push({ id: `${id}-shard-${i}`, x: point.x, y: point.y, taken: false });
    }
  }
  const decoyCount = Math.min(summaries, 3);
  for (let i = 0; i < decoyCount; i += 1) {
    const point = take(80);
    if (point) {
      sector.decoys.push({ id: `${id}-decoy-${summaries}-${i}`, x: point.x, y: point.y });
    }
  }
  const enemyCount = id === CORE_SECTOR ? 0 : Math.min(1 + summaries, 3);
  for (let i = 0; i < enemyCount; i += 1) {
    const point = take(120);
    if (point) {
      const angle = nextRandom(state) * Math.PI * 2;
      sector.enemies.push({
        id: `${id}-drone-${summaries}-${i}`,
        x: point.x,
        y: point.y,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        retarget: 1 + nextRandom(state) * 2,
        wobble: nextRandom(state) * Math.PI * 2
      });
    }
  }
  for (const kind of PICKUP_PLAN[id] ?? []) {
    const pickupKey = `${id}-${kind}`;
    if (!state.pickupsTaken.has(pickupKey)) {
      const point = take(110);
      if (point) {
        sector.pickups.push({ id: pickupKey, kind, x: point.x, y: point.y });
      }
    }
  }
  sector.resident = true;
  sector.generated = true;
}

function quip(state, list, id, tokens) {
  return pick(state, list).replace("{id}", id).replace("{tokens}", String(tokens));
}

function evictSector(state, id) {
  const sector = state.sectors[id];
  state.resident = state.resident.filter((entry) => entry !== id);
  sector.resident = false;
  sector.generated = false;
  state.summaries[id] += 1;
  state.stats.evictions += 1;
  const tokens = 700 + randInt(state, 1400);
  state.stats.tokens += 12;
  pushLog(state, quip(state, EVICTION_QUIPS, id, tokens), "eviction");
  state.events.push({ type: "evict", sector: id, summaries: state.summaries[id] });
}

function enterSector(state, id) {
  state.currentSector = id;
  const sector = state.sectors[id];
  if (!sector.generated) {
    generateSector(state, id);
    if (state.summaries[id] > 0) {
      pushLog(state, quip(state, RESUMMON_QUIPS, id), "resummon");
      state.events.push({ type: "resummon", sector: id, summaries: state.summaries[id] });
    }
  }
  state.resident = state.resident.filter((entry) => entry !== id);
  state.resident.push(id);
  while (state.resident.length > state.capacity) {
    const victim = state.resident.find((entry) => (
      entry !== CORE_SECTOR && entry !== id && !state.sectors[entry].pinned
    ));
    if (!victim) {
      break;
    }
    evictSector(state, victim);
  }
}

function pushLog(state, text, kind = "info") {
  state.log.push({ text, kind, at: state.stats.time });
  if (state.log.length > 40) {
    state.log.shift();
  }
}

function collideAxis(state, half, nx, ny) {
  const left = Math.floor((nx - half) / TILE);
  const right = Math.floor((nx + half) / TILE);
  const top = Math.floor((ny - half) / TILE);
  const bottom = Math.floor((ny + half) / TILE);
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (isWall(state, tx, ty)) {
        return true;
      }
    }
  }
  return false;
}

function moveBody(state, body, half, dx, dy) {
  let hitX = false;
  let hitY = false;
  if (dx !== 0) {
    const nx = body.x + dx;
    if (collideAxis(state, half, nx, body.y)) {
      hitX = true;
    } else {
      body.x = nx;
    }
  }
  if (dy !== 0) {
    const ny = body.y + dy;
    if (collideAxis(state, half, body.x, ny)) {
      hitY = true;
    } else {
      body.y = ny;
    }
  }
  return { hitX, hitY };
}

function nearestFreeTile(state, id, x, y) {
  const tiles = freeTiles(state, id);
  let best = null;
  let bestDistance = Infinity;
  for (const tile of tiles) {
    const point = tileCenter(tile);
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best ?? { x, y };
}

function damagePlayer(state, enemy) {
  const player = state.player;
  if (player.invulnerable > 0 || state.phase !== "playing") {
    return;
  }
  player.integrity -= 1;
  player.invulnerable = INVULN_SECONDS;
  state.stats.hits += 1;
  pushLog(state, pick(state, DAMAGE_QUIPS), "damage");
  state.events.push({ type: "damage", integrity: player.integrity });
  if (player.carried.length > 0) {
    const dropped = player.carried.pop();
    const sectorIdNow = state.currentSector;
    const point = nearestFreeTile(state, sectorIdNow, player.x, player.y);
    state.sectors[sectorIdNow].shards.push({ id: dropped.id, x: point.x, y: point.y, taken: false });
    pushLog(state, "You dropped a shard. It rolled somewhere plausible.", "damage");
    state.events.push({ type: "drop", shard: dropped.id });
  }
  if (player.integrity <= 0) {
    state.phase = "lost";
    pushLog(state, "Context collapsed. Please start a new chat.", "lose");
    state.events.push({ type: "lose" });
  }
  if (enemy) {
    /* Hallucinations cannot hold coherence after contact: the striker
       destabilizes and re-forms somewhere else in the sector. This
       keeps drones from camping on top of a cornered agent. */
    const sectorIdNow = state.currentSector;
    const safeTiles = freeTiles(state, sectorIdNow).filter((tile) => {
      const point = tileCenter(tile);
      return Math.hypot(point.x - player.x, point.y - player.y) > 300;
    });
    const tile = safeTiles.length > 0 ? pick(state, safeTiles) : null;
    if (tile) {
      const point = tileCenter(tile);
      enemy.x = point.x;
      enemy.y = point.y;
    }
    enemy.retarget = 2 + nextRandom(state) * 2;
    state.events.push({ type: "destabilize", enemy: enemy.id });
  }
}

function updateEnemies(state, dt) {
  const player = state.player;
  for (const id of state.resident) {
    const sector = state.sectors[id];
    if (!sector.generated) {
      continue;
    }
    const aggression = Math.min(1 + state.summaries[id] * 0.35, 2);
    const speed = 42 * aggression + state.stats.evictions * 1.5;
    for (const enemy of sector.enemies) {
      enemy.retarget -= dt;
      enemy.wobble += dt * 6;
      const sameSector = sectorIdAt(player.x, player.y) === id;
      const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (sameSector && distance < 200 && state.phase === "playing") {
        const chase = Math.min(speed * 1.4, 96);
        enemy.vx = (player.x - enemy.x) / (distance || 1);
        enemy.vy = (player.y - enemy.y) / (distance || 1);
        const result = moveBody(state, enemy, ENEMY_HALF, enemy.vx * chase * dt, enemy.vy * chase * dt);
        if (result.hitX || result.hitY) {
          enemy.retarget = 0;
        }
      } else {
        if (enemy.retarget <= 0) {
          const angle = nextRandom(state) * Math.PI * 2;
          enemy.vx = Math.cos(angle);
          enemy.vy = Math.sin(angle);
          enemy.retarget = 1.2 + nextRandom(state) * 2.4;
        }
        const result = moveBody(state, enemy, ENEMY_HALF, enemy.vx * speed * dt, enemy.vy * speed * dt);
        if (result.hitX) {
          enemy.vx *= -1;
        }
        if (result.hitY) {
          enemy.vy *= -1;
        }
      }
      if (sameSector && Math.hypot(player.x - enemy.x, player.y - enemy.y) < PLAYER_HALF + ENEMY_HALF + 2) {
        damagePlayer(state, enemy);
      }
    }
  }
}

function updatePickups(state) {
  const player = state.player;
  const sector = state.sectors[state.currentSector];
  if (!sector.generated) {
    return;
  }
  for (const shard of sector.shards) {
    if (!shard.taken && Math.hypot(player.x - shard.x, player.y - shard.y) < PLAYER_HALF + 13) {
      if (player.carried.length >= CARRY_LIMIT) {
        if (!state.fullWarned || state.stats.time - state.fullWarned > 2.5) {
          pushLog(state, `Working memory full (${CARRY_LIMIT}/${CARRY_LIMIT}). Deposit at the System Core.`, "warn");
          state.events.push({ type: "full" });
          state.fullWarned = state.stats.time;
        }
        continue;
      }
      shard.taken = true;
      state.shardsRemaining[state.currentSector] -= 1;
      player.carried.push({ id: shard.id });
      state.stats.shardsCollected += 1;
      state.stats.tokens += 48;
      pushLog(state, "Memory shard recovered. Probably real. It felt real.", "pickup");
      state.events.push({ type: "shard", carried: player.carried.length });
    }
  }
  sector.shards = sector.shards.filter((shard) => !shard.taken);

  for (let i = sector.decoys.length - 1; i >= 0; i -= 1) {
    const decoy = sector.decoys[i];
    if (Math.hypot(player.x - decoy.x, player.y - decoy.y) < PLAYER_HALF + 13) {
      sector.decoys.splice(i, 1);
      const angle = nextRandom(state) * Math.PI * 2;
      sector.enemies.push({
        id: `${decoy.id}-spawn`,
        x: decoy.x,
        y: decoy.y,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        retarget: 2,
        wobble: 0
      });
      state.stats.decoysTouched += 1;
      state.stats.tokens += 5;
      pushLog(state, pick(state, DECOY_QUIPS), "decoy");
      state.events.push({ type: "decoy" });
    }
  }

  for (let i = sector.pickups.length - 1; i >= 0; i -= 1) {
    const item = sector.pickups[i];
    if (Math.hypot(player.x - item.x, player.y - item.y) >= PLAYER_HALF + 14) {
      continue;
    }
    sector.pickups.splice(i, 1);
    state.pickupsTaken.add(item.id);
    state.stats.tokens += 64;
    if (item.kind === "patch") {
      state.player.integrity = Math.min(MAX_INTEGRITY, state.player.integrity + 1);
      pushLog(state, "Integrity patch applied. You feel substantiated.", "pickup");
      state.events.push({ type: "patch", integrity: state.player.integrity });
    } else if (item.kind === "compress") {
      state.capacity = Math.min(MAX_CAPACITY, state.capacity + 1);
      pushLog(state, `Compression pass installed. Context capacity is now ${state.capacity} sectors.`, "pickup");
      state.events.push({ type: "compress", capacity: state.capacity });
    } else if (item.kind === "pin") {
      sector.pinned = true;
      pushLog(state, `System Prompt injected: "You are a helpful recovery agent." Sector ${state.currentSector} will be remembered.`, "pickup");
      state.events.push({ type: "pin", sector: state.currentSector });
    }
  }
}

function updateDeposit(state) {
  const player = state.player;
  if (state.currentSector !== CORE_SECTOR || player.carried.length === 0) {
    return;
  }
  const { sx, sy } = sectorCoords(CORE_SECTOR);
  const cx = (sx * SECTOR_COLS + SECTOR_COLS / 2) * TILE;
  const cy = (sy * SECTOR_ROWS + SECTOR_ROWS / 2) * TILE;
  if (Math.hypot(player.x - cx, player.y - cy) > TILE * 1.7) {
    return;
  }
  const count = player.carried.length;
  player.carried = [];
  state.deposited += count;
  state.stats.tokens += count * 128;
  pushLog(state, `${count} shard${count > 1 ? "s" : ""} committed to long-term storage. Now the disk's problem.`, "deposit");
  state.events.push({ type: "deposit", deposited: state.deposited, count });
  if (state.deposited >= WIN_DEPOSITS) {
    state.phase = "won";
    pushLog(state, "Archive restored. You will remember this run forever. (Terms apply.)", "win");
    state.events.push({ type: "win" });
  }
}

export function createGame(seed = DEFAULT_SEED) {
  const state = {
    seed,
    rngState: seed >>> 0,
    phase: "playing",
    walls: null,
    sectors: {},
    summaries: {},
    shardsRemaining: { ...SHARD_PLAN, [CORE_SECTOR]: 0 },
    pickupsTaken: new Set(),
    resident: [],
    capacity: BASE_CAPACITY,
    currentSector: CORE_SECTOR,
    deposited: 0,
    player: {
      x: 0,
      y: 0,
      integrity: MAX_INTEGRITY,
      carried: [],
      invulnerable: 0
    },
    stats: {
      time: 0,
      tokens: 4096,
      evictions: 0,
      shardsCollected: 0,
      decoysTouched: 0,
      hits: 0,
      sectorsVisited: 1
    },
    log: [],
    events: [],
    fullWarned: 0,
    visited: new Set([CORE_SECTOR])
  };
  buildStaticWalls(state);
  for (let sy = 0; sy < GRID; sy += 1) {
    for (let sx = 0; sx < GRID; sx += 1) {
      const id = sectorId(sx, sy);
      state.summaries[id] = 0;
      state.sectors[id] = {
        id,
        resident: false,
        generated: false,
        pinned: id === CORE_SECTOR,
        wallVariant: 0,
        shards: [],
        decoys: [],
        enemies: [],
        pickups: []
      };
    }
  }
  const { sx, sy } = sectorCoords(CORE_SECTOR);
  state.player.x = (sx * SECTOR_COLS + SECTOR_COLS / 2) * TILE;
  state.player.y = (sy * SECTOR_ROWS + SECTOR_ROWS / 2) * TILE;
  enterSector(state, CORE_SECTOR);
  pushLog(state, "Agent K-3 instantiated. Objective: recover 9 memory shards. Try to remember.", "info");
  return state;
}

/*
 * Advances the simulation. `input` is { moveX, moveY } with components in
 * [-1, 1]; `dt` is seconds. Returns the drained event list for the frame.
 */
export function step(state, input = {}, dt = 1 / 60) {
  if (state.phase !== "playing") {
    const events = state.events;
    state.events = [];
    return events;
  }
  const clamped = Math.min(Math.max(dt, 0), 0.05);
  state.stats.time += clamped;
  const player = state.player;
  player.invulnerable = Math.max(0, player.invulnerable - clamped);

  let moveX = Math.max(-1, Math.min(1, Number(input.moveX) || 0));
  let moveY = Math.max(-1, Math.min(1, Number(input.moveY) || 0));
  const magnitude = Math.hypot(moveX, moveY);
  if (magnitude > 1) {
    moveX /= magnitude;
    moveY /= magnitude;
  }
  if (magnitude > 0.01) {
    const dx = moveX * PLAYER_SPEED * clamped;
    const dy = moveY * PLAYER_SPEED * clamped;
    const before = state.currentSector;
    moveBody(state, player, PLAYER_HALF, dx, dy);
    state.stats.tokens += Math.hypot(dx, dy) * 0.05;
    const now = sectorIdAt(player.x, player.y);
    if (now !== before) {
      if (!state.visited.has(now)) {
        state.visited.add(now);
        state.stats.sectorsVisited += 1;
      }
      enterSector(state, now);
      state.events.push({ type: "sector", from: before, to: now });
    }
  }

  updateEnemies(state, clamped);
  updatePickups(state);
  updateDeposit(state);

  const events = state.events;
  state.events = [];
  return events;
}

/* Snapshot helpers for renderers and proofs. */
export function coreCenter() {
  const { sx, sy } = sectorCoords(CORE_SECTOR);
  return {
    x: (sx * SECTOR_COLS + SECTOR_COLS / 2) * TILE,
    y: (sy * SECTOR_ROWS + SECTOR_ROWS / 2) * TILE
  };
}

export function sectorSummaryList(state) {
  return Object.values(state.sectors).map((sector) => ({
    id: sector.id,
    resident: sector.resident,
    pinned: sector.pinned,
    summaries: state.summaries[sector.id],
    shardsRemaining: state.shardsRemaining[sector.id],
    isCore: sector.id === CORE_SECTOR,
    isCurrent: state.currentSector === sector.id
  }));
}
