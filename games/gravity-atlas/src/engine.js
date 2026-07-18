/*
 * Gravity Atlas — deterministic physics engine.
 * Observation 005 / Game 005 — Physics Experiment Hall
 *
 * This module is pure and shared verbatim by the browser page (src/main.js)
 * and the Node verifier (scripts/verify-gravity-atlas.mjs). The integrator is
 * a fixed-timestep semi-implicit Euler over softened inverse-square wells,
 * using only +, -, *, / and Math.sqrt, so a launch vector replays to the same
 * trajectory in both runtimes. Reference solutions below were found by random
 * search through this same engine and prove every plate is completable.
 */

export const WORLD = { width: 1280, height: 720 };
export const DT = 1 / 120;
export const MAX_TIME = 10;
export const POWER_CAP = 560;
export const PROBE_RADIUS = 7;
const SOFTEN = 900;
const OUT_MARGIN = 36;

// pull > 0 attracts, pull < 0 repels. core is the lethal radius of a well.
export const LEVELS = [
  {
    name: "Plate I — Open Field",
    note: "No gravity. Read the aim line, set power, hit the ring.",
    pad: { x: 130, y: 360 },
    target: { x: 1110, y: 360, r: 30 },
    wells: [],
    voids: [],
    budget: 4,
    par: 1
  },
  {
    name: "Plate II — One Mass",
    note: "A single mass bends every path. Aim off-center and let it curve you in.",
    pad: { x: 130, y: 560 },
    target: { x: 1130, y: 180, r: 28 },
    wells: [{ x: 640, y: 380, pull: 2.6e6, core: 34 }],
    voids: [],
    budget: 5,
    par: 2
  },
  {
    name: "Plate III — Twin Masses",
    note: "Two masses make a channel. Thread it or swing wide.",
    pad: { x: 120, y: 360 },
    target: { x: 1140, y: 360, r: 26 },
    wells: [
      { x: 520, y: 210, pull: 2.4e6, core: 32 },
      { x: 760, y: 520, pull: 2.4e6, core: 32 }
    ],
    voids: [],
    budget: 5,
    par: 2
  },
  {
    name: "Plate IV — The Gate",
    note: "Void zones erase the probe. Curve through the gate between them.",
    pad: { x: 130, y: 600 },
    target: { x: 1120, y: 140, r: 26 },
    wells: [{ x: 700, y: 420, pull: 3.0e6, core: 36 }],
    voids: [
      { x: 640, y: 80, r: 120 },
      { x: 560, y: 660, r: 120 },
      { x: 980, y: 560, r: 110 }
    ],
    budget: 6,
    par: 2
  },
  {
    name: "Plate V — Repulsor",
    note: "The bright mass pushes. Use the shove, then let the far mass catch you.",
    pad: { x: 120, y: 200 },
    target: { x: 1140, y: 520, r: 28 },
    wells: [
      { x: 450, y: 380, pull: -1.5e6, core: 30 },
      { x: 860, y: 440, pull: 2.5e6, core: 34 }
    ],
    voids: [{ x: 660, y: 90, r: 95 }],
    budget: 6,
    par: 2
  },
  {
    name: "Plate VI — The Atlas",
    note: "Three masses, narrow voids, one long curve. The final plate.",
    pad: { x: 110, y: 360 },
    target: { x: 1170, y: 360, r: 24 },
    wells: [
      { x: 430, y: 200, pull: 2.3e6, core: 30 },
      { x: 660, y: 520, pull: 2.6e6, core: 32 },
      { x: 950, y: 230, pull: 2.3e6, core: 30 }
    ],
    voids: [
      { x: 320, y: 620, r: 105 },
      { x: 1000, y: 600, r: 110 }
    ],
    budget: 7,
    par: 3
  }
];

/*
 * Launch vectors (px/s) proving each plate is completable, found by random
 * search through this engine and replayed by scripts/verify-gravity-atlas.mjs.
 * Values are exact doubles; do not round them.
 */
export const REFERENCE_SOLUTIONS = [
  { "vx": 552.7441937320065, "vy": 12.940888152874201 },
  { "vx": 518.343661459025, "vy": -123.1983512588845 },
  { "vx": 526.5819705326791, "vy": 1.9460198969745985 },
  { "vx": 482.24616309409254, "vy": -265.77151044474016 },
  { "vx": 522.9851293558714, "vy": 162.32116676249302 },
  { "vx": 553.4339524524377, "vy": 16.27752364061942 }
];

export function createShot(levelIndex, vx, vy) {
  const level = LEVELS[levelIndex];
  const state = {
    x: level.pad.x,
    y: level.pad.y,
    vx,
    vy,
    t: 0,
    outcome: null
  };

  function step() {
    if (state.outcome) {
      return state.outcome;
    }

    let ax = 0;
    let ay = 0;
    for (const well of level.wells) {
      const dx = well.x - state.x;
      const dy = well.y - state.y;
      const d2 = dx * dx + dy * dy + SOFTEN;
      const d = Math.sqrt(d2);
      const a = well.pull / (d2 * d);
      ax += dx * a;
      ay += dy * a;
    }

    state.vx += ax * DT;
    state.vy += ay * DT;
    state.x += state.vx * DT;
    state.y += state.vy * DT;
    state.t += DT;

    for (const well of level.wells) {
      const dx = well.x - state.x;
      const dy = well.y - state.y;
      if (dx * dx + dy * dy < (well.core + PROBE_RADIUS) * (well.core + PROBE_RADIUS)) {
        state.outcome = "well";
        return state.outcome;
      }
    }
    for (const zone of level.voids) {
      const dx = zone.x - state.x;
      const dy = zone.y - state.y;
      if (dx * dx + dy * dy < (zone.r + PROBE_RADIUS) * (zone.r + PROBE_RADIUS)) {
        state.outcome = "void";
        return state.outcome;
      }
    }
    {
      const dx = level.target.x - state.x;
      const dy = level.target.y - state.y;
      if (dx * dx + dy * dy < (level.target.r + PROBE_RADIUS) * (level.target.r + PROBE_RADIUS)) {
        state.outcome = "target";
        return state.outcome;
      }
    }
    if (
      state.x < -OUT_MARGIN || state.x > WORLD.width + OUT_MARGIN ||
      state.y < -OUT_MARGIN || state.y > WORLD.height + OUT_MARGIN
    ) {
      state.outcome = "bounds";
      return state.outcome;
    }
    if (state.t >= MAX_TIME) {
      state.outcome = "timeout";
      return state.outcome;
    }
    return null;
  }

  return { state, step };
}

export function simulateShot(levelIndex, vx, vy, capturePath = false) {
  const shot = createShot(levelIndex, vx, vy);
  const path = capturePath ? [{ x: shot.state.x, y: shot.state.y }] : null;
  let outcome = null;
  let steps = 0;
  while (!outcome) {
    outcome = shot.step();
    steps += 1;
    if (capturePath && steps % 3 === 0) {
      path.push({ x: shot.state.x, y: shot.state.y });
    }
  }
  if (capturePath) {
    path.push({ x: shot.state.x, y: shot.state.y });
  }
  return { outcome, t: shot.state.t, path };
}

export function clampPower(vx, vy) {
  const mag = Math.sqrt(vx * vx + vy * vy);
  if (mag <= POWER_CAP || mag === 0) {
    return { vx, vy };
  }
  const scale = POWER_CAP / mag;
  return { vx: vx * scale, vy: vy * scale };
}
