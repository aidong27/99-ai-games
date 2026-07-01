import { createElement } from "./dom.js";

export function createBadge(text, tone = "neutral") {
  return createElement("span", {
    className: `archive-badge ${tone}`,
    text: text ?? "Unrecorded"
  });
}

export function createBadgeRow(items, className = "compact-badges") {
  const row = createElement("div", { className });
  row.append(...items.map(([text, tone]) => createBadge(text, tone)));
  return row;
}
