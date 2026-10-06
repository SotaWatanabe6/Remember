import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConstellationNodes, isConstellationNodeVisible } from '../src/lib/constellationNodes.mjs';

const memory = { id: 'm1', category: 'memory', label: 'Learning to garden', summary: 'We planted tomatoes together.', contributor_id: 'c1', contributor_name: 'Jonah', relationship_type: 'grandchild' };

test('shared memories stay visible for any contributor who passes both filters', () => {
  const shared = { ...memory, attributions: [{ contributor_id: 'c1', relationship_type: 'grandchild' }, { contributor_id: 'c2', relationship_type: 'cousin' }] };
  assert.equal(isConstellationNodeVisible(shared, { c1: true }, {}), true);
  assert.equal(isConstellationNodeVisible(shared, {}, { Grandchild: true }), true);
  assert.equal(isConstellationNodeVisible(shared, { c1: true, c2: true }, {}), false);
  assert.equal(isConstellationNodeVisible(shared, { c2: true }, { Grandchild: true }), false);
  assert.equal(isConstellationNodeVisible(memory, { c1: true }, {}), false);
});

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

test('shared memory carries contributor count, growing prominence and individual summaries into the viewer', () => {
  const attributions = [{ contributor_id: 'c1', contributor_name: 'Jonah', contributor_summary: 'My own memory.' }, { contributor_id: 'c2', contributor_name: 'Cousin', contributor_summary: 'My separate account.' }];
  const [node] = buildConstellationNodes({ nodes: [{ ...memory, attributions, contributor_count: 2, prominence_score: 0.85 }] });
  assert.equal(node.contributions, 2);
  assert.equal(node.prominence, 0.85);
  assert.deepEqual(node.attributions, attributions);
  assert.deepEqual(node.contributor_ids, ['c1', 'c2']);
});
