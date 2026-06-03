/*
 * Lumen Lattice: Prism Archive
 * Observation 002 / Game 002 — Puzzle Logic Hall
 *
 * A deterministic constraint puzzle. Every prism is aligned (lit) or dark.
 * Pressing a prism applies a fixed linear transformation over GF(2) to a set
 * of prisms decided by the active rule. Align every prism to synchronize the
 * lattice.
 *
 * Solvability is guaranteed by construction: each lattice is built by scrambling
 * a fully aligned board with random presses. Because every press is its own
 * inverse and presses commute, re-applying the tracked press set always restores
 * the solved board. That same tracked parity powers a reliable hint and autoSolve.
 */

const canvas = document.querySelector("#lattice-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.querySelector("#level-readout"),
  moves: document.querySelector("#moves-readout"),
  par: document.querySelector("#par-readout"),
  aligned: document.querySelector("#aligned-readout"),
  ruleName: document.querySelector("#rule-name"),
  ruleNote: document.querySelector("#rule-note"),
  directive: document.querySelector("#directive"),
  progressLabel: document.querySelector("#progress-label"),
  progressMeter: document.querySelector("#progress-meter"),
  overlay: document.querySelector("#overlay"),
  overlayKicker: document.querySelector("#overlay-kicker"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayCopy: document.querySelector("#overlay-copy"),
  overlayRule: document.querySelector("#overlay-rule"),
  overlayActions: document.querySelector("#overlay-actions"),
  hintButton: document.querySelector("#hint-button"),
  undoButton: document.querySelector("#undo-button"),
  resetButton: document.querySelector("#reset-button"),
  pauseButton: document.querySelector("#pause-button"),
  hitGrid: document.querySelector("#lattice-hit-grid")
};

const WORLD = 900;
const MARGIN = 80;
const BASE_SEED = 0x9e3779b1;

const RULES = {
  pulse: {
    name: "Pulse",
    note: "Flips the prism you press and its four orthogonal neighbours.",
    offsets: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]
  },
  beam: {
    name: "Beam",
    note: "Flips every prism in the pressed prism's row and column.",
    offsets: null // full row + column, handled in applyRule
  },
  split: {
    name: "Split",
    note: "Flips the prism you press and its four diagonal neighbours.",
    offsets: [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
  }
};

const LEVELS = [
  { size: 4, rule: "pulse", scramble: 3, par: 3, tutorial: true },
  { size: 4, rule: "beam", scramble: 4, par: 4 },
  { size: 5, rule: "pulse", scramble: 6, par: 6 },
  { size: 5, rule: "split", scramble: 6, par: 6 },
  { size: 6, rule: "beam", scramble: 8, par: 8 },
  { size: 6, rule: "pulse", scramble: 10, par: 10 }
];

let state = createInitialState();
let lastTime = performance.now();
let seenRules = new Set();

function createInitialState() {
  const size = LEVELS[0].size;
  return {
    mode: "menu",
    levelIndex: 0,
    size,
    rule: LEVELS[0].rule,
    par: LEVELS[0].par,
    grid: makeGrid(size, false),
    remaining: makeGrid(size, false),
    history: [],
    cursor: { row: 0, col: 0 },
    moves: 0,
    beams: [],
    cellFx: [],
    hintCell: null,
    hintUntil: 0,
    time: 0,
    solvedLevels: 0,
    resumeMode: "playing"
  };
}

function makeGrid(size, value) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value));
}

function ruleCells(rule, size, row, col) {
  const cells = [];
  if (rule === "beam") {
    for (let i = 0; i < size; i += 1) {
      cells.push([row, i]);
    }
    for (let i = 0; i < size; i += 1) {
      if (i !== row) {
        cells.push([i, col]);
      }
    }
    return cells;
  }

  for (const [dr, dc] of RULES[rule].offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nc >= 0 && nr < size && nc < size) {
      cells.push([nr, nc]);
    }
  }
  return cells;
}

function applyRule(grid, rule, row, col) {
  for (const [r, c] of ruleCells(rule, grid.length, row, col)) {
    grid[r][c] = !grid[r][c];
  }
}

function isSolved(grid = state.grid) {
  return grid.every((line) => line.every((cell) => cell));
}

function alignedCount(grid = state.grid) {
  let total = 0;
  for (const line of grid) {
    for (const cell of line) {
      if (cell) {
        total += 1;
      }
    }
  }
  return total;
}

function remainingMoves() {
  let total = 0;
  for (const line of state.remaining) {
    for (const cell of line) {
      if (cell) {
        total += 1;
      }
    }
  }
  return total;
}

function startLevel(index) {
  const clamped = clamp(index, 0, LEVELS.length - 1);
  const config = LEVELS[clamped];
  const size = config.size;
  const rng = mulberry32(BASE_SEED + (clamped + 1) * 0x85ebca77);

  const grid = makeGrid(size, true);
  const remaining = makeGrid(size, false);

  let applied = 0;
  let guard = 0;
  while (applied < config.scramble || isSolved(grid)) {
    const row = Math.floor(rng() * size);
    const col = Math.floor(rng() * size);
    applyRule(grid, config.rule, row, col);
    remaining[row][col] = !remaining[row][col];
    applied += 1;
    guard += 1;
    if (guard > 1000) {
      break;
    }
  }

  state.levelIndex = clamped;
  state.size = size;
  state.rule = config.rule;
  state.par = config.par;
  state.grid = grid;
  state.remaining = remaining;
  state.history = [];
  state.cursor = { row: 0, col: 0 };
  state.moves = 0;
  state.beams = [];
  state.cellFx = [];
  state.hintCell = null;
  state.hintUntil = 0;
  state.mode = "playing";
  state.resumeMode = "playing";
  seenRules.add(config.rule);

  syncHitGrid();
  hideOverlay();
  updateUi();
}

function pressCell(row, col, fromUndo = false) {
  if (state.mode !== "playing") {
    return false;
  }
  if (row < 0 || col < 0 || row >= state.size || col >= state.size) {
    return false;
  }

  applyRule(state.grid, state.rule, row, col);
  state.remaining[row][col] = !state.remaining[row][col];
  spawnEffects(row, col);

  if (fromUndo) {
    state.moves = Math.max(0, state.moves - 1);
  } else {
    state.history.push({ row, col });
    state.moves += 1;
  }

  if (state.hintCell && state.hintCell.row === row && state.hintCell.col === col) {
    state.hintCell = null;
  }

  if (isSolved(state.grid)) {
    solveLevel();
  }

  updateUi();
  return true;
}

function undo() {
  if (state.mode !== "playing" || state.history.length === 0) {
    return;
  }
  const last = state.history.pop();
  pressCell(last.row, last.col, true);
}

function reset() {
  startLevel(state.levelIndex);
}

function restart() {
  seenRules = new Set();
  startLevel(0);
}

function showHint() {
  if (state.mode !== "playing") {
    return;
  }
  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      if (state.remaining[row][col]) {
        state.hintCell = { row, col };
        state.hintUntil = state.time + 2.6;
        state.cursor = { row, col };
        updateUi();
        return;
      }
    }
  }
  // No tracked presses remain: the board is already aligned.
  state.hintCell = null;
}

function solveLevel() {
  state.beams = [];
  state.solvedLevels = Math.max(state.solvedLevels, state.levelIndex + 1);
  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      state.cellFx.push({ row, col, born: state.time, kind: "win" });
    }
  }

  const isFinal = state.levelIndex >= LEVELS.length - 1;
  const rating = state.moves <= state.par
    ? "Optimal alignment — at or under par."
    : `Synchronized in ${state.moves} moves (par ${state.par}).`;

  if (isFinal) {
    state.mode = "won";
    showOverlay({
      kicker: "Archive synchronized",
      title: "The Prism Archive is complete",
      copy: `Every lattice is aligned. ${rating} All ${LEVELS.length} lattices are in phase.`,
      ruleText: "",
      actions: [{ label: "Replay archive", primary: true, fn: restart }]
    });
  } else {
    state.mode = "cleared";
    const next = LEVELS[state.levelIndex + 1];
    const newRule = !seenRules.has(next.rule);
    showOverlay({
      kicker: `Lattice ${state.levelIndex + 1} synchronized`,
      title: "Lattice aligned",
      copy: `${rating}`,
      ruleText: newRule ? `New rule — ${RULES[next.rule].name}: ${RULES[next.rule].note}` : "",
      actions: [{ label: "Continue", primary: true, fn: () => startLevel(state.levelIndex + 1) }]
    });
  }
}

function togglePause() {
  if (state.mode === "playing") {
    state.resumeMode = "playing";
    state.mode = "paused";
    showOverlay({
      kicker: "Archive paused",
      title: "Paused",
      copy: "The lattice is held. Resume when you are ready, or restart this lattice.",
      ruleText: `Active rule — ${RULES[state.rule].name}: ${RULES[state.rule].note}`,
      actions: [
        { label: "Resume", primary: true, fn: resume },
        { label: "Restart lattice", primary: false, fn: reset }
      ]
    });
    updateUi();
  } else if (state.mode === "paused") {
    resume();
  }
}

function resume() {
  state.mode = "playing";
  hideOverlay();
  updateUi();
}

function moveCursor(dRow, dCol) {
  if (state.mode !== "playing") {
    return;
  }
  state.cursor.row = clamp(state.cursor.row + dRow, 0, state.size - 1);
  state.cursor.col = clamp(state.cursor.col + dCol, 0, state.size - 1);
  focusHitButton(state.cursor.row, state.cursor.col);
}

function spawnEffects(row, col) {
  const cells = ruleCells(state.rule, state.size, row, col);
  for (const [r, c] of cells) {
    state.cellFx.push({ row: r, col: c, born: state.time, kind: "flip" });
  }
  if (state.rule === "beam") {
    state.beams.push({ type: "row", index: row, born: state.time });
    state.beams.push({ type: "col", index: col, born: state.time });
  }
  if (state.cellFx.length > 400) {
    state.cellFx.splice(0, state.cellFx.length - 400);
  }
  state.beams = state.beams.filter((beam) => state.time - beam.born < 0.6);
}

function update(dt) {
  state.time += dt;
  state.beams = state.beams.filter((beam) => state.time - beam.born < 0.6);
  state.cellFx = state.cellFx.filter((fx) => state.time - fx.born < (fx.kind === "win" ? 1.1 : 0.5));
  if (state.hintCell && state.time > state.hintUntil) {
    state.hintCell = null;
  }
}

function geometry() {
  const size = state.size;
  const span = WORLD - MARGIN * 2;
  const gap = span * 0.06 / size;
  const cell = (span - gap * (size - 1)) / size;
  return { size, span, gap, cell, origin: MARGIN };
}

function cellRect(geo, row, col) {
  return {
    x: geo.origin + col * (geo.cell + geo.gap),
    y: geo.origin + row * (geo.cell + geo.gap),
    w: geo.cell,
    h: geo.cell
  };
}

function render() {
  ctx.clearRect(0, 0, WORLD, WORLD);
  drawBackground();
  const geo = geometry();
  drawBeams(geo);
  drawPrisms(geo);
  if (state.mode === "playing") {
    drawCursor(geo);
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, WORLD, WORLD);
  gradient.addColorStop(0, "#090a0b");
  gradient.addColorStop(1, "#050607");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD, WORLD);

  ctx.strokeStyle = "rgba(244, 241, 232, 0.035)";
  ctx.lineWidth = 1;
  for (let x = MARGIN; x <= WORLD - MARGIN; x += (WORLD - MARGIN * 2) / 12) {
    ctx.beginPath();
    ctx.moveTo(x, MARGIN);
    ctx.lineTo(x, WORLD - MARGIN);
    ctx.stroke();
  }
  for (let y = MARGIN; y <= WORLD - MARGIN; y += (WORLD - MARGIN * 2) / 12) {
    ctx.beginPath();
    ctx.moveTo(MARGIN, y);
    ctx.lineTo(WORLD - MARGIN, y);
    ctx.stroke();
  }
}

function drawBeams(geo) {
  for (const beam of state.beams) {
    const life = 1 - (state.time - beam.born) / 0.6;
    if (life <= 0) {
      continue;
    }
    ctx.fillStyle = `rgba(216, 247, 95, ${0.12 * life})`;
    if (beam.type === "row") {
      const rect = cellRect(geo, beam.index, 0);
      ctx.fillRect(geo.origin - geo.gap, rect.y - geo.gap * 0.4, geo.span + geo.gap * 2, rect.h + geo.gap * 0.8);
    } else {
      const rect = cellRect(geo, 0, beam.index);
      ctx.fillRect(rect.x - geo.gap * 0.4, geo.origin - geo.gap, rect.w + geo.gap * 0.8, geo.span + geo.gap * 2);
    }
  }
}

function fxAt(row, col) {
  let flip = 0;
  let win = 0;
  for (const fx of state.cellFx) {
    const span = fx.kind === "win" ? 1.1 : 0.5;
    const life = 1 - (state.time - fx.born) / span;
    if (fx.row === row && fx.col === col && life > 0) {
      if (fx.kind === "win") {
        win = Math.max(win, life);
      } else {
        flip = Math.max(flip, life);
      }
    }
  }
  return { flip, win };
}

function drawPrisms(geo) {
  for (let row = 0; row < geo.size; row += 1) {
    for (let col = 0; col < geo.size; col += 1) {
      const rect = cellRect(geo, row, col);
      const lit = state.grid[row][col];
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const radius = Math.max(10, geo.cell * 0.16);
      const { flip, win } = fxAt(row, col);

      // Cell housing.
      roundRect(rect.x, rect.y, rect.w, rect.h, radius);
      ctx.fillStyle = lit ? "rgba(244, 241, 232, 0.04)" : "rgba(255, 255, 255, 0.015)";
      ctx.fill();
      ctx.strokeStyle = lit ? "rgba(216, 247, 95, 0.30)" : "rgba(244, 241, 232, 0.10)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner prism (diamond).
      const d = rect.w * 0.30;
      ctx.beginPath();
      ctx.moveTo(cx, cy - d);
      ctx.lineTo(cx + d, cy);
      ctx.lineTo(cx, cy + d);
      ctx.lineTo(cx - d, cy);
      ctx.closePath();

      if (lit) {
        const glow = ctx.createRadialGradient(cx, cy, d * 0.1, cx, cy, d * 1.5);
        glow.addColorStop(0, "rgba(244, 241, 232, 0.96)");
        glow.addColorStop(0.55, "rgba(216, 247, 95, 0.55)");
        glow.addColorStop(1, "rgba(216, 247, 95, 0.05)");
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.strokeStyle = "rgba(244, 241, 232, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(244, 241, 232, 0.22)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Recently flipped feedback.
      if (flip > 0) {
        roundRect(rect.x, rect.y, rect.w, rect.h, radius);
        ctx.strokeStyle = `rgba(127, 233, 224, ${0.85 * flip})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if (win > 0) {
        roundRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6, radius + 2);
        ctx.strokeStyle = `rgba(216, 247, 95, ${0.9 * win})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Hint marker.
      const isHint = state.hintCell && state.hintCell.row === row && state.hintCell.col === col;
      if (isHint) {
        const pulse = 0.45 + Math.sin(state.time * 6) * 0.4;
        roundRect(rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 10, radius + 3);
        ctx.strokeStyle = `rgba(127, 233, 224, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }
}

function drawCursor(geo) {
  const rect = cellRect(geo, state.cursor.row, state.cursor.col);
  const radius = Math.max(10, geo.cell * 0.16);
  roundRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4, radius + 2);
  ctx.strokeStyle = "rgba(216, 247, 95, 0.9)";
  ctx.setLineDash([12, 9]);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function updateUi() {
  const total = state.size * state.size;
  const lit = alignedCount();
  const rule = RULES[state.rule];

  ui.level.textContent = `${state.levelIndex + 1} / ${LEVELS.length}`;
  ui.moves.textContent = String(state.moves);
  ui.par.textContent = String(state.par);
  ui.aligned.textContent = `${lit} / ${total}`;
  ui.ruleName.textContent = rule.name;
  ui.ruleNote.textContent = rule.note;
  ui.progressLabel.textContent = `Aligned ${lit} / ${total}`;
  ui.progressMeter.style.width = `${Math.round(lit / total * 100)}%`;

  if (isSolved() && state.mode !== "playing") {
    ui.directive.textContent = "Lattice synchronized.";
  } else {
    ui.directive.textContent = "Align every prism to synchronize the lattice.";
  }

  const playing = state.mode === "playing";
  ui.undoButton.disabled = !playing || state.history.length === 0;
  ui.hintButton.disabled = !playing;
  ui.resetButton.disabled = state.mode === "menu";
  ui.hitGrid.hidden = !playing;
  syncHitGridState();

  canvas.dataset.mode = state.mode;
  canvas.dataset.level = String(state.levelIndex + 1);
  canvas.dataset.rule = state.rule;
  canvas.dataset.moves = String(state.moves);
  canvas.dataset.aligned = String(lit);
  canvas.dataset.total = String(total);
  canvas.dataset.solved = String(lit === total);
}

function syncHitGrid() {
  if (!ui.hitGrid) {
    return;
  }
  const size = state.size;
  const geo = geometry();
  ui.hitGrid.style.setProperty("--lattice-size", String(size));
  ui.hitGrid.style.setProperty("--lattice-gap", `${(geo.gap / WORLD * 100).toFixed(3)}%`);

  const expected = size * size;
  if (ui.hitGrid.children.length !== expected) {
    const buttons = [];
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        buttons.push(button);
      }
    }
    ui.hitGrid.replaceChildren(...buttons);
  }
  syncHitGridState();
}

function syncHitGridState() {
  if (!ui.hitGrid) {
    return;
  }
  for (const button of ui.hitGrid.querySelectorAll("button")) {
    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);
    const lit = Boolean(state.grid[row]?.[col]);
    const hinted = state.hintCell && state.hintCell.row === row && state.hintCell.col === col;
    button.disabled = state.mode !== "playing";
    button.dataset.lit = String(lit);
    button.dataset.hint = String(Boolean(hinted));
    button.setAttribute("aria-label", `Prism row ${row + 1}, column ${col + 1}${lit ? ", aligned" : ", dark"}`);
  }
}

function focusHitButton(row, col) {
  if (!ui.hitGrid || ui.hitGrid.hidden) {
    return;
  }
  const button = ui.hitGrid.querySelector(`button[data-row="${row}"][data-col="${col}"]`);
  if (button && document.activeElement !== button) {
    button.focus({ preventScroll: true });
  }
}

function showOverlay({ kicker, title, copy, ruleText, actions }) {
  ui.overlay.classList.remove("hidden");
  ui.overlayKicker.textContent = kicker ?? "Observation 002 / Game 002";
  ui.overlayTitle.textContent = title ?? "";
  ui.overlayCopy.textContent = copy ?? "";

  if (ruleText) {
    ui.overlayRule.textContent = ruleText;
    ui.overlayRule.hidden = false;
  } else {
    ui.overlayRule.textContent = "";
    ui.overlayRule.hidden = true;
  }

  const buttons = (actions ?? []).map((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.primary ? "button primary" : "button";
    button.textContent = action.label;
    button.addEventListener("click", action.fn);
    return button;
  });
  ui.overlayActions.replaceChildren(...buttons);
}

function hideOverlay() {
  ui.overlay.classList.add("hidden");
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
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

// Input -------------------------------------------------------------------

ui.hitGrid.addEventListener("pointerdown", (event) => {
  event.preventDefault();
});

ui.hitGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-row][data-col]");
  if (!button) {
    return;
  }
  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  state.cursor = { row, col };
  pressCell(row, col);
});

ui.hintButton.addEventListener("click", showHint);
ui.undoButton.addEventListener("click", undo);
ui.resetButton.addEventListener("click", reset);
ui.pauseButton.addEventListener("click", togglePause);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const handled = [
    "arrowup", "arrowdown", "arrowleft", "arrowright",
    " ", "enter", "w", "a", "s", "d", "h", "u", "r", "p"
  ];
  if (handled.includes(key)) {
    event.preventDefault();
  }

  if (state.mode === "menu") {
    if (key === "enter" || key === " ") {
      startLevel(0);
    }
    return;
  }

  if (state.mode === "cleared" || state.mode === "won") {
    if (key === "enter" || key === " ") {
      const primary = ui.overlayActions.querySelector(".button.primary");
      primary?.click();
    }
    return;
  }

  if (key === "p") {
    togglePause();
    return;
  }

  if (state.mode === "paused") {
    if (key === "enter" || key === " ") {
      resume();
    }
    return;
  }

  // Playing.
  if (key === "arrowup" || key === "w") {
    moveCursor(-1, 0);
  } else if (key === "arrowdown" || key === "s") {
    moveCursor(1, 0);
  } else if (key === "arrowleft" || key === "a") {
    moveCursor(0, -1);
  } else if (key === "arrowright" || key === "d") {
    moveCursor(0, 1);
  } else if (key === "enter" || key === " ") {
    pressCell(state.cursor.row, state.cursor.col);
  } else if (key === "h") {
    showHint();
  } else if (key === "u") {
    undo();
  } else if (key === "r") {
    reset();
  }
});

// QA hooks ----------------------------------------------------------------

window.__lumenLatticeQA = {
  start: () => startLevel(0),
  startLevel,
  restart,
  reset,
  undo,
  hint: showHint,
  clickCell: (row, col) => pressCell(row, col),
  isSolved: () => isSolved(),
  autoSolve() {
    const pending = [];
    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        if (state.remaining[row][col]) {
          pending.push({ row, col });
        }
      }
    }
    for (const move of pending) {
      pressCell(move.row, move.col);
    }
    return isSolved();
  },
  getSnapshot() {
    const total = state.size * state.size;
    const lit = alignedCount();
    return {
      mode: state.mode,
      level: state.levelIndex + 1,
      levelCount: LEVELS.length,
      size: state.size,
      rule: state.rule,
      moves: state.moves,
      par: state.par,
      aligned: lit,
      total,
      progress: total ? lit / total : 0,
      solved: isSolved(),
      remainingMoves: remainingMoves(),
      cursor: { ...state.cursor },
      hint: state.hintCell ? { ...state.hintCell } : null,
      won: state.mode === "won"
    };
  }
};

// Boot --------------------------------------------------------------------

updateUi();
showOverlay({
  kicker: "Observation 002 / Game 002",
  title: "Lumen Lattice: Prism Archive",
  copy: "Align every prism to synchronize the lattice. Each press sends light through a fixed pattern.",
  ruleText: `Lattice 1 — ${RULES.pulse.name}: ${RULES.pulse.note}`,
  actions: [{ label: "Enter the archive", primary: true, fn: () => startLevel(0) }]
});
requestAnimationFrame(loop);
