import { createSignalField } from "./archive-effects.js";

const signalCanvas = document.querySelector("#log-signal");
const signalField = createSignalField(signalCanvas, { variant: "log", density: 22 });

signalField.start();
window.addEventListener("pagehide", () => signalField.destroy(), { once: true });
