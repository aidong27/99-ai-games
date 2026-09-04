import { createState, step, interact, useBarrier, objective, nearbyAction, snapshot } from "./simulation.js";
import { createRenderer } from "./render.js";

const requestedSeed = Number(new URLSearchParams(location.search).get("seed"));
const seed = Number.isSafeInteger(requestedSeed) && requestedSeed >= 0 ? requestedSeed : 99;
let state = createState(seed);
const keys = new Set();
const canvas = document.querySelector("#arena");
const draw = createRenderer(canvas);
const refs = Object.fromEntries(["intro", "pause-screen", "victory", "defeat", "clock",
  "integrity-value", "integrity-meter", "cargo-value", "relay-value", "exit-value",
  "mission", "stage-label", "status-message", "ability-value", "victory-time"]
  .map(id => [id, document.getElementById(id)]));
const pauseButton = document.querySelector('[data-p99-action="pause"]');
const restartButton = document.querySelector('[data-p99-action="restart"]');
const abilityButton = document.querySelector('[data-p99-action="ability"]');
const touchKeys = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
const handledKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown",
  "ArrowLeft", "ArrowRight", "KeyE", "Space", "ShiftLeft", "ShiftRight", "Escape", "KeyP", "KeyR"]);
function write(element, value) { if (element.textContent !== value) element.textContent = value; }
function time(ms) {
  const seconds = Math.floor(ms / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}
function updateUI() {
  refs.intro.hidden = state.phase !== "title";
  refs["pause-screen"].hidden = state.phase !== "paused";
  refs.victory.hidden = state.phase !== "won";
  refs.defeat.hidden = state.phase !== "lost";
  restartButton.hidden = !["won", "lost"].includes(state.phase);
  pauseButton.disabled = !["playing", "paused"].includes(state.phase);
  write(pauseButton, state.phase === "paused" ? "Resume" : "Pause");
  pauseButton.setAttribute("aria-label", state.phase === "paused" ? "Resume game" : "Pause game");
  abilityButton.disabled = state.phase !== "playing" || state.cooldown > 0;
  write(refs.clock, time(state.elapsed));
  write(refs["integrity-value"], String(Math.ceil(state.integrity)));
  refs["integrity-meter"].value = state.integrity;
  write(refs["cargo-value"], state.carrying === null ? "Empty" : "Core " + state.cores[state.carrying].name);
  write(refs["relay-value"], state.stage + " / 3");
  write(refs["exit-value"], state.stage === 3 ? "Unlocked" : "Locked");
  write(refs.mission, objective(state)?.label ?? "Recovery complete");
  write(refs["stage-label"], "STAGE 0" + state.stage);
  write(refs["ability-value"], state.barrier > 0 ? "Barrier active" : state.cooldown > 0 ? "Barrier " + Math.ceil(state.cooldown) + "s" : "Barrier ready");
  const nearby = nearbyAction(state);
  write(refs["status-message"], state.elapsed < state.messageUntil ? state.message
    : nearby ? "[E] " + nearby : "Watch the vent labels. Follow the core markers.");
  write(refs["victory-time"], "Recovery time " + time(state.elapsed) + " / Integrity " + Math.ceil(state.integrity) + "%");
}
function changed() {
  updateUI();
  window.dispatchEvent(new CustomEvent("protocol99:statechange", { detail: snapshot(state) }));
}
function focusArena() { canvas.focus({ preventScroll: true }); }
function start() {
  if (state.phase !== "title") return;
  state.phase = "playing"; keys.clear(); changed(); focusArena();
}
function pause() {
  if (!["playing", "paused"].includes(state.phase)) return;
  state.phase = state.phase === "paused" ? "playing" : "paused";
  keys.clear(); changed();
  if (state.phase === "playing") focusArena();
}
function restart() {
  state = createState(seed); keys.clear(); changed();
  document.querySelector('[data-p99-action="start"]').focus({ preventScroll: true });
}
function action(name) {
  if (name === "start") start();
  else if (name === "pause" || name === "resume") pause();
  else if (name === "restart") restart();
  else if (name === "interact" && interact(state)) changed();
  else if (name === "ability" && useBarrier(state)) changed();
}
for (const button of document.querySelectorAll("[data-p99-action]")) {
  button.addEventListener("click", () => action(button.dataset.p99Action));
}
window.addEventListener("keydown", event => {
  if (!handledKeys.has(event.code)) return;
  event.preventDefault();
  if (event.code.startsWith("Arrow") || ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) keys.add(event.code);
  if (event.repeat) return;
  if (event.code === "KeyE") action("interact");
  else if (["Space", "ShiftLeft", "ShiftRight"].includes(event.code)) action("ability");
  else if (event.code === "Escape" || event.code === "KeyP") pause();
  else if (event.code === "KeyR" && ["won", "lost"].includes(state.phase)) restart();
});
window.addEventListener("keyup", event => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());
document.addEventListener("visibilitychange", () => {
  keys.clear();
  if (document.hidden && state.phase === "playing") pause();
});
for (const button of document.querySelectorAll("[data-p99-control]")) {
  const key = touchKeys[button.dataset.p99Control];
  button.addEventListener("pointerdown", event => {
    event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(key);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(name, () => keys.delete(key));
}
Object.defineProperty(window, "__P99__", {
  value: Object.freeze({ contractVersion: "1.0", getState: () => snapshot(state) }),
  writable: false, configurable: false
});

// A single fixed-step loop survives every restart; no per-run listeners or timers.
let previous = performance.now(), accumulator = 0, uiFrames = 0;
function frame(now) {
  accumulator += Math.min((now - previous) / 1000, 0.1);
  previous = now;
  while (accumulator >= 1 / 60) {
    const beforePhase = state.phase, beforeReady = state.cooldown === 0;
    step(state, keys, 1 / 60);
    if (state.phase !== beforePhase || (state.cooldown === 0) !== beforeReady) changed();
    accumulator -= 1 / 60;
  }
  if (++uiFrames % 6 === 0) updateUI();
  draw(state);
  requestAnimationFrame(frame);
}
changed();
requestAnimationFrame(frame);
