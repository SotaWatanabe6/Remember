// Story bookends are assembled separately from the generated chapter slides.
// The opening is organizer data only, never model-written narration.
function buildOpeningSlide(memorial = {}, subjectName = memorial.subject_name) {
  return {
    id: 'story-opening',
    slide_type: 'opening',
    subject_name: subjectName || '',
    photo_url: memorial.cover_photo_url || null,
    date_of_birth: memorial.date_of_birth || null,
    date_of_passing: memorial.date_of_passing || null,
  }
}

function addStoryBookends(slides, { memorial, subjectName }) {
  return [buildOpeningSlide(memorial, subjectName), ...slides]
    .map((slide, index) => ({ ...slide, order_index: index + 1 }))
}

module.exports = { buildOpeningSlide, addStoryBookends }
