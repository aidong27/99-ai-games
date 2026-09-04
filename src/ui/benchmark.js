import { createElement } from "./dom.js";
import {
  formatDate,
  formatIdentity,
  getCanonicalGameUrl,
  getEntryFamily,
  shortHash
} from "../benchmark-data.js";

export function createBenchmarkEntryCard(entry, options = {}) {
  const card = createElement("article", {
    className: `benchmark-entry-card${options.featured ? " benchmark-featured" : ""}`
  });
  const screenshot = (options.featured ? entry.screenshots?.relay1 : null)
    ?? entry.screenshots?.gameplay ?? entry.screenshots?.title;
  const media = createElement("a", {
    className: "benchmark-entry-media",
    href: entry.detailUrl,
    ariaLabel: `Open Protocol 99 Entry ${entry.entryNumberLabel}`
  });
  if (screenshot) {
    const image = createElement("img", {
      src: screenshot,
      alt: `Real gameplay evidence for Entry ${entry.entryNumberLabel}`,
      loading: options.eager ? "eager" : "lazy",
      decoding: "async",
      width: 1440,
      height: 900,
      ...(options.eager ? { fetchPriority: "high" } : {})
    });
    image.addEventListener("error", () => {
      media.replaceChildren(createEntryPlaceholder(entry));
    }, { once: true });
    media.append(image);
  } else {
    media.append(createEntryPlaceholder(entry));
  }

  const body = createElement("div", { className: "benchmark-entry-body" });
  const family = getEntryFamily(entry);
  const eyebrow = createElement("div", { className: "entry-card-eyebrow" });
  eyebrow.append(
    createElement("span", { className: "entry-number" }, `ENTRY ${entry.entryNumberLabel}`),
    createElement("span", { className: `verification-dot ${entry.defaultComparable || entry.selectedRunPublished ? "verified" : ""}` }),
    createElement(
      "span",
      { className: "entry-status" },
      entry.defaultComparable ? "Verified Raw"
        : entry.selectedRunPublished ? `Verified ${entry.canonicalRun.runType}` : entry.status
    )
  );

  const title = createElement(options.featured ? "h2" : "h3");
  title.append(createElement("a", { href: entry.detailUrl, translate: false }, entry.title || entry.identity.modelName));
  const identity = createElement("p", { className: "entry-identity", translate: false }, formatIdentity(entry));
  const identityNotice = createElement("span", { className: "entry-identity-notice" }, "Identity unverified");
  if (!entry.identity.identityConfidence || ["unverified", "unknown", "undeclared"].includes(entry.identity.identityConfidence)) {
    eyebrow.append(identityNotice);
  }
  const score = entry.canonicalRun?.report?.score;
  const facts = createElement("dl", { className: "entry-facts" });
  facts.append(
    fact("Family", family.name),
    fact("Agent", entry.identity.agentName),
    fact("Compliance", score ? `${score.earned} / ${score.maximum}` : "Pending"),
    fact("Finished", formatDate(entry.canonicalRun?.finishedAt))
  );
  const actions = createElement("div", { className: "entry-card-actions" });
  actions.append(createElement("a", {
    className: "archive-button compact primary",
    href: entry.detailUrl
  }, "Open record"));
  const playUrl = getCanonicalGameUrl(entry);
  if (playUrl) {
    actions.append(createElement("a", {
      className: "archive-button compact",
      href: playUrl
    }, `Play ${entry.canonicalRun.runType}`));
  }
  body.append(
    eyebrow,
    title,
    identity,
    facts,
    createElement(
      "p",
      { className: "entry-hash", title: entry.canonicalPromptHash },
      `Prompt ${shortHash(entry.canonicalPromptHash)}`
    ),
    actions
  );
  if (options.featured) {
    const heading = createElement("header", { className: "featured-heading" });
    heading.append(createElement("div", {}, [eyebrow, title, identity]), actions);
    const caption = createElement("div", { className: "featured-caption" }, [
      createElement("span", {}, "Real gameplay capture"),
      createElement("span", { className: "mono-value" }, `SEED 99 · ${entry.challengeVersion} · ${shortHash(entry.canonicalPromptHash)}`)
    ]);
    body.replaceChildren(facts);
    card.append(heading, media, caption, body);
  } else {
    card.append(media, body);
  }
  return card;
}

export function createBenchmarkEmptyState({
  title = "No finalized Raw Entries yet",
  message = "Protocol 99 is locked and ready. The benchmark stays empty until a real AI coding system completes verification.",
  actionHref = "./challenge.html",
  actionLabel = "Read the current challenge",
  onAction
} = {}) {
  const state = createElement("section", {
    className: "benchmark-empty",
    ariaLabel: title
  });
  const action = createElement(onAction ? "button" : "a", {
    className: "archive-button compact",
    ...(onAction ? { type: "button" } : { href: actionHref })
  }, actionLabel);
  if (onAction) action.addEventListener("click", onAction);
  state.append(
    createElement("span", { className: "empty-index", ariaHidden: "true" }, "00"),
    createElement("div", { className: "empty-copy" }, [
      createElement("p", { className: "benchmark-kicker" }, "Honest zero state"),
      createElement("h3", {}, title),
      createElement("p", {}, message),
      action
    ])
  );
  return state;
}

export function createScoreBreakdown(score) {
  const container = createElement("div", { className: "score-breakdown" });
  for (const group of score?.groups ?? []) {
    const row = createElement("div", { className: "score-row" });
    const label = createElement("div", { className: "score-row-label" });
    label.append(
      createElement("strong", {}, group.title),
      createElement("span", {}, `${group.earned} / ${group.maximum}`)
    );
    const meter = createElement("div", {
      className: "score-meter",
      role: "meter",
      ariaLabel: group.title,
      ariaValueMin: "0",
      ariaValueMax: String(group.maximum),
      ariaValueNow: String(group.earned)
    });
    meter.append(createElement("span", {
      style: `width:${group.maximum ? (group.earned / group.maximum) * 100 : 0}%`
    }));
    row.append(label, meter);
    container.append(row);
  }
  return container;
}

function createEntryPlaceholder(entry) {
  return createElement("span", { className: "entry-media-placeholder" }, [
    createElement("strong", {}, entry.entryNumberLabel),
    createElement("small", {}, "Verification evidence pending")
  ]);
}

function fact(label, value) {
  return createElement("div", {}, [
    createElement("dt", {}, label),
    createElement("dd", {}, value ?? "unknown")
  ]);
}
