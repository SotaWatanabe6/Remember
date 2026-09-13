const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the API module with browser storage and HTTP fixtures. Import-only UI
// dependencies are substituted so these regressions run with Node alone.
function fixture({ fail = false, savedStories = [], cachedStories = [], withSession = true } = {}) {
  const token = 'test-invite';
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  if (withSession) storage.setItem(`remember_contributor_session:${token}`, JSON.stringify({ contributorToken: 'owner', contributorId: 'owner' }));
  storage.setItem(`remember_stories:${token}`, JSON.stringify(cachedStories));
  storage.setItem(`remember_voice:${token}`, JSON.stringify([{ id: 'voice-id', contributor_title: 'Original voice' }]));
  const requests = [];
  const memory = { photos: [], voice: [] };
  const source = readFileSync(path.resolve(__dirname, '../src/lib/api.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export /gm, '');
  const context = {
    window: { localStorage: storage, location: { hostname: 'localhost' } },
    process: { env: { NEXT_PUBLIC_API_URL: 'http://fixture.invalid', NODE_ENV: 'test' } },
    URL, AbortController, setTimeout, clearTimeout, console,
    CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS: [], mockMemorials: [],
    getStore: () => memory,
    removeVoice: (id) => { memory.voice = memory.voice.filter((item) => item.id !== id); },
    updateVoiceTitle: (id, title) => { memory.voice = memory.voice.map((item) => item.id === id ? { ...item, title } : item); },
    getQuestionSetForContributorRelationship: () => [],
    fetch: async (url, options) => {
      const body = options.body ? JSON.parse(options.body) : null;
      const method = options.method || 'GET';
      requests.push({ url, method, body });
      if (fail) return new Response(JSON.stringify({ error: 'Could not save' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      const contributor = { id: 'owner', status: 'in_progress', submitted_at: null };
      let result;
      if (method === 'GET') {
        if (url.includes('/photos?')) result = { contributor, photos: [] };
        else if (url.includes('/voice?')) result = { contributor, voice: [] };
        else result = { contributor, stories: savedStories };
      } else if (method === 'DELETE') result = { deleted: true };
      else if (url.includes('/voice/')) result = { recording: { id: 'voice-id', contributor_title: body.contributor_title } };
      else result = { story: { id: 'server-id', client_story_id: body.client_story_id || 'draft-id', title: body.title, body: body.body } };
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    },
  };
  vm.runInNewContext(`${source}\nthis.api = { getContributorSummary, saveContributorStory, updateContributorStory, deleteContributorStory, renameContributorVoice, deleteVoice };`, context);
  return { api: context.api, token, storage, memory, requests, stories: () => JSON.parse(storage.getItem(`remember_stories:${token}`)) };
}

test('story creation caches both stable client and server identifiers', async () => {
  const f = fixture();
  const result = await f.api.saveContributorStory(f.token, 'owner', { id: 'draft-id', title: 'Garden', body: 'A memory' });
  assert.equal(result.story.id, 'draft-id');
  assert.equal(result.story.server_id, 'server-id');
  await f.api.updateContributorStory(f.token, result.story, { title: 'New title', body: 'New text' });
  assert.equal(f.requests[1].method, 'PATCH');
  assert.ok(f.requests[1].url.endsWith('/stories/server-id'));
  assert.equal(f.stories().length, 1);
  assert.equal(f.stories()[0].body, 'New text');
});

test('story deletion removes its cached draft so submission cannot recreate it', async () => {
  const story = { id: 'draft-id', server_id: 'server-id', title: 'Garden', body: 'Text' };
  const f = fixture({ cachedStories: [story] });
  await f.api.deleteContributorStory(f.token, story);
  assert.ok(f.requests[0].url.endsWith('/stories/server-id'));
  assert.equal(f.requests[0].method, 'DELETE');
  assert.equal(f.stories().length, 0);
  assert.equal((await f.api.getContributorSummary(f.token, { requireFreshContent: true })).stories.length, 0);
});

test('refresh reconciles legacy drafts, prefers saved edits, and drops deleted saved rows', async () => {
  const f = fixture({
    savedStories: [{ id: 'server-id', client_story_id: 'draft-id', title: 'Saved title', body: 'Saved text' }],
    cachedStories: [
      { id: 'draft-id', title: 'Stale title' },
      { id: 'deleted-draft', server_id: 'deleted-id', title: 'Deleted elsewhere' },
      { id: 'unsaved', title: 'Keep unsaved draft' },
    ],
  });
  const result = await f.api.getContributorSummary(f.token, { requireFreshContent: true });
  assert.equal(result.stories.length, 2);
  assert.equal(result.stories[0].title, 'Saved title');
  assert.equal(result.stories[0].server_id, 'server-id');
  assert.equal(result.stories[1].id, 'unsaved');
});

test('failed story update or deletion never changes the cached story', async () => {
  const story = { id: 'draft-id', server_id: 'server-id', title: 'Original', body: 'Original text' };
  const f = fixture({ fail: true, cachedStories: [story] });
  await assert.rejects(f.api.updateContributorStory(f.token, story, { title: 'New', body: 'New' }), /Could not save/);
  await assert.rejects(f.api.deleteContributorStory(f.token, story), /Could not save/);
  assert.deepEqual(f.stories(), [story]);
});

test('failed creation preserves the existing draft without reporting an unsaved edit as saved', async () => {
  const story = { id: 'draft-id', title: 'Original', body: 'Original text' };
  const f = fixture({ fail: true, cachedStories: [story] });
  await assert.rejects(f.api.updateContributorStory(f.token, story, { title: 'New', body: 'New' }), /Could not save/);
  assert.deepEqual(f.stories(), [story]);
});

test('review read failures surface instead of silently falling back to stale content', async () => {
  const f = fixture({ fail: true });
  await assert.rejects(f.api.getContributorSummary(f.token, { requireFreshContent: true }), /Could not save/);
});

test('voice changes update both browser caches only after API success', async () => {
  const f = fixture();
  f.memory.voice.push({ id: 'voice-id', title: 'Original voice' });
  await f.api.renameContributorVoice(f.token, 'voice-id', 'Renamed');
  assert.equal(f.memory.voice[0].title, 'Renamed');
  await f.api.deleteVoice(f.token, 'voice-id');
  assert.equal(f.memory.voice.length, 0);
  assert.equal(JSON.parse(f.storage.getItem(`remember_voice:${f.token}`)).length, 0);
});

test('voice failures leave the saved title and recording intact', async () => {
  const f = fixture({ fail: true });
  await assert.rejects(f.api.renameContributorVoice(f.token, 'voice-id', 'Renamed'), /Could not save/);
  await assert.rejects(f.api.deleteVoice(f.token, 'voice-id'), /Could not save/);
  assert.equal(JSON.parse(f.storage.getItem(`remember_voice:${f.token}`))[0].contributor_title, 'Original voice');
});

test('real mutations require a session and never silently use mock behavior', async () => {
  const f = fixture({ withSession: false });
  await assert.rejects(f.api.deleteVoice(f.token, 'voice-id'), /contributor details/);
  await assert.rejects(f.api.saveContributorStory(f.token, null, { id: 'draft-id', title: 'Story' }), /contributor details/);
  assert.equal(f.requests.length, 0);
});
