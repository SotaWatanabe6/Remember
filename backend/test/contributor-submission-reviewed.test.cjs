const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const { createClient } = require('@supabase/supabase-js')

// NS-5: the red dot on a submission sub-tab clears when the organizer acts on
// that content type — approving the submission, or deleting from it — never on
// a mere view. Exercised against an in-memory Supabase fixture. No
// credentials, live records, or storage are used.
function fixture() {
  const db = {
    memorials: [
      { id: 'memorial', user_id: 'organizer' },
      { id: 'other-memorial', user_id: 'someone-else' },
    ],
    contributors: [
      { id: 'jane', memorial_id: 'memorial', name: 'Jane Doe', status: 'submitted', submitted_at: '2026-09-10T00:00:00.000Z' },
      { id: 'outsider', memorial_id: 'other-memorial', name: 'Out Sider', status: 'submitted', submitted_at: null },
    ],
    media_assets: [
      { id: 'p1', contributor_id: 'jane', memorial_id: 'memorial', storage_path: 'jane/1.jpg', storage_bucket: 'photos', file_name: '1.jpg', file_type: 'image/jpeg', reviewed_at: '2026-09-11T00:00:00.000Z', created_at: '2026-09-10T00:00:00.000Z' },
      { id: 'p2', contributor_id: 'jane', memorial_id: 'memorial', storage_path: 'jane/2.jpg', storage_bucket: 'photos', file_name: '2.jpg', file_type: 'image/jpeg', reviewed_at: null, created_at: '2026-09-10T00:00:01.000Z' },
      { id: 'p3', contributor_id: 'outsider', memorial_id: 'other-memorial', storage_path: 'out/3.jpg', storage_bucket: 'photos', file_name: '3.jpg', file_type: 'image/jpeg', reviewed_at: null, created_at: '2026-09-10T00:00:02.000Z' },
    ],
    voice_recordings: [
      { id: 'v1', contributor_id: 'jane', memorial_id: 'memorial', storage_path: 'jane/v.m4a', storage_bucket: 'voices', file_name: 'v.m4a', file_type: 'audio/mp4', contributor_title: 'Her laugh', reviewed_at: null, created_at: '2026-09-10T00:00:00.000Z' },
    ],
    contributor_stories: [
      { id: 's1', contributor_id: 'jane', memorial_id: 'memorial', client_story_id: 'c1', title: 'Lake', body: 'We swam.', reviewed_at: null, created_at: '2026-09-10T00:00:00.000Z' },
    ],
    questionnaire_responses: [
      { id: 'r1', contributor_id: 'jane', memorial_id: 'memorial', question_text: 'Favourite place?', response_text: 'The lake.', order_index: 0, reviewed_at: null, created_at: '2026-09-10T00:00:00.000Z' },
    ],
  }
  const mutations = []
  const removedFiles = []
  const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...headers },
  })
  const project = (rows, fields) => rows.map((row) => fields && fields !== '*'
    ? Object.fromEntries(fields.split(',').map((key) => [key.trim(), row[key.trim()]])) : row)
  const supabase = createClient('https://ns5-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options = {}) => {
      const url = new URL(input)
      const method = options.method || 'GET'
      if (url.pathname.startsWith('/storage/v1/object/sign/')) {
        return json({ signedURL: '/object/sign/fixture?token=fixture' })
      }
      if (url.pathname.startsWith('/storage/v1/object/') && method === 'DELETE') {
        removedFiles.push(...JSON.parse(options.body).prefixes)
        return json([])
      }
      const table = url.pathname.split('/').pop()
      assert.ok(db[table], `Unexpected request: ${method} ${url.pathname}`)
      const rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) => {
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3)
        if (value === 'is.null') return row[key] === null || row[key] === undefined
        if (value === 'not.is.null') return row[key] !== null && row[key] !== undefined
        if (value.startsWith('in.')) return value.slice(4, -1).split(',').includes(String(row[key]))
        return true
      }))
      const fields = url.searchParams.get('select')
      const wantsOne = new Headers(options.headers).get('accept')?.includes('vnd.pgrst.object')
      if (method === 'PATCH') {
        const patch = JSON.parse(options.body)
        mutations.push({ table, ids: rows.map((row) => row.id), patch })
        rows.forEach((row) => Object.assign(row, patch))
        if (wantsOne && rows.length !== 1) return json({ message: 'Not found', code: 'PGRST116' }, 406)
        const patched = project(rows, fields)
        return json(wantsOne ? patched[0] : patched)
      }
      if (method === 'HEAD') {
        return new Response(null, { headers: { 'content-range': `0-0/${rows.length}` } })
      }
      if (method === 'DELETE') {
        mutations.push({ table, method: 'DELETE', ids: rows.map((row) => row.id) })
        db[table] = db[table].filter((row) => !rows.includes(row))
        return new Response(null, { status: 204 })
      }
      if (wantsOne && rows.length !== 1) return json({ message: 'Not found', code: 'PGRST116' }, 406)
      const projected = project(rows, fields)
      return json(wantsOne ? projected[0] : projected)
    } },
  })
  const filename = path.resolve(__dirname, '../src/routes/memorials.js')
  const realRequire = createRequire(filename)
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, process, console, Buffer, Request,
    require(name) {
      if (name === '../supabase') return supabase
      if (name === 'dotenv') return { config() {} }
      if (name === '../middleware/auth') return (req, res, next) => next()
      if (name === '../services/storageUrls') return { enrichMemorialsForClient: (x) => x, enrichMemorialForClient: (x) => x }
      return realRequire(name)
    },
  }, { filename })

  async function call(method, routePath, { params = {}, body = {}, user = 'organizer' } = {}) {
    const route = module.exports.stack.find((layer) => layer.route?.path === routePath && layer.route.methods[method]).route
    const handler = route.stack[route.stack.length - 1].handle
    // The route runs in its own vm realm; round-trip the body so its arrays
    // compare structurally with deepEqual in this one.
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this } }
    await handler({ params: { id: 'memorial', contributorId: 'jane', ...params }, body, user: { sub: user } }, response)
    return response
  }
  const submission = (options) => call('get', '/:id/contributors/:contributorId/submission', options)
  const approveType = (type, options) => call('patch', '/:id/contributors/:contributorId/submission/approve', { body: { type }, ...options })
  const approveSelected = (type, ids, options) => call('patch', '/:id/contributors/:contributorId/submission/approve', { body: { type, ids }, ...options })
  const setStatus = (status, options) => call('patch', '/:id/contributors/:contributorId/status', { body: { status }, ...options })
  const remove = (routePath, params, options) => call('delete', routePath, { params, ...options })
  const stamped = (table) => db[table].map((row) => row.reviewed_at)
  return { db, mutations, removedFiles, submission, setStatus, remove, stamped, approveType, approveSelected }
}

test('submission payload carries reviewed_at per item and answer_text for responses', async () => {
  const f = fixture()
  const { statusCode, body } = await f.submission()
  assert.equal(statusCode, 200)
  assert.deepEqual(body.photos.map((photo) => [photo.id, photo.reviewed_at]), [['p1', '2026-09-11T00:00:00.000Z'], ['p2', null]])
  assert.deepEqual(body.voices.map((voice) => voice.reviewed_at), [null])
  assert.deepEqual(body.stories.map((story) => story.reviewed_at), [null])
  assert.deepEqual(body.responses.map((response) => [response.answer_text, response.reviewed_at]), [['The lake.', null]])
})

test('reading a submission never stamps anything — a glance is not a review', async () => {
  const f = fixture()
  await f.submission()
  await f.submission()
  assert.deepEqual(f.mutations, [])
  assert.deepEqual(f.stamped('voice_recordings'), [null])
  assert.deepEqual(f.stamped('contributor_stories'), [null])
})

test('approving settles every content type at once', async () => {
  const f = fixture()
  const { statusCode, body } = await f.setStatus('approved')
  assert.equal(statusCode, 200)
  assert.equal(body.contributor.status, 'approved')
  assert.ok(body.reviewed_at, 'the approve response carries the stamp')
  assert.deepEqual(f.stamped('voice_recordings'), [body.reviewed_at])
  assert.deepEqual(f.stamped('contributor_stories'), [body.reviewed_at])
  assert.deepEqual(f.stamped('questionnaire_responses'), [body.reviewed_at])
  assert.deepEqual(f.db.media_assets.map((photo) => [photo.id, photo.reviewed_at]), [
    ['p1', '2026-09-11T00:00:00.000Z'],
    ['p2', body.reviewed_at],
    ['p3', null],
  ], 'earlier stamps and other memorials are untouched')
})

test('rejecting settles the submission the same way', async () => {
  const f = fixture()
  const { body } = await f.setStatus('rejected')
  assert.deepEqual(f.stamped('contributor_stories'), [body.reviewed_at])
})

test('a status change that is not a review pass leaves the dots alone', async () => {
  const f = fixture()
  const { statusCode, body } = await f.setStatus('in_progress')
  assert.equal(statusCode, 200)
  assert.equal(body.reviewed_at, null)
  assert.deepEqual(f.mutations.filter((mutation) => mutation.patch?.reviewed_at), [])
  assert.deepEqual(f.stamped('contributor_stories'), [null])
})

for (const [type, routePath, params, table, otherTable] of [
  ['photos', '/:id/contributors/:contributorId/photos/:assetId', { assetId: 'p2' }, 'media_assets', 'voice_recordings'],
  ['voices', '/:id/contributors/:contributorId/voices/:recordingId', { recordingId: 'v1' }, 'voice_recordings', 'contributor_stories'],
  ['responses', '/:id/contributors/:contributorId/responses/:responseId', { responseId: 'r1' }, 'questionnaire_responses', 'contributor_stories'],
  ['stories', '/:id/contributors/:contributorId/stories/:storyId', { storyId: 's1' }, 'contributor_stories', 'voice_recordings'],
]) {
  test(`deleting from ${type} settles that type and leaves the others dotted`, async () => {
    const f = fixture()
    const { statusCode, body } = await f.remove(routePath, params)
    assert.equal(statusCode, 200)
    assert.equal(body.deleted, true)
    assert.ok(body.reviewed_at, 'the delete response carries the stamp')
    assert.equal(f.db[table].every((row) => row.contributor_id !== 'jane' || row.reviewed_at), true)
    assert.deepEqual(f.stamped(otherTable), [null], 'other types stay dotted')
  })
}

test('deleting one photo settles the photos left behind', async () => {
  const f = fixture()
  // p1 was stamped earlier, p2 was not; removing p2 leaves p1 alone, and a
  // second photo added to the same submission would still be settled.
  const { body } = await f.remove('/:id/contributors/:contributorId/photos/:assetId', { assetId: 'p1' })
  assert.deepEqual(f.db.media_assets.map((photo) => [photo.id, photo.reviewed_at]), [
    ['p2', body.reviewed_at],
    ['p3', null],
  ])
  assert.deepEqual(f.removedFiles, ['jane/1.jpg'])
})

for (const [name, options, expected] of [
  ['a memorial the user does not own', { user: 'someone-else' }, 403],
  ['a contributor from another memorial', { params: { contributorId: 'outsider' } }, 404],
  ['an unknown contributor', { params: { contributorId: 'nobody' } }, 404],
]) {
  test(`approving ${name} settles nothing`, async () => {
    const f = fixture()
    assert.equal((await f.setStatus('approved', options)).statusCode, expected)
    assert.deepEqual(f.mutations.filter((mutation) => mutation.patch?.reviewed_at), [])
  })
}

test('an invalid status is rejected before anything is settled', async () => {
  const f = fixture()
  assert.equal((await f.setStatus('bogus')).statusCode, 400)
  assert.deepEqual(f.mutations, [])
})

test("deleting another memorial's item settles nothing", async () => {
  const f = fixture()
  const { statusCode } = await f.remove('/:id/contributors/:contributorId/photos/:assetId', { assetId: 'p3' })
  assert.equal(statusCode, 404)
  assert.deepEqual(f.mutations, [])
  assert.deepEqual(f.removedFiles, [])
})

// NS-5: the organizer approves one content type at a time.
test('approving one type settles only that type', async () => {
  const f = fixture()
  const { statusCode, body } = await f.approveType('photos')
  assert.equal(statusCode, 200)
  assert.equal(body.type, 'photos')
  assert.deepEqual(body.ids, ['p1', 'p2'])
  assert.deepEqual(f.db.media_assets.map((photo) => [photo.id, Boolean(photo.approved_at)]), [
    ['p1', true], ['p2', true], ['p3', false],
  ], "another memorial's photos are untouched")
  assert.equal(f.db.voice_recordings[0].approved_at, undefined, 'voices stay awaiting approval')
  assert.equal(f.db.contributor_stories[0].approved_at, undefined, 'stories stay awaiting approval')
})

test('approving a type also settles its red dot', async () => {
  const f = fixture()
  const { body } = await f.approveType('voices')
  assert.equal(f.db.voice_recordings[0].reviewed_at, body.approved_at)
})

test('the contributor stays in the queue while any type is unapproved', async () => {
  const f = fixture()
  const { body } = await f.approveType('photos')
  assert.ok(body.awaiting_approval > 0)
  assert.equal(body.contributor.status, 'submitted')
  assert.equal(f.db.contributors[0].status, 'submitted')
})

test('approving the last type approves the contributor', async () => {
  const f = fixture()
  for (const type of ['photos', 'voices', 'stories']) await f.approveType(type)
  assert.equal(f.db.contributors[0].status, 'submitted', 'Q&A is still awaiting approval')

  const { body } = await f.approveType('responses')
  assert.equal(body.awaiting_approval, 0)
  assert.equal(body.contributor.status, 'approved')
  assert.equal(f.db.contributors[0].status, 'approved')
})

test('approving a type twice is a no-op that keeps the first stamp', async () => {
  const f = fixture()
  const first = await f.approveType('stories')
  const again = await f.approveType('stories')
  assert.deepEqual(again.body.ids, [])
  assert.equal(f.db.contributor_stories[0].approved_at, first.body.approved_at)
})

test('approving the whole submission approves every type left', async () => {
  const f = fixture()
  const { body } = await f.setStatus('approved')
  for (const table of ['media_assets', 'voice_recordings', 'contributor_stories', 'questionnaire_responses']) {
    assert.equal(f.db[table].every((row) => row.contributor_id !== 'jane' || row.approved_at), true, table)
  }
  assert.equal(f.db.media_assets[2].approved_at, undefined, 'other memorials are untouched')
  assert.ok(body.reviewed_at)
})

for (const [name, type, options, expected] of [
  ['an unknown content type', 'archive', {}, 400],
  ['a memorial the user does not own', 'photos', { user: 'someone-else' }, 403],
  ['a contributor from another memorial', 'photos', { params: { contributorId: 'outsider' } }, 404],
]) {
  test(`approving ${name} approves nothing`, async () => {
    const f = fixture()
    assert.equal((await f.approveType(type, options)).statusCode, expected)
    assert.deepEqual(f.mutations.filter((mutation) => mutation.patch?.approved_at), [])
  })
}

// NS-6: "Approve selected" keeps what the organizer ticked and permanently
// deletes the rest of that type, files included.
test('approving a selection deletes the unselected items of that type', async () => {
  const f = fixture()
  const { statusCode, body } = await f.approveSelected('photos', ['p2'])
  assert.equal(statusCode, 200)
  assert.deepEqual(body.ids, ['p2'])
  assert.deepEqual(body.deleted_ids, ['p1'])
  assert.deepEqual(f.db.media_assets.map((photo) => [photo.id, Boolean(photo.approved_at)]), [
    ['p2', true], ['p3', false],
  ], "another memorial's photos are untouched")
  assert.deepEqual(f.removedFiles, ['jane/1.jpg'])
  assert.equal(f.db.voice_recordings.length, 1, 'other types are untouched')
})

test('approving an empty selection removes every item of that type', async () => {
  const f = fixture()
  const { body } = await f.approveSelected('voices', [])
  assert.deepEqual(body.ids, [])
  assert.deepEqual(body.deleted_ids, ['v1'])
  assert.deepEqual(f.db.voice_recordings, [])
  assert.deepEqual(f.removedFiles, ['jane/v.m4a'])
})

test('types without files delete rows only', async () => {
  const f = fixture()
  const { body } = await f.approveSelected('stories', [])
  assert.deepEqual(body.deleted_ids, ['s1'])
  assert.deepEqual(f.db.contributor_stories, [])
  assert.deepEqual(f.removedFiles, [])
})

test('a stale selection never deletes or re-stamps approved items', async () => {
  const f = fixture()
  const first = await f.approveSelected('photos', ['p1'])
  assert.deepEqual(first.body.deleted_ids, ['p2'])

  const again = await f.approveSelected('photos', [])
  assert.deepEqual(again.body.ids, [])
  assert.deepEqual(again.body.deleted_ids, [], 'p1 was already approved')
  assert.equal(f.db.media_assets.find((photo) => photo.id === 'p1').approved_at, first.body.approved_at)
})

test("ids from another contributor are ignored, not approved", async () => {
  const f = fixture()
  const { body } = await f.approveSelected('photos', ['p1', 'p2', 'p3'])
  assert.deepEqual(body.ids, ['p1', 'p2'])
  assert.equal(f.db.media_assets.find((photo) => photo.id === 'p3').approved_at, undefined)
})

test('deleting the unselected items can finish the submission', async () => {
  const f = fixture()
  await f.approveSelected('photos', ['p1'])
  await f.approveSelected('voices', [])
  await f.approveSelected('stories', ['s1'])
  const { body } = await f.approveSelected('responses', [])
  assert.equal(body.awaiting_approval, 0)
  assert.equal(f.db.contributors[0].status, 'approved')
})

test('a malformed selection is rejected before anything changes', async () => {
  const f = fixture()
  for (const ids of ['p1', [1], null]) {
    assert.equal((await f.approveSelected('photos', ids)).statusCode, 400, JSON.stringify(ids))
  }
  assert.deepEqual(f.mutations, [])
  assert.deepEqual(f.removedFiles, [])
})

test('the submission payload says what is already approved', async () => {
  const f = fixture()
  await f.approveSelected('photos', ['p2'])
  const { body } = await f.submission()
  assert.deepEqual(body.photos.map((photo) => [photo.id, Boolean(photo.approved_at)]), [['p2', true]])
  assert.deepEqual(body.stories.map((story) => story.approved_at), [undefined])
})
