import {
  getArchiveStats,
  getGameNumberLabel,
  getObservationHref,
  getPlayGateHref,
  getPromoHref,
  getScreenshotHref,
  loadArchive
} from "./archive-data.js";
import { setupShareControls } from "./share.js";
import { createElement, setHref, setText } from "./ui/dom.js";
import { createEmptyState } from "./ui/layout.js";

const MAX_VISIBLE_GAMES = 6;

const refs = {
  archiveStatus: document.querySelector("#archive-status"),
  enterLibrary: document.querySelector("#enter-library"),
  featuredAgent: document.querySelector("#featured-agent"),
  featuredDescription: document.querySelector("#featured-description"),
  featuredImage: document.querySelector("#featured-image"),
  featuredImageLink: document.querySelector("#featured-image-link"),
  featuredLabel: document.querySelector("#featured-label"),
  featuredModel: document.querySelector("#featured-model"),
  featuredPlaceholder: document.querySelector("#featured-placeholder"),
  featuredPlay: document.querySelector("#play-featured"),
  featuredPlayLink: document.querySelector("#featured-play-link"),
  featuredPromoLink: document.querySelector("#featured-promo-link"),
  featuredRecordLink: document.querySelector("#featured-record-link"),
  featuredTitle: document.querySelector("#featured-title"),
  gameGrid: document.querySelector("#game-grid"),
  observationCount: document.querySelector("#observation-count"),
  playableCount: document.querySelector("#playable-count"),
  runCount: document.querySelector("#run-count"),
  targetCount: document.querySelector("#target-count"),
  variantCount: document.querySelector("#variant-count")
};

setupShareControls();
loadLauncherData();

async function loadLauncherData() {
  try {
    const { manifest, games } = await loadArchive();
    const stats = getArchiveStats(manifest, games);
    const playableGames = games
      .filter((game) => game.status === "playable")
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
    const featured = selectFeaturedWithPreview(playableGames) ?? playableGames[0] ?? games[0];

    updateStats(stats);
    updateFeatured(featured);
    renderGameGrid(playableGames);
    setText(
      refs.archiveStatus,
      `Showing ${Math.min(playableGames.length, MAX_VISIBLE_GAMES)} of ${playableGames.length} playable observations.`
    );
  } catch (error) {
    setText(refs.archiveStatus, `Manifest unavailable: ${error.message}`);
    setText(refs.featuredLabel, "Archive unavailable");
    setText(refs.featuredTitle, "Manifest could not be loaded");
    setText(refs.featuredDescription, "Check games/manifest.json and local server access.");
    renderEmptyState("No playable observations could be loaded.");
  }
}

function updateStats(stats) {
  setText(refs.observationCount, stats.observationCount);
  setText(refs.targetCount, stats.targetCount);
  setText(refs.playableCount, stats.playableCount);
  setText(refs.variantCount, stats.variantCount);
  setText(refs.runCount, stats.runCount);
}

function updateFeatured(game) {
  if (!game) {
    return;
  }

  const playHref = getPlayGateHref(game);
  const recordHref = getObservationHref(game);
  const promoHref = getPromoHref(game);
  const imageHref = getScreenshotHref(game);

  setText(refs.featuredLabel, getGameNumberLabel(game));
  setText(refs.featuredTitle, game.title ?? "Untitled observation");
  setText(refs.featuredDescription, game.description ?? "No description recorded.");
  setText(refs.featuredModel, game.provenance?.modelName ?? "Unrecorded");
  setText(refs.featuredAgent, game.provenance?.agentName ?? "Unrecorded");
  setHref(refs.featuredPlay, playHref);
  setHref(refs.featuredPlayLink, playHref);
  setHref(refs.featuredPromoLink, promoHref);
  setHref(refs.featuredRecordLink, recordHref);
  setHref(refs.featuredImageLink, playHref);

  if (refs.featuredImage && refs.featuredPlaceholder) {
    if (imageHref) {
      refs.featuredImage.hidden = false;
      refs.featuredImage.src = imageHref;
      refs.featuredImage.alt = `${game.title} screenshot`;
      refs.featuredPlaceholder.hidden = true;
    } else {
      refs.featuredImage.hidden = true;
      refs.featuredImage.removeAttribute("src");
      refs.featuredPlaceholder.hidden = false;
    }
  }
}

function renderGameGrid(games) {
  if (!refs.gameGrid) {
    return;
  }

  refs.gameGrid.replaceChildren();

  if (!games.length) {
    renderEmptyState("No playable observations are listed yet.");
    return;
  }

  for (const game of games.slice(0, MAX_VISIBLE_GAMES)) {
    refs.gameGrid.append(createGameCard(game));
  }
}

function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";

  const playHref = getPlayGateHref(game);
  const recordHref = getObservationHref(game);
  const imageHref = getScreenshotHref(game);
  const media = createElement("a", {
    className: "game-card-media",
    href: playHref,
    ariaLabel: `Play ${game.title}`
  });

  if (imageHref) {
    const image = createElement("img", {
      src: imageHref,
      alt: `${game.title} screenshot`,
      loading: "lazy"
    });
    image.addEventListener("error", () => {
      image.remove();
      media.append(createElement("span", { className: "game-card-placeholder" }, "Preview pending"));
    }, { once: true });
    media.append(image);
  } else {
    media.append(createElement("span", { className: "game-card-placeholder" }, "Preview pending"));
  }

  const body = createElement("div", { className: "game-card-body" });
  body.append(createElement("p", { className: "game-card-label" }, getGameNumberLabel(game)));

  const title = createElement("h3");
  title.append(createElement("a", { href: playHref }, game.title ?? "Untitled observation"));
  body.append(title);

  body.append(createElement("p", { className: "game-card-description" }, game.description ?? "No description recorded."));

  const meta = createElement("div", { className: "game-card-meta" });
  meta.append(createElement("span", {}, game.hallName ?? "Hall unrecorded"));
  meta.append(createElement("span", {}, game.provenance?.modelName ?? "Model unrecorded"));
  body.append(meta);

  const links = createElement("div", { className: "game-card-links" });
  links.append(createElement("a", { href: playHref }, "Play"));
  links.append(createElement("a", { href: recordHref }, "Record"));
  links.append(createElement("a", { href: getPromoHref(game) }, "Promo"));
  body.append(links);

  card.append(media, body);
  return card;
}

function renderEmptyState(message) {
  refs.gameGrid?.replaceChildren(createEmptyState(message, "launcher-empty"));
}

function selectFeaturedWithPreview(games) {
  return [...games]
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0))
    .find((game) => Boolean(getScreenshotHref(game)));
}
