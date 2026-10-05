const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture({ fail = false } = {}) {
  const invite = 'privacy-invite';
  const key = `remember_contributor_session:${invite}`;
  const values = new Map([[key, JSON.stringify({ contributorId: 'contributor', contributorToken: 'secret', memorialId: 'memorial', contributorName: 'Jane Doe', is_anonymous: false, display_name: 'Jane Doe' })]]);
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const saved = { id: 'contributor', name: 'Jane Doe', status: 'in_progress', is_anonymous: true, relationship_type: 'Family', relationship_label: 'Cousin', display_name: 'Cousin' };
  const requests = [];
  const context = {
    window: { localStorage: storage }, process: { env: {} }, console,
    formatPersonName: (name) => name.trim(),
    CONTRIBUTOR_RELATIONSHIP_TYPES_REQUIRING_LABEL: new Set(['Family', 'Other']),
    getInviteToken: async () => ({ invite: { is_active: true }, memorial: { id: 'memorial', subject_name: 'Robin' } }),
    getPrivacyChoice: async (token, secret) => {
      requests.push({ token, secret });
      if (fail) throw new Error('Offline');
      return { contributor: saved };
    },
    savePrivacyChoice: async (token, body) => {
      requests.push({ token, body });
      if (fail) throw new Error('Save failed');
      saved.is_anonymous = body.is_anonymous;
      saved.display_name = body.is_anonymous ? 'Cousin' : saved.name;
      return { contributor: saved };
    },
    ApiRequestError: class extends Error {},
  };
  const source = readFileSync(path.resolve(__dirname, '../src/services/contributorService.js'), 'utf8')
    .replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/^export /gm, '');
  vm.runInNewContext(`${source}\nthis.api = { getContributorPrivacyDraft, saveContributorPrivacy };`, context);
  return { api: context.api, invite, requests, session: () => JSON.parse(storage.getItem(key)) };
}

test('returning to privacy restores the server choice instead of stale browser values', async () => {
  const f = fixture();
  const draft = await f.api.getContributorPrivacyDraft(f.invite);
  assert.equal(draft.is_anonymous, true);
  assert.equal(draft.session.contributorName, 'Jane Doe');
  assert.equal(draft.session.display_name, 'Cousin');
  assert.equal(draft.session.relationship_custom_label, 'Cousin');
  assert.equal(f.requests[0].secret, 'secret');
  assert.equal(f.session().is_anonymous, true);
});

test('switching privacy stores public display name separately from real identity', async () => {
  const f = fixture();
  await f.api.saveContributorPrivacy(f.invite, true);
  assert.equal(f.session().display_name, 'Cousin');
  assert.equal(f.session().contributorName, 'Jane Doe');
  assert.equal(f.requests[0].body.contributor_token, 'secret');
  assert.equal(f.requests[0].body.is_anonymous, true);
  await f.api.saveContributorPrivacy(f.invite, false);
  assert.equal(f.session().display_name, 'Jane Doe');
  assert.equal(f.session().is_anonymous, false);
});

test('failed privacy reads and saves cannot overwrite the last confirmed browser state', async () => {
  const f = fixture({ fail: true });
  const before = f.session();
  await assert.rejects(f.api.getContributorPrivacyDraft(f.invite), /Offline/);
  await assert.rejects(f.api.saveContributorPrivacy(f.invite, true), /could not save/);
  assert.deepEqual(f.session(), before);
});
