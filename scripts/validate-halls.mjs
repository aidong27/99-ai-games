import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const errors = [];

function fail(message) {
  errors.push(message);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

const hallsIndex = await readJson("halls/halls.json");
const manifest = await readJson("games/manifest.json");

if (hallsIndex.totalHalls !== 9) fail("halls.totalHalls must be 9");
if (hallsIndex.slotsPerHall !== 11) fail("halls.slotsPerHall must be 11");
if (hallsIndex.totalGameSlots !== 99) fail("halls.totalGameSlots must be 99");

const mix = hallsIndex.slotMixPerHall ?? {};
const expectedMix = { benchmark: 3, normal: 6, "failed-weird": 1, "future-remake": 1 };
for (const [key, value] of Object.entries(expectedMix)) {
  if (mix[key] !== value) fail(`slotMixPerHall.${key} must be ${value}`);
}

const halls = hallsIndex.halls ?? [];
if (halls.length !== 9) fail("halls.halls must contain exactly 9 halls");

const ids = new Set();
const numbers = new Set();
const assigned = new Map();
const manifestGames = new Map((manifest.games ?? []).map((game) => [game.number, game]));

for (const hall of halls) {
  if (ids.has(hall.id)) fail(`duplicate hall id: ${hall.id}`);
  ids.add(hall.id);

  if (numbers.has(hall.number)) fail(`duplicate hall number: ${hall.number}`);
  numbers.add(hall.number);

  if (hall.capacity !== 11) fail(`${hall.id} capacity must be 11`);
  if (!Array.isArray(hall.assignedGameNumbers)) fail(`${hall.id} assignedGameNumbers must be an array`);
  if ((hall.assignedGameNumbers ?? []).length > 11) fail(`${hall.id} assigns more than 11 game slots`);

  for (const gameNumber of hall.assignedGameNumbers ?? []) {
    if (assigned.has(gameNumber)) {
      fail(`Game ${gameNumber} is assigned to multiple halls: ${assigned.get(gameNumber)} and ${hall.id}`);
    }
    assigned.set(gameNumber, hall.id);
  }
}

for (const game of manifest.games ?? []) {
  if (!ids.has(game.hallId)) fail(`Game ${game.number} uses unknown hallId: ${game.hallId}`);
  if (assigned.get(game.number) !== game.hallId) {
    fail(`Game ${game.number} must be assigned to ${game.hallId} in halls/halls.json`);
  }
}

if (errors.length) {
  console.error("Hall validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Hall validation passed");
