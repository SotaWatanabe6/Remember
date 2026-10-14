import { CONTRIBUTOR_FAMILY_RELATIONSHIP_OPTIONS } from '../contribute/relationshipOptions.js';

const GROUPS = [
  { id: 'family', label: 'Family', color: 'var(--color-r-family)' },
  { id: 'friends', label: 'Friends', color: 'var(--color-r-friend)' },
  { id: 'colleagues', label: 'Colleagues', color: 'var(--color-r-colleague)' },
  { id: 'partners', label: 'Partners', color: 'var(--color-r-shape)' },
  { id: 'other', label: 'Other connections', color: 'var(--color-r-secondary)' },
];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeType(value) {
  return text(value).replace(/[_-]/g, ' ').toLowerCase();
}

function formatLabel(value) {
  return text(value).replace(/[_-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

const FAMILY_TYPES = new Set([
  'family', ...CONTRIBUTOR_FAMILY_RELATIONSHIP_OPTIONS.map(normalizeType),
  'mother', 'father', 'son', 'daughter', 'brother', 'sister', 'aunt', 'uncle',
]);

export function getRelationshipGroup(type) {
  const normalized = normalizeType(type);
  if (FAMILY_TYPES.has(normalized)) return 'family';
  if (['friend', 'friends', 'close friend'].includes(normalized)) return 'friends';
  if (['colleague', 'colleagues', 'coworker', 'co worker'].includes(normalized)) return 'colleagues';
  if (['partner', 'partner / spouse'].includes(normalized)) return 'partners';
  return 'other';
}

export function buildRelationshipGroups(contributors = []) {
  const people = contributors.filter((person) => person?.id && !person.is_flagged &&
    (!person.status || ['submitted', 'approved'].includes(person.status)));
  const seen = new Set();
  const normalized = people.filter((person) => {
    if (seen.has(person.id)) return false;
    seen.add(person.id);
    return true;
  }).map((person) => {
    const relationship = formatLabel(person.relationship_label || person.relationship_type) || 'Contributor';
    return {
      id: String(person.id),
      name: person.is_anonymous ? relationship : text(person.display_name) || text(person.name) || 'Contributor',
      relationship,
      group: getRelationshipGroup(person.relationship_type || person.relationship_label),
    };
  });
  return GROUPS.map((group) => ({ ...group, people: normalized.filter((person) => person.group === group.id) }))
    .filter((group) => group.people.length > 0);
}

export function getRelationshipSummary(output, contributorId) {
  for (const node of output?.constellation?.nodes || []) {
    const attribution = node.attributions?.find((item) => String(item.contributor_id) === contributorId);
    if (attribution) {
      const summary = text(attribution.contributor_summary) || text(attribution.quote);
      if (summary) return summary;
    }
    // A merged node's main summary belongs to its primary contributor only.
    if (String(node.contributor_id) === contributorId) {
      const summary = text(node.contributor_summary) || text(node.summary);
      if (summary) return summary;
    }
  }
  return '';
}

export function getRelationshipPhotos(output, contributorId, highlights) {
  const source = output?.photos;
  const albums = Array.isArray(source) ? source : source?.albums || [];
  const savedPhotos = albums.flatMap((album) => Array.isArray(album.photos) ? album.photos : [album])
    .filter((photo) => String(photo.contributor_id) === contributorId && !photo.is_flagged);
  const photos = Array.isArray(highlights?.photos) ? highlights.photos : savedPhotos;
  const seen = new Set();
  return photos.flatMap((photo) => {
    const url = text(photo.photo_url) || text(photo.url);
    const key = photo.id || url;
    if (!url || seen.has(key)) return [];
    seen.add(key);
    return [{ id: String(key), url, caption: text(photo.caption), takenAt: photo.taken_at || null }];
  });
}

export function parseRelationshipPath(path) {
  const parts = String(path).split('/');
  if (parts[0] !== 'relationships') return { groupId: null, personId: null };
  try {
    return { groupId: parts[1] ? decodeURIComponent(parts[1]) : null, personId: parts[2] ? decodeURIComponent(parts[2]) : null };
  } catch {
    return { groupId: null, personId: null };
  }
}

export function getRelationshipPath(groupId, personId) {
  return ['relationships', groupId, personId].filter((value) => value != null).map(encodeURIComponent).join('/');
}
