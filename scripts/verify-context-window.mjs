/*
 * Context Window completability proof.
 *
 * Reuses the shipped pure engine (games/context-window/src/engine.js)
 * to prove, with the real simulation:
 *
 *   1. Completability — a scripted navigator can recover and deposit
 *      enough memory shards to reach the "won" phase.
 *   2. Failure path — repeated contact with hallucination drones drains
 *      integrity and reaches the "lost" phase.
 *   3. Forgetting mechanic — filling the context window evicts sectors,
 *      and re-entering an evicted sector resamples its details while
 *      permanent facts (shard counts) survive.
 *   4. Walls hold — the player cannot tunnel through solid tiles.
 *
 * Run: node scripts/verify-context-window.mjs
 */
import {
  createGame,
  step,
  isWall,
  sectorIdAt,
  sectorCoords,
  coreCenter,
  TILE,
  SECTOR_COLS,
  SECTOR_ROWS,
  WORLD_COLS,
  WORLD_ROWS,
  WIN_DEPOSITS,
  CARRY_LIMIT,
  CORE_SECTOR,
  DEFAULT_SEED
} from "../games/context-window/src/engine.js";

const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok - ${label}`);
  } else {
    failures.push(`${label}${detail ? ` (${detail})` : ""}`);
    console.error(`  FAIL - ${label}${detail ? ` (${detail})` : ""}`);
  }
}

function playerTile(state) {
  return { tx: Math.floor(state.player.x / TILE), ty: Math.floor(state.player.y / TILE) };
}

function bfsPath(state, from, to, extraBlocked = new Set()) {
  if (from.tx === to.tx && from.ty === to.ty) {
    return [from];
  }
  const key = (tx, ty) => ty * WORLD_COLS + tx;
  const prev = new Map();
  const queue = [from];
  prev.set(key(from.tx, from.ty), null);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.tx === to.tx && current.ty === to.ty) {
      const path = [];
      let cursor = current;
      while (cursor) {
        path.unshift(cursor);
        cursor = prev.get(key(cursor.tx, cursor.ty));
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.tx + dx;
      const ny = current.ty + dy;
      if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) {
        continue;
      }
      const k = key(nx, ny);
      if (prev.has(k) || isWall(state, nx, ny) || extraBlocked.has(k)) {
        continue;
      }
      prev.set(k, current);
      queue.push({ tx: nx, ty: ny });
    }
  }
  return null;
}

function sectorCenterTile(id) {
  const { sx, sy } = sectorCoords(id);
  return { tx: sx * SECTOR_COLS + Math.floor(SECTOR_COLS / 2), ty: sy * SECTOR_ROWS + Math.floor(SECTOR_ROWS / 2) };
}

/* BFS whose goal is any walkable tile inside the given sector. Center
   tiles can be walls in some wall variants; sectors cannot. */
function bfsToSector(state, from, id, extraBlocked = new Set()) {
  const { sx, sy } = sectorCoords(id);
  const inSector = (tx, ty) => (
    tx >= sx * SECTOR_COLS && tx < (sx + 1) * SECTOR_COLS
    && ty >= sy * SECTOR_ROWS && ty < (sy + 1) * SECTOR_ROWS
  );
  if (inSector(from.tx, from.ty)) {
    return [from];
  }
  const key = (tx, ty) => ty * WORLD_COLS + tx;
  const prev = new Map();
  const queue = [from];
  prev.set(key(from.tx, from.ty), null);
  while (queue.length > 0) {
    const current = queue.shift();
    if (inSector(current.tx, current.ty)) {
      const path = [];
      let cursor = current;
      while (cursor) {
        path.unshift(cursor);
        cursor = prev.get(key(cursor.tx, cursor.ty));
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.tx + dx;
      const ny = current.ty + dy;
      if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) {
        continue;
      }
      const k = key(nx, ny);
      if (prev.has(k) || isWall(state, nx, ny) || extraBlocked.has(k)) {
        continue;
      }
      prev.set(k, current);
      queue.push({ tx: nx, ty: ny });
    }
  }
  return null;
}

function kiteInput(state) {
  const sector = state.sectors[state.currentSector];
  if (!sector.generated) {
    return null;
  }
  for (const enemy of sector.enemies) {
    const ex = state.player.x - enemy.x;
    const ey = state.player.y - enemy.y;
    const distance = Math.hypot(ex, ey);
    if (distance < 56 && distance > 0.01) {
      return { moveX: ex / distance, moveY: ey / distance };
    }
  }
  return null;
}

function steerPath(state, path, fallbackPoint, { kite = true } = {}) {
  if (kite) {
    const dodge = kiteInput(state);
    if (dodge) {
      return dodge;
    }
  }
  let cx;
  let cy;
  if (!path || path.length < 2) {
    if (!fallbackPoint) {
      return { moveX: 0, moveY: 0 };
    }
    cx = fallbackPoint.x;
    cy = fallbackPoint.y;
  } else {
    cx = path[1].tx * TILE + TILE / 2;
    cy = path[1].ty * TILE + TILE / 2;
  }
  const dx = cx - state.player.x;
  const dy = cy - state.player.y;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude < 2) {
    return { moveX: 0, moveY: 0 };
  }
  return { moveX: dx / magnitude, moveY: dy / magnitude };
}

function droneBlockedTiles(state) {
  const blocked = new Set();
  const sector = state.sectors[state.currentSector];
  if (!sector.generated) {
    return blocked;
  }
  for (const enemy of sector.enemies) {
    const ex = Math.floor(enemy.x / TILE);
    const ey = Math.floor(enemy.y / TILE);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        blocked.add((ey + dy) * WORLD_COLS + (ex + dx));
      }
    }
  }
  for (const decoy of sector.decoys) {
    blocked.add(Math.floor(decoy.y / TILE) * WORLD_COLS + Math.floor(decoy.x / TILE));
  }
  return blocked;
}

function chooseTargetTile(state) {
  const withPoint = (tx, ty, px, py) => ({ tx, ty, px, py });
  const sector = state.sectors[state.currentSector];
  if (state.player.carried.length >= CARRY_LIMIT) {
    const core = coreCenter();
    return withPoint(Math.floor(core.x / TILE), Math.floor(core.y / TILE), core.x, core.y);
  }
  if (sector.generated && sector.shards.length > 0) {
    const guardGap = (shard) => sector.enemies.reduce((gap, enemy) => (
      Math.min(gap, Math.hypot(enemy.x - shard.x, enemy.y - shard.y))
    ), Infinity);
    const unguarded = sector.shards.filter((shard) => guardGap(shard) >= 100);
    if (unguarded.length > 0) {
      let best = unguarded[0];
      for (const shard of unguarded) {
        if (Math.hypot(state.player.x - shard.x, state.player.y - shard.y)
          < Math.hypot(state.player.x - best.x, state.player.y - best.y)) {
          best = shard;
        }
      }
      return withPoint(Math.floor(best.x / TILE), Math.floor(best.y / TILE), best.x, best.y);
    }
    /* Every shard is guarded: approach the one with the widest guard
       gap. Contact teleports the striker away, freeing the shard. */
    let best = sector.shards[0];
    for (const shard of sector.shards) {
      if (guardGap(shard) > guardGap(best)) {
        best = shard;
      }
    }
    return withPoint(Math.floor(best.x / TILE), Math.floor(best.y / TILE), best.x, best.y);
  }
  /* The run remembers shard counts, not positions: navigate to the
     nearest sector that still holds uncollected shards. */
  const from = playerTile(state);
  const candidates = Object.entries(state.shardsRemaining)
    .filter(([, remaining]) => remaining > 0)
    .map(([id]) => ({ id, tile: sectorCenterTile(id) }))
    .sort((a, b) => (
      Math.hypot(a.tile.tx - from.tx, a.tile.ty - from.ty)
      - Math.hypot(b.tile.tx - from.tx, b.tile.ty - from.ty)
    ));
  if (candidates.length === 0) {
    const core = coreCenter();
    return withPoint(Math.floor(core.x / TILE), Math.floor(core.y / TILE), core.x, core.y);
  }
  const chosen = candidates[0].tile;
  const target = withPoint(chosen.tx, chosen.ty, chosen.tx * TILE + TILE / 2, chosen.ty * TILE + TILE / 2);
  target.sectorId = candidates[0].id;
  return target;
}

/* ---- Proof 1: completability ------------------------------------------ */
console.log("proof 1: a scripted navigator can complete Context Window");
{
  const state = createGame(DEFAULT_SEED);
  const evictionSnapshots = new Map();
  const resummonChecks = [];
  let steps = 0;
  const maxSteps = 60 * 60 * 25; // 25 simulated minutes
  while (state.phase === "playing" && steps < maxSteps) {
    const target = chooseTargetTile(state);
    const blocked = droneBlockedTiles(state);
    const path = target.sectorId
      ? (bfsToSector(state, playerTile(state), target.sectorId, blocked) ?? bfsToSector(state, playerTile(state), target.sectorId))
      : (bfsPath(state, playerTile(state), target, blocked) ?? bfsPath(state, playerTile(state), target));
    const events = step(state, steerPath(state, path, { x: target.px, y: target.py }), 1 / 60);
    for (const event of events) {
      if (event.type === "evict") {
        const sector = state.sectors[event.sector];
        evictionSnapshots.set(event.sector, sector.__lastShardSignature ?? null);
      }
      if (event.type === "resummon") {
        resummonChecks.push(event.sector);
      }
    }
    /* Record shard signatures of resident sectors so eviction can be
       shown to discard and later resample them. */
    for (const id of state.resident) {
      const sector = state.sectors[id];
      if (sector.generated) {
        sector.__lastShardSignature = sector.shards.map((shard) => `${Math.round(shard.x)},${Math.round(shard.y)}`).join("|");
      }
    }
    steps += 1;
  }
  check("navigator reaches the won phase", state.phase === "won", `phase=${state.phase} deposited=${state.deposited} hits=${state.stats.hits}`);
  check(`navigator deposits at least ${WIN_DEPOSITS} shards`, state.deposited >= WIN_DEPOSITS, `deposited=${state.deposited}`);
  check("run terminates inside the step budget", steps < maxSteps, `steps=${steps}`);
  check("context window evicted at least one sector during the run", state.stats.evictions >= 1, `evictions=${state.stats.evictions}`);
  check("at least one evicted sector was re-entered and resummarized", resummonChecks.length >= 1, `resummons=${resummonChecks.length}`);
  console.log(`    run stats: time=${(state.stats.time / 60).toFixed(1)}min tokens=${Math.round(state.stats.tokens)} evictions=${state.stats.evictions} hits=${state.stats.hits} decoys=${state.stats.decoysTouched} visited=${state.stats.sectorsVisited}`);
}

/* ---- Proof 2: failure path -------------------------------------------- */
console.log("proof 2: hallucination contact can collapse the run");
{
  const state = createGame(DEFAULT_SEED ^ 0x5f3);
  let steps = 0;
  const maxSteps = 60 * 60 * 12;
  while (state.phase === "playing" && steps < maxSteps) {
    /* Seek the nearest resident drone via real pathfinding; if none is
       visible, roam to a sector that spawns one. */
    const sector = state.sectors[state.currentSector];
    let path = null;
    let fallback = null;
    if (sector.generated && sector.enemies.length > 0) {
      let best = sector.enemies[0];
      for (const enemy of sector.enemies) {
        if (Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y)
          < Math.hypot(best.x - state.player.x, best.y - state.player.y)) {
          best = enemy;
        }
      }
      path = bfsPath(state, playerTile(state), { tx: Math.floor(best.x / TILE), ty: Math.floor(best.y / TILE) });
      fallback = { x: best.x, y: best.y };
    } else {
      path = bfsToSector(state, playerTile(state), "A1");
    }
    step(state, steerPath(state, path, fallback, { kite: false }), 1 / 60);
    steps += 1;
  }
  check("integrity reaches zero under repeated hallucination contact", state.player.integrity <= 0, `integrity=${state.player.integrity}`);
  check("run reaches the lost phase", state.phase === "lost", `phase=${state.phase}`);
  check("collapse is reported inside the step budget", steps < maxSteps, `steps=${steps}`);
}

/* ---- Proof 3: forgetting resamples details, keeps facts ---------------- */
console.log("proof 3: eviction discards details, not facts");
{
  const state = createGame(DEFAULT_SEED ^ 0x91a);
  /* A tour bot walks a fixed loop of the outer sectors, stepping around
     shards so every sector keeps its full count. With a 4-slot context
     window and 8 sectors on the route, evictions and re-entries are
     guaranteed. */
  const tour = ["A1", "B1", "C1", "C2", "C3", "B3", "A3", "A2"];
  let tourIndex = 0;
  const snapshots = new Map();
  let compared = null;
  let steps = 0;
  const maxSteps = 60 * 60 * 20;
  const signatureOf = (sector) => sector.shards.map((shard) => `${Math.round(shard.x)},${Math.round(shard.y)}`).join("|");
  while (state.phase === "playing" && steps < maxSteps && !compared) {
    const targetSector = tour[tourIndex % tour.length];
    if (state.currentSector === targetSector) {
      tourIndex += 1;
      continue;
    }
    const blocked = droneBlockedTiles(state);
    const sector = state.sectors[state.currentSector];
    if (sector.generated) {
      for (const shard of sector.shards) {
        blocked.add(Math.floor(shard.y / TILE) * WORLD_COLS + Math.floor(shard.x / TILE));
      }
    }
    const path = bfsToSector(state, playerTile(state), targetSector, blocked)
      ?? bfsToSector(state, playerTile(state), targetSector);
    const events = step(state, steerPath(state, path, null), 1 / 60);
    for (const event of events) {
      if (event.type === "evict" && snapshots.has(event.sector)) {
        snapshots.get(event.sector).evicted = true;
      }
      if (event.type === "resummon" && snapshots.get(event.sector)?.evicted) {
        const before = snapshots.get(event.sector);
        const now = state.sectors[event.sector];
        if (before.count > 0) {
          compared = {
            sector: event.sector,
            changed: before.signature !== signatureOf(now),
            shardCountKept: now.shards.length === state.shardsRemaining[event.sector]
              && state.shardsRemaining[event.sector] === before.count
          };
        }
      }
    }
    /* Keep the freshest pre-eviction snapshot of every resident sector. */
    for (const id of state.resident) {
      const current = state.sectors[id];
      if (current.generated) {
        snapshots.set(id, {
          signature: signatureOf(current),
          count: state.shardsRemaining[id],
          evicted: snapshots.get(id)?.evicted ?? false
        });
      }
    }
    steps += 1;
  }
  check("an evicted sector was re-entered for comparison", compared !== null, `steps=${steps} phase=${state.phase}`);
  if (compared) {
    check(`sector ${compared.sector} details were resampled after re-summarization`, compared.changed);
    check(`sector ${compared.sector} kept its permanent shard count`, compared.shardCountKept);
  }
}

/* ---- Proof 4: walls hold ------------------------------------------------ */
console.log("proof 4: solid tiles cannot be tunneled");
{
  const state = createGame(DEFAULT_SEED);
  /* Navigate to the north-west corner pocket, then push into the
     boundary wall and confirm nothing moves. */
  const path = bfsPath(state, playerTile(state), { tx: 1, ty: 1 });
  check("a route to the boundary pocket exists", Array.isArray(path), "BFS failed");
  let steps = 0;
  while (steps < 60 * 60 * 6 && (playerTile(state).tx !== 1 || playerTile(state).ty !== 1)) {
    const route = bfsPath(state, playerTile(state), { tx: 1, ty: 1 });
    if (!route || route.length < 2) {
      break;
    }
    const next = route[1];
    const dx = next.tx * TILE + TILE / 2 - state.player.x;
    const dy = next.ty * TILE + TILE / 2 - state.player.y;
    const magnitude = Math.hypot(dx, dy) || 1;
    step(state, { moveX: dx / magnitude, moveY: dy / magnitude }, 1 / 60);
    steps += 1;
  }
  check("navigator reached the boundary pocket", playerTile(state).tx === 1 && playerTile(state).ty === 1, `tile=(${playerTile(state).tx},${playerTile(state).ty})`);
  for (let i = 0; i < 240; i += 1) {
    step(state, { moveX: -1, moveY: -1 }, 1 / 60);
  }
  const pressed = { x: state.player.x, y: state.player.y };
  for (let i = 0; i < 240; i += 1) {
    step(state, { moveX: -1, moveY: -1 }, 1 / 60);
  }
  check("pushing into a boundary wall does not move the player", state.player.x === pressed.x && state.player.y === pressed.y, `pos=(${state.player.x},${state.player.y})`);
  check("player stays inside the world", state.player.x > TILE && state.player.y > TILE, `pos=(${state.player.x},${state.player.y})`);
  check("sector tracking stays coherent against the wall", sectorIdAt(state.player.x, state.player.y) === "A1", `sector=${sectorIdAt(state.player.x, state.player.y)}`);
}

if (failures.length > 0) {
  console.error(`\nContext Window proof failed (${failures.length}):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
console.log("\nContext Window completability proof passed:");
console.log("- scripted navigator deposits enough shards to win");
console.log("- hallucination contact can collapse the run");
console.log("- eviction resamples sector details while keeping shard counts");
console.log("- solid tiles cannot be tunneled");
