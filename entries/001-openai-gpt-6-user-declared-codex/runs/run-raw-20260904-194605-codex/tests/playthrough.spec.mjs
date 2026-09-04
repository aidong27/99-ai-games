import { defineProtocolTest } from "../../../../../benchmarks/protocol-99/test-sdk/index.mjs";

export default defineProtocolTest("Tidelight: recover, restore and physically extract twice", async (h) => {
  await h.start();
  async function move(x, y) {
    for (const axis of ["x", "y"]) {
      const target = axis === "x" ? x : y;
      let stuck = 0;
      for (let i = 0; i < 90; i++) {
        const before = await h.state();
        if (before.phase === "won") return;
        if (before.phase !== "playing") throw new Error("Recovery ended unexpectedly: " + before.phase);
        const delta = target - before.player[axis];
        if (Math.abs(delta) < 2.5) break;
        if (before.abilityStatus === "ready") await h.press("Space");
        const key = axis === "x" ? (delta > 0 ? "ArrowRight" : "ArrowLeft")
          : (delta > 0 ? "ArrowDown" : "ArrowUp");
        const after = await h.hold(key, Math.max(16, Math.min(800, Math.abs(delta) / 85 * 1000)));
        stuck = Math.abs(after.player[axis] - before.player[axis]) < 0.5 ? stuck + 1 : 0;
        if (stuck > 3) throw new Error("A public-control route is obstructed at " + JSON.stringify(after.player));
        if (i === 89) throw new Error("Movement did not reach the waypoint");
      }
    }
  }
  await move(160, 160);
  await h.press("KeyE");
  await h.waitForState({ carryingCore: true, coresCollectedTotal: 1 });
  await h.checkpoint("gameplay");
  await move(160, 840);
  await move(800, 840);
  await h.press("KeyE");
  await h.waitForState({ relaysActivated: 1, carryingCore: false });
  await h.checkpoint("relay-1");
  await move(800, 180);
  await h.press("KeyE");
  await h.waitForState({ coresCollectedTotal: 2, carryingCore: true });
  await move(1480, 180);
  await move(1480, 820);
  await move(1320, 820);
  await h.press("KeyE");
  await h.waitForState({ relaysActivated: 2, carryingCore: false });
  await h.checkpoint("relay-2");
  await move(1480, 820);
  await move(1480, 180);
  await move(1460, 180);
  await h.press("KeyE");
  await h.waitForState({ coresCollectedTotal: 3, carryingCore: true });
  await move(1460, 560);
  await move(980, 560);
  await move(980, 460);
  await move(160, 460);
  await h.press("KeyE");
  await h.waitForState({ relaysActivated: 3, carryingCore: false, exitUnlocked: true });
  await h.checkpoint("relay-3");
  await move(160, 840);
  await move(1480, 840);
  await move(1480, 900);
  const result = await h.waitForState({ phase: "won" });
  if (result.player.x < 1430 || result.player.y < 862) throw new Error("Drone did not enter the actual dock");
  await h.checkpoint("victory");
});
