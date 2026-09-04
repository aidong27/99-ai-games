import { CORES, RELAYS, GATES, WALLS, VENTS, PATROLS, EXIT, SPEED, RADIUS,
  circleTouchesRect, distance, ventState, patrolPosition } from "./level.js";

export function createState(seed) {
  return { phase: "title", seed, player: { x: 160, y: 840, angle: -Math.PI / 2 },
    integrity: 100, elapsed: 0, stage: 0, carrying: null, collected: 0,
    cores: CORES.map(c => ({ ...c, taken: false })),
    relays: RELAYS.map(r => ({ ...r, active: false })), cooldown: 0, barrier: 0,
    message: "Restore the facility. Leave no core behind.", messageUntil: 0, hit: 0 };
}
export function wallsFor(state) {
  return [...WALLS, ...GATES.filter(g => state.stage < g.stage)];
}
export function objective(state) {
  if (state.stage === 3) return { x: EXIT.x + EXIT.w / 2, y: EXIT.y + EXIT.h / 2, label: "Reach the extraction dock" };
  if (state.carrying !== null) {
    const r = state.relays.find(r => !r.active);
    return { ...r, label: "Carry core to relay " + r.name };
  }
  const core = state.cores.find(c => !c.taken);
  return core ? { ...core, label: "Recover data core " + core.name } : null;
}
export function nearbyAction(state) {
  if (state.carrying !== null) {
    const r = state.relays.find(r => !r.active && distance(r, state.player) < 55);
    if (r) return "Activate relay " + r.name;
  } else {
    const c = state.cores.find(c => !c.taken && distance(c, state.player) < 48);
    if (c) return "Take data core " + c.name;
  }
  return "";
}
export function interact(state) {
  if (state.phase !== "playing") return false;
  if (state.carrying !== null) {
    const relay = state.relays.find(r => !r.active && distance(r, state.player) < 55);
    if (!relay) return false;
    relay.active = true;
    state.stage += 1;
    state.carrying = null;
    state.integrity = Math.min(100, state.integrity + 25);
    state.message = RELAYS[state.stage - 1].change + " Integrity +25.";
  } else {
    const index = state.cores.findIndex(c => !c.taken && distance(c, state.player) < 48);
    if (index < 0) return false;
    state.cores[index].taken = true;
    state.carrying = index;
    state.collected += 1;
    state.message = "Core secured. Carry it to an inactive relay.";
  }
  state.messageUntil = state.elapsed + 5500;
  return true;
}
export function useBarrier(state) {
  if (state.phase !== "playing" || state.cooldown > 0) return false;
  state.barrier = 2.6;
  state.cooldown = 9;
  state.message = "Barrier active for 2.6 seconds.";
  state.messageUntil = state.elapsed + 1600;
  return true;
}
export function step(state, input, dt) {
  if (state.phase !== "playing") return;
  state.elapsed += dt * 1000;
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.barrier = Math.max(0, state.barrier - dt);
  state.hit = Math.max(0, state.hit - dt * 3);
  let dx = Number(input.has("KeyD") || input.has("ArrowRight")) - Number(input.has("KeyA") || input.has("ArrowLeft"));
  let dy = Number(input.has("KeyS") || input.has("ArrowDown")) - Number(input.has("KeyW") || input.has("ArrowUp"));
  const length = Math.hypot(dx, dy);
  if (length) {
    dx /= length; dy /= length;
    state.player.angle = Math.atan2(dy, dx);
    const walls = wallsFor(state);
    const horizontal = { ...state.player, x: state.player.x + dx * SPEED * dt };
    if (!walls.some(w => circleTouchesRect(horizontal, w))) state.player.x = horizontal.x;
    const vertical = { ...state.player, y: state.player.y + dy * SPEED * dt };
    if (!walls.some(w => circleTouchesRect(vertical, w))) state.player.y = vertical.y;
  }
  let damage = 0;
  for (const vent of VENTS) {
    if (ventState(vent, state) === "active" && circleTouchesRect(state.player, vent, RADIUS - 3)) damage += 22;
  }
  for (const patrol of PATROLS) {
    if (distance(patrolPosition(patrol, state), state.player) < 34) damage += 32;
  }
  if (damage && state.barrier <= 0) {
    state.integrity = Math.max(0, state.integrity - damage * dt);
    state.hit = 1;
  }
  if (state.integrity <= 0) state.phase = "lost";
  else if (state.stage === 3 && state.player.x > EXIT.x && state.player.x < EXIT.x + EXIT.w
    && state.player.y > EXIT.y && state.player.y < EXIT.y + EXIT.h) state.phase = "won";
}
export function snapshot(state) {
  return {
    phase: state.phase, seed: state.seed, integrity: Math.round(state.integrity * 100) / 100,
    maxIntegrity: 100, carryingCore: state.carrying !== null, coresCollectedTotal: state.collected,
    relaysActivated: state.stage, worldStage: state.stage,
    abilityStatus: state.cooldown > 0 ? "cooldown" : "ready",
    exitUnlocked: state.stage === 3, elapsedMs: Math.round(state.elapsed),
    player: { x: Math.round(state.player.x * 100) / 100, y: Math.round(state.player.y * 100) / 100 },
    diagnostics: {
      objective: { coreCount: state.cores.length, relayCount: state.relays.length, exitCount: 1 },
      hazards: [
        { id: "pressure-vents", behavior: "Stationary floor vents telegraph, then damage on a timed duty cycle." },
        { id: "patrol-machines", behavior: "Moving machines patrol fixed paths and cause contact damage." }
      ],
      ability: { id: "barrier", limitation: "2.6 seconds of protection, then a 9 second start-to-start cooldown." },
      worldSignature: GATES.filter(g => state.stage < g.stage).map(g => g.id).join("|") + ";exit=" + (state.stage === 3)
    }
  };
}
