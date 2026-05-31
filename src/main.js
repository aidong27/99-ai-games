const gameList = document.querySelector("#game-list");
const featuredGame = document.querySelector("#featured-game");
const collectionStatus = document.querySelector("#collection-status");
const completedCount = document.querySelector("#completed-count");
const targetCount = document.querySelector("#target-count");
const hallCount = document.querySelector("#hall-count");
const variantCount = document.querySelector("#variant-count");
const runCount = document.querySelector("#run-count");
const latestTitle = document.querySelector("#latest-title");
const scopeModel = document.querySelector("#scope-model");
const latestLaunch = document.querySelector("#latest-launch");
const scopeCanvas = document.querySelector("#scope-canvas");
const scopeCtx = scopeCanvas?.getContext("2d");

const scopeNodes = Array.from({ length: 22 }, (_, index) => ({
  x: 70 + (index * 137) % 610,
  y: 62 + (index * 91) % 392,
  size: 3 + index % 4,
  phase: index * 0.71
}));

loadManifest();
animateScope();

async function loadManifest() {
  try {
    const response = await fetch("./games/manifest.json");
    if (!response.ok) {
      throw new Error(`Manifest request failed: ${response.status}`);
    }

    const manifest = await response.json();
    renderCollection(manifest);
  } catch (error) {
    renderError(error);
  }
}

function renderCollection(manifest) {
  const games = Array.isArray(manifest.games) ? manifest.games : [];
  const playable = games.filter((game) => game.status === "playable");
  const featured = games[0];
  const target = manifest.targetGameCount ?? 99;
  const variants = games.reduce((total, game) => total + (game.variants?.length ?? 0), 0);
  const runs = games.reduce((total, game) => total + (game.runRecords?.length ?? 0), 0);

  completedCount.textContent = String(playable.length);
  targetCount.textContent = String(target);
  hallCount.textContent = String(manifest.hallCount ?? 9);
  variantCount.textContent = String(variants);
  runCount.textContent = String(runs);
  collectionStatus.textContent = `${playable.length} playable observation sample, ${variants} variant, ${runs} run record`;
  featuredGame.replaceChildren(createFeaturedGame(featured));
  gameList.replaceChildren(...games.map(createGameCard));

  if (featured) {
    const launchHref = getLaunchHref(featured);
    latestTitle.textContent = featured.title;
    latestLaunch.href = launchHref;
    scopeModel.textContent = `${featured.provenance?.modelName ?? "Unknown model"} / ${featured.provenance?.agentName ?? "Unknown agent"}`;
  }
}

function createFeaturedGame(game) {
  if (!game) {
    return createNotice("No games are listed yet.");
  }

  const article = document.createElement("article");
  article.className = "featured-card";

  const signal = document.createElement("div");
  signal.className = "signal-stack";
  signal.setAttribute("aria-hidden", "true");
  signal.innerHTML = "<span></span><span></span><span></span><span></span>";

  const copy = document.createElement("div");
  copy.className = "featured-copy";
  copy.append(
    createText("span", "game-number", `Observation ${String(game.number).padStart(3, "0")} / Game ${String(game.number).padStart(3, "0")}`),
    createText("h3", "", game.title),
    createText("p", "game-description", game.description),
    createTags(game.tags),
    createMetadataBlock(game)
  );

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    createLink("Launch game", getLaunchHref(game), "button primary"),
    createLink("View metadata", getMetadataHref(game), "button")
  );

  article.append(signal, copy, actions);
  return article;
}

function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";

  const header = document.createElement("header");
  header.append(
    createText("span", "game-number", `Observation ${String(game.number).padStart(3, "0")} / Game ${String(game.number).padStart(3, "0")}`),
    createText("h3", "", game.title),
    createText("p", "game-description", game.description)
  );

  const status = document.createElement("div");
  status.className = "status-row";
  status.append(
    createText("span", "status-pill", game.statusLabel ?? game.status),
    createText("span", "model-pill", game.provenance?.modelName ?? "Model unrecorded")
  );

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    createLink("Launch game", getLaunchHref(game), "button primary"),
    createLink("Metadata", getMetadataHref(game), "button")
  );

  card.append(header, createTags(game.tags), status, createMetadataBlock(game), createNotice(game.repositoryNote), actions);
  return card;
}

function createMetadataBlock(game) {
  const provenance = game.provenance ?? {};
  const metadata = document.createElement("dl");
  metadata.className = "metadata";
  metadata.append(
    createMetadata("Status", game.statusLabel ?? game.status),
    createMetadata("Archive role", game.archiveRole),
    createMetadata("Hall", game.hallName ?? game.hallId),
    createMetadata("Slot type", game.slotType),
    createMetadata("Model", provenance.modelName),
    createMetadata("Agent", provenance.agentName),
    createMetadata("Created", provenance.createdDate),
    createMetadata("Human edits", provenance.humanCodeEdits ? "Yes" : "No"),
    createMetadata("Variants", String(game.variants?.length ?? 0)),
    createMetadata("Runs", String(game.runRecords?.length ?? 0)),
    createMetadata("Source", game.sourceCompleteness)
  );
  return metadata;
}

function createMetadata(label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");

  term.textContent = label;
  description.textContent = value ?? "Unknown";

  row.append(term, description);
  return row;
}

function createTags(tags = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "tag-list";

  for (const tagText of tags) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = tagText;
    wrapper.append(tag);
  }

  return wrapper;
}

function createNotice(message) {
  const notice = document.createElement("p");
  notice.className = "notice";
  notice.textContent = message ?? "No repository note recorded.";
  return notice;
}

function createLink(label, href, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = href;
  link.textContent = label;
  return link;
}

function createText(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text ?? "";
  return element;
}

function getLaunchHref(game) {
  return game.localPath ?? `./games/${game.slug}/`;
}

function getMetadataHref(game) {
  const launchHref = getLaunchHref(game).replace(/\/?$/, "/");
  return game.metadataPath ?? `${launchHref}game.json`;
}

function renderError(error) {
  collectionStatus.textContent = "Archive manifest could not be loaded";
  featuredGame.replaceChildren(createNotice(`The observatory could not read games/manifest.json. ${error.message}`));
  gameList.replaceChildren();
}

function animateScope(now = 0) {
  if (!scopeCtx || !scopeCanvas) {
    return;
  }

  const width = scopeCanvas.width;
  const height = scopeCanvas.height;
  const time = now / 1000;

  scopeCtx.clearRect(0, 0, width, height);
  scopeCtx.fillStyle = "#06090f";
  scopeCtx.fillRect(0, 0, width, height);

  drawScopeGrid(width, height, time);
  drawScopeLinks(time);
  drawScopeSweep(width, height, time);
  drawScopeNodes(time);
  drawScopeLabels(width, height, time);

  requestAnimationFrame(animateScope);
}

function drawScopeGrid(width, height, time) {
  scopeCtx.strokeStyle = "rgba(77, 244, 255, 0.12)";
  scopeCtx.lineWidth = 1;

  for (let x = -80; x < width + 80; x += 40) {
    const offset = Math.sin(time * 0.8 + x * 0.04) * 7;
    scopeCtx.beginPath();
    scopeCtx.moveTo(x + offset, 0);
    scopeCtx.lineTo(x - 62 + offset, height);
    scopeCtx.stroke();
  }

  for (let y = 20; y < height; y += 38) {
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, y + Math.cos(time + y * 0.02) * 3);
    scopeCtx.lineTo(width, y + Math.sin(time + y * 0.02) * 3);
    scopeCtx.stroke();
  }
}

function drawScopeLinks(time) {
  for (let i = 0; i < scopeNodes.length - 1; i += 1) {
    const node = scopeNodes[i];
    const next = scopeNodes[(i * 5 + 7) % scopeNodes.length];
    const intensity = 0.12 + Math.sin(time * 1.7 + node.phase) * 0.08;
    scopeCtx.strokeStyle = `rgba(168, 255, 120, ${intensity})`;
    scopeCtx.lineWidth = 1 + i % 3;
    scopeCtx.beginPath();
    scopeCtx.moveTo(node.x, node.y);
    scopeCtx.lineTo(next.x, next.y);
    scopeCtx.stroke();
  }
}

function drawScopeSweep(width, height, time) {
  const sweepX = (time * 90) % (width + 160) - 80;
  scopeCtx.strokeStyle = "rgba(255, 209, 102, 0.42)";
  scopeCtx.lineWidth = 34;
  scopeCtx.beginPath();
  scopeCtx.moveTo(sweepX, height);
  scopeCtx.lineTo(sweepX + 180, 0);
  scopeCtx.stroke();

  scopeCtx.strokeStyle = "rgba(244, 247, 255, 0.42)";
  scopeCtx.lineWidth = 2;
  scopeCtx.beginPath();
  scopeCtx.moveTo(sweepX + 18, height);
  scopeCtx.lineTo(sweepX + 198, 0);
  scopeCtx.stroke();
}

function drawScopeNodes(time) {
  for (const node of scopeNodes) {
    const pulse = 1 + Math.sin(time * 3 + node.phase) * 0.28;
    scopeCtx.fillStyle = "rgba(61, 242, 255, 0.94)";
    scopeCtx.beginPath();
    scopeCtx.rect(node.x - node.size * pulse, node.y - node.size * pulse, node.size * 2 * pulse, node.size * 2 * pulse);
    scopeCtx.fill();
    scopeCtx.strokeStyle = "rgba(244, 247, 255, 0.52)";
    scopeCtx.stroke();
  }
}

function drawScopeLabels(width, height, time) {
  scopeCtx.fillStyle = "rgba(244, 247, 255, 0.82)";
  scopeCtx.font = "700 14px ui-sans-serif, system-ui";
  scopeCtx.fillText("OBSERVATION 001 // SIGNAL FIELD LOCKED", 24, 34);
  scopeCtx.fillText(`AI EVOLUTION RECORD T+${Math.floor(time).toString().padStart(4, "0")}`, width - 270, height - 28);
}
