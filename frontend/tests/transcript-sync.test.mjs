import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTranscriptSegment, normalizeTranscriptSegments } from '../src/lib/transcriptSync.mjs';

const lines = normalizeTranscriptSegments([
  { start: 0.25, end: 2, text: 'The garden.' },
  { start: 3, end: 5, text: 'Sunday mornings.' },
  { start: 5, end: 7, text: 'Together.' },
]);

test('spoken lines use precise second timestamps and silence has no highlight', () => {
  for (const [time, index] of [[0, -1], [0.25, 0], [1.99, 0], [2, -1], [2.9, -1], [3, 1], [5, 2], [7, -1]]) {
    assert.equal(activeTranscriptSegment(lines, time), index);
  }
});

test('seeking in either direction immediately resolves the correct line', () => {
  assert.equal(activeTranscriptSegment(lines, 6), 2);
  assert.equal(activeTranscriptSegment(lines, 1), 0);
  assert.equal(activeTranscriptSegment(lines, 4), 1);
  for (const time of [NaN, Infinity, undefined, -1]) assert.equal(activeTranscriptSegment(lines, time), -1);
});

test('timestamp aliases normalize and sort without guessing milliseconds', () => {
  const result = normalizeTranscriptSegments([
    { startTime: '3', endTime: '5', transcript: 'Later', speaker_name: 'Robin' },
    { start_seconds: 0, end_seconds: 1.5, text: 'First' },
  ]);
  assert.deepEqual(result, [{ text: 'First', start: 0, end: 1.5, speaker: '' }, { text: 'Later', start: 3, end: 5, speaker: 'Robin' }]);
  assert.equal(normalizeTranscriptSegments([{ start: 1000, end: 2000, text: 'Seconds' }])[0].start, 1000);
});

test('missing, malformed or partial timing stays static without losing text', () => {
  for (const invalid of [null, '', -1, NaN, Infinity, false]) {
    const result = normalizeTranscriptSegments([{ start: 0, end: 1, text: 'Valid' }, { start: invalid, end: 2, text: 'Keep me' }]);
    assert.equal(result.length, 2);
    assert.equal(activeTranscriptSegment(result, 0.5), -1);
  }
  assert.equal(activeTranscriptSegment(normalizeTranscriptSegments([{ start: 3, end: 2, text: 'Reversed' }]), 3), -1);
  assert.equal(activeTranscriptSegment(normalizeTranscriptSegments(['Plain text']), 0), -1);
  assert.deepEqual(normalizeTranscriptSegments(null), []);
});
