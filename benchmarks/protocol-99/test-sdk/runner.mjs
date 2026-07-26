import path from "node:path";
import { mkdir } from "node:fs/promises";

const ALLOWED_CHECKPOINTS = new Set([
  "title",
  "gameplay",
  "relay-1",
  "relay-2",
  "relay-3",
  "victory",
  "defeat"
]);

const ALLOWED_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyE",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "Escape",
  "KeyP",
  "KeyR",
  "Enter",
  "Tab"
]);

export function createProtocolHarness(page, options) {
  const {
    gameUrl,
    screenshotDir,
    history,
    checkpointNames,
    timeoutMs = 15_000
  } = options;

  async function state() {
    const snapshot = await page.evaluate(() => {
      const contract = globalThis.__P99__;
      if (!contract || typeof contract.getState !== "function") {
        throw new Error("window.__P99__.getState() is unavailable");
      }
      return JSON.parse(JSON.stringify(contract.getState()));
    });
    history.push({ at: Date.now(), state: snapshot });
    return snapshot;
  }

  async function goto() {
    await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (
      globalThis.__P99__?.contractVersion === "1.0"
      && typeof globalThis.__P99__?.getState === "function"
    ), undefined, { timeout: timeoutMs });
    return state();
  }

  async function clickAction(action) {
    const safeAction = String(action);
    if (!/^[a-z0-9-]+$/.test(safeAction)) {
      throw new Error(`Invalid Protocol action: ${safeAction}`);
    }
    const locator = page.locator(`[data-p99-action="${safeAction}"]`).filter({ visible: true });
    if (await locator.count() !== 1) {
      throw new Error(`Expected one visible data-p99-action="${safeAction}" control`);
    }
    await locator.click();
    return state();
  }

  async function click(selector) {
    if (!isSafePublicSelector(selector)) {
      throw new Error(`Participant selector is not a safe public selector: ${selector}`);
    }
    const locator = page.locator(selector).filter({ visible: true });
    if (await locator.count() !== 1) {
      throw new Error(`Expected one visible public element for ${selector}`);
    }
    await locator.click();
    return state();
  }

  async function press(key) {
    const normalized = normalizeKey(key);
    await page.keyboard.press(normalized);
    await page.waitForTimeout(24);
    return state();
  }

  async function hold(key, durationMs) {
    const normalized = normalizeKey(key);
    const duration = Number(durationMs);
    if (!Number.isFinite(duration) || duration < 16 || duration > 5000) {
      throw new Error("hold() duration must be from 16 through 5000 milliseconds");
    }
    await page.keyboard.down(normalized);
    await page.waitForTimeout(duration);
    await page.keyboard.up(normalized);
    await page.waitForTimeout(24);
    return state();
  }

  async function wait(durationMs) {
    const duration = Number(durationMs);
    if (!Number.isFinite(duration) || duration < 0 || duration > 10_000) {
      throw new Error("wait() duration must be from 0 through 10000 milliseconds");
    }
    await page.waitForTimeout(duration);
    return state();
  }

  async function waitForState(expected, waitOptions = {}) {
    if (!expected || typeof expected !== "object" || Array.isArray(expected)) {
      throw new Error("waitForState() expects a plain object");
    }
    const deadline = Date.now() + Math.min(
      Math.max(Number(waitOptions.timeoutMs ?? timeoutMs), 100),
      30_000
    );
    let latest;
    while (Date.now() <= deadline) {
      latest = await state();
      if (matchesExpected(latest, expected)) {
        return latest;
      }
      await page.waitForTimeout(50);
    }
    throw new Error(
      `Timed out waiting for state ${JSON.stringify(expected)}; latest was ${JSON.stringify(latest)}`
    );
  }

  async function checkpoint(name) {
    if (!ALLOWED_CHECKPOINTS.has(name)) {
      throw new Error(`Unsupported checkpoint name: ${name}`);
    }
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, `${name}.png`),
      fullPage: false,
      animations: "disabled"
    });
    checkpointNames.add(name);
    return state();
  }

  async function start() {
    const current = await state();
    if (current.phase === "playing") {
      return current;
    }
    await clickAction("start");
    return waitForState({ phase: "playing" });
  }

  async function restart() {
    const visibleRestart = page.locator('[data-p99-action="restart"]').filter({ visible: true });
    if (await visibleRestart.count() === 1) {
      await visibleRestart.click();
    } else {
      await page.keyboard.press("KeyR");
    }
    await page.waitForTimeout(40);
    return state();
  }

  async function pause() {
    const current = await state();
    if (current.phase === "paused") {
      return current;
    }
    await page.keyboard.press("Escape");
    return waitForState({ phase: "paused" });
  }

  async function resume() {
    const current = await state();
    if (current.phase === "playing") {
      return current;
    }
    await page.keyboard.press("Escape");
    return waitForState({ phase: "playing" });
  }

  return Object.freeze({
    goto,
    start,
    restart,
    pause,
    resume,
    press,
    hold,
    wait,
    click,
    clickAction,
    state,
    waitForState,
    checkpoint
  });
}

function normalizeKey(value) {
  const raw = String(value);
  const aliases = {
    w: "KeyW",
    a: "KeyA",
    s: "KeyS",
    d: "KeyD",
    e: "KeyE",
    p: "KeyP",
    r: "KeyR",
    shift: "ShiftLeft",
    space: "Space",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight"
  };
  const key = aliases[raw.toLowerCase()] ?? raw;
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error(`Key is outside the Protocol 99 public-control allowlist: ${raw}`);
  }
  return key;
}

function isSafePublicSelector(value) {
  const selector = String(value ?? "");
  return /^\[(?:data-p99-action|data-p99-control|aria-label)=["'][^"'<>]+["']\]$/.test(selector);
}

function matchesExpected(actual, expected) {
  return Object.entries(expected).every(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return matchesExpected(actual?.[key], value);
    }
    return actual?.[key] === value;
  });
}
