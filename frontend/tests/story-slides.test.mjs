import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStorySlides, formatStoryDate } from '../src/lib/storySlides.mjs';

test('preserves the opening and all chapter slides in pipeline order', () => {
  const story = [
    { slide_type: 'opening', subject_name: 'Robin', date_of_birth: '1950-01-01', order_index: 1 },
    ...Array.from({ length: 20 }, (_, i) => ({ photo_id: `p${i}`, photo_url: 'photo.jpg', photo_year: 2000 - i, order_index: i + 2 })),
  ];
  const slides = normalizeStorySlides({}, story);
  assert.equal(slides.length, 21);
  assert.equal(slides[0].slideType, 'opening');
  assert.equal(slides[0].subjectName, 'Robin');
  assert.equal(slides[1].id, 'p0');
  assert.equal(slides.at(-1).id, 'p19');
});

test('legacy story shapes still resolve photos and captions', () => {
  const output = { photos: { albums: [{ photos: [{ id: 'photo', url: 'photo.jpg' }] }] }, tabs: { story: { slides: [{ photo_id: 'photo', quote: 'A memory' }] } } };
  assert.equal(normalizeStorySlides(output)[0].photoUrl, 'photo.jpg');
  assert.equal(normalizeStorySlides(output)[0].photoDescription, 'A memory');
});

test('date-only values retain their calendar day regardless of local timezone', () => {
  assert.equal(formatStoryDate('1950-01-01'), 'January 1, 1950');
  assert.equal(formatStoryDate(null), '');
  assert.equal(formatStoryDate('bad-date'), '');
});

test('plain farewell survives normalization without a photo or narration', () => {
  const slides = normalizeStorySlides({}, [{ slide_type: 'farewell', farewell_message: 'In loving memory', date_of_passing: '2026-02-03' }]);
  assert.equal(slides.length, 1);
  assert.equal(slides[0].slideType, 'farewell');
  assert.equal(slides[0].farewellMessage, 'In loving memory');
  assert.equal(slides[0].contributorId, null);
});
