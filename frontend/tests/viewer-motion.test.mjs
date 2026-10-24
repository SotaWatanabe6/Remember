import test from 'node:test';
import assert from 'node:assert/strict';
import { getViewerMotion } from '../src/lib/viewer/viewerMotion.mjs';

test('section entry follows its position around the portrait and returning reverses it', () => {
  for (const [section, vector] of Object.entries({
    relationships: { x: 24, y: 0 }, story: { x: -24, y: 0 },
    voices: { x: 0, y: -24 }, photos: { x: 0, y: 24 },
  })) {
    assert.deepEqual(getViewerMotion('navigation', section), vector);
    const returning = getViewerMotion(`${section}/nested`, 'navigation');
    assert.equal(returning.x || 0, -vector.x || 0);
    assert.equal(returning.y || 0, -vector.y || 0);
  }
});

test('nested navigation and backward media selection reverse their entrance direction', () => {
  assert.deepEqual(getViewerMotion('relationships', 'relationships/family'), { x: 16, y: 0 });
  assert.deepEqual(getViewerMotion('relationships/family/person', 'relationships/family'), { x: -16, y: 0 });
  assert.deepEqual(getViewerMotion('story/slide/1', 'story/slide/2'), { x: 0, y: 16 });
  assert.deepEqual(getViewerMotion('story/slide/2', 'story/slide/1'), { x: 0, y: -16 });
  assert.deepEqual(getViewerMotion('photo/2', 'photo/1'), { x: -16, y: 0 });
  assert.deepEqual(getViewerMotion('photos', 'photos'), { x: 0, y: 0 });
});
