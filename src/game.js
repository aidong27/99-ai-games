import { PROJECT_STATUS } from "./utils.js";

export function renderSourceStatus(root) {
  if (!root) {
    return;
  }

  root.replaceChildren(
    createStatusItem("Playable source", PROJECT_STATUS.sourceStatus),
    createStatusItem("Next required step", PROJECT_STATUS.nextStep),
    createStatusItem("Maintainer note", PROJECT_STATUS.maintainerNote)
  );
}

function createStatusItem(label, value) {
  const item = document.createElement("article");
  item.className = "status-item";

  const title = document.createElement("strong");
  title.textContent = `${label}:`;

  const body = document.createElement("span");
  body.textContent = value;

  item.append(title, body);
  return item;
}
