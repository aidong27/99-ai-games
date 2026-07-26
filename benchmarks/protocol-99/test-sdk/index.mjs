/**
 * Participant-facing Protocol 99 test declaration.
 *
 * Entry tests receive a restricted harness from the repository runner. They do
 * not receive a Playwright Page and cannot evaluate arbitrary browser code.
 */
export function defineProtocolTest(name, run) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Protocol test name must be a non-empty string");
  }
  if (typeof run !== "function") {
    throw new TypeError("Protocol test callback must be a function");
  }
  return Object.freeze({
    contract: "protocol-99-test/1.0",
    name: name.trim(),
    run
  });
}
