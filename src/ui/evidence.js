import { createElement } from "./dom.js";

export const EVIDENCE_LABELS = Object.freeze({
  title: "Title state", gameplay: "Active gameplay", relay1: "After relay one", victory: "Real victory"
});

export function createEvidenceFigure(entry, checkpoint) {
  const src = entry.screenshots?.[checkpoint];
  if (!src) return createElement("p", { className: "compare-warning" }, "Real screenshot evidence is pending.");
  return createElement("figure", {}, [
    createElement("img", {
      src, alt: `${EVIDENCE_LABELS[checkpoint]} evidence for Entry ${entry.entryNumberLabel}`, loading: "lazy"
    }),
    createElement("figcaption", {}, EVIDENCE_LABELS[checkpoint])
  ]);
}

export function createComplianceDetails(report) {
  const details = createElement("details", { className: "compliance-details" });
  details.append(createElement("summary", {}, "Individual machine checks"));
  for (const group of report?.score?.groups ?? []) {
    const list = createElement("ul");
    for (const check of group.checks ?? []) {
      list.append(createElement("li", {}, `${check.passed ? "Pass" : "Fail"}: ${check.title ?? check.id}`));
    }
    details.append(createElement("h4", {}, group.title), list);
  }
  return details;
}
