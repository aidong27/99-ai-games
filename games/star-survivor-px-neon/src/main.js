const root = document.querySelector("#game-status");

loadGameMetadata();

async function loadGameMetadata() {
  try {
    const response = await fetch("./game.json");
    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }

    const game = await response.json();
    renderGameStatus(game);
  } catch (error) {
    renderError(error);
  }
}

function renderGameStatus(game) {
  root.replaceChildren(
    createStatusItem("Collection", game.collection),
    createStatusItem("Status", game.statusLabel),
    createStatusItem("Model", game.provenance.modelName),
    createStatusItem("Agent", game.provenance.agentName),
    createStatusItem("Created date", game.provenance.createdDate),
    createStatusItem("Human code edits", game.provenance.humanCodeEdits ? "Yes" : "No"),
    createStatusItem("Source completeness", game.sourceCompleteness),
    createStatusItem("Repository note", game.repositoryNote)
  );
}

function createStatusItem(label, value) {
  const item = document.createElement("article");
  item.className = "status-item";

  const title = document.createElement("strong");
  title.textContent = `${label}:`;

  const body = document.createElement("span");
  body.textContent = value;

  item.append(title, body);
  return item;
}

function renderError(error) {
  const notice = createStatusItem("Metadata error", error.message);
  root.replaceChildren(notice);
}
