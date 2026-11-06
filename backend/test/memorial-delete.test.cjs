const assert = require('node:assert/strict')
const { test } = require('node:test')
const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const { registerMemorialDeletion } = require('../src/services/memorialDeletion')

// Exercise real Supabase query serialization against an isolated HTTP fixture.
// There are no credentials or live records in these tests.
function fixture({ status = 'collecting', activeJob = false, sharedCover = false, storageFails = false, readFails = false, deleteFails = false, photoCount = 1 } = {}) {
  const cover = 'covers/organizer/1700000000000.png'
  const db = {
    memorials: [
      { id: 'memorial', user_id: 'organizer', status, cover_photo_url: cover },
      { id: 'other', user_id: 'other-organizer', status: 'complete', cover_photo_url: sharedCover ? `https://deletion-fixture.invalid/storage/v1/object/sign/memorial-assets/${cover}?token=other` : null },
    ],
    media_assets: [
      ...Array.from({ length: photoCount }, (_, i) => ({ id: `photo-${String(i).padStart(5, '0')}`, memorial_id: 'memorial', storage_bucket: 'photos', storage_path: `memorials/memorial/photos/${i}.jpg` })),
      { id: 'other-photo', memorial_id: 'other', storage_bucket: 'photos', storage_path: 'memorials/other/private.jpg' },
    ],
    voice_recordings: [{ id: 'voice', memorial_id: 'memorial', storage_bucket: 'audio', storage_path: 'memorials/memorial/voice/one.mp3' }],
    questionnaire_responses: [
      { id: 'answer', memorial_id: 'memorial', response_audio_url: 'https://deletion-fixture.invalid/storage/v1/object/sign/audio/memorials/memorial/voice/one.mp3?token=fixture' },
      { id: 'external', memorial_id: 'memorial', response_audio_url: 'https://external.invalid/private.mp3' },
      { id: 'other-reference', memorial_id: 'memorial', response_audio_url: 'https://deletion-fixture.invalid/storage/v1/object/sign/audio/memorials/other/private.mp3?token=fixture' },
    ],
    documents: [{ id: 'document', memorial_id: 'memorial', file_url: 'memorials/memorial/document.pdf' }],
    ai_jobs: activeJob ? [{ id: 'job', memorial_id: 'memorial', status: 'processing' }] : [],
    contributors: [{ id: 'person', memorial_id: 'memorial' }],
    invite_links: [{ id: 'share', memorial_id: 'memorial', link_type: 'share' }],
    ai_outputs: [{ id: 'output', memorial_id: 'memorial' }],
  }
  const requests = [], removals = []
  const settings = { storageFails, readFails, deleteFails }
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const supabase = createClient('https://deletion-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options = {}) => {
      const url = new URL(input), method = options.method || 'GET'
      requests.push({ url, method })
      if (url.pathname.startsWith('/storage/v1/object/')) {
        assert.equal(method, 'DELETE')
        const paths = JSON.parse(options.body).prefixes
        assert.ok(paths.length <= 1000)
        if (settings.storageFails) return json({ error: 'Unavailable', message: 'Private storage failure', statusCode: '503' }, 503)
        removals.push({ bucket: url.pathname.split('/').pop(), paths })
        return json([])
      }
      const table = url.pathname.split('/').pop()
      assert.ok(db[table], `Unexpected table ${table}`)
      if (settings.readFails && table === 'media_assets') return json({ message: 'Private database failure' }, 500)
      let rows = db[table].filter(row => [...url.searchParams].every(([field, value]) => {
        if (value.startsWith('eq.')) return String(row[field]) === value.slice(3)
        if (value.startsWith('neq.')) return String(row[field]) !== value.slice(4)
        if (value.startsWith('in.')) return value.slice(4, -1).split(',').includes(String(row[field]))
        return true
      }))
      if (method === 'DELETE') {
        assert.equal(table, 'memorials', 'Only the parent row is explicitly deleted')
        if (settings.deleteFails) return json({ message: 'Private delete failure' }, 500)
        db.memorials = db.memorials.filter(row => !rows.includes(row))
        // The actual schema's memorial_id foreign keys all use ON DELETE CASCADE.
        for (const [name, records] of Object.entries(db)) if (name !== 'memorials') db[name] = records.filter(row => !rows.some(parent => row.memorial_id === parent.id))
      }
      const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 1000)
      rows = rows.slice(offset, offset + limit)
      const fields = url.searchParams.get('select')
      const projected = rows.map(row => fields && fields !== '*' ? Object.fromEntries(fields.split(',').map(key => [key, row[key]])) : row)
      return json(projected)
    } },
  })
  const router = express.Router(), auth = (_req, _res, next) => next()
  registerMemorialDeletion(router, supabase, auth)
  const route = router.stack.find(layer => layer.route?.path === '/:id').route
  assert.equal(route.stack[0].handle, auth, 'Deletion requires auth middleware')
  async function remove(user = 'organizer', id = 'memorial') {
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
    await route.stack[1].handle({ params: { id }, user: { sub: user } }, response)
    return response
  }
  return { db, requests, removals, settings, remove }
}

for (const status of ['collecting', 'complete', null]) {
  test(`organizer can delete a ${status} memorial and its own files`, async () => {
    const f = fixture({ status })
    const response = await f.remove()
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.deleted, true)
    assert.deepEqual(f.db.memorials.map(row => row.id), ['other'])
    assert.equal(f.db.invite_links.length, 0)
    assert.equal(f.db.ai_outputs.length, 0)
    assert.equal(f.db.contributors.length, 0)
    assert.deepEqual(f.db.media_assets.map(row => row.id), ['other-photo'])
    assert.deepEqual(f.removals, [
      { bucket: 'photos', paths: ['memorials/memorial/photos/0.jpg'] },
      { bucket: 'audio', paths: ['memorials/memorial/voice/one.mp3'] },
      { bucket: 'memorial-assets', paths: ['memorials/memorial/document.pdf', 'covers/organizer/1700000000000.png'] },
    ])
    const deletion = f.requests.find(req => req.method === 'DELETE' && req.url.pathname.includes('/rest/'))
    assert.equal(deletion.url.searchParams.get('id'), 'eq.memorial')
    assert.equal(deletion.url.searchParams.get('user_id'), 'eq.organizer')
  })
}

test('another organizer cannot delete records or files', async () => {
  const f = fixture()
  assert.equal((await f.remove('someone-else')).statusCode, 403)
  assert.equal(f.removals.length, 0)
  assert.equal(f.requests.length, 1)
  assert.equal(f.db.memorials.length, 2)
})

test('a missing memorial cannot trigger file removal', async () => {
  const f = fixture()
  assert.equal((await f.remove('organizer', 'missing')).statusCode, 403)
  assert.equal(f.removals.length, 0)
})

for (const options of [{ status: 'generating' }, { activeJob: true }]) {
  test(`deletion is blocked during active generation: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options)
    assert.equal((await f.remove()).statusCode, 409)
    assert.equal(f.removals.length, 0)
    assert.equal(f.db.memorials.length, 2)
  })
}

test('a cover referenced by another memorial is retained, even with a different signed URL', async () => {
  const f = fixture({ sharedCover: true })
  assert.equal((await f.remove()).statusCode, 200)
  assert.ok(f.removals.every(group => !group.paths.some(path => path.startsWith('covers/'))))
})

test('file reads are paginated and storage deletion is batched', async () => {
  const f = fixture({ photoCount: 1003 })
  assert.equal((await f.remove()).statusCode, 200)
  assert.equal(f.removals.filter(group => group.bucket === 'photos').length, 2)
  assert.equal(f.removals.filter(group => group.bucket === 'photos').flatMap(group => group.paths).length, 1003)
})

test('failed file inventory leaves everything untouched', async () => {
  const f = fixture({ readFails: true })
  const response = await f.remove()
  assert.equal(response.statusCode, 500)
  assert.doesNotMatch(response.body.error, /Private/)
  assert.equal(f.removals.length, 0)
  assert.equal(f.db.memorials.length, 2)
})

test('storage failure preserves file references so deletion can be retried', async () => {
  const f = fixture({ storageFails: true })
  assert.equal((await f.remove()).statusCode, 500)
  assert.equal(f.db.memorials.length, 2)
  assert.equal(f.db.media_assets.length, 2)
  f.settings.storageFails = false
  assert.equal((await f.remove()).statusCode, 200)
})

test('database deletion failure can be retried after idempotent storage cleanup', async () => {
  const f = fixture({ deleteFails: true })
  assert.equal((await f.remove()).statusCode, 500)
  assert.equal(f.db.memorials.length, 2)
  f.settings.deleteFails = false
  assert.equal((await f.remove()).statusCode, 200)
})
