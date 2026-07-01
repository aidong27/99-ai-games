import { createNotice } from "./cards.js";
import { createElement } from "./dom.js";

export function createEmptyState(message, className = "archive-notice") {
  return createElement("p", { className, text: message });
}

export function replaceWithNotice(node, message) {
  node?.replaceChildren(createNotice(message));
}

export function showPanelMessage(panel, message, hiddenClass = "hidden") {
  if (!panel) {
    return;
  }
  panel.textContent = message;
  panel.classList.remove(hiddenClass);
}

export function clearPanelMessage(panel, hiddenClass = "hidden") {
  if (!panel) {
    return;
  }
  panel.textContent = "";
  panel.classList.add(hiddenClass);
}
