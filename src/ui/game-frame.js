import { createElement } from "./dom.js";

export function createGameFrame({ title, src, lazy = true }) {
  return createElement("iframe", {
    title, src, loading: lazy ? "lazy" : "eager", referrerPolicy: "no-referrer",
    attrs: { sandbox: "allow-scripts", allow: "" }
  });
}

export function createFact(label, value, className = "") {
  return createElement("div", {}, [
    createElement("dt", {}, label),
    createElement("dd", { className }, value ?? "unknown")
  ]);
}
