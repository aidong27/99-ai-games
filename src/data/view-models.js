import { DEFAULT_TARGET_COUNT } from "../app/constants.js";
import { getMobileSupportInfo, isMobileRuntime } from "./device-support.js";
import {
  getModelFamily,
  getModelFamilyIdFromSelection
} from "./model-families.js";

export function getArchiveStats(manifest, games) {
  const playableCount = games.filter((game) => game.status === "playable").length;
  const mobileSupportedCount = games.filter((game) => getMobileSupportInfo(game).key === "supported").length;
  const variantCount = games.reduce((total, game) => total + (game.variants?.length ?? 0), 0);
  const runCount = games.reduce((total, game) => total + (game.runRecords?.length ?? 0), 0);
  const targetCount = manifest.targetGameCount ?? DEFAULT_TARGET_COUNT;

  return {
    observationCount: games.length,
    playableCount,
    mobileSupportedCount,
    variantCount,
    runCount,
    targetCount,
    reservedCount: Math.max(0, targetCount - games.length)
  };
}

export function getModelsFromGames(games) {
  const models = new Map();

  for (const game of games) {
    registerModel(models, game.provenance?.modelName, game.provenance?.agentName, game);

    for (const variant of game.variants ?? []) {
      registerModel(models, variant.modelName, variant.agentName, game);
    }
  }

  return [...models.values()].sort(compareModels);
}

export function getModelFamiliesFromModels(models) {
  const families = new Map();

  for (const model of models) {
    const familyInfo = getModelFamily(model.modelName);
    if (!families.has(familyInfo.id)) {
      families.set(familyInfo.id, {
        ...familyInfo,
        models: [],
        agents: new Set(),
        games: []
      });
    }

    const family = families.get(familyInfo.id);
    family.models.push(model);
    for (const agent of model.agents) {
      family.agents.add(agent);
    }
    for (const game of model.games) {
      if (!family.games.some((entry) => entry.slug === game.slug)) {
        family.games.push(game);
      }
    }
  }

  return [...families.values()]
    .map((family) => ({
      ...family,
      models: [...family.models].sort(compareModels),
      games: [...family.games].sort(compareGames)
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function filterGamesByModel(games, modelName) {
  if (!modelName || modelName === "all") {
    return games;
  }

  const familyId = getModelFamilyIdFromSelection(modelName);

  return games.filter((game) => {
    if (familyId) {
      return getGameModelNames(game).some((name) => getModelFamily(name).id === familyId);
    }
    if (game.provenance?.modelName === modelName) {
      return true;
    }
    return (game.variants ?? []).some((variant) => variant.modelName === modelName);
  });
}

export function selectFeaturedGame(games) {
  const playable = games
    .filter((game) => game.status === "playable")
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0));

  if (!playable.length) {
    return [...games].sort((a, b) => (b.number ?? 0) - (a.number ?? 0))[0] ?? null;
  }

  if (isMobileRuntime()) {
    return playable.find((game) => getMobileSupportInfo(game).key === "supported")
      ?? playable.find((game) => getMobileSupportInfo(game).key === "limited")
      ?? playable[0];
  }

  return playable[0];
}

export function getGameNumberLabel(game) {
  const label = String(game?.number ?? "?").padStart(3, "0");
  return `Observation ${label} / Game ${label}`;
}

export function getShortGameNumber(game) {
  return `OBS ${String(game?.number ?? "?").padStart(3, "0")}`;
}

export function getGameStatusLabel(game) {
  const status = String(game?.status ?? "").trim();
  if (status === "playable") {
    return "Playable";
  }
  return String(game?.statusLabel ?? "").trim() || toTitle(status || "unknown");
}

export function formatDate(value) {
  if (!value) {
    return "Date unrecorded";
  }
  return String(value);
}

export function toTitle(value = "unknown") {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function registerModel(models, modelName, agentName, game) {
  if (!modelName) {
    return;
  }

  if (!models.has(modelName)) {
    models.set(modelName, {
      modelName,
      agents: new Set(),
      games: []
    });
  }

  const model = models.get(modelName);
  if (agentName) {
    model.agents.add(agentName);
  }
  if (!model.games.some((entry) => entry.slug === game.slug)) {
    model.games.push(game);
  }
}

function getGameModelNames(game) {
  return [
    game.provenance?.modelName,
    ...(game.variants ?? []).map((variant) => variant.modelName)
  ].filter(Boolean);
}

function compareModels(a, b) {
  const firstNumber = Math.min(...a.games.map((game) => game.number ?? 999));
  const secondNumber = Math.min(...b.games.map((game) => game.number ?? 999));
  return firstNumber - secondNumber || a.modelName.localeCompare(b.modelName);
}

function compareGames(a, b) {
  return (a.number ?? 999) - (b.number ?? 999) || String(a.title ?? "").localeCompare(String(b.title ?? ""));
}
