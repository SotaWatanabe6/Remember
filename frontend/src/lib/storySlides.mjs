function formatRelationship(relationshipType) {
  if (!relationshipType) return '';
  return relationshipType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStorySource(output, story) {
  if (Array.isArray(story)) return story;
  if (Array.isArray(story?.slides)) return story.slides;
  if (Array.isArray(output?.story)) return output.story;
  if (Array.isArray(output?.story?.slides)) return output.story.slides;
  if (Array.isArray(output?.tabs?.story)) return output.tabs.story;
  if (Array.isArray(output?.tabs?.story?.slides)) return output.tabs.story.slides;
  if (Array.isArray(output?.memorialOutput?.story)) return output.memorialOutput.story;
  if (Array.isArray(output?.memorialOutput?.story?.slides)) return output.memorialOutput.story.slides;
  return [];
}

function buildContributorLookup(output) {
  const contributors = [
    ...(Array.isArray(output?.contributors) ? output.contributors : []),
    ...(Array.isArray(output?.contributions) ? output.contributions : []),
  ];

  return contributors.reduce((lookup, item) => {
    const contributor = item.contributor || item;
    if (contributor?.id) {
      lookup[contributor.id] = contributor;
    }
    return lookup;
  }, {});
}

function buildPhotoLookup(output) {
  const raw = output?.photos;
  const albums = Array.isArray(raw) ? raw : raw?.albums || [];

  return albums.reduce((lookup, album) => {
    (album.photos || []).forEach((photo) => {
      if (photo?.id) {
        lookup[photo.id] = photo;
      }
    });
    return lookup;
  }, {});
}

function resolveSlideYear(slide, matchedPhoto) {
  const fromSlide = slide.photo_year || slide.year
  if (fromSlide) return String(fromSlide)
  if (matchedPhoto?.year) return String(matchedPhoto.year)
  if (matchedPhoto?.taken_at) {
    const y = new Date(matchedPhoto.taken_at).getFullYear()
    if (Number.isFinite(y)) return String(y)
  }
  return null
}

export function normalizeStorySlides(output, story) {
  const contributorLookup = buildContributorLookup(output);
  const photoLookup = buildPhotoLookup(output);

  const normalizedSlides = getStorySource(output, story)
    .map((slide, index) => {
      const contributor = contributorLookup[slide.contributor_id] || {};
      const matchedPhoto = photoLookup[slide.photo_id] || {};
      const contributorName =
        slide.contributor_name ||
        contributor.name ||
        contributor.contributor_name ||
        matchedPhoto.contributor_name ||
        'Contributor';
      const photoUrl =
        slide.photo_url ||
        slide.url ||
        slide.photo?.url ||
        matchedPhoto.url ||
        matchedPhoto.photo_url ||
        null;
      const photoDescription =
        slide.photo_description || slide.photoDescription || slide.scene || '';
      const narration = slide.narration || '';
      const fallbackQuote = slide.quote || slide.memory || slide.caption || '';
      const photoYear = resolveSlideYear(slide, matchedPhoto);
      const photoEraLabel =
        slide.photo_era_label ||
        slide.photoEraLabel ||
        slide.subject_life_stage_label ||
        matchedPhoto.era_label ||
        null;
      const chronologicalSortKey = Number(slide.chronological_sort_key);
      const photoYearSort = Number.isFinite(chronologicalSortKey) && chronologicalSortKey < 9999
        ? chronologicalSortKey
        : photoYear
          ? Number(photoYear)
          : 9999;

      return {
        id: slide.id || slide.photo_id || `${index}-${contributorName}`,
        orderIndex: Number.isFinite(Number(slide.order_index)) ? Number(slide.order_index) : index,
        slideType: slide.slide_type || 'photo',
        subjectName: slide.subject_name || '',
        dateOfBirth: slide.date_of_birth || null,
        dateOfPassing: slide.date_of_passing || null,
        photoUrl,
        photoDescription: photoDescription || fallbackQuote,
        narration,
        matchedQuote: slide.matched_quote || slide.matchedQuote || '',
        photoYear,
        photoEraLabel,
        photoYearSort,
        contributorName,
        relationshipLabel: formatRelationship(
          slide.relationship_type || contributor.relationship_type || matchedPhoto.relationship_type,
        ),
        themeLabel: slide.theme_label || slide.theme || slide.ai_theme || '',
      };
    })
    .filter((slide) => slide.slideType === 'opening' || slide.photoUrl || slide.photoDescription || slide.narration)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  // The pipeline owns chapter order and slide selection. Resampling here can
  // discard complete chapters and bookends, or move the cover into the story.
  return normalizedSlides;
}

export function formatStoryDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}
