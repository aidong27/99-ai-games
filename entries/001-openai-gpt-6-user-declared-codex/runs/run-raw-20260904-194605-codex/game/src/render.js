import { WORLD, WALLS, GATES, VENTS, PATROLS, EXIT, clamp, ventState, patrolPosition } from "./level.js";
import { objective, nearbyAction } from "./simulation.js";

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  let width = 1000, height = 600, ratio = 1;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function text(value, x, y, size = 12, color = "#95aaa5", align = "left") {
    ctx.fillStyle = color; ctx.font = "600 " + size + "px ui-monospace, monospace";
    ctx.textAlign = align; ctx.fillText(value, x, y);
  }
  function line(x1, y1, x2, y2, color, thickness = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = thickness;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function ring(x, y, r, color, thickness = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = thickness;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }
  function rect(r, fill, stroke) {
    ctx.fillStyle = fill; ctx.fillRect(r.x, r.y, r.w, r.h);
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(r.x, r.y, r.w, r.h); }
  }
  function diamond(x, y, size, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill();
  }
  function minimap(state, camera) {
    const w = width < 600 ? 125 : 190, h = w * WORLD.height / WORLD.width;
    const left = width - w - 16, upper = 34, k = w / WORLD.width;
    ctx.save();
    rect({ x: left - 8, y: upper - 24, w: w + 16, h: h + 36 }, "#0b1719eb", "#354743");
    text("FACILITY / 99", left, upper - 9, 9, "#93b4aa");
    ctx.translate(left, upper); ctx.scale(k, k);
    rect({ x: 0, y: 0, w: WORLD.width, h: WORLD.height }, "#213532");
    for (const wall of WALLS) rect(wall, "#68867d");
    for (const gate of GATES) if (state.stage < gate.stage) rect(gate, "#d98967");
    for (const core of state.cores) if (!core.taken) diamond(core.x, core.y, 24, "#d8e79b");
    for (const relay of state.relays) {
      ctx.fillStyle = relay.active ? "#8cffc3" : "#8db2cf";
      ctx.fillRect(relay.x - 22, relay.y - 22, 44, 44);
    }
    rect(EXIT, state.stage === 3 ? "#8cffc3" : "#667474");
    ctx.strokeStyle = "#a8d5c555"; ctx.lineWidth = 5;
    ctx.strokeRect(camera.x, camera.y, camera.w, camera.h);
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(state.player.x, state.player.y, 25, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  return function draw(state) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#081312"; ctx.fillRect(0, 0, width, height);
    const viewWidth = width < 600 ? 700 : 1040;
    const scale = width / viewWidth, viewHeight = height / scale;
    const camera = {
      x: clamp(state.player.x - viewWidth / 2, 0, WORLD.width - viewWidth),
      y: clamp(state.player.y - viewHeight / 2, 0, Math.max(0, WORLD.height - viewHeight)),
      w: viewWidth, h: viewHeight
    };
    ctx.save(); ctx.scale(scale, scale); ctx.translate(-camera.x, -camera.y);
    rect({ x: 24, y: 24, w: 476, h: 952 }, "#152a25");
    rect({ x: 540, y: 24, w: 500, h: 952 }, "#192c2d");
    rect({ x: 1080, y: 24, w: 496, h: 952 }, "#1c292d");
    for (let x = 32; x < WORLD.width; x += 40) line(x, 24, x, 976, "#8abcd00b");
    for (let y = 32; y < WORLD.height; y += 40) line(24, y, 1576, y, "#8abcd00b");
    text("01 / INTAKE", 65, 82, 26, "#99c5b126");
    text("02 / CONTROL", 580, 82, 26, "#99bfc526");
    text("03 / PRESSURE", 1120, 82, 26, "#99bfc526");
    // Fixed service lanes help the player read a route through the facility.
    ctx.setLineDash([5, 12]);
    line(270, 210, 270, 850, "#b9d6c624", 2);
    line(170, 840, 1490, 840, "#b9d6c624", 2);
    line(800, 200, 1480, 200, "#b9d6c624", 2);
    ctx.setLineDash([]);
    for (const wall of WALLS) {
      rect({ ...wall, y: wall.y + 7 }, "#050b0d");
      rect(wall, "#293b38", "#476359");
      line(wall.x + 3, wall.y + 3, wall.x + wall.w - 3, wall.y + 3, "#587369");
      if (wall.w > 60 && wall.h > 60) {
        for (let y = wall.y + 16; y < wall.y + wall.h - 8; y += 12) line(wall.x + 10, y, wall.x + wall.w - 10, y, "#1c2a27", 4);
      }
    }
    for (const gate of GATES) {
      const locked = state.stage < gate.stage;
      rect(gate, locked ? "#533d2d" : "#214938", locked ? "#db9f6b" : "#74c599");
      if (locked) {
        for (let y = gate.y + 10; y < gate.y + gate.h; y += 18) line(gate.x + 3, y, gate.x + gate.w - 3, y - 8, "#d9985e", 3);
        text(String(gate.stage), gate.x + gate.w / 2, gate.y + gate.h / 2 + 5, 16, "#fff1cf", "center");
      } else {
        line(gate.x + 10, gate.y, gate.x + 10, gate.y + gate.h, "#a0f3c944", 2);
        line(gate.x + gate.w - 10, gate.y, gate.x + gate.w - 10, gate.y + gate.h, "#a0f3c944", 2);
      }
    }
    for (const vent of VENTS) {
      const phase = ventState(vent, state);
      rect(vent, phase === "active" ? "#6e3630" : "#233632", phase === "warning" ? "#e1b872" : "#75887e");
      for (let y = vent.y + 12; y < vent.y + vent.h; y += 13) {
        line(vent.x + 9, y, vent.x + vent.w - 9, y, phase === "active" ? "#f89874" : "#52665d", phase === "active" ? 4 : 2);
      }
      text(phase === "active" ? "HOT" : phase === "warning" ? "CAUTION" : "CLEAR",
        vent.x + vent.w / 2, vent.y - 9, 10, phase === "safe" ? "#92a79d" : "#ffc38b", "center");
      if (phase === "active" && !motion.matches) {
        for (let i = 0; i < 5; i++) {
          const drift = (state.elapsed / 80 + i * 16) % 60;
          ctx.globalAlpha = (1 - drift / 60) * 0.45;
          ring(vent.x + 18 + i * 23, vent.y + vent.h / 2 - drift, 3 + drift / 8, "#ffb994", 1);
        }
        ctx.globalAlpha = 1;
      }
    }
    rect(EXIT, state.stage === 3 ? "#284d40" : "#273133", state.stage === 3 ? "#a8ffc8" : "#647b76");
    for (let y = EXIT.y + 14; y < EXIT.y + EXIT.h; y += 19) {
      line(EXIT.x + 14, y + 7, EXIT.x + EXIT.w / 2, y - 2, state.stage === 3 ? "#a8ffc8" : "#617973", 2);
      line(EXIT.x + EXIT.w / 2, y - 2, EXIT.x + EXIT.w - 14, y + 7, state.stage === 3 ? "#a8ffc8" : "#617973", 2);
    }
    text(state.stage === 3 ? "EXTRACT" : "LOCKED", EXIT.x + EXIT.w / 2, EXIT.y - 12, 12, "#b0ceba", "center");
    for (const core of state.cores) {
      if (core.taken) continue;
      const pulse = motion.matches ? 0 : Math.sin(state.elapsed / 500) * 2;
      ring(core.x, core.y, 29 + pulse, "#e0ebae55", 1);
      diamond(core.x, core.y, 18, "#d5e8a1");
      diamond(core.x, core.y, 9, "#49615a");
      text("CORE " + core.name, core.x, core.y - 40, 12, "#ecf5c5", "center");
    }
    for (const relay of state.relays) {
      rect({ x: relay.x - 27, y: relay.y - 27, w: 54, h: 54 }, "#0c1717", relay.active ? "#8ee9be" : "#7fabb9");
      ring(relay.x, relay.y, 20, relay.active ? "#8ee9be" : "#688b98", 3);
      text(relay.active ? "ON" : relay.name, relay.x, relay.y + 5, 14, relay.active ? "#c8ffde" : "#adc9d1", "center");
      text("RELAY " + relay.name, relay.x, relay.y - 43, 11, "#bed3d8", "center");
      if (relay.active) {
        for (let i = 0; i < 4; i++) ring(relay.x, relay.y, 33 + i * 8, "#8ee9be18", 1);
      }
    }
    for (const patrol of PATROLS) {
      const p = patrolPosition(patrol, state);
      ctx.setLineDash([3, 9]); line(patrol.ax, patrol.ay, patrol.bx, patrol.by, "#ca827d33"); ctx.setLineDash([]);
      ring(p.x, p.y, 33, "#e6958544", 1);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(state.elapsed / 1500);
      rect({ x: -14, y: -14, w: 28, h: 28 }, "#423239", "#f0aa93");
      ctx.restore(); diamond(p.x, p.y, 6, "#ffbfab");
    }
    const p = state.player;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = "#01070877"; ctx.beginPath(); ctx.ellipse(0, 10, 23, 12, 0, 0, Math.PI * 2); ctx.fill();
    if (state.barrier > 0) {
      ring(0, 0, 37, "#a6f5d4", 3); ring(0, 0, 44, "#a6f5d444", 2);
    }
    ctx.rotate(p.angle);
    rect({ x: -12, y: -16, w: 20, h: 8 }, "#aab8b0", "#f2f7e9");
    rect({ x: -12, y: 8, w: 20, h: 8 }, "#aab8b0", "#f2f7e9");
    ctx.fillStyle = "#f1f5dd"; ctx.beginPath(); ctx.moveTo(23, 0); ctx.lineTo(-10, -11); ctx.lineTo(-16, 0); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
    rect({ x: -7, y: -5, w: 12, h: 10 }, "#2c7161");
    ctx.restore();
    if (state.carrying !== null) { diamond(p.x, p.y - 32, 9, "#e5efa9"); }
    const target = objective(state);
    if (target) {
      const tx = clamp(target.x, camera.x + 35, camera.x + camera.w - 35);
      const ty = clamp(target.y, camera.y + 42, camera.y + camera.h - 50);
      if (Math.abs(tx - target.x) > 3 || Math.abs(ty - target.y) > 3) {
        diamond(tx, ty, 9, "#d8eaa6");
        text(Math.round(Math.hypot(target.x - p.x, target.y - p.y) / 10) + "m", tx, ty + 25, 12, "#edf6c8", "center");
      }
    }
    ctx.restore();
    minimap(state, camera);
    const action = nearbyAction(state);
    if (action && state.phase === "playing") {
      const box = { x: width / 2 - 130, y: height - 56, w: 260, h: 36 };
      rect(box, "#0b1719ec", "#89b59f");
      text("[E] " + action, width / 2, height - 33, 12, "#e6f5d7", "center");
    }
    if (state.hit > 0 && !motion.matches) {
      ctx.strokeStyle = "rgba(240,140,112," + state.hit * 0.55 + ")";
      ctx.lineWidth = 5; ctx.strokeRect(2, 2, width - 4, height - 4);
    }
  };
}
