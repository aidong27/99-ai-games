import {
  getArchiveStats,
  loadArchive,
  selectFeaturedGame
} from "./archive-data.js";

const enterLink = document.querySelector("#enter-observatory");
const observationCount = document.querySelector("#observation-count");
const targetCount = document.querySelector("#target-count");
const playableCount = document.querySelector("#playable-count");
const mobileCount = document.querySelector("#mobile-count");
const runCount = document.querySelector("#run-count");
const titleFeatured = document.querySelector("#title-featured");
const canvas = document.querySelector("#title-signal");
const ctx = canvas?.getContext("2d");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let animationFrame = 0;
let resizeTimer = 0;

loadTitleData();
resizeCanvas();
startSignal();

document.addEventListener("keydown", (event) => {
  const active = document.activeElement;
  const isBodyFocus = !active || active === document.body || active === document.documentElement;
  if (!isBodyFocus || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    window.location.href = enterLink?.href ?? "./library.html";
  }
});

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(resizeCanvas, 120);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopSignal();
  } else {
    startSignal();
  }
});

reduceMotionQuery.addEventListener("change", () => {
  stopSignal();
  startSignal();
});

async function loadTitleData() {
  try {
    const { manifest, games } = await loadArchive();
    const stats = getArchiveStats(manifest, games);
    const featured = selectFeaturedGame(games);

    observationCount.textContent = String(stats.observationCount);
    targetCount.textContent = String(stats.targetCount);
    playableCount.textContent = String(stats.playableCount);
    mobileCount.textContent = String(stats.mobileSupportedCount);
    runCount.textContent = String(stats.runCount);
    titleFeatured.textContent = featured
      ? `Latest playable signal: ${featured.title}`
      : "No playable observation samples are listed yet.";
  } catch (error) {
    titleFeatured.textContent = `Manifest unavailable: ${error.message}`;
  }
}

function resizeCanvas() {
  if (!canvas) {
    return;
  }

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.dataset.ratio = String(ratio);
  drawSignal(0);
}

function startSignal() {
  if (!ctx || animationFrame || document.hidden) {
    return;
  }

  if (reduceMotionQuery.matches) {
    drawSignal(0);
    return;
  }

  animationFrame = requestAnimationFrame(animateSignal);
}

function stopSignal() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
}

function animateSignal(time) {
  drawSignal(time / 1000);
  animationFrame = requestAnimationFrame(animateSignal);
}

function drawSignal(time) {
  if (!ctx || !canvas) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const ratio = Number(canvas.dataset.ratio || 1);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, width, height);

  const centerX = width * 0.68;
  const centerY = height * 0.45;
  const baseRadius = Math.min(width, height) * 0.18;
  const lineAlpha = reduceMotionQuery.matches ? 0.16 : 0.1 + Math.sin(time * 0.7) * 0.03;

  ctx.lineWidth = Math.max(1, ratio);
  ctx.strokeStyle = `rgba(216, 247, 95, ${lineAlpha})`;

  for (let index = 0; index < 4; index += 1) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius + index * 62 * ratio, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(244, 241, 232, 0.08)";
  for (let x = -40 * ratio; x < width + 40 * ratio; x += 92 * ratio) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 120 * ratio, height);
    ctx.stroke();
  }

  const sweep = reduceMotionQuery.matches ? -0.8 : time * 0.35;
  ctx.strokeStyle = "rgba(216, 247, 95, 0.22)";
  ctx.lineWidth = Math.max(1, 2 * ratio);
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(sweep) * baseRadius * 3.2,
    centerY + Math.sin(sweep) * baseRadius * 3.2
  );
  ctx.stroke();

  ctx.fillStyle = "rgba(244, 241, 232, 0.34)";
  for (let index = 0; index < 11; index += 1) {
    const x = (90 + index * 147) * ratio % width;
    const y = (height * 0.18) + ((index * 81) % Math.max(1, height * 0.58));
    const pulse = reduceMotionQuery.matches ? 1 : 1 + Math.sin(time * 1.5 + index) * 0.35;
    ctx.beginPath();
    ctx.rect(x, y, 3 * ratio * pulse, 3 * ratio * pulse);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(216, 247, 95, 0.68)";
  ctx.font = `${12 * ratio}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.fillText("OBSERVATORY PROTOCOL / 99 TARGET SLOTS", 24 * ratio, height - 32 * ratio);
}
