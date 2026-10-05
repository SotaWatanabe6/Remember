// Organizer searches use the stored real name, including anonymous contributors.
export function matchesContributorName(contributor, query) {
  const search = String(query || "").trim().toLowerCase();
  return !search || String(contributor?.name || "").toLowerCase().includes(search);
}

// Keep equal names separate: answers belong to contributor IDs, not labels.
export function getArchiveQaGroups(contributors = [], responses = []) {
  const byId = new Map(contributors.map((contributor) => [contributor.id, contributor]));
  const groups = new Map();

  for (const response of responses) {
    if (!String(response.answer_text || "").trim() && !response.response_audio_url) continue;
    const id = response.contributor_id || response.id;
    if (!groups.has(id)) {
      groups.set(id, {
        contributor: byId.get(id) || { id, name: response.contributor_name || "" },
        responses: [],
      });
    }
    groups.get(id).responses.push(response);
  }

  // The archive API supplies contributors in submission order.
  const ordered = contributors.map((contributor) => groups.get(contributor.id)).filter(Boolean);
  const knownIds = new Set(contributors.map((contributor) => contributor.id));
  return [...ordered, ...[...groups].filter(([id]) => !knownIds.has(id)).map(([, group]) => group)];
}
