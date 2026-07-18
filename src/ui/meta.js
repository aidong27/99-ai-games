const SITE_ROOT = "https://aidong27.github.io/99-ai-games/";

export function setDocumentMeta({
  title,
  section = "",
  description = "",
  canonicalPath = "",
  socialImagePath = ""
}) {
  const documentTitle = [title, section, "99 AI Games"].filter(Boolean).join(" | ");
  const socialTitle = [title, "99 AI Games"].filter(Boolean).join(" | ");
  const canonicalUrl = toSiteUrl(canonicalPath);
  const socialImageUrl = toSiteUrl(socialImagePath);

  document.title = documentTitle;
  setMeta("name", "description", description);
  setMeta("property", "og:title", socialTitle);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", canonicalUrl);
  setMeta("name", "twitter:title", socialTitle);
  setMeta("name", "twitter:description", description);
  if (socialImageUrl) {
    setMeta("property", "og:image", socialImageUrl);
    setMeta("name", "twitter:image", socialImageUrl);
  }
  setCanonical(canonicalUrl);
}

function setMeta(attribute, key, content) {
  if (!content) {
    return;
  }
  let meta = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.append(meta);
  }
  meta.setAttribute("content", content);
}

function setCanonical(href) {
  if (!href) {
    return;
  }
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = href;
}

function toSiteUrl(path) {
  if (!path) {
    return "";
  }
  return new URL(String(path).replace(/^\.\//, ""), SITE_ROOT).href;
}
