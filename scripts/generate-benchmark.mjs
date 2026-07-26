#!/usr/bin/env node
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  formatEntryNumber,
  fromRepo,
  hashFile,
  parseCli,
  pathExists,
  readJson,
  resolveRepoRoot,
  sha256,
  stableJson,
  toPosix
} from "./lib/common.mjs";
import { loadProtocol, scanEntries } from "./lib/protocol.mjs";

const cli = parseCli();
const checkOnly = cli.has("check");
const repoRoot = resolveRepoRoot(cli.get("repo"));
const protocol = await loadProtocol(repoRoot);
const legacy = await readJson(fromRepo(repoRoot, "games", "manifest.json"));
const records = await scanEntries(repoRoot);
const failures = [];
const summaries = [];

for (const record of records) {
  if (!record.entry) {
    continue;
  }
  const runs = [];
  for (const runRecord of record.runs) {
    if (!runRecord.run) {
      continue;
    }
    const reportPath = path.join(runRecord.runDir, runRecord.run.verificationReport ?? "evidence/report.json");
    const report = await pathExists(reportPath) ? await readJson(reportPath) : null;
    runs.push({
      runId: runRecord.run.runId,
      runType: runRecord.run.runType,
      status: runRecord.run.status,
      startedAt: runRecord.run.startedAt,
      finishedAt: runRecord.run.finishedAt,
      parentRunId: runRecord.run.parentRunId,
      sourceHash: runRecord.run.sourceHash,
      evidenceHash: runRecord.run.evidenceHash,
      humanPromptCount: runRecord.run.humanPromptCount,
      humanCodeEdits: runRecord.run.humanCodeEdits,
      identity: runRecord.run.identity,
      report: report ? {
        status: report.status,
        score: report.score,
        failures: report.failures ?? [],
        browser: report.browser,
        sourceBytes: report.sourceBytes,
        sourceFileCount: report.sourceFileCount,
        verifiedAt: report.verifiedAt
      } : null,
      publicPath: runRecord.run.status === "finalized"
        ? `./entries/${encodeURIComponent(record.directoryName)}/runs/${encodeURIComponent(runRecord.run.runId)}/`
        : null,
      repositoryPath: `${toPosix(path.relative(repoRoot, runRecord.runDir))}/`
    });
  }
  const canonicalRun = runs.find((run) => run.runId === record.entry.canonicalRunId)
    ?? runs.find((run) => run.runType === "raw" && run.status === "finalized")
    ?? null;
  const canonicalRecord = canonicalRun
    ? record.runs.find((run) => run.run?.runId === canonicalRun.runId)
    : null;
  const screenshotBase = canonicalRecord
    ? `${toPosix(path.relative(repoRoot, canonicalRecord.runDir))}/evidence/screenshots`
    : null;
  summaries.push({
    entryId: record.entry.entryId,
    entryNumber: record.entry.entryNumber,
    entryNumberLabel: formatEntryNumber(record.entry.entryNumber),
    status: record.entry.status,
    challengeId: record.entry.challengeId,
    challengeVersion: record.entry.challengeVersion,
    canonicalPromptHash: record.entry.canonicalPromptHash,
    identity: record.entry.identity,
    createdAt: record.entry.createdAt,
    canonicalRunId: record.entry.canonicalRunId,
    defaultComparable: Boolean(
      record.entry.status === "finalized"
      && canonicalRun?.runType === "raw"
      && canonicalRun?.status === "finalized"
      && canonicalRun?.report?.status === "passed"
    ),
    canonicalRun,
    runs,
    screenshots: screenshotBase ? {
      title: `./${screenshotBase}/title.png`,
      gameplay: `./${screenshotBase}/gameplay.png`,
      relay1: `./${screenshotBase}/relay-1.png`,
      victory: `./${screenshotBase}/victory.png`
    } : null,
    detailUrl: `./entry.html?id=${encodeURIComponent(record.entry.entryId)}`,
    generatedDetailUrl: `./benchmark-pages/${encodeURIComponent(record.entry.entryId)}/`,
    repositoryPath: `${toPosix(path.relative(repoRoot, record.entryDir))}/`,
    reviews: record.entry.reviews ?? {
      playerExperience: null,
      engineering: null
    }
  });
}

summaries.sort((a, b) => a.entryNumber - b.entryNumber);
const finalizedRaw = summaries.filter((entry) => entry.defaultComparable);
const latestFinishedAt = summaries
  .flatMap((entry) => entry.runs.map((run) => run.finishedAt).filter(Boolean))
  .sort()
  .at(-1) ?? protocol.lock.lockedAt;

const manifest = {
  generated: true,
  generatedFrom: latestFinishedAt,
  challengeId: protocol.challenge.challengeId,
  challengeVersion: protocol.challenge.challengeVersion,
  canonicalPromptHash: protocol.lock.canonicalPromptSha256,
  targetEntryCount: 99,
  allocatedEntryCount: summaries.length,
  finalizedRawEntryCount: finalizedRaw.length,
  defaultComparisonPolicy: {
    challengeVersion: protocol.challenge.challengeVersion,
    canonicalPromptHash: protocol.lock.canonicalPromptSha256,
    runType: "raw",
    status: "finalized"
  },
  entries: summaries
};
const benchmarkData = {
  generated: true,
  generatedFrom: latestFinishedAt,
  project: {
    name: "99 AI Games",
    primaryTagline: "Same brief. Same rules. Different AI.",
    secondaryTagline: "The games are playable. The real exhibit is the AI that made them.",
    comparisonUnit: "AI coding system: model + Agent + native tool environment",
    repository: "https://github.com/aidong27/99-ai-games"
  },
  challenge: {
    id: protocol.challenge.challengeId,
    version: protocol.challenge.challengeVersion,
    title: protocol.challenge.title,
    status: protocol.challenge.status,
    canonicalPromptHash: protocol.lock.canonicalPromptSha256,
    benchmarkSeed: protocol.challenge.benchmarkSeed,
    targetEntries: 99,
    promptUrl: "./benchmarks/protocol-99/v1/PROMPT.md",
    methodUrl: "./methodology.html"
  },
  stats: {
    benchmarkEntries: finalizedRaw.length,
    allocatedEntries: summaries.length,
    targetEntries: 99,
    legacyPlayableExperiments: (legacy.games ?? []).filter((game) => game.status === "playable").length,
    legacyRunRecords: (legacy.games ?? []).reduce(
      (total, game) => total + (game.runRecords?.length ?? 0),
      0
    )
  },
  entries: summaries,
  defaultEntries: finalizedRaw,
  legacy: {
    collection: "Pre-Benchmark Era",
    manifest: "./games/manifest.json",
    libraryUrl: "./library.html",
    includedInBenchmarkRanking: false
  },
  scoreDisclaimer: protocol.rubric.disclaimer
};
const generatedIndex = renderGeneratedIndex(benchmarkData);
const socialManifest = {
  generated: true,
  canonicalPromptHash: protocol.lock.canonicalPromptSha256,
  cards: finalizedRaw.map((entry) => ({
    entryId: entry.entryId,
    sourceScreenshot: entry.screenshots.victory,
    sourceHash: entry.canonicalRun.sourceHash,
    path: `assets/social/entries/${entry.entryId}.svg`,
    rasterPath: `assets/social/entries/${entry.entryId}.png`
  }))
};

const outputs = new Map([
  ["entries/manifest.json", stableJson(manifest)],
  ["data/benchmark.json", stableJson(benchmarkData)],
  ["docs/generated-benchmark-index.md", generatedIndex],
  ["assets/social/entries/manifest.json", stableJson(socialManifest)],
  ["assets/social/og-cover.svg", renderProjectSocialCard(benchmarkData)]
]);

for (const entry of finalizedRaw) {
  outputs.set(
    `assets/social/entries/${entry.entryId}.svg`,
    renderSocialCard(entry)
  );
  outputs.set(
    `benchmark-pages/${entry.entryId}/index.html`,
    renderEntryPage(entry, protocol.lock.canonicalPromptSha256)
  );
}

if (checkOnly) {
  for (const [relative, expected] of outputs) {
    const target = fromRepo(repoRoot, relative);
    if (!(await pathExists(target))) {
      failures.push(`${relative} is missing`);
      continue;
    }
    const actual = await readFile(target, "utf8");
    if (actual !== expected) {
      failures.push(`${relative} is out of date`);
    }
  }
  await checkGeneratedDirectory("assets/social/entries", outputs);
  await checkGeneratedDirectory("benchmark-pages", outputs);
} else {
  await rm(fromRepo(repoRoot, "assets", "social", "entries"), { recursive: true, force: true });
  await rm(fromRepo(repoRoot, "benchmark-pages"), { recursive: true, force: true });
  for (const [relative, content] of outputs) {
    const target = fromRepo(repoRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

if (failures.length) {
  console.error("Protocol 99 generated data is stale:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(
  `${checkOnly ? "Checked" : "Generated"} Protocol 99 data: ${summaries.length} allocated, ${finalizedRaw.length} finalized Raw`
);

async function checkGeneratedDirectory(relativeDir, expectedOutputs) {
  const root = fromRepo(repoRoot, relativeDir);
  const expected = [...expectedOutputs.keys()].filter((value) => (
    value === relativeDir || value.startsWith(`${relativeDir}/`)
  ));
  if (!(await pathExists(root))) {
    if (expected.length) {
      failures.push(`${relativeDir} is missing`);
    }
    return;
  }
  const actual = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) actual.push(toPosix(path.relative(repoRoot, target)));
    }
  }
  await walk(root);
  for (const extra of actual.filter((value) => (
    !expected.includes(value)
    && !isEntryRasterOutput(relativeDir, value)
  ))) {
    failures.push(`${extra} is a stale generated file`);
  }
}

function isEntryRasterOutput(relativeDir, value) {
  return relativeDir === "assets/social/entries"
    && (value.endsWith(".png") || value === "assets/social/entries/raster-manifest.json");
}

function renderGeneratedIndex(data) {
  const lines = [
    "# Generated Protocol 99 Entry Index",
    "",
    "> Generated by `scripts/generate-benchmark.mjs`. Do not edit manually.",
    "",
    `- Challenge: ${data.challenge.title} ${data.challenge.version}`,
    `- Canonical Prompt SHA-256: \`${data.challenge.canonicalPromptHash}\``,
    `- Finalized Raw Entries: ${data.stats.benchmarkEntries} / ${data.stats.targetEntries}`,
    `- Allocated Entries: ${data.stats.allocatedEntries}`,
    `- Legacy playable experiments: ${data.stats.legacyPlayableExperiments} (not ranked)`,
    ""
  ];
  if (!data.entries.length) {
    lines.push("No formal Protocol 99 Entry has been allocated.");
  } else {
    lines.push("| Entry | AI coding system | Status | Raw score |");
    lines.push("|---:|---|---|---:|");
    for (const entry of data.entries) {
      const identity = `${entry.identity.modelName} × ${entry.identity.agentName}`;
      const score = entry.canonicalRun?.report?.score
        ? `${entry.canonicalRun.report.score.earned}/100`
        : "Pending";
      lines.push(`| ${entry.entryNumberLabel} | ${identity} | ${entry.status} | ${score} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderSocialCard(entry) {
  const model = escapeXml(entry.identity.modelName);
  const agent = escapeXml(entry.identity.agentName);
  const score = entry.canonicalRun.report.score.earned;
  const screenshot = escapeXml(`../../../${entry.screenshots.victory.replace(/^\.\//, "")}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title description">
  <title id="title">Protocol 99 Entry ${entry.entryNumberLabel}</title>
  <desc id="description">${model} and ${agent}, verified Raw Entry</desc>
  <rect width="1200" height="630" fill="#081015"/>
  <image href="${screenshot}" x="510" y="0" width="690" height="630" preserveAspectRatio="xMidYMid slice"/>
  <rect x="480" width="360" height="630" fill="url(#fade)"/>
  <rect x="42" y="42" width="420" height="546" rx="8" fill="#101b21" stroke="#2d4a57"/>
  <text x="78" y="105" fill="#6ed9ff" font-family="system-ui,sans-serif" font-size="22" font-weight="700">PROTOCOL 99 · ENTRY ${entry.entryNumberLabel}</text>
  <text x="78" y="178" fill="#f5fbff" font-family="system-ui,sans-serif" font-size="46" font-weight="750">${model}</text>
  <text x="78" y="225" fill="#a5bbc5" font-family="system-ui,sans-serif" font-size="26">with ${agent}</text>
  <text x="78" y="322" fill="#f5fbff" font-family="system-ui,sans-serif" font-size="78" font-weight="760">${score}/100</text>
  <text x="78" y="358" fill="#a5bbc5" font-family="system-ui,sans-serif" font-size="19">Automated Compliance Score</text>
  <text x="78" y="465" fill="#70e0b1" font-family="ui-monospace,monospace" font-size="18">RAW · VERIFIED · SEED 99</text>
  <text x="78" y="535" fill="#a5bbc5" font-family="system-ui,sans-serif" font-size="19">Same brief. Same rules. Different AI.</text>
  <defs><linearGradient id="fade"><stop stop-color="#081015"/><stop offset="1" stop-color="#081015" stop-opacity="0"/></linearGradient></defs>
</svg>
`;
}

function renderProjectSocialCard(data) {
  const finalized = data.stats.benchmarkEntries;
  const target = data.stats.targetEntries;
  const legacy = data.stats.legacyPlayableExperiments;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">99 AI Games — Protocol 99</title>
  <desc id="desc">One challenge, the same rules, and playable implementations by different AI coding systems.</desc>
  <rect width="1200" height="630" fill="#090c0f"/>
  <path d="M0 126h1200M0 252h1200M0 378h1200M0 504h1200M240 0v630M480 0v630M720 0v630M960 0v630" stroke="#172028" stroke-width="1"/>
  <rect x="64" y="58" width="1072" height="514" rx="8" fill="#0d1216" fill-opacity=".92" stroke="#27343d"/>
  <rect x="92" y="86" width="48" height="48" rx="8" fill="#5e9cff"/>
  <text x="116" y="117" fill="#ffffff" font-family="system-ui,sans-serif" font-size="18" font-weight="800" text-anchor="middle">99</text>
  <text x="158" y="113" fill="#f4f7f9" font-family="system-ui,sans-serif" font-size="24" font-weight="750">AI Games</text>
  <text x="158" y="134" fill="#778893" font-family="ui-monospace,monospace" font-size="11">PROTOCOL 99 · EVOLUTION BENCHMARK</text>
  <text x="92" y="226" fill="#77b2ff" font-family="ui-monospace,monospace" font-size="17" font-weight="700">SAME BRIEF · SAME RULES · DIFFERENT AI</text>
  <text x="88" y="320" fill="#f4f7f9" font-family="system-ui,sans-serif" font-size="76" font-weight="780">One challenge.</text>
  <text x="88" y="398" fill="#f4f7f9" font-family="system-ui,sans-serif" font-size="70" font-weight="780">99 slots. Real evidence.</text>
  <text x="94" y="448" fill="#a5b3bb" font-family="system-ui,sans-serif" font-size="24">The games are playable. The real exhibit is the AI that made them.</text>
  <g font-family="system-ui,sans-serif">
    <rect x="92" y="492" width="238" height="52" rx="6" fill="#131b21" stroke="#2a3943"/>
    <text x="108" y="514" fill="#778893" font-size="12" font-weight="650">FINALIZED RAW</text>
    <text x="108" y="535" fill="#f4f7f9" font-size="20" font-weight="760">${finalized} / ${target}</text>
    <rect x="344" y="492" width="238" height="52" rx="6" fill="#131b21" stroke="#2a3943"/>
    <text x="360" y="514" fill="#778893" font-size="12" font-weight="650">CURRENT CHALLENGE</text>
    <text x="360" y="535" fill="#70e0b1" font-size="20" font-weight="760">PROTOCOL 99 v1</text>
    <rect x="596" y="492" width="238" height="52" rx="6" fill="#131b21" stroke="#2a3943"/>
    <text x="612" y="514" fill="#778893" font-size="12" font-weight="650">LEGACY PLAYABLE</text>
    <text x="612" y="535" fill="#f4f7f9" font-size="20" font-weight="760">${legacy} preserved</text>
  </g>
  <g transform="translate(900 170)">
    <rect width="176" height="248" rx="8" fill="#11191e" stroke="#2a3943"/>
    <text x="20" y="38" fill="#778893" font-family="ui-monospace,monospace" font-size="12">FIXED OBJECTIVE</text>
    <circle cx="28" cy="78" r="7" fill="#5e9cff"/>
    <text x="48" y="84" fill="#f4f7f9" font-family="system-ui,sans-serif" font-size="18" font-weight="700">3 cores</text>
    <circle cx="28" cy="126" r="7" fill="#70e0b1"/>
    <text x="48" y="132" fill="#f4f7f9" font-family="system-ui,sans-serif" font-size="18" font-weight="700">3 relays</text>
    <circle cx="28" cy="174" r="7" fill="#f3c969"/>
    <text x="48" y="180" fill="#f4f7f9" font-family="system-ui,sans-serif" font-size="18" font-weight="700">1 exit</text>
    <path d="M20 212h136" stroke="#2a3943"/>
    <text x="20" y="234" fill="#778893" font-family="ui-monospace,monospace" font-size="11">SEED 99 · REAL EVIDENCE</text>
  </g>
</svg>
`;
}

function renderEntryPage(entry, promptHash) {
  const title = `Entry ${entry.entryNumberLabel}: ${escapeHtml(entry.identity.modelName)} | 99 AI Games`;
  const description = `A verified Protocol 99 Raw Entry by ${escapeHtml(entry.identity.modelName)} with ${escapeHtml(entry.identity.agentName)}.`;
  const id = encodeURIComponent(entry.entryId);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <meta name="robots" content="index,follow">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:image" content="https://aidong27.github.io/99-ai-games/assets/social/entries/${id}.png">
    <title>${title}</title>
    <link rel="canonical" href="https://aidong27.github.io/99-ai-games/benchmark-pages/${id}/">
    <script>location.replace("../../entry.html?id=${id}");</script>
  </head>
  <body>
    <main>
      <h1>Protocol 99 Entry ${entry.entryNumberLabel}</h1>
      <p>${description}</p>
      <p>Prompt SHA-256: <code>${promptHash}</code></p>
      <p><a href="../../entry.html?id=${id}">Open the full Entry record</a></p>
    </main>
  </body>
</html>
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeHtml(value) {
  return escapeXml(value).replaceAll("'", "&#39;");
}
