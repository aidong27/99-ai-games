/*
 * Replays the reference launch vectors embedded in the Gravity Atlas engine
 * through the same deterministic physics the browser runs, and asserts every
 * plate is completable within its shot budget. This is the repository's
 * standing proof that no plate of Game 005 is unwinnable.
 */
import {
  LEVELS,
  REFERENCE_SOLUTIONS,
  POWER_CAP,
  simulateShot
} from "../games/gravity-atlas/src/engine.js";

const errors = [];

if (REFERENCE_SOLUTIONS.length !== LEVELS.length) {
  errors.push(`reference solution count ${REFERENCE_SOLUTIONS.length} != level count ${LEVELS.length}`);
}

for (let index = 0; index < LEVELS.length; index += 1) {
  const level = LEVELS[index];
  const solution = REFERENCE_SOLUTIONS[index];
  if (!solution) {
    errors.push(`${level.name}: missing reference solution`);
    continue;
  }

  const power = Math.sqrt(solution.vx * solution.vx + solution.vy * solution.vy);
  if (power > POWER_CAP + 1e-9) {
    errors.push(`${level.name}: reference solution exceeds power cap (${power.toFixed(2)} > ${POWER_CAP})`);
  }

  const result = simulateShot(index, solution.vx, solution.vy);
  if (result.outcome !== "target") {
    errors.push(`${level.name}: reference solution outcome is "${result.outcome}", expected "target"`);
    continue;
  }
  if (level.budget < 1) {
    errors.push(`${level.name}: shot budget must allow at least one attempt`);
  }
  console.log(`${level.name}: reference shot hits the target in ${result.t.toFixed(2)}s (budget ${level.budget}, par ${level.par})`);
}

if (errors.length) {
  console.error("Gravity Atlas verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Gravity Atlas verification passed: every plate is completable within budget");
