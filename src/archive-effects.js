const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

export function bindPointerTilt(root, selector, options = {}) {
  if (!root) {
    return createNoopEffect();
  }

  const reduceMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY);
  const maxTilt = options.maxTilt ?? 1.2;
  let activeElement = null;

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
