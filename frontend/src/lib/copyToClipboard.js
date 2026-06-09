/**
 * Copy text to the clipboard. Uses the async Clipboard API when available,
 * with a textarea + execCommand fallback (needed on localhost and after awaits).
 */
export async function copyTextToClipboard(text) {
  if (!text) {
    throw new Error("Nothing to copy");
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through — common after async work or without a secure context
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Could not copy to clipboard");
  }
}

/** Fix invite URLs when backend APP_URL env is missing. */
export function normalizeShareUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("undefined/") && typeof window !== "undefined") {
    return `${window.location.origin}${url.slice("undefined".length)}`;
  }
  return url;
}
