export function setDocumentTitle(title, suffix = "99 AI Games") {
  document.title = suffix ? `${title} | ${suffix}` : String(title);
}
