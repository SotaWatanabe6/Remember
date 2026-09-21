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
    return { getManageTabs, resolveManageTab, hasPendingContributions, getPendingSubmissionSections, getSubmissionSubTabs, resolveSubTab }; })()`);
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
