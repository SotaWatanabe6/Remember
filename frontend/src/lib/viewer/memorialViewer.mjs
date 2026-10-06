export const VIEWER_SECTIONS = [
  { id: 'relationships', label: 'Relationships', position: 'right' },
  { id: 'story', label: 'Story', position: 'left' },
  { id: 'voices', label: 'Voices', position: 'top' },
  { id: 'photos', label: 'Photos', position: 'bottom' },
];

export function normalizeViewerData(payload) {
  const output = payload?.output_json ?? payload?.output ?? payload ?? {};
  const source = payload?.memorial ?? output.memorial ?? {};
  const contributors = payload?.contributors ?? payload?.contributor ?? output.contributors ?? output.contributor;

  return {
    output,
    memorial: {
      id: source.id ?? null,
      subject_name: source.subject_name || source.deceased_name || '',
      cover_photo_url: source.cover_photo_url || source.profile_photo_url || null,
      date_of_birth: source.date_of_birth || source.birth_date || null,
      date_of_passing: source.date_of_passing || source.death_date || null,
      biography: source.biography || source.bio || source.brief_biography || source.short_description || '',
    },
    contributors: Array.isArray(contributors) ? contributors : [],
  };
}

export function getViewerSections(output) {
  const voices = output?.voices;
  const recordings = Array.isArray(voices) ? voices : voices?.recordings ?? voices?.items ?? voices?.data;
  return VIEWER_SECTIONS.filter((section) => section.id !== 'voices' || (Array.isArray(recordings) && recordings.length > 0));
}

export function getMemorialYearRange(memorial) {
  const year = (value) => String(value ?? '').match(/^(\d{4})(?:-|$)/)?.[1] || '';
  return [year(memorial?.date_of_birth), year(memorial?.date_of_passing)].filter(Boolean).join(' - ');
}

export function resolveViewerScreen(requested, output) {
  if (requested === 'intro' || requested === 'navigation') return requested;
  return getViewerSections(output).some((section) => section.id === requested) ? requested : 'navigation';
}
