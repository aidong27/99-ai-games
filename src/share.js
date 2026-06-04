const PROJECT_URL = "https://aidong27.github.io/99-ai-games/";
const SHARE_TEXT = `I'm building 99 AI Games - a playable archive observing how AI coding agents make browser games.
${PROJECT_URL}`;

export function setupShareControls(root = document) {
  const controls = root.querySelectorAll("[data-share-action]");
  if (!controls.length) {
    return;
  }

  const status = root.querySelector("#share-status");
  const fallback = root.querySelector("#share-fallback");
  let resetTimer = 0;

  for (const control of controls) {
    control.addEventListener("click", async () => {
      const action = control.getAttribute("data-share-action");
      const text = action === "link" ? PROJECT_URL : SHARE_TEXT;
      const copied = await copyText(text, fallback);
      setStatus(status, copied ? "Copied." : "Copy unavailable. Text is ready below.");

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => setStatus(status, "Ready to copy."), 2200);
    });
  }
}

async function copyText(text, fallback) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      hideFallback(fallback);
      return true;
    } catch {
      // Fall through to the manual fallback without surfacing console noise.
    }
  }

  return legacyCopy(text, fallback);
}

function legacyCopy(text, fallback) {
  if (!fallback) {
    return false;
  }

  fallback.hidden = false;
  fallback.value = text;
  fallback.focus();
  fallback.select();

  try {
    const copied = document.execCommand?.("copy") === true;
    if (copied) {
      fallback.hidden = true;
    }
    return copied;
  } catch {
    return false;
  }
}

function hideFallback(fallback) {
  if (fallback) {
    fallback.hidden = true;
  }
}

function setStatus(node, text) {
  if (node) {
    node.textContent = text;
  }
}
