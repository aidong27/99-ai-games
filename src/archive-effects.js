const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

export function prefersReducedMotion() {
  return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

export function createSignalField(canvas, options = {}) {
  const ctx = canvas?.getContext?.("2d");
  if (!canvas || !ctx) {
    return createNoopEffect();
  }

  const reduceMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY);
  const state = {
    frame: 0,
    resizeTimer: 0,
    particles: [],
    width: 0,
    height: 0,
    ratio: 1,
    pointerX: 0,
    pointerY: 0,
    parallaxX: 0,
    parallaxY: 0
  };

  const config = {
    density: options.density ?? 34,
    variant: options.variant ?? "archive",
    accent: options.accent ?? "216, 247, 95"
  };

  function resize() {
    state.ratio = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(1, Math.floor(window.innerWidth * state.ratio));
    state.height = Math.max(1, Math.floor(window.innerHeight * state.ratio));
    canvas.width = state.width;
    canvas.height = state.height;
    buildParticles();
    draw(0);
  }

  function scheduleResize() {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(resize, 140);
  }

  function buildParticles() {
    const count = reduceMotionQuery.matches ? Math.min(10, config.density) : config.density;
    state.particles = Array.from({ length: count }, (_, index) => ({
      x: ((index * 167) % 997) / 997,
      y: ((index * 263) % 991) / 991,
      phase: index * 0.73,
      speed: 0.14 + (index % 5) * 0.018,
      size: 1 + (index % 3) * 0.65
    }));
  }

  function updatePointer(event) {
    if (!finePointerQuery.matches) {
      return;
    }
    state.pointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    state.pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
  }

  function draw(time) {
    const width = state.width || canvas.width;
    const height = state.height || canvas.height;
    const ratio = state.ratio || 1;
    const t = reduceMotionQuery.matches ? 0 : time / 1000;
    state.parallaxX += (state.pointerX * 28 * ratio - state.parallaxX) * 0.04;
    state.parallaxY += (state.pointerY * 18 * ratio - state.parallaxY) * 0.04;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#050607";
    ctx.fillRect(0, 0, width, height);

    drawVignette(width, height);
    drawGeometry(width, height, ratio, t);
    drawParticles(width, height, ratio, t);
    drawVariantMark(width, height, ratio);
  }

  function drawVignette(width, height) {
    const gradient = ctx.createRadialGradient(width * 0.52, height * 0.38, 0, width * 0.52, height * 0.38, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, "rgba(244, 241, 232, 0.035)");
    gradient.addColorStop(0.46, "rgba(5, 6, 7, 0.1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.76)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawGeometry(width, height, ratio, time) {
    const isTitle = config.variant === "title";
    const originX = width * (isTitle ? 0.67 : 0.52) + state.parallaxX;
    const originY = height * (isTitle ? 0.43 : 0.48) + state.parallaxY;
    const radius = Math.min(width, height) * (isTitle ? 0.18 : 0.14);
    const lineAlpha = reduceMotionQuery.matches ? 0.12 : 0.11 + Math.sin(time * 0.65) * 0.025;

    ctx.lineWidth = Math.max(1, ratio);
    ctx.strokeStyle = `rgba(${config.accent}, ${lineAlpha})`;
    for (let index = 0; index < 5; index += 1) {
      ctx.beginPath();
      ctx.arc(originX, originY, radius + index * 58 * ratio, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(244, 241, 232, 0.07)";
    for (let x = -width * 0.2; x < width * 1.15; x += 94 * ratio) {
      ctx.beginPath();
      ctx.moveTo(x + state.parallaxX * 0.18, 0);
      ctx.lineTo(x - 140 * ratio + state.parallaxX * 0.18, height);
      ctx.stroke();
    }

    const sweep = reduceMotionQuery.matches ? -0.72 : time * 0.32;
    ctx.strokeStyle = `rgba(${config.accent}, 0.2)`;
    ctx.lineWidth = Math.max(1, 2 * ratio);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + Math.cos(sweep) * radius * 3.4, originY + Math.sin(sweep) * radius * 3.4);
    ctx.stroke();
  }

  function drawParticles(width, height, ratio, time) {
    ctx.fillStyle = "rgba(244, 241, 232, 0.34)";
    for (const particle of state.particles) {
      const drift = reduceMotionQuery.matches ? 0 : time * particle.speed;
      const x = ((particle.x + drift * 0.035) % 1) * width + state.parallaxX * 0.1;
      const y = ((particle.y + Math.sin(time * particle.speed + particle.phase) * 0.018 + 1) % 1) * height + state.parallaxY * 0.1;
      const pulse = reduceMotionQuery.matches ? 1 : 1 + Math.sin(time * 1.4 + particle.phase) * 0.28;
      ctx.fillRect(x, y, particle.size * ratio * pulse, particle.size * ratio * pulse);
    }
  }

  function drawVariantMark(width, height, ratio) {
    ctx.fillStyle = `rgba(${config.accent}, 0.62)`;
    ctx.font = `${11 * ratio}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    const label = config.variant === "gate"
      ? "START OBSERVATION GATE"
      : config.variant === "library"
        ? "MODEL AXIS / OBSERVATION TRACK"
        : "OBSERVATORY PROTOCOL / 99 TARGET SLOTS";
    ctx.fillText(label, 24 * ratio, height - 30 * ratio);
  }

  function tick(time) {
    state.frame = 0;
    draw(time);
    if (!document.hidden && !reduceMotionQuery.matches) {
      state.frame = requestAnimationFrame(tick);
    }
  }

  function start() {
    if (state.frame || document.hidden) {
      return;
    }
    if (reduceMotionQuery.matches) {
      draw(0);
      return;
    }
    state.frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (state.frame) {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
    }
  }

  function handleVisibility() {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  }

  function handleMotionChange() {
    stop();
    buildParticles();
    start();
  }

  resize();
  window.addEventListener("resize", scheduleResize);
  window.addEventListener("pointermove", updatePointer, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  addMediaChangeListener(reduceMotionQuery, handleMotionChange);

  return {
    start,
    stop,
    destroy() {
      stop();
      window.clearTimeout(state.resizeTimer);
      window.removeEventListener("resize", scheduleResize);
      window.removeEventListener("pointermove", updatePointer);
      document.removeEventListener("visibilitychange", handleVisibility);
      removeMediaChangeListener(reduceMotionQuery, handleMotionChange);
    }
  };
}

export function bindPointerTilt(root, selector, options = {}) {
  if (!root) {
    return createNoopEffect();
  }

  const reduceMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY);
  let activeElement = null;
  const maxTilt = options.maxTilt ?? 4.5;

  function reset(element = activeElement) {
    if (!element) {
      return;
    }
    element.style.removeProperty("--tilt-x");
    element.style.removeProperty("--tilt-y");
    element.style.removeProperty("--tilt-lift");
  }

  function handleMove(event) {
    if (reduceMotionQuery.matches || !finePointerQuery.matches) {
      reset();
      return;
    }

    const element = event.target.closest(selector);
    if (!element || !root.contains(element)) {
      reset();
      activeElement = null;
      return;
    }

    if (activeElement && activeElement !== element) {
      reset(activeElement);
    }
    activeElement = element;

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const y = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    element.style.setProperty("--tilt-x", `${(x * maxTilt).toFixed(2)}deg`);
    element.style.setProperty("--tilt-y", `${(-y * maxTilt).toFixed(2)}deg`);
    element.style.setProperty("--tilt-lift", "-2px");
  }

  function handleLeave() {
    reset();
    activeElement = null;
  }

  root.addEventListener("pointermove", handleMove, { passive: true });
  root.addEventListener("pointerleave", handleLeave);

  return {
    start() {},
    stop: handleLeave,
    destroy() {
      handleLeave();
      root.removeEventListener("pointermove", handleMove);
      root.removeEventListener("pointerleave", handleLeave);
    }
  };
}

function createNoopEffect() {
  return {
    start() {},
    stop() {},
    destroy() {}
  };
}

function addMediaChangeListener(query, handler) {
  if (query.addEventListener) {
    query.addEventListener("change", handler);
  } else if (query.addListener) {
    query.addListener(handler);
  }
}

function removeMediaChangeListener(query, handler) {
  if (query.removeEventListener) {
    query.removeEventListener("change", handler);
  } else if (query.removeListener) {
    query.removeListener(handler);
  }
}
