import { defineProtocolTest } from "../../../../benchmarks/protocol-99/test-sdk/index.mjs";

export default defineProtocolTest("fixture winning playthrough", async (game) => {
  await game.start();

  await game.press("ArrowUp");
  await game.press("e");
  await game.press("ArrowRight");
  await game.press("ArrowRight");
  await game.press("e");
  await game.waitForState({ relaysActivated: 1, worldStage: 1 });
  await game.checkpoint("relay-1");

  await game.press("ArrowLeft");
  await game.press("ArrowLeft");
  await game.press("ArrowUp");
  await game.press("e");
  await game.press("ArrowRight");
  await game.press("ArrowRight");
  await game.press("e");
  await game.waitForState({ relaysActivated: 2, worldStage: 2 });
  await game.checkpoint("relay-2");

  await game.press("ArrowLeft");
  await game.press("ArrowLeft");
  await game.press("ArrowUp");
  await game.press("e");
  await game.press("ArrowRight");
  await game.press("ArrowRight");
  await game.press("e");
  await game.waitForState({ relaysActivated: 3, worldStage: 3, exitUnlocked: true });
  await game.checkpoint("relay-3");

  await game.press("space");
  await game.press("ArrowRight");
  await game.press("ArrowRight");
  await game.press("ArrowRight");
  await game.press("ArrowRight");
  await game.press("ArrowRight");
  await game.waitForState({ phase: "won" });
  await game.checkpoint("victory");
});
