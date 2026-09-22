const test = require('node:test')
const assert = require('node:assert/strict')
const { createClient } = require('@supabase/supabase-js')
const { createContributorDraftRouter } = require('../src/routes/contributorDrafts')

// Exercise real route handlers and Supabase query serialization against an
// isolated transport. These tests never touch a real memorial or storage bucket.
function fixture({ status = 'in_progress', submittedAt = null, active = true, expired = false, storageFails = false, updateFails = false } = {}) {
  const db = {
    invite_links: [{ id: 'invite', token: 'invite-token', memorial_id: 'memorial', is_active: active, expires_at: expired ? '2020-01-01' : null }],
    contributors: [
      { id: 'owner', memorial_id: 'memorial', status, submitted_at: submittedAt, voice_done: true },
      { id: 'outsider', memorial_id: 'other-memorial', status: 'in_progress' },
    ],
    contributor_stories: [
      { id: 'own-story', client_story_id: 'draft-1', contributor_id: 'owner', memorial_id: 'memorial', title: 'Old title', body: 'First line\nSecond line' },
      { id: 'other-story', contributor_id: 'someone-else', memorial_id: 'memorial', title: 'Private', body: 'Keep this' },
      { id: 'cross-memorial-story', contributor_id: 'owner', memorial_id: 'other-memorial', title: 'Elsewhere', body: 'Keep this too' },
    ],
    voice_recordings: [
      { id: 'own-voice', contributor_id: 'owner', memorial_id: 'memorial', contributor_title: 'Original title', file_name: 'memory.wav', storage_path: 'owner/voice.wav', storage_bucket: 'voices' },
      { id: 'other-voice', contributor_id: 'someone-else', memorial_id: 'memorial', contributor_title: 'Private title', storage_path: 'other/voice.wav', storage_bucket: 'voices' },
      { id: 'cross-memorial-voice', contributor_id: 'owner', memorial_id: 'other-memorial', contributor_title: 'Elsewhere', storage_path: 'other/elsewhere.wav', storage_bucket: 'voices' },
    ],
  }
  const removedFiles = []
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const supabase = createClient('https://ns3-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options = {}) => {
      const url = new URL(input)
      const method = options.method || 'GET'
      if (url.pathname.startsWith('/storage/v1/object/sign/')) return json({ signedURL: '/object/sign/voices/memory.wav?token=test' })
      if (url.pathname === '/storage/v1/object/voices' && method === 'DELETE') {
        if (storageFails) return json({ message: 'Storage unavailable', statusCode: '503' }, 503)
        removedFiles.push(...JSON.parse(options.body).prefixes)
        return json([])
      }
      const table = url.pathname.split('/').pop()
      assert.ok(db[table], `Unexpected table: ${table}`)
      let rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) =>
        !value.startsWith('eq.') || String(row[key]) === value.slice(3)))
      if (method === 'PATCH') {
        if (updateFails) return json({ message: 'Database unavailable' }, 400)
        rows.forEach((row) => Object.assign(row, JSON.parse(options.body)))
      }
      if (method === 'DELETE') db[table] = db[table].filter((row) => !rows.includes(row))
      if (method === 'HEAD') return new Response(null, { headers: { 'content-range': `0-0/${rows.length}` } })
      const fields = url.searchParams.get('select')
      if (fields && fields !== '*') rows = rows.map((row) => Object.fromEntries(fields.split(',').map((key) => [key, row[key]])))
      const headers = new Headers(options.headers)
      if (['PATCH', 'DELETE'].includes(method) && !headers.get('prefer')?.includes('return=representation')) return new Response(null, { status: 204 })
      if (headers.get('accept')?.includes('vnd.pgrst.object')) {
        if (rows.length !== 1) return json({ message: 'Not found', code: 'PGRST116' }, 406)
        return json(rows[0])
      }
      return json(rows)
    } },
  })
  const router = createContributorDraftRouter(supabase)
  async function call(method, { kind = 'voice', id = kind === 'stories' ? 'own-story' : 'own-voice', contributorToken = 'owner', token = 'invite-token', body = {} } = {}) {
    const path = method === 'get' ? `/:token/${kind}` : `/:token/${kind}/:${kind === 'stories' ? 'storyId' : 'recordingId'}`
    const route = router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
    await route.stack[0].handle({ params: { token, recordingId: id, storyId: id }, body: { contributor_token: contributorToken, ...body }, query: { contributor_token: contributorToken } }, response)
    return response
  }
  return { db, removedFiles, call, supabase }
}

test('renaming persists through a fresh read and only changes the owned recording title', async () => {
  const f = fixture()
  const result = await f.call('patch', { body: { contributor_title: '  Summer at the lake  ', file_name: 'unwanted.wav' } })
  assert.equal(result.statusCode, 200)
  assert.equal(result.body.recording.contributor_title, 'Summer at the lake')
  const read = await f.call('get')
  assert.equal(read.body.voice.length, 1)
  assert.equal(read.body.voice[0].contributor_title, 'Summer at the lake')
  assert.equal(read.body.voice[0].file_name, 'memory.wav')
  assert.match(read.body.voice[0].audio_url, /object\/sign/)
  assert.equal(f.db.voice_recordings[1].contributor_title, 'Private title')
})

test('deleting removes the stored file, persists through refresh and clears the last-recording flag', async () => {
  const f = fixture()
  assert.equal((await f.call('delete')).statusCode, 200)
  assert.deepEqual(f.removedFiles, ['owner/voice.wav'])
  assert.equal((await f.call('get')).body.voice.length, 0)
  assert.equal(f.db.contributors[0].voice_done, false)
  assert.equal(f.db.voice_recordings.length, 2)
})

test('deleting one of several recordings keeps voice_done true', async () => {
  const f = fixture()
  f.db.voice_recordings.push({ ...f.db.voice_recordings[0], id: 'second-voice', storage_path: 'owner/second.wav' })
  assert.equal((await f.call('delete')).statusCode, 200)
  assert.equal(f.db.contributors[0].voice_done, true)
})

for (const title of ['', '   ', null, 42, { title: 'bad' }]) {
  test(`rejects invalid title ${JSON.stringify(title)}`, async () => {
    const f = fixture()
    assert.equal((await f.call('patch', { body: { contributor_title: title } })).statusCode, 400)
    assert.equal(f.db.voice_recordings[0].contributor_title, 'Original title')
  })
}

for (const method of ['patch', 'delete']) {
  for (const status of ['submitted', 'approved', 'rejected', null]) {
    test(`${method} is denied for ${status} contributions`, async () => {
      const f = fixture({ status })
      const before = JSON.stringify(f.db)
      assert.equal((await f.call(method, { body: { contributor_title: 'Changed' } })).statusCode, 403)
      assert.equal(JSON.stringify(f.db), before)
      assert.equal(f.removedFiles.length, 0)
    })
  }
  test(`${method} is denied for a previously submitted draft`, async () => {
    const f = fixture({ submittedAt: '2026-09-01T12:00:00Z' })
    assert.equal((await f.call(method, { body: { contributor_title: 'Changed' } })).statusCode, 403)
  })
  for (const [name, args, expected] of [
    ['another contributor', { id: 'other-voice' }, 404],
    ['another memorial', { id: 'cross-memorial-voice' }, 404],
    ['foreign session', { contributorToken: 'outsider' }, 404],
    ['missing session', { contributorToken: null }, 400],
    ['invalid invite', { token: 'invalid' }, 410],
  ]) {
    test(`${method} rejects ${name}`, async () => {
      const f = fixture()
      const before = JSON.stringify(f.db)
      assert.equal((await f.call(method, { ...args, body: { contributor_title: 'Changed' } })).statusCode, expected)
      assert.equal(JSON.stringify(f.db), before)
      assert.equal(f.removedFiles.length, 0)
    })
  }
}

for (const options of [{ active: false }, { expired: true }]) {
  test(`inactive or expired invite rejects content access: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options)
    for (const method of ['get', 'patch', 'delete']) assert.equal((await f.call(method)).statusCode, 410)
  })
}

test('storage failure retains the recording and flag for retry', async () => {
  const f = fixture({ storageFails: true })
  assert.equal((await f.call('delete')).statusCode, 400)
  assert.equal(f.db.voice_recordings[0].id, 'own-voice')
  assert.equal(f.db.contributors[0].voice_done, true)
})

test('failed title update leaves saved content intact', async () => {
  const f = fixture({ updateFails: true })
  assert.equal((await f.call('patch', { body: { contributor_title: 'New' } })).statusCode, 400)
  assert.equal(f.db.voice_recordings[0].contributor_title, 'Original title')
})


test('story title and multiline text changes persist through a fresh read', async () => {
  const f = fixture()
  const result = await f.call('patch', { kind: 'stories', body: { title: '  Our garden  ', body: '  A new memory\nWith two lines  ', contributor_id: 'outsider' } })
  assert.equal(result.statusCode, 200)
  const read = await f.call('get', { kind: 'stories' })
  assert.equal(read.body.stories.length, 1)
  assert.equal(read.body.stories[0].id, 'own-story')
  assert.equal(read.body.stories[0].client_story_id, 'draft-1')
  assert.equal(read.body.stories[0].title, 'Our garden')
  assert.equal(read.body.stories[0].body, 'A new memory\nWith two lines')
  assert.equal(f.db.contributor_stories[0].contributor_id, 'owner')
})

test('partial story edit preserves the other field and allows an untitled story', async () => {
  const f = fixture()
  assert.equal((await f.call('patch', { kind: 'stories', body: { title: '' } })).statusCode, 200)
  assert.equal(f.db.contributor_stories[0].body, 'First line\nSecond line')
  assert.equal((await f.call('patch', { kind: 'stories', body: { body: '' } })).statusCode, 400)
  assert.equal(f.db.contributor_stories[0].body, 'First line\nSecond line')
})

for (const body of [{ title: 12 }, { body: {} }, {}, { title: ' ', body: ' ' }]) {
  test(`rejects invalid story edits: ${JSON.stringify(body)}`, async () => {
    const f = fixture()
    const before = JSON.stringify(f.db)
    assert.equal((await f.call('patch', { kind: 'stories', body })).statusCode, 400)
    assert.equal(JSON.stringify(f.db), before)
  })
}

test('story deletion persists and leaves other contributors and memorials untouched', async () => {
  const f = fixture()
  assert.equal((await f.call('delete', { kind: 'stories' })).statusCode, 200)
  assert.equal((await f.call('get', { kind: 'stories' })).body.stories.length, 0)
  assert.deepEqual(f.db.contributor_stories.map(story => story.id), ['other-story', 'cross-memorial-story'])
})

for (const method of ['patch', 'delete']) {
  for (const status of ['submitted', 'approved', 'rejected', null]) {
    test(`story ${method} is denied for ${status} contributions`, async () => {
      const f = fixture({ status })
      const before = JSON.stringify(f.db)
      assert.equal((await f.call(method, { kind: 'stories', body: { title: 'Changed' } })).statusCode, 403)
      assert.equal(JSON.stringify(f.db), before)
    })
  }
  test(`story ${method} is denied after a previous submission`, async () => {
    const f = fixture({ submittedAt: '2026-09-01T12:00:00Z' })
    assert.equal((await f.call(method, { kind: 'stories', body: { title: 'Changed' } })).statusCode, 403)
  })
  for (const [args, expected] of [
    [{ id: 'other-story' }, 404], [{ id: 'cross-memorial-story' }, 404],
    [{ contributorToken: 'outsider' }, 404], [{ contributorToken: null }, 400], [{ token: 'invalid' }, 410],
  ]) {
    test(`story ${method} rejects unauthorized access ${JSON.stringify(args)}`, async () => {
      const f = fixture()
      const before = JSON.stringify(f.db)
      assert.equal((await f.call(method, { kind: 'stories', ...args, body: { title: 'Changed' } })).statusCode, expected)
      assert.equal(JSON.stringify(f.db), before)
    })
  }
}

test('failed story update retains the saved text', async () => {
  const f = fixture({ updateFails: true })
  assert.equal((await f.call('patch', { kind: 'stories', body: { body: 'New' } })).statusCode, 400)
  assert.equal(f.db.contributor_stories[0].body, 'First line\nSecond line')
})


test('the existing story upsert route cannot bypass the post-submission edit lock', async () => {
  const { readFileSync } = require('node:fs')
  const { createRequire } = require('node:module')
  const path = require('node:path')
  const vm = require('node:vm')
  const filename = path.resolve(__dirname, '../src/routes/contribute.js')
  const realRequire = createRequire(filename)
  for (const options of [{ status: 'submitted' }, { status: 'approved' }, { submittedAt: '2026-09-01T12:00:00Z' }]) {
    const f = fixture(options)
    const before = JSON.stringify(f.db)
    const module = { exports: {} }
    vm.runInNewContext(readFileSync(filename, 'utf8'), {
      module, exports: module.exports, process, console, Buffer, Request,
      require(name) {
        if (name === '../supabase') return f.supabase
        if (name === 'dotenv') return { config() {} }
        if (name === '../services/duration' || name === '../services/exif') return {}
        return realRequire(name)
      },
    }, { filename })
    const route = module.exports.stack.find(layer => layer.route?.path === '/:token/stories' && layer.route.methods.post).route
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this }, json() { return this } }
    await route.stack[0].handle({ params: { token: 'invite-token' }, body: { contributor_token: 'owner', client_story_id: 'draft-1', title: 'Bypass attempt', body: 'Changed text' } }, response)
    assert.equal(response.statusCode, 403)
    assert.equal(JSON.stringify(f.db), before)
  }
})
