import test from 'node:test';
import assert from 'node:assert/strict';
import { getViewerSections, getMemorialYearRange, normalizeViewerData, resolveViewerScreen } from '../src/lib/viewer/memorialViewer.mjs';

test('missing and empty recordings hide Voices without moving the other sections', () => {
  const expected = [['relationships', 'right'], ['story', 'left'], ['photos', 'bottom']];
  for (const output of [{}, { voices: [] }, { voices: null }, { voices: { recordings: [] } }]) {
    assert.deepEqual(getViewerSections(output).map(({ id, position }) => [id, position]), expected);
  }
  assert.equal(getViewerSections({ voices: [{}] }).find(({ id }) => id === 'voices').position, 'top');
  assert.equal(getViewerSections({ voices: { recordings: [{}] } }).length, 4);
  assert.equal(getViewerSections({ voices: { items: [{}] } }).length, 4);
  assert.equal(getViewerSections({ voices: { data: [{}] } }).length, 4);
});

test('share response retains memorial information and privacy-safe contributor names', () => {
  const data = normalizeViewerData({ story: [], memorial: { id: 'm1', subject_name: 'Robin', biography: 'A life remembered.' }, contributor: [{ id: 'c1', name: 'Anonymous' }] });
  assert.equal(data.memorial.subject_name, 'Robin');
  assert.equal(data.memorial.biography, 'A life remembered.');
  assert.deepEqual(data.contributors, [{ id: 'c1', name: 'Anonymous' }]);
});

test('wrapped outputs and legacy memorial field names normalize consistently', () => {
  const data = normalizeViewerData({ output_json: { voices: [] }, memorial: { deceased_name: 'Robin', birth_date: '1950-01-01', death_date: '2026-02-03', short_description: 'Remembered.' }, contributors: [] });
  assert.deepEqual(data.output, { voices: [] });
  assert.equal(getMemorialYearRange(data.memorial), '1950 - 2026');
  assert.equal(data.memorial.biography, 'Remembered.');
  assert.equal(getMemorialYearRange({ date_of_birth: 'bad-date' }), '');
});

test('a saved Voices selection falls back to navigation when recordings disappear', () => {
  assert.equal(resolveViewerScreen('voices', { voices: [] }), 'navigation');
  assert.equal(resolveViewerScreen('voices', { voices: [{}] }), 'voices');
  assert.equal(resolveViewerScreen('intro', {}), 'intro');
  assert.equal(resolveViewerScreen('story', {}), 'story');
  assert.equal(resolveViewerScreen('unknown', {}), 'navigation');
});
