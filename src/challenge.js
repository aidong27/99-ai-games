import { loadBenchmark } from "./benchmark-data.js";

const hash = document.querySelector("#challenge-prompt-hash");
const seed = document.querySelector("#challenge-seed");
const prompt = document.querySelector("#prompt-content");

init();

async function init() {
  try {
    const [data, promptResponse] = await Promise.all([
      loadBenchmark(),
      fetch(new URL("../benchmarks/protocol-99/v1/PROMPT.md", import.meta.url), {
        cache: "no-store"
      })
    ]);
    if (!promptResponse.ok) {
      throw new Error(`Canonical prompt returned HTTP ${promptResponse.status}`);
    }
    hash.textContent = data.challenge.canonicalPromptHash;
    seed.textContent = data.challenge.benchmarkSeed;
    prompt.textContent = await promptResponse.text();
  } catch (error) {
    prompt.textContent = `The canonical prompt could not be loaded.\n\n${error.message}`;
  }
}
