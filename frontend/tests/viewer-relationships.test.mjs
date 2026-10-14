import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRelationshipGroups, getRelationshipGroup, getRelationshipPhotos,
  getRelationshipSummary, getRelationshipPath, parseRelationshipPath,
} from '../src/lib/viewer/relationships.mjs';

test('groups current categories and older family subtypes without dropping partners or other connections', () => {
  const groups = buildRelationshipGroups([
    { id: '1', name: 'Alex', relationship_type: 'Family', relationship_label: 'Child' },
    { id: '2', name: 'Sam', relationship_type: 'friend' },
    { id: '3', name: 'Morgan', relationship_type: 'Colleague' },
    { id: '4', name: 'Avery', relationship_type: 'Partner' },
    { id: '5', name: 'Lee', relationship_type: 'Other', relationship_label: 'Neighbor' },
    { id: '6', name: 'Robin', relationship_type: 'grandchild' },
  ]);
  assert.deepEqual(groups.map(({ id, people }) => [id, people.length]), [
    ['family', 2], ['friends', 1], ['colleagues', 1], ['partners', 1], ['other', 1],
  ]);
  assert.equal(getRelationshipGroup('Aunt/Uncle'), 'family');
  assert.equal(getRelationshipGroup('co-worker'), 'colleagues');
  assert.equal(groups[0].people[0].relationship, 'Child');
});

test('anonymous people remain distinct by ID and unsubmitted or flagged contributors are excluded', () => {
  const groups = buildRelationshipGroups([
    { id: 'a', name: 'Private Name', is_anonymous: true, relationship_type: 'Family', relationship_label: 'Sibling', status: 'approved' },
    { id: 'b', name: 'Another Private Name', is_anonymous: true, relationship_type: 'Family', relationship_label: 'Sibling', status: 'submitted' },
    { id: 'draft', name: 'Draft', relationship_type: 'Friend', status: 'draft' },
    { id: 'flagged', name: 'Flagged', relationship_type: 'Family', is_flagged: true },
    { id: 'a', name: 'Duplicate', relationship_type: 'Family' },
  ]);
  assert.deepEqual(groups[0].people.map(({ id, name }) => [id, name]), [['a', 'Sibling'], ['b', 'Sibling']]);
  assert.deepEqual(groups.map(({ id }) => id), ['family']);
  assert.deepEqual(buildRelationshipGroups(), []);
});

test('only populated relationship categories are shown', () => {
  const groups = buildRelationshipGroups([
    { id: 'friend', name: 'Sam', relationship_type: 'Friend', status: 'approved' },
    { id: 'family-draft', name: 'Alex', relationship_type: 'Family', status: 'in_progress' },
    { id: 'colleague-flagged', name: 'Morgan', relationship_type: 'Colleague', is_flagged: true },
  ]);
  assert.deepEqual(groups.map(({ id, people }) => [id, people.length]), [['friends', 1]]);
  assert.deepEqual(buildRelationshipGroups([
    { id: 'draft', relationship_type: 'Family', status: 'in_progress' },
  ]), []);
});

test('a shared memory uses the selected contributor\'s own summary or quote', () => {
  const output = { constellation: { nodes: [{
    contributor_id: 'a', summary: 'Primary account.',
    attributions: [
      { contributor_id: 'a', contributor_summary: 'Alex\'s account.' },
      { contributor_id: 'b', contributor_summary: 'Sam\'s account.' },
      { contributor_id: 'c', quote: 'Morgan\'s quote.' },
    ],
  }] } };
  assert.equal(getRelationshipSummary(output, 'b'), 'Sam\'s account.');
  assert.equal(getRelationshipSummary(output, 'c'), 'Morgan\'s quote.');
  assert.equal(getRelationshipSummary(output, 'unknown'), '');
});

test('photos never match by display name and explicit empty highlights stay empty', () => {
  const output = { photos: { albums: [{ photos: [
    { id: 'a-photo', contributor_id: 'a', contributor_name: 'Sibling', url: '/a.jpg' },
    { id: 'b-photo', contributor_id: 'b', contributor_name: 'Sibling', url: '/b.jpg' },
    { id: 'missing-id', contributor_name: 'Sibling', url: '/unknown.jpg' },
  ] }] } };
  assert.deepEqual(getRelationshipPhotos(output, 'b').map(({ url }) => url), ['/b.jpg']);
  assert.deepEqual(getRelationshipPhotos(output, 'b', { photos: [] }), []);
  assert.deepEqual(getRelationshipPhotos(output, 'b', { photos: [
    { id: 'one', photo_url: '/signed.jpg' }, { id: 'one', photo_url: '/signed.jpg' }, { id: 'empty', photo_url: null },
  ] }).map(({ url }) => url), ['/signed.jpg']);
});

test('relationship paths preserve IDs and tolerate malformed or missing selections', () => {
  const path = getRelationshipPath('family', 'person/with spaces');
  assert.equal(path, 'relationships/family/person%2Fwith%20spaces');
  assert.deepEqual(parseRelationshipPath(path), { groupId: 'family', personId: 'person/with spaces' });
  assert.deepEqual(parseRelationshipPath('relationships'), { groupId: null, personId: null });
  assert.deepEqual(parseRelationshipPath('relationships/%zz'), { groupId: null, personId: null });
});
