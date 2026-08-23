/**
 * Normalize a contributor-supplied display name.
 * Trims, collapses runs of whitespace, and capitalizes the first letter of
 * each word ("sungjun" -> "Sungjun", "sungjun kim" -> "Sungjun Kim").
 * Words that already contain an uppercase letter are left alone so names like
 * "McDonald", "O'Brien", or "JR" keep the casing the contributor chose.
 * Mirrors backend/src/lib/formatName.js.
 */
export function formatPersonName(name) {
  if (typeof name !== "string") return "";

  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (/[A-Z]/.test(word) ? word : capitalizeWordParts(word)))
    .join(" ");
}

// Capitalize after word-internal separators too, so "jean-luc" -> "Jean-Luc"
// and "o'brien" -> "O'Brien".
function capitalizeWordParts(word) {
  return word.replace(
    /(^|[-'’.])(\p{L})/gu,
    (match, separator, letter) => separator + letter.toUpperCase(),
  );
}
