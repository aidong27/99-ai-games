const gameList = document.querySelector("#game-list");
const collectionStatus = document.querySelector("#collection-status");

loadManifest();

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
  const released = games.filter((game) => game.status !== "planned").length;

  collectionStatus.textContent = `${released} of ${manifest.targetGameCount} entries started`;
  gameList.replaceChildren(...games.map(createGameCard));
}

function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";

  const header = document.createElement("header");
  const number = document.createElement("span");
  number.className = "game-number";
  number.textContent = `Game ${String(game.number).padStart(3, "0")}`;

  const title = document.createElement("h3");
  title.textContent = game.title;

  const description = document.createElement("p");
  description.className = "game-description";
  description.textContent = game.description;

  header.append(number, title, description);

  const metadata = document.createElement("dl");
  metadata.className = "metadata";
  metadata.append(
    createMetadata("Status", game.statusLabel),
    createMetadata("Model", game.provenance.modelName),
    createMetadata("Agent", game.provenance.agentName),
    createMetadata("Human edits", game.provenance.humanCodeEdits ? "Yes" : "No"),
    createMetadata("Source", game.sourceCompleteness)
  );

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    createLink("Open entry", game.localPath, "button primary"),
    createLink("Play on itch.io", game.playUrl, "button")
  );

  card.append(header, createTags(game.tags), metadata, createNotice(game), actions);
  return card;
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
  wrapper.className = "hero-meta";

  for (const tagText of tags) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = tagText;
    wrapper.append(tag);
  }

  return wrapper;
}

function createNotice(game) {
  const notice = document.createElement("p");
  notice.className = "notice";
  notice.textContent = game.repositoryNote;
  return notice;
}

function createLink(label, href, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = href;
  link.textContent = label;
  return link;
}

function renderError(error) {
  collectionStatus.textContent = "Manifest could not be loaded";

  const notice = document.createElement("p");
  notice.className = "notice";
  notice.textContent = `The launcher could not read games/manifest.json. ${error.message}`;
  gameList.replaceChildren(notice);
}
