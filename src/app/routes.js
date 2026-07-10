export const ROUTES = {
  home: "./",
  library: "./library.html",
  manifest: "./games/manifest.json",
  halls: "./halls/halls.json",
  play: "./play.html",
  observation: "./observation.html",
  promoRoot: "./promo/"
};

export function playGateRoute(slug) {
  return `${ROUTES.play}?slug=${encodeURIComponent(slug ?? "")}`;
}

export function observationRoute(slug) {
  return `${ROUTES.observation}?slug=${encodeURIComponent(slug ?? "")}`;
}

export function promoRoute(slug) {
  return `${ROUTES.promoRoot}${encodeURIComponent(slug ?? "")}/`;
}

export function librarySelectionRoute(slug) {
  return slug ? `${ROUTES.library}#${encodeURIComponent(slug)}` : ROUTES.library;
}
