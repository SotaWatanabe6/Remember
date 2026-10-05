import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/organizer/contributorSearch.js', import.meta.url), 'utf8');
const { matchesContributorName, getArchiveQaGroups } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('names match case-insensitive substrings and trimmed queries, including non-Latin names', () => {
  assert.equal(matchesContributorName({ name: 'Natasha Smith' }, '  TASHA  '), true);
  assert.equal(matchesContributorName({ name: '김수진' }, '수진'), true);
  assert.equal(matchesContributorName({ name: "Anne O’Neill" }, 'O’NEILL'), true);
  assert.equal(matchesContributorName({ name: 'Natasha Smith' }, 'Jonah'), false);
});

test('empty and whitespace-only search show everyone, including missing names', () => {
  for (const query of ['', '   ', undefined]) {
    assert.equal(matchesContributorName({ name: 'Natasha' }, query), true);
    assert.equal(matchesContributorName({}, query), true);
    assert.equal(matchesContributorName(null, query), true);
  }
  assert.equal(matchesContributorName({}, 'Anonymous'), false);
});

test('organizer search uses real names, never relationships, statuses or public anonymous labels', () => {
  const contributor = { name: 'Natasha Smith', is_anonymous: true, display_name: 'Cousin', relationship_label: 'Cousin', relationship_type: 'Family', status: 'submitted' };
  assert.equal(matchesContributorName(contributor, 'Natasha'), true);
  for (const query of ['Cousin', 'Family', 'submitted', 'anonymous']) {
    assert.equal(matchesContributorName(contributor, query), false);
  }
});

test('Q&A groups use IDs so duplicate names stay distinct and each contributor keeps every answer', () => {
  const contributors = [{ id: 'b', name: 'Sam' }, { id: 'a', name: 'Sam' }, { id: 'c', name: 'Casey' }];
  const responses = [
    { id: 'a1', contributor_id: 'a', answer_text: 'First answer' },
    { id: 'b1', contributor_id: 'b', answer_text: 'Second contributor' },
    { id: 'a2', contributor_id: 'a', answer_text: 'Another answer' },
  ];
  const groups = getArchiveQaGroups(contributors, responses);
  assert.deepEqual(groups.map((group) => group.contributor.id), ['b', 'a']);
  assert.deepEqual(groups[1].responses.map((response) => response.id), ['a1', 'a2']);
  assert.equal(groups.filter(({ contributor }) => matchesContributorName(contributor, 'SAM')).length, 2);
  assert.equal(groups.filter(({ contributor }) => matchesContributorName(contributor, 'Casey')).length, 0);
  assert.equal(responses.length, 3);
});

test('approved answers of a partially reviewed contributor are searchable; blank Q&A is omitted and audio answers remain', () => {
  const contributors = [{ id: 'a', name: 'Natasha', status: 'submitted' }, { id: 'b', name: 'Jonah', status: 'approved' }];
  const groups = getArchiveQaGroups(contributors, [
    { id: 'a1', contributor_id: 'a', answer_text: 'Approved answer', approved_at: '2026-10-03' },
    { id: 'b1', contributor_id: 'b', answer_text: '  ' },
    { id: 'b2', contributor_id: 'b', response_audio_url: '/recorded-answer.wav' },
  ]);
  assert.equal(groups.filter(({ contributor }) => matchesContributorName(contributor, 'natasha')).length, 1);
  assert.deepEqual(groups[1].responses.map((response) => response.id), ['b2']);
  assert.deepEqual(getArchiveQaGroups(), []);
});

test('missing contributor metadata falls back to the response name and remains separate by ID', () => {
  const groups = getArchiveQaGroups([], [
    { id: 'r1', contributor_id: 'a', contributor_name: 'Sam', answer_text: 'One' },
    { id: 'r2', contributor_id: 'b', contributor_name: 'Sam', answer_text: 'Two' },
    { id: 'r3', contributor_id: 'c', answer_text: 'Three' },
  ]);
  assert.deepEqual(groups.map((group) => group.contributor.name), ['Sam', 'Sam', '']);
  assert.equal(groups.filter(({ contributor }) => matchesContributorName(contributor, 'sam')).length, 2);
});
