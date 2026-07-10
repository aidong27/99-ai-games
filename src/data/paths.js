export function normalizeRootPath(value) {
  if (!value) {
    return "";
  }

  const path = String(value);
  if (/^(?:https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("./")) {
    return path;
  }
  return `./${path}`;
}

export function isExternalOrRootPath(value) {
  const path = String(value);
  return /^(?:https?:)?\/\//.test(path)
    || path.startsWith("/")
    || path.startsWith("./games/")
    || path.startsWith("games/");
}

export function ensureTrailingSlash(path) {
  return path.endsWith("/") ? path : `${path}/`;
}

export function fileStem(href) {
  const fileName = String(href).split("/").pop() ?? "run-record";
  return fileName.replace(/\.json$/, "");
}
