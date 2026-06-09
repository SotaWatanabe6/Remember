/** True when a value can be used directly in img src. */
export function isBrowserImageUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

export function memorialInitial(name = "") {
  const trimmed = String(name).trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "R";
}
