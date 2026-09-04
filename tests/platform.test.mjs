import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { selectEntryRun, comparableEntries, samplePair } from "../src/data/entry-runs.js";
import { groupEntriesByFamily } from "../src/benchmark-data.js";
import { startStaticServer } from "../scripts/lib/static-server.mjs";

const identity = { modelName: "GPT-6", agentName: "Codex", provider: "OpenAI" };
const raw = { runId: "raw", runType: "raw", status: "finalized", publicPath: "./test/raw/", identity,
  finishedAt: "2026-01-01", report: { status: "passed", score: { earned: 80, maximum: 100, groups: [] } } };
const repair = { ...raw, runId: "repair", runType: "standard-repair", publicPath: "./test/repair/",
  identity: { ...identity, agentName: "Repair Agent" } };
const entry = { entryId: "test-one", entryNumber: 1, entryNumberLabel: "001", status: "finalized", identity,
  title: "Test Beacon", summary: "A local relay experiment",
  challengeId: "protocol-99", challengeVersion: "v1", canonicalPromptHash: "test-hash",
  canonicalRun: raw, runs: [raw, repair] };

test("Run selection keeps evidence, identity and routes together", () => {
  const selected = selectEntryRun(entry, "standard-repair");
  assert.equal(selected.canonicalRun.runId, "repair");
  assert.equal(selected.screenshots.victory, "./test/repair/evidence/screenshots/victory.png");
  assert.match(selected.detailUrl, /run=repair/);
  assert.equal(selected.defaultComparable, false);
  assert.equal(selectEntryRun(entry, "raw", "missing"), null);
  assert.equal(entry.canonicalRun.runId, "raw");
  assert.equal(selectEntryRun({ ...entry, status: "withdrawn" }).canonicalRun.publicPath, null);
});

test("comparison excludes mismatched versions and unpublished repairs", () => {
  const data = { challenge: { id: "protocol-99", version: "v1", canonicalPromptHash: "test-hash" }, entries: [entry,
    { ...entry, challengeVersion: "v2" }, { ...entry, canonicalPromptHash: "other" },
    { ...entry, runs: [raw, { ...repair, status: "building" }] }] };
  assert.equal(comparableEntries(data, "standard-repair").length, 1);
});

test("family grouping preserves selected sorting and blind pairs cannot repeat", () => {
  const newest = { ...entry, entryNumber: 2 };
  assert.deepEqual(groupEntriesByFamily([newest, entry])[0].entries.map((item) => item.entryNumber), [2, 1]);
  assert.equal(samplePair([entry]).length, 0);
  const pair = samplePair([entry, newest], () => 0);
  assert.notEqual(pair[0], pair[1]);
});

test("local server blocks private files, link escapes and writes; supports opaque-origin modules", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "p99-platform-"));
  const root = path.join(temp, "public");
  let server;
  let browser;
  try {
    await mkdir(root);
    await writeFile(path.join(temp, "private.txt"), "private");
    await writeFile(path.join(root, ".env"), "private");
    await symlink(path.join(temp, "private.txt"), path.join(root, "escape.txt"));
    await writeFile(path.join(root, "index.html"), '<iframe sandbox="allow-scripts" src="game.html"></iframe>');
    await writeFile(path.join(root, "game.html"), '<script type="module" src="module.js"></script>');
    await writeFile(path.join(root, "module.js"), 'document.body.textContent="Module loaded"; try { parent.document.body.textContent="unsafe"; } catch { document.body.dataset.isolated="true"; }');
    server = await startStaticServer({ root });
    assert.equal((await fetch(`${server.origin}/.env`)).status, 404);
    assert.equal((await fetch(`${server.origin}/escape.txt`)).status, 400);
    assert.equal((await fetch(server.origin, { method: "POST" })).status, 405);
    assert.equal(await (await fetch(server.origin, { method: "HEAD" })).text(), "");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(server.origin);
    const content = page.frameLocator("iframe").locator("body[data-isolated=true]");
    await content.waitFor();
    assert.equal(await content.textContent(), "Module loaded");
  } finally {
    await browser?.close();
    await server?.close();
    await rm(temp, { recursive: true, force: true });
  }
});

test("populated index sorting, Repair detail and Compare work at desktop and mobile", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const server = await startStaticServer({ root });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const second = { ...entry, entryId: "test-two", entryNumber: 2, entryNumberLabel: "002", canonicalRun: { ...raw, finishedAt: "2026-02-01" }, runs: [{ ...raw, finishedAt: "2026-02-01" }, repair] };
    const data = { challenge: { id: "protocol-99", version: "v1", title: "Protocol 99", canonicalPromptHash: "test-hash" },
      stats: { allocatedEntries: 2, benchmarkEntries: 2, targetEntries: 99 }, entries: [entry, second] };
    for (const width of [1440, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/data/benchmark.json", (route) => route.fulfill({ json: data }));
      await page.route("**/test/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>Browser-only test fixture</p>" }));
      await page.goto(`${server.origin}/entries.html`);
      await page.locator(".benchmark-entry-card").first().waitFor();
      await page.locator("#sort-filter").selectOption("newest");
      assert.match(await page.locator(".entry-number").first().textContent(), /002/);
      await page.locator("#run-filter").selectOption("standard-repair");
      assert.equal(await page.getByText("Play standard-repair", { exact: true }).count(), 2);
      await page.locator("#agent-filter").selectOption("Repair Agent");
      assert.equal(await page.locator(".benchmark-entry-card").count(), 2);
      await page.locator("#entry-search").fill("Test Beacon");
      assert.equal(await page.locator(".benchmark-entry-card").count(), 2);
      await page.locator("#entry-search").fill("no-such-game");
      await page.getByRole("button", { name: "Clear filters", exact: true }).click();
      await page.locator(".benchmark-entry-card").first().waitFor();
      assert.equal(await page.locator("#entry-search").inputValue(), "");
      assert.equal(await page.locator("#run-filter").inputValue(), "raw");
      await page.goto(`${server.origin}/entry.html?id=test-one&run=repair`);
      await page.locator("#entry-detail").waitFor();
      await page.waitForFunction(() => document.querySelector("#detail-header-status")?.textContent !== "LOADING ENTRY");
      assert.equal(await page.locator(".detail-game iframe").count(), 1, await page.locator("#entry-detail").innerText());
      assert.match(await page.locator(".detail-game iframe").getAttribute("src"), /repair/);
      assert.equal(await page.locator("iframe").getAttribute("sandbox"), "allow-scripts");
      assert.ok((await page.locator(".detail-game iframe").boundingBox()).height >= 700);
      assert.ok(await page.locator(".detail-game .benchmark-section-heading h2").first()
        .evaluate((element) => element.getBoundingClientRect().height < 70));
      await page.goto(`${server.origin}/compare.html`);
      await page.locator(".compare-column").first().waitFor();
      await page.locator("#compare-run-type").selectOption("standard-repair");
      assert.match(await page.locator(".compare-column iframe").first().getAttribute("src"), /repair/);
      await page.locator("#compare-checkpoint").selectOption("victory");
      assert.match(await page.locator(".compare-evidence img").first().getAttribute("src"), /repair\/evidence\/screenshots\/victory.png/);
      assert.equal(await page.locator(".compliance-details").count(), 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const html = (await readFile(path.join(root, "compare.html"), "utf8"))
        .replace(/<select id="compare-(?:run-type|checkpoint)">[\s\S]*?<\/select>/g, "");
      await page.route("**/compare.html", (route) => route.fulfill({ contentType: "text/html", body: html }));
      await page.reload();
      await page.locator(".compare-column").first().waitFor();
      assert.match(await page.locator(".compare-column iframe").first().getAttribute("src"), /raw/);
      await page.route("**/data/benchmark.json", (route) => route.fulfill({ json: {
        ...data, defaultEntries: [], stats: { ...data.stats, benchmarkEntries: 0 }
      } }));
      await page.goto(`${server.origin}/`);
      await page.locator("#home-entry-grid .benchmark-empty").waitFor();
      const empty = await page.locator("#home-entry-grid .benchmark-empty").boundingBox();
      const grid = await page.locator("#home-entry-grid").boundingBox();
      const index = await page.locator("#home-entry-grid .empty-index").boundingBox();
      const copy = await page.locator("#home-entry-grid .empty-copy").boundingBox();
      assert.ok(Math.abs(empty.width - grid.width) < 1, "empty state must span the complete grid");
      assert.ok(index.x + index.width <= copy.x || index.y + index.height <= copy.y,
        "empty-state number and copy must not overlap");
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser?.close(); await server.close(); }
});

test("language changes preserve dynamic state, nested markup and canonical text", async () => {
  const server = await startStaticServer({ root: path.resolve(import.meta.dirname, "..") });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${server.origin}/entries.html`);
    await page.waitForFunction(() => window.NinetyNineI18n);
    await page.evaluate(() => {
      const section = document.createElement("section");
      section.id = "translation-test";
      section.innerHTML = '<span id="dynamic-count">0</span><p id="mixed-label">Home<br><strong>Entries</strong></p><p id="dynamic-label">Home</p><pre>Home</pre><span translate="no">Entries</span><input placeholder="Search game, model, provider, or Agent">';
      document.body.append(section);
    });
    await page.evaluate(() => window.NinetyNineI18n.setLanguage("zh"));
    assert.equal(await page.locator("#mixed-label").textContent(), "首页作品");
    assert.equal(await page.locator("#mixed-label br").count(), 1);
    await page.evaluate(() => {
      document.querySelector("#dynamic-count").firstChild.data = "7";
      document.querySelector("#dynamic-label").firstChild.data = "Challenge";
    });
    await page.waitForFunction(() => document.querySelector("#dynamic-label").textContent === "挑战");
    await page.evaluate(() => window.NinetyNineI18n.setLanguage("en"));
    assert.equal(await page.locator("#dynamic-count").textContent(), "7");
    assert.equal(await page.locator("#dynamic-label").textContent(), "Challenge");
    assert.equal(await page.locator("#mixed-label").textContent(), "HomeEntries");
    await page.evaluate(() => window.NinetyNineI18n.setLanguage("zh"));
    assert.equal(await page.locator("#translation-test pre").textContent(), "Home");
    assert.equal(await page.locator('#translation-test [translate="no"]').textContent(), "Entries");
    assert.match(await page.locator("#translation-test input").getAttribute("placeholder"), /搜索游戏/);
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); await server.close(); }
});

test("featured evidence is contained, theme switching is real, and identity is not translated", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const server = await startStaticServer({ root });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const width of [1440, 768, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(server.origin, { waitUntil: "networkidle" });
      const featured = page.locator(".benchmark-featured");
      if (await featured.count()) {
        const media = await featured.locator(".benchmark-entry-media").boundingBox();
        const image = featured.locator("img");
        const bounds = await image.boundingBox();
        assert.ok(await image.evaluate((node) => node.complete && node.naturalWidth > 0));
        assert.ok(bounds.height <= media.height + 1 && bounds.width <= media.width + 1,
          "evidence must not escape its constrained frame");
        assert.equal(await image.evaluate((node) => getComputedStyle(node).objectFit), "contain");
        assert.equal(await featured.locator(".entry-identity").getAttribute("translate"), "no");
      }
      const count = await page.locator("#benchmark-count").textContent();
      await page.evaluate(() => {
        window.NinetyNineTheme.setMode("light");
        window.NinetyNineI18n.setLanguage("zh");
      });
      assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
      assert.equal(await page.locator("html").getAttribute("lang"), "zh-CN");
      assert.equal(await page.locator("#benchmark-count").textContent(), count);
      await page.reload();
      assert.equal(await page.locator("html").getAttribute("data-theme-mode"), "light");
      await page.evaluate(() => window.NinetyNineTheme.setMode("dark"));
      assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
      const boundary = await page.evaluate(() => [5, 6, 18, 19].map((hour) =>
        window.NinetyNineTheme.resolveThemeForDate(new Date(2026, 0, 1, hour), "auto")));
      assert.deepEqual(boundary, ["dark", "light", "light", "dark"]);
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await page.locator(".benchmark-hero > div").evaluate((node) =>
        getComputedStyle(node).animationName), "none");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.close();
    }
  } finally { await browser?.close(); await server.close(); }
});
