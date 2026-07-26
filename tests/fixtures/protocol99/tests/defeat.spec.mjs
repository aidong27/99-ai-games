import { defineProtocolTest } from "../../../../benchmarks/protocol-99/test-sdk/index.mjs";

export default defineProtocolTest("fixture defeat path", async (game) => {
  await game.start();
  await game.press("ArrowRight");
  await game.wait(1900);
  await game.waitForState({ phase: "lost", integrity: 0 });
});
