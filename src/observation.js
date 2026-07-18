import {
  formatDate,
  getDeviceSupport,
  getGameBySlug,
  getGameNumberLabel,
  getLaunchHref,
  getMetadataHref,
  getMobileSupportInfo,
  getPlayGateHref,
  getRunRecordHref,
  getScreenshotHref,
  getScreenshotList,
  loadRunRecords,
  toTitle
} from "./archive-data.js";

const root = document.querySelector("#record-root");

loadRecord();

async function loadRecord() {
  const slug = new URLSearchParams(window.location.search).get("slug");
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

  const record = document.createElement("article");
  record.className = "record";
  record.append(
    createHero(game, heroImage, mobile),
    createMediaSection(game, screenshots),
    createDevicePanel(support, mobile),
    createProvenancePanel(game),
    createControlsPanel(game),
    createVariantsPanel(game),
    createRunsPanel(game, runs)
  );

  root.replaceChildren(record);
  document.title = `${game.title} | Observation Record`;
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
      [game.statusLabel ?? toTitle(game.status), "neutral"],
      [mobile.label, mobile.tone],
      [game.provenance?.modelName ?? "Model unrecorded", "mono"]
    ]),
    createActionRow([
      ["Continue", getPlayGateHref(game), "primary"],
      ["Metadata JSON", getMetadataHref(game), "secondary"],
      ["Direct game page", getLaunchHref(game), "ghost"]
    ])
  );

  hero.append(image, copy);
  return hero;
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
  const section = createSection("Device Support");
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
  const section = createSection("Provenance");
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
    const path = variant.metadataPath ? getRunRecordHref(game, variant.metadataPath).replace("/runs/", "/variants/") : "";
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
  list.append(...runs.map((run) => createRunCard(game, run)));
  section.append(list);
  return section;
}

function createRunCard(game, run) {
  if (run._loadError) {
    return createDefinitionCard(run._runId, [
      ["Path", run._href],
      ["Status", `Could not load: ${run._loadError}`]
    ]);
  }

  const verification = run.verification ?? {};
  const performed = verification.performed ?? verification.checks ?? [];
  const pending = verification.pending ?? run.pending ?? [];
  const knownIssues = run.knownIssues ?? [];

  const card = createDefinitionCard(run._runId, [
    ["Model", run.modelName],
    ["Agent", run.agentName],
    ["Verified", formatDate(verification.verifiedDate ?? run.date)],
    ["Human code edits", String(run.humanCodeEdits)],
    ["Path", getRunRecordHref(game, run._href)]
  ]);

  card.append(
    createListBlock("Prompt summary", [run.promptSummary ?? "No public prompt summary recorded."]),
    createListBlock("Outputs", run.outputs ?? []),
    createListBlock("Verification", performed),
    createListBlock("Known issues", Array.isArray(knownIssues) ? knownIssues : [String(knownIssues)]),
    createListBlock("Pending", Array.isArray(pending) ? pending : [String(pending)])
  );
  return card;
}

function createSection(title) {
  const section = document.createElement("section");
  section.className = "record-section";
  section.append(createText("h3", "", title));
  return section;
}

function createDefinitionGrid(rows) {
  const grid = document.createElement("dl");
  grid.className = "definition-grid";
  grid.append(...rows.map(([label, value]) => createDefinitionItem(label, value)));
  return grid;
}

function createDefinitionCard(title, rows) {
  const card = document.createElement("article");
  card.className = "definition-card";
  card.append(createText("h4", "", title), createDefinitionGrid(rows));
  return card;
}

function createDefinitionItem(label, value) {
  const item = document.createElement("div");
  item.append(createText("dt", "", label), createText("dd", "", normalizeValue(value)));
  return item;
}

function createListBlock(title, items) {
  const block = document.createElement("div");
  block.className = "list-block";
  block.append(createText("h4", "", title));

  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) {
    block.append(createText("p", "", "None recorded."));
    return block;
  }

  const list = document.createElement("ul");
  list.append(...values.map((item) => {
    const li = document.createElement("li");
    li.textContent = String(item);
    return li;
  }));
  block.append(list);
  return block;
}

function createBadgeRow(items) {
  const row = document.createElement("div");
  row.className = "compact-badges";
  row.append(...items.map(([text, tone]) => {
    const badge = document.createElement("span");
    badge.className = `archive-badge ${tone}`;
    badge.textContent = text;
    return badge;
  }));
  return row;
}

function createActionRow(actions) {
  const row = document.createElement("div");
  row.className = "record-actions";
  row.append(...actions.map(([label, href, tone]) => {
    const link = document.createElement("a");
    link.className = `archive-button ${tone}`;
    link.href = href;
    link.textContent = label;
    return link;
  }));
  return row;
}

function createText(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text ?? "";
  return element;
}

function normalizeValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Unrecorded";
  }
  return String(value);
}

function renderError(message) {
  root.replaceChildren(
    createText("p", "archive-kicker", "Record unavailable"),
    createText("h2", "", "Observation not found"),
    createText("p", "archive-notice", message),
    createActionRow([
      ["Back to Library", "./library.html", "primary"],
      ["Open Manifest", "./games/manifest.json", "secondary"]
    ])
  );
}
