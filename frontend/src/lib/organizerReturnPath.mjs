const INTERNAL_ORIGIN = "https://remember.invalid";

export function getOrganizerReturnPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  let url;
  try {
    url = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return "/dashboard";
  }
  const organizerRoute = /^\/(?:dashboard\/?$|memorial\/(?:create\/?$|[^/]+\/manage(?:\/|$)))/;
  if (url.origin !== INTERNAL_ORIGIN || !organizerRoute.test(url.pathname)) {
    return "/dashboard";
  }
  return url.pathname + url.search + url.hash;
}
