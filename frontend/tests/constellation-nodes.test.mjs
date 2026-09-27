import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConstellationNodes } from '../src/lib/constellationNodes.mjs';

const memory = { id: 'm1', category: 'memory', label: 'Learning to garden', summary: 'We planted tomatoes together.', contributor_id: 'c1', contributor_name: 'Jonah', relationship_type: 'grandchild' };

test('unmatched memories remain visible with text and attribution, without fallback photos', () => {
  const [node] = buildConstellationNodes({ nodes: [{ ...memory, photo_urls: ['unconfirmed.jpg'], photo_ids: ['p1'], photo_match: null }] });
  assert.equal(node.summary, memory.summary);
  assert.equal(node.contributor_name, 'Jonah');
  assert.equal(node.contributions, 1);
  assert.deepEqual(node.photo_urls, []);
  assert.deepEqual(node.photos, []);
});

test('a memory exposes at most one matched photo and drops failed URL resolutions', () => {
  const [node] = buildConstellationNodes({ nodes: [{ ...memory, photo_match: { photo_id: 'p1' }, photo_ids: ['p1'], photo_urls: [null, 'match.jpg', 'extra.jpg'] }] });
  assert.deepEqual(node.photo_urls, ['match.jpg']);
  assert.equal(node.relationship_type, 'Grandchild');
  assert.deepEqual(buildConstellationNodes({ nodes: [{ ...memory, photo_match: {}, photo_ids: ['p1'], photo_urls: [null] }] })[0].photo_urls, []);
});

test('legacy theme outputs keep their photo collections', () => {
  const [node] = buildConstellationNodes({ nodes: [{ id: 't1', category: 'era', photo_urls: ['a.jpg', 'b.jpg'], photo_ids: ['a', 'b'] }] });
  assert.deepEqual(node.photo_urls, ['a.jpg', 'b.jpg']);
  assert.equal(node.contributions, 2);
  assert.deepEqual(buildConstellationNodes(null), []);
});
