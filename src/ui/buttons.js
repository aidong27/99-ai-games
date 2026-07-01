import { createElement } from "./dom.js";

export function createActionLink(label, href, tone = "secondary") {
  const className = tone.startsWith("archive-button") ? tone : `archive-button ${tone}`;
  return createElement("a", { className, href, text: label });
}

export function createDisabledButton(label, className = "archive-button primary disabled") {
  return createElement("button", {
    type: "button",
    className,
    disabled: true,
    text: label
  });
}

export function createActionRow(actions, className = "record-actions") {
  const row = createElement("div", { className });
  row.append(...actions.map(([label, href, tone]) => createActionLink(label, href, tone)));
  return row;
}

export function createActionGroup(actions, className = "record-actions") {
  const group = createElement("div", { className });
  group.append(...actions);
  return group;
}
