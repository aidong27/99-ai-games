const NON_CURRENT_MEDIA_PATTERN = /\b(?:stale|predate|superseded|pending maintainer|not claimed to reflect the current build)\b/i;

export function hasCurrentScreenshotEvidence(game) {
  const note = String(game?.mediaNote ?? game?.media?.note ?? "");
  return !NON_CURRENT_MEDIA_PATTERN.test(note);
}
