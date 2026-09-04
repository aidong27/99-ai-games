import { defineProtocolTest } from "../../../../../benchmarks/protocol-99/test-sdk/index.mjs";

export default defineProtocolTest("Tidelight: unprotected vent contact reaches real defeat", async (h) => {
  await h.start();
  await h.hold("KeyW", 1880);
  const position = await h.state();
  if (position.player.y < 640 || position.player.y > 730) throw new Error("Drone missed the pressure vent");
  await h.waitForState({ phase: "lost", integrity: 0 }, { timeoutMs: 30000 });
  await h.checkpoint("defeat");
});
