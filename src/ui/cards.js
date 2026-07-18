import { createElement, createText } from "./dom.js";

export function createNotice(message) {
  return createElement("p", { className: "archive-notice", text: message });
}

export function createSection(title, extraClass = "") {
  const section = createElement("section", {
    className: `record-section${extraClass ? ` ${extraClass}` : ""}`
  });
  section.append(createText("h3", "", title));
  return section;
}

export function createDefinitionGrid(rows) {
  const grid = createElement("dl", { className: "definition-grid" });
  grid.append(...rows.map(([label, value]) => createDefinitionItem(label, value)));
  return grid;
}

export function createDefinitionCard(title, rows) {
  const card = createElement("article", { className: "definition-card" });
  card.append(createText("h4", "", title), createDefinitionGrid(rows));
  return card;
}

export function createDefinitionItem(label, value) {
  const item = createElement("div");
  item.append(createText("dt", "", label), createText("dd", "", normalizeDisplayValue(value)));
  return item;
}

export function createListBlock(title, items) {
  const block = createElement("div", { className: "list-block" });
  block.append(createText("h4", "", title));

  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) {
    block.append(createText("p", "", "None recorded."));
    return block;
  }

  const list = createElement("ul");
  list.append(...values.map((item) => createElement("li", { text: String(item) })));
  block.append(list);
  return block;
}

function normalizeDisplayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Unrecorded";
  }
  return String(value);
}
