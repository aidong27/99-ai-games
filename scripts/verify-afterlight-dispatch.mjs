import assert from "node:assert/strict";
import {
  REFERENCE_PATH,
  applyChoice,
  createInitialState,
  getCurrentScene,
  getEnding,
  getMetricSnapshot
} from "../games/afterlight-dispatch/src/engine.js";

let state = createInitialState();
assert.equal(getCurrentScene(state)?.id, "breakwater");

for (const choiceId of REFERENCE_PATH) {
  const scene = getCurrentScene(state);
  assert.ok(scene, `Reference path ended before choice ${choiceId}`);
  assert.ok(scene.choices.some((choice) => choice.id === choiceId), `${choiceId} is unavailable in ${scene.id}`);
  state = applyChoice(state, choiceId);
}

assert.equal(state.outcome, "city-answers");
assert.equal(getEnding(state)?.title, "The city answers back");
assert.equal(state.history.length, 6);
assert.ok(state.evidence.includes("causeway-key"));
assert.ok(state.evidence.includes("ghost-mismatch"));
assert.ok(state.evidence.includes("witness-consensus"));
assert.deepEqual(getMetricSnapshot(state), {
  clarity: 6,
  trust: 6,
  time: 4,
  interference: 1,
  evidenceCount: 4
});

let failureState = createInitialState();
for (const choiceId of [
  "send-shelter-order",
  "send-lamp-breakwater",
  "cut-echo",
  "accept-ghost",
  "split-ferry",
  "route-seaward"
]) {
  failureState = applyChoice(failureState, choiceId);
}
assert.equal(failureState.outcome, "frequency-lost");

assert.throws(
  () => applyChoice(createInitialState(), "route-glass"),
  /not available/
);

console.log("Afterlight Dispatch verification passed:");
console.log(`- canonical path reaches ${state.outcome} with ${state.evidence.length} evidence fragments`);
console.log(`- adverse path reaches ${failureState.outcome}`);
console.log("- invalid out-of-scene choices are rejected");
