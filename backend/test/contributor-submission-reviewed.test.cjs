const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const { createClient } = require('@supabase/supabase-js')

// NS-5: exercise the organizer's mark-reviewed route and the submission
// payload it feeds, against an in-memory Supabase fixture. No credentials,
// live records, or storage are used.
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
      const table = url.pathname.split('/').pop()
      assert.ok(db[table], `Unexpected request: ${method} ${url.pathname}`)
      const rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) => {
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3)
        if (value === 'is.null') return row[key] === null || row[key] === undefined
        return true
      }))
      const fields = url.searchParams.get('select')
      if (method === 'PATCH') {
        const patch = JSON.parse(options.body)
        mutations.push({ table, ids: rows.map((row) => row.id), patch })
        rows.forEach((row) => Object.assign(row, patch))
        return json(project(rows, fields))
      }
      const single = new Headers(options.headers).get('accept')?.includes('vnd.pgrst.object')
      if (single && rows.length !== 1) return json({ message: 'Not found', code: 'PGRST116' }, 406)
      const projected = project(rows, fields)
      return json(single ? projected[0] : projected)
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
  const reviewed = (type, options) => call('patch', '/:id/contributors/:contributorId/submission/reviewed', { body: { type }, ...options })
  const submission = (options) => call('get', '/:id/contributors/:contributorId/submission', options)
  return { db, mutations, reviewed, submission }
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

test('opening a sub-tab stamps only that type and only its unreviewed items', async () => {
  const f = fixture()
  const { statusCode, body } = await f.reviewed('photos')
  assert.equal(statusCode, 200)
  assert.equal(body.type, 'photos')
  assert.deepEqual(body.ids, ['p2'])
  assert.deepEqual(f.mutations, [{ table: 'media_assets', ids: ['p2'], patch: { reviewed_at: body.reviewed_at } }])
  assert.equal(f.db.media_assets[0].reviewed_at, '2026-09-11T00:00:00.000Z', 'earlier stamp is kept')
  assert.equal(f.db.media_assets[1].reviewed_at, body.reviewed_at)
  assert.equal(f.db.media_assets[2].reviewed_at, null, 'other memorial untouched')
  assert.equal(f.db.voice_recordings[0].reviewed_at, null, 'other types untouched')

  const again = await f.reviewed('photos')
  assert.equal(again.statusCode, 200)
  assert.deepEqual(again.body.ids, [], 'second open is a no-op')
})

for (const [type, table] of [['voices', 'voice_recordings'], ['stories', 'contributor_stories'], ['responses', 'questionnaire_responses']]) {
  test(`marks ${type} reviewed in ${table}`, async () => {
    const f = fixture()
    const { body } = await f.reviewed(type)
    assert.equal(f.mutations[0].table, table)
    assert.equal(f.db[table][0].reviewed_at, body.reviewed_at)
    const refreshed = await f.submission()
    assert.equal(refreshed.body[type][0].reviewed_at, body.reviewed_at)
  })
}

for (const [name, type, options, expected] of [
  ['an unknown content type', 'archive', {}, 400],
  ['a missing content type', '', {}, 400],
  ['a memorial the user does not own', 'photos', { user: 'someone-else' }, 403],
  ['a contributor from another memorial', 'photos', { params: { contributorId: 'outsider' } }, 404],
  ['an unknown contributor', 'photos', { params: { contributorId: 'nobody' } }, 404],
]) {
  test(`rejects ${name} without stamping anything`, async () => {
    const f = fixture()
    assert.equal((await f.reviewed(type, options)).statusCode, expected)
    assert.equal(f.mutations.length, 0)
  })
}
