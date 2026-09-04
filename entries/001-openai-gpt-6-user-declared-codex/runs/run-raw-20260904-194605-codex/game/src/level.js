export const WORLD = { width: 1600, height: 1000 };
export const SPEED = 85;
export const RADIUS = 14;
export const CORES = [
  { x: 160, y: 160, name: "I" },
  { x: 800, y: 180, name: "II" },
  { x: 1460, y: 180, name: "III" }
];
export const RELAYS = [
  { x: 800, y: 840, name: "01", change: "West crossway opened. Pressure duty reduced." },
  { x: 1320, y: 820, name: "02", change: "North and east crossways opened." },
  { x: 160, y: 460, name: "03", change: "Extraction bridge restored. Reach the east dock." }
];
export const EXIT = { x: 1430, y: 862, w: 96, h: 90 };
export const VENTS = [
  { x: 90, y: 640, w: 140, h: 90, phase: 0 },
  { x: 750, y: 360, w: 170, h: 85, phase: 2 },
  { x: 1370, y: 630, w: 170, h: 90, phase: 4 },
  { x: 600, y: 785, w: 95, h: 115, phase: 1 }
];
export const PATROLS = [
  { ax: 100, ay: 310, bx: 420, by: 310, phase: 0 },
  { ax: 930, ay: 100, bx: 930, by: 750, phase: 1.8 },
  { ax: 1120, ay: 600, bx: 1510, by: 600, phase: 3.2 }
];
export const GATES = [
  { id: "west-crossway", x: 500, y: 400, w: 40, h: 130, stage: 1 },
  { id: "west-north", x: 500, y: 140, w: 40, h: 130, stage: 2 },
  { id: "east-crossway", x: 1040, y: 450, w: 40, h: 160, stage: 2 },
  { id: "extraction-bridge", x: 1040, y: 800, w: 40, h: 110, stage: 3 }
];
export const WALLS = [
  { x: 0, y: 0, w: 1600, h: 24 }, { x: 0, y: 976, w: 1600, h: 24 },
  { x: 0, y: 0, w: 24, h: 1000 }, { x: 1576, y: 0, w: 24, h: 1000 },
  { x: 500, y: 24, w: 40, h: 116 }, { x: 500, y: 270, w: 40, h: 130 },
  { x: 500, y: 530, w: 40, h: 230 }, { x: 500, y: 900, w: 40, h: 76 },
  { x: 1040, y: 24, w: 40, h: 116 }, { x: 1040, y: 270, w: 40, h: 180 },
  { x: 1040, y: 610, w: 40, h: 190 }, { x: 1040, y: 910, w: 40, h: 66 },
  { x: 320, y: 300, w: 125, h: 115 },
  { x: 640, y: 530, w: 120, h: 110 },
  { x: 1220, y: 430, w: 190, h: 100 }
];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function circleTouchesRect(p, r, radius = RADIUS) {
  return Math.hypot(p.x - clamp(p.x, r.x, r.x + r.w), p.y - clamp(p.y, r.y, r.y + r.h)) < radius;
}
export function ventState(vent, state) {
  const period = 8;
  const t = (state.elapsed / 1000 + vent.phase + state.seed % period) % period;
  const activeEnd = state.stage >= 1 ? 4 : 5;
  return t < 2 ? "warning" : t < activeEnd ? "active" : "safe";
}
export function patrolPosition(patrol, state) {
  const t = state.elapsed / 1000 * 0.45 + patrol.phase + (state.seed % 17) * 0.1;
  const k = (Math.sin(t) + 1) / 2;
  return { x: patrol.ax + (patrol.bx - patrol.ax) * k, y: patrol.ay + (patrol.by - patrol.ay) * k };
}
