// Pure Run selection shared by the index, detail page and comparison.
export function isPublishedRun(run) {
  return run?.status === "finalized" && run.report?.status === "passed" && Boolean(run.publicPath);
}

export function selectEntryRun(entry, runType = "raw", runId) {
  const candidates = entry.runs ?? [];
  const run = runId
    ? candidates.find((item) => item.runId === runId)
    : runType === "all" || runType === "raw"
      ? entry.canonicalRun ?? candidates.find((item) => item.runType === "raw")
      : candidates.filter((item) => item.runType === runType)
        .sort((a, b) => Number(isPublishedRun(b)) - Number(isPublishedRun(a))
          || String(b.finishedAt ?? b.startedAt).localeCompare(String(a.finishedAt ?? a.startedAt)))[0];
  if (!run) return null;
  const published = entry.status !== "withdrawn" && isPublishedRun(run);
  const selected = { ...run, publicPath: published ? run.publicPath : null };
  return {
    ...entry,
    identity: run.identity ?? entry.identity,
    canonicalRun: selected,
    selectedRunPublished: published,
    defaultComparable: published && run.runType === "raw",
    screenshots: published ? Object.fromEntries(
      [["title", "title"], ["gameplay", "gameplay"], ["relay1", "relay-1"], ["victory", "victory"]]
        .map(([key, file]) => [key, `${run.publicPath}evidence/screenshots/${file}.png`])
    ) : null,
    detailUrl: `./entry.html?${new URLSearchParams({ id: entry.entryId, run: run.runId })}`
  };
}

export function comparableEntries(data, runType = "raw") {
  return data.entries.filter((entry) => entry.challengeId === data.challenge.id
    && entry.challengeVersion === data.challenge.version
    && entry.canonicalPromptHash === data.challenge.canonicalPromptHash)
    .map((entry) => selectEntryRun(entry, runType))
    .filter((entry) => entry?.selectedRunPublished);
}

export function samplePair(entries, random = Math.random) {
  if (entries.length < 2) return [];
  const first = Math.floor(random() * entries.length);
  const offset = 1 + Math.floor(random() * (entries.length - 1));
  return [entries[first], entries[(first + offset) % entries.length]];
}
