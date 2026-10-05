const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// NS-7: the Approve Contributions tab and its content sub-tabs only exist
// while something is pending review. Run the helper module with Node alone.
function loadHelpers() {
  const source = readFileSync(path.resolve(__dirname, '../src/lib/organizer/contributionReview.js'), 'utf8')
    .replace(/^export /gm, '');
  // Same realm as the assertions so arrays compare structurally with deepEqual.
  return vm.runInThisContext(`(() => { ${source}
    return { getManageTabs, resolveManageTab, hasPendingContributions, getPendingSubmissionSections, getSubmissionSubTabs, resolveSubTab, isUnreviewed, hasUnreviewedItems, markSectionReviewed, isApproved, markSectionApproved, getSubTabNoun, SUBMISSION_SUB_TABS, getSelectedIds, toggleSelected, setAllSelected }; })()`);
}

const helpers = loadHelpers();
const submitted = { id: 'a', status: 'submitted' };
const approved = { id: 'b', status: 'approved' };
const inProgress = { id: 'c', status: 'in_progress' };
const keys = (tabs) => tabs.map((tab) => tab.key);

test('approve contributions tab is hidden when nothing is pending review', () => {
  assert.deepEqual(helpers.getManageTabs([approved, inProgress]), ['Archive', 'Outputs']);
  assert.deepEqual(helpers.getManageTabs([]), ['Archive', 'Outputs']);
  assert.deepEqual(helpers.getManageTabs(undefined), ['Archive', 'Outputs']);
  assert.equal(helpers.hasPendingContributions(undefined), false);
});

test('approve contributions tab is shown while any contributor is submitted', () => {
  assert.deepEqual(helpers.getManageTabs([approved, submitted]), ['Archive', 'Approve Contributions', 'Outputs']);
  assert.deepEqual(helpers.getManageTabs([{ status: 'SUBMITTED' }]), ['Archive', 'Approve Contributions', 'Outputs']);
});

test('approving the last pending submission falls back to the archive tab', () => {
  const before = helpers.getManageTabs([submitted]);
  assert.equal(helpers.resolveManageTab('Approve Contributions', before), 'Approve Contributions');
  const after = helpers.getManageTabs([{ ...submitted, status: 'approved' }]);
  assert.equal(helpers.resolveManageTab('Approve Contributions', after), 'Archive');
  assert.equal(helpers.resolveManageTab('Outputs', after), 'Outputs');
});

test('only content types with pending items get a sub-tab', () => {
  const sections = helpers.getPendingSubmissionSections({
    photos: [{ id: 'p1' }],
    voices: [],
    stories: [{ id: 's1', title: '', body: '   ' }, { id: 's2', title: 'A day at the lake', body: '' }],
    responses: [{ id: 'r1', answer_text: '' }, { id: 'r2', answer_text: 'She loved gardening.' }],
  });
  const subTabs = helpers.getSubmissionSubTabs(sections);
  assert.deepEqual(keys(subTabs), ['photos', 'stories', 'responses']);
  assert.deepEqual(subTabs.map((tab) => tab.label), ['Photos', 'Stories', 'Q&A']);
  assert.deepEqual(sections.stories.map((story) => story.id), ['s2']);
  assert.deepEqual(sections.responses.map((response) => response.id), ['r2']);
});

test('active sub-tab falls back to the first visible one when its type empties', () => {
  const subTabs = helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections({ photos: [{ id: 'p1' }], voices: [{ id: 'v1' }] }));
  assert.equal(helpers.resolveSubTab('voices', subTabs), 'voices');
  assert.equal(helpers.resolveSubTab('stories', subTabs), 'photos');
  assert.equal(helpers.resolveSubTab(null, subTabs), 'photos');
});

test('a submission with nothing pending has no sub-tabs at all', () => {
  assert.deepEqual(helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections(null)), []);
  const empty = helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections({ stories: [{ title: ' ' }], responses: [{}] }));
  assert.deepEqual(empty, []);
  assert.equal(helpers.resolveSubTab('photos', empty), null);
});

// NS-5: red dot on a sub-tab until the organizer has acted on that content
// type. Opening a sub-tab is not review, so the dot survives a glance.
test('a sub-tab stays dotted while any of its pending items is unsettled', () => {
  const sections = helpers.getPendingSubmissionSections({
    photos: [{ id: 'p1', reviewed_at: '2026-09-01T00:00:00.000Z' }, { id: 'p2', reviewed_at: null }],
    voices: [{ id: 'v1', reviewed_at: '2026-09-01T00:00:00.000Z' }],
    stories: [{ id: 's1', title: 'Lake', body: '', reviewed_at: undefined }],
  });
  const byKey = Object.fromEntries(helpers.getSubmissionSubTabs(sections).map((tab) => [tab.key, tab.unreviewed]));
  assert.deepEqual(byKey, { photos: true, voices: false, stories: true });
  assert.equal(helpers.hasUnreviewedItems([]), false);
  assert.equal(helpers.hasUnreviewedItems(undefined), false);
  assert.equal(helpers.isUnreviewed({}), true);
});

test('an empty draft does not keep its sub-tab dotted', () => {
  // The blank story is not pending content, so it neither shows a tab nor a dot.
  const sections = helpers.getPendingSubmissionSections({ stories: [{ id: 's0', title: '', body: '' }] });
  assert.deepEqual(helpers.getSubmissionSubTabs(sections), []);
});

test('settling a section stamps only its unreviewed items and clears its dot', () => {
  const detail = {
    contributor: { id: 'a' },
    photos: [{ id: 'p1', reviewed_at: '2026-09-01T00:00:00.000Z' }, { id: 'p2', reviewed_at: null }],
    voices: [{ id: 'v1', reviewed_at: null }],
  };
  const next = helpers.markSectionReviewed(detail, 'photos', '2026-09-21T12:00:00.000Z');
  assert.deepEqual(next.photos.map((photo) => photo.reviewed_at), ['2026-09-01T00:00:00.000Z', '2026-09-21T12:00:00.000Z']);
  assert.equal(next.voices, detail.voices, 'other sections are untouched');
  assert.notEqual(next, detail, 'detail is not mutated');
  assert.equal(detail.photos[1].reviewed_at, null);
  const tabs = helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections(next));
  assert.deepEqual(tabs.map((tab) => [tab.key, tab.unreviewed]), [['photos', false], ['voices', true]]);
});

test('marking a section that is absent from the detail is a no-op', () => {
  const detail = { contributor: { id: 'a' }, photos: [] };
  assert.equal(helpers.markSectionReviewed(detail, 'stories', 'now'), detail);
  assert.equal(helpers.markSectionReviewed(null, 'photos', 'now'), null);
});

test('a sub-tab the organizer only looked at keeps its dot', () => {
  // Nothing in the helpers clears a dot on read: only markSectionReviewed,
  // which mirrors the server's stamping on approve/delete, does.
  const detail = { contributor: { id: 'a' }, photos: [{ id: 'p1', reviewed_at: null }], voices: [{ id: 'v1', reviewed_at: null }] };
  const dotted = () => helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections(detail))
    .filter((tab) => tab.unreviewed).map((tab) => tab.key);
  assert.deepEqual(dotted(), ['photos', 'voices']);
  assert.equal(helpers.resolveSubTab('voices', helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections(detail))), 'voices');
  assert.deepEqual(dotted(), ['photos', 'voices'], 'switching sub-tabs settles nothing');
});

test('an approve pass settles every type, so no sub-tab is dotted', () => {
  // The server stamps all four types on approve; mirror that locally.
  const approved = ['photos', 'voices', 'stories', 'responses'].reduce(
    (detail, type) => helpers.markSectionReviewed(detail, type, '2026-09-24T12:00:00.000Z'),
    {
      contributor: { id: 'a' },
      photos: [{ id: 'p1', reviewed_at: null }],
      voices: [{ id: 'v1', reviewed_at: null }],
      stories: [{ id: 's1', title: 'Lake', body: 'We swam.', reviewed_at: null }],
      responses: [{ id: 'r1', answer_text: 'Gardening.', reviewed_at: null }],
    },
  );
  const tabs = helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections(approved));
  assert.deepEqual(tabs.map((tab) => tab.key), ['photos', 'voices', 'stories', 'responses']);
  assert.deepEqual(tabs.filter((tab) => tab.unreviewed), []);
});

// NS-5: approval is per content type — photos can be settled while the
// stories are still awaiting review.
test('approved content leaves the queue, one type at a time', () => {
  const detail = {
    photos: [{ id: 'p1', approved_at: '2026-09-24T00:00:00.000Z' }, { id: 'p2' }],
    stories: [{ id: 's1', title: 'Lake', body: 'We swam.' }],
  };
  const sections = helpers.getPendingSubmissionSections(detail);
  assert.deepEqual(sections.photos.map((photo) => photo.id), ['p2'], 'approved photos are gone');
  assert.deepEqual(keys(helpers.getSubmissionSubTabs(sections)), ['photos', 'stories']);
});

test("a fully approved type loses its sub-tab while the rest stays", () => {
  const detail = {
    photos: [{ id: 'p1', approved_at: '2026-09-24T00:00:00.000Z' }],
    stories: [{ id: 's1', title: 'Lake', body: 'We swam.' }],
  };
  const subTabs = helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections(detail));
  assert.deepEqual(keys(subTabs), ['stories']);
  assert.equal(helpers.resolveSubTab('photos', subTabs), 'stories', 'the pills fall back to what is left');
});

test('approving a section settles it locally, including its dot', () => {
  const detail = {
    contributor: { id: 'a' },
    photos: [{ id: 'p1', reviewed_at: null }, { id: 'p2', reviewed_at: '2026-09-20T00:00:00.000Z' }],
    stories: [{ id: 's1', title: 'Lake', body: 'We swam.', reviewed_at: null }],
  };
  const next = helpers.markSectionApproved(detail, 'photos', '2026-09-24T12:00:00.000Z');
  assert.deepEqual(next.photos.map((photo) => photo.approved_at), ['2026-09-24T12:00:00.000Z', '2026-09-24T12:00:00.000Z']);
  assert.deepEqual(next.photos.map((photo) => photo.reviewed_at), ['2026-09-24T12:00:00.000Z', '2026-09-20T00:00:00.000Z'], 'an earlier review stamp is kept');
  assert.equal(next.stories, detail.stories, 'other types are untouched');
  assert.equal(detail.photos[0].approved_at, undefined, 'detail is not mutated');

  const tabs = helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections(next));
  assert.deepEqual(keys(tabs), ['stories'], 'the approved type is out of the queue');
});

test('an already approved item keeps its original approval stamp', () => {
  const detail = { photos: [{ id: 'p1', approved_at: '2026-09-01T00:00:00.000Z' }] };
  const next = helpers.markSectionApproved(detail, 'photos', '2026-09-24T12:00:00.000Z');
  assert.deepEqual(next.photos.map((photo) => photo.approved_at), ['2026-09-01T00:00:00.000Z']);
  assert.equal(helpers.isApproved(next.photos[0]), true);
  assert.equal(helpers.isApproved({}), false);
});

test('each content type names itself the way the approval dialog reads', () => {
  assert.deepEqual(helpers.SUBMISSION_SUB_TABS.map((tab) => tab.noun), ['photo', 'audio', 'story', 'Q&A']);
  assert.equal(helpers.getSubTabNoun('voices'), 'audio');
  assert.equal(helpers.getSubTabNoun('nope'), '');
});

// NS-6: "Approve selected" approves what is ticked and deletes the rest.
test('everything starts selected, so nothing is deleted by default', () => {
  const photos = [{ id: 'p1' }, { id: 'p2' }];
  assert.deepEqual(helpers.getSelectedIds(photos, {}, 'photos'), ['p1', 'p2']);
  assert.deepEqual(helpers.getSelectedIds(photos, undefined, 'photos'), ['p1', 'p2']);
});

test('unticking and re-ticking an item', () => {
  const photos = [{ id: 'p1' }, { id: 'p2' }];
  const off = helpers.toggleSelected({}, 'photos', 'p1');
  assert.deepEqual(helpers.getSelectedIds(photos, off, 'photos'), ['p2']);
  assert.deepEqual(helpers.getSelectedIds([{ id: 'p1' }], off, 'voices'), ['p1'], 'other types keep their own selection');
  const on = helpers.toggleSelected(off, 'photos', 'p1');
  assert.deepEqual(helpers.getSelectedIds(photos, on, 'photos'), ['p1', 'p2']);
});

test('select all ticks or unticks a whole type', () => {
  const photos = [{ id: 'p1' }, { id: 'p2' }];
  const none = helpers.setAllSelected(helpers.toggleSelected({}, 'voices', 'v1'), 'photos', photos, false);
  assert.deepEqual(helpers.getSelectedIds(photos, none, 'photos'), []);
  assert.deepEqual(none.voices, ['v1'], 'other types are untouched');
  const all = helpers.setAllSelected(none, 'photos', photos, true);
  assert.deepEqual(helpers.getSelectedIds(photos, all, 'photos'), ['p1', 'p2']);
});

test('approving a selection drops the deleted items and stamps only the approved ones', () => {
  const detail = {
    photos: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3', approved_at: '2026-09-01T00:00:00.000Z' }],
  };
  const next = helpers.markSectionApproved(detail, 'photos', '2026-09-24T12:00:00.000Z', {
    approvedIds: ['p2'], deletedIds: ['p1'],
  });
  assert.deepEqual(next.photos.map((photo) => [photo.id, photo.approved_at]), [
    ['p2', '2026-09-24T12:00:00.000Z'],
    ['p3', '2026-09-01T00:00:00.000Z'],
  ]);
  assert.deepEqual(keys(helpers.getSubmissionSubTabs(helpers.getPendingSubmissionSections(next))), [], 'nothing of the type is left pending');
});
