import {
  formatDate,
  getDeviceSupport,
  getGameBySlug,
  getGameNumberLabel,
  getGameStatusLabel,
  getLibrarySelectionHref,
  getLaunchHref,
  getManifestHref,
  getMetadataHref,
  getMobileSupportInfo,
  getObservationHref,
  getPlayGateHref,
  getPromoHref,
  getScreenshotHref,
  getScreenshotList,
  getSlugFromSearch,
  getVariantHref,
  loadRunRecords,
  toTitle
} from "./archive-data.js";
import { createBadgeRow } from "./ui/badges.js";
import { createActionRow } from "./ui/buttons.js";
import {
  createDefinitionCard,
  createDefinitionGrid,
  createListBlock,
  createSection
} from "./ui/cards.js";
import { createText } from "./ui/dom.js";
import { setDocumentMeta } from "./ui/meta.js";

const root = document.querySelector("#record-root");
const recordBackLink = document.querySelector("#record-back-link");

if (root) {
  loadRecord();
}

async function loadRecord() {
  const slug = getSlugFromSearch();
  if (!slug) {
    renderError("No observation slug was provided.");
    return;
  }

  try {
    const { game } = await getGameBySlug(slug);
    if (!game) {
      renderError(`No observation sample exists for slug "${slug}".`);
      return;
    }

    const runs = await loadRunRecords(game);
    renderRecord(game, runs);
  } catch (error) {
    renderError(`The observation record could not load. ${error.message}`);
  }
}

function renderRecord(game, runs) {
  const support = getDeviceSupport(game);
  const mobile = getMobileSupportInfo(game);
  const screenshots = getScreenshotList(game);
  const heroImage = getScreenshotHref(game);
  if (recordBackLink) {
    recordBackLink.href = getLibrarySelectionHref(game);
  }

  const record = document.createElement("article");
  record.className = "record";
  record.append(
    createHero(game, heroImage, mobile),
    createMetadataWarning(game),
    createCoreFactsPanel(game, mobile),
    createMediaSection(game, screenshots),
    createDevicePanel(support, mobile),
    createProvenancePanel(game),
    createControlsPanel(game),
    createVariantsPanel(game),
    createRunsPanel(game, runs)
  );

  root.replaceChildren(record);
  setDocumentMeta({
    title: game.title ?? "Untitled observation",
    section: "Observation Record",
    description: game.description ?? "Inspect a playable AI game-making observation and its recorded provenance.",
    canonicalPath: getObservationHref(game),
    socialImagePath: `assets/social/games/${encodeURIComponent(game.slug)}.svg`
  });
}

function createHero(game, heroImage, mobile) {
  const hero = document.createElement("section");
  hero.className = "record-hero";

  const image = document.createElement("div");
  image.className = "record-cover";
  if (heroImage) {
    const img = document.createElement("img");
    img.src = heroImage;
    img.alt = `${game.title} verified screenshot`;
    img.decoding = "async";
    img.addEventListener("error", () => {
      image.replaceChildren(createText("span", "image-fallback", "No verified screenshot"));
    }, { once: true });
    image.append(img);
  } else {
    image.append(createText("span", "image-fallback", "No verified screenshot"));
  }

  const copy = document.createElement("div");
  copy.className = "record-copy";
  copy.append(
    createText("p", "archive-kicker", getGameNumberLabel(game)),
    createText("h2", "", game.title ?? "Untitled observation"),
    createText("p", "record-description", game.description ?? "No description recorded."),
    createBadgeRow([
      [game.hallName ?? game.hallId ?? "Hall unrecorded", "neutral"],
      [getGameStatusLabel(game), "neutral"],
      [mobile.label, mobile.tone],
      [game.provenance?.modelName ?? "Model unrecorded", "mono"]
    ]),
    createText("p", `record-device-note ${mobile.tone}`, mobile.note),
    createActionRow([
      [mobile.key === "supported" ? "Continue" : mobile.ctaLabel, getPlayGateHref(game), "primary"],
      ["Promo page", getPromoHref(game), "secondary"],
      ["Metadata JSON", getMetadataHref(game), "secondary"],
      ["Direct game page", getLaunchHref(game), "ghost"]
    ])
  );

  hero.append(image, copy);
  return hero;
}

function createMetadataWarning(game) {
  if (!game._metadataError) {
    const fragment = document.createDocumentFragment();
    return fragment;
  }

  const warning = document.createElement("p");
  warning.className = "archive-notice";
  warning.textContent = `game.json could not be loaded completely. Rendering manifest-backed data only. ${game._metadataError}`;
  return warning;
}

function createCoreFactsPanel(game, mobile) {
  const section = createSection("Core Facts", "core-facts");
  section.append(
    createDefinitionGrid([
      ["Observation", getGameNumberLabel(game)],
      ["Hall", game.hallName ?? game.hallId],
      ["Status", getGameStatusLabel(game)],
      ["Model", game.provenance?.modelName],
      ["Agent", game.provenance?.agentName],
      ["Created", formatDate(game.provenance?.createdDate)],
      ["Mobile support", mobile.label],
      ["Source completeness", game.sourceCompleteness]
    ])
  );
  return section;
}

function createMediaSection(game, screenshots) {
  const section = createSection("Screenshots / Media");
  const gallery = document.createElement("div");
  gallery.className = "media-grid";

  if (!screenshots.length) {
    gallery.append(createText("p", "archive-notice", "No verified screenshot is listed for this observation."));
  } else {
    gallery.append(...screenshots.map((entry, index) => {
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.src = entry.href;
      img.alt = `${game.title} screenshot ${index + 1}`;
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => {
        figure.replaceChildren(createText("div", "image-fallback", "Screenshot path missing"));
      }, { once: true });
      const caption = document.createElement("figcaption");
      caption.textContent = entry.path;
      figure.append(img, caption);
      return figure;
    }));
  }

  section.append(gallery);
  return section;
}

function createDevicePanel(support, mobile) {
  const section = createSection("Device Support", "device-support");
  section.append(
    createDefinitionGrid([
      ["Desktop", toTitle(support.desktop)],
      ["Mobile", mobile.label],
      ["Launcher policy", toTitle(support.launcherPolicy)],
      ["Minimum viewport", `${support.minViewport.width} x ${support.minViewport.height}`],
      ["Inputs", support.inputs.join(", ") || "Unrecorded"],
      ["Mobile notes", support.mobileNotes]
    ])
  );
  return section;
}

function createProvenancePanel(game) {
  const provenance = game.provenance ?? {};
  const section = createSection("Provenance", "provenance-panel");
  section.append(
    createDefinitionGrid([
      ["Model", provenance.modelName],
      ["Agent", provenance.agentName],
      ["Created", formatDate(provenance.createdDate)],
      ["Human code edits", String(provenance.humanCodeEdits)],
      ["Source", game.sourceCompleteness],
      ["Archive role", game.archiveRole],
      ["Repository note", game.repositoryNote],
      ["Notes", provenance.notes]
    ])
  );
  return section;
}

function createControlsPanel(game) {
  const section = createSection("Controls");
  const controls = game.controls ?? {};
  const groups = Object.entries(controls);

  if (!groups.length) {
    section.append(createText("p", "archive-notice", "No controls are recorded in game.json."));
    return section;
  }

  const grid = document.createElement("div");
  grid.className = "record-list-grid";
  grid.append(...groups.map(([label, items]) => createListBlock(toTitle(label), items)));
  section.append(grid);
  return section;
}

function createVariantsPanel(game) {
  const section = createSection("Variants");
  const variants = game.variants ?? [];

  if (!variants.length) {
    section.append(createText("p", "archive-notice", "No model variants are listed."));
    return section;
  }

  const list = document.createElement("div");
  list.className = "record-list-grid";
  list.append(...variants.map((variant) => {
    const path = variant.metadataPath ? getVariantHref(game, variant.metadataPath) : "";
    return createDefinitionCard(variant.variantId ?? "Variant", [
      ["Model", variant.modelName],
      ["Agent", variant.agentName],
      ["Status", variant.status],
      ["Metadata", path || variant.metadataPath || "Unrecorded"]
    ]);
  }));
  section.append(list);
  return section;
}

function createRunsPanel(game, runs) {
  const section = createSection("Run Records");

  if (!runs.length) {
    section.append(createText("p", "archive-notice", "No run records are listed."));
    return section;
  }

  const list = document.createElement("div");
  list.className = "run-list";
  list.append(...runs.map((run, index) => createRunCard(game, run, index)));
  section.append(list);
  return section;
}

function createRunCard(game, run, index) {
  if (run._loadError) {
    const card = createRunDetails(run._runId, "Run record load failed", index === 0);
    card.append(createDefinitionGrid([
      ["Path", run._href],
      ["Status", `Could not load: ${run._loadError}`]
    ]));
    return card;
  }

  const verification = run.verification ?? {};
  const performed = verification.performed ?? verification.checks ?? [];
  const pending = verification.pending ?? run.pending ?? [];
  const knownIssues = run.knownIssues ?? [];
  const card = createRunDetails(run._runId, run.status ?? run.runType ?? "Recorded attempt", index === 0);

  card.append(
    createDefinitionGrid([
      ["Model", run.modelName],
      ["Agent", run.agentName],
      ["Run type", run.runType],
      ["Status", run.status],
      ["Verified", formatDate(verification.verifiedDate ?? run.date)],
      ["Human code edits", String(run.humanCodeEdits)],
      ["Path", run._href]
    ]),
    createRunAlerts(knownIssues, pending),
    createListBlock("Prompt summary", [run.promptSummary ?? "No public prompt summary recorded."]),
    createListBlock("Outputs", run.outputs ?? []),
    createListBlock("Verification", performed)
  );
  return card;
}

function createRunDetails(title, status, open) {
  const details = document.createElement("details");
  details.className = "definition-card run-card";
  details.open = open;

  const summary = document.createElement("summary");
  summary.append(
    createText("h4", "", title),
    createText("span", "", status ?? "Recorded attempt")
  );
  details.append(summary);
  return details;
}

function createRunAlerts(knownIssues, pending) {
  const block = document.createElement("div");
  block.className = "run-alerts";
  block.append(
    createListBlock("Known issues", Array.isArray(knownIssues) ? knownIssues : [String(knownIssues)]),
    createListBlock("Pending", Array.isArray(pending) ? pending : [String(pending)])
  );
  return block;
}

function renderError(message) {
  if (recordBackLink) {
    recordBackLink.href = "./library.html";
  }
  root.replaceChildren(
    createText("p", "archive-kicker", "Record unavailable"),
    createText("h2", "", "Observation not found"),
    createText("p", "archive-notice", message),
    createActionRow([
      ["Back to Library", "./library.html", "primary"],
      ["Open Manifest", getManifestHref(), "secondary"]
    ])
  );
}
