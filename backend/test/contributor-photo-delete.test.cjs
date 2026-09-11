const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const { createClient } = require('@supabase/supabase-js')

// Exercise the real route and Supabase query serialization against a local
// in-memory HTTP fixture. No credentials, live records, or storage are used.
function fixture({ status = 'in_progress', submittedAt = null, active = true, storageFails = false } = {}) {
  const db = {
    invite_links: [{ id: 'invite', token: 'invite-token', memorial_id: 'memorial', is_active: active }],
    contributors: [
      { id: 'owner', memorial_id: 'memorial', status, submitted_at: submittedAt, photos_done: true },
      { id: 'outsider', memorial_id: 'other-memorial', status: 'in_progress', submitted_at: null },
    ],
    media_assets: [
      { id: 'own-photo', contributor_id: 'owner', memorial_id: 'memorial', storage_path: 'owner/photo.jpg', storage_bucket: 'photos' },
      { id: 'other-photo', contributor_id: 'someone-else', memorial_id: 'memorial', storage_path: 'other/photo.jpg', storage_bucket: 'photos' },
    ],
  }
  const removedFiles = []
  const mutations = []
  const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...headers },
  })
  const supabase = createClient('https://ns2-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options = {}) => {
      const url = new URL(input)
      const method = options.method || 'GET'
      if (url.pathname.startsWith('/storage/v1/object/sign/')) {
        return json({ signedURL: '/object/sign/photos/fixture.jpg?token=fixture' })
      }
      if (url.pathname === '/storage/v1/object/photos' && method === 'DELETE') {
        if (storageFails) return json({ message: 'Storage unavailable', statusCode: '503', error: 'Unavailable' }, 503)
        removedFiles.push(...JSON.parse(options.body).prefixes)
        return json([])
      }
      const table = url.pathname.split('/').pop()
      assert.ok(db[table], `Unexpected request: ${method} ${url.pathname}`)
      const rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) => {
        if (!value.startsWith('eq.')) return true
        return String(row[key]) === value.slice(3)
      }))
      if (method === 'DELETE') {
        mutations.push({ table, method })
        db[table] = db[table].filter((row) => !rows.includes(row))
        return new Response(null, { status: 204 })
      }
      if (method === 'PATCH') {
        mutations.push({ table, method })
        rows.forEach((row) => Object.assign(row, JSON.parse(options.body)))
        return new Response(null, { status: 204 })
      }
      if (method === 'HEAD') return new Response(null, { headers: { 'content-range': `0-0/${rows.length}` } })
      const fields = url.searchParams.get('select')
      const projected = rows.map((row) => fields && fields !== '*'
        ? Object.fromEntries(fields.split(',').map((key) => [key, row[key]])) : row)
      const single = new Headers(options.headers).get('accept')?.includes('vnd.pgrst.object')
      if (single && rows.length !== 1) return json({ message: 'Not found', code: 'PGRST116' }, 406)
      return json(single ? projected[0] : projected)
    } },
  })
  const filename = path.resolve(__dirname, '../src/routes/contribute.js')
  const realRequire = createRequire(filename)
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, process, console, Buffer, Request,
    require(name) {
      if (name === '../supabase') return supabase
      if (name === 'dotenv') return { config() {} }
      if (name === '../services/duration' || name === '../services/exif') return {}
      return realRequire(name)
    },
  }, { filename })

  async function call(method = 'delete', { assetId = 'own-photo', contributorToken = 'owner', token = 'invite-token' } = {}) {
    const routePath = method === 'get' ? '/:token/photos' : '/:token/photos/:assetId'
    const route = module.exports.stack.find((layer) => layer.route?.path === routePath && layer.route.methods[method]).route
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
    await route.stack[0].handle({ params: { token, assetId }, body: { contributor_token: contributorToken }, query: { contributor_token: contributorToken } }, response)
    return response
  }
  return { db, removedFiles, mutations, call }
}

test('draft photo deletion persists, keeps others, and resets the last-photo flag', async () => {
  const f = fixture()
  const response = await f.call()
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.deleted, true)
  assert.deepEqual(f.removedFiles, ['owner/photo.jpg'])
  assert.deepEqual(f.db.media_assets.map((photo) => photo.id), ['other-photo'])
  assert.equal(f.db.contributors[0].photos_done, false)
  const refreshed = await f.call('get')
  assert.equal(refreshed.body.photos.length, 0)
  assert.equal(refreshed.body.contributor.status, 'in_progress')
})

for (const status of ['submitted', 'approved', 'rejected', null]) {
  test(`cannot delete a photo when contributor status is ${status}`, async () => {
    const f = fixture({ status })
    assert.equal((await f.call()).statusCode, 403)
    assert.equal(f.removedFiles.length, 0)
    assert.equal(f.mutations.length, 0)
  })
}

test('a previous submission timestamp prevents deletion even if status was reset', async () => {
  const f = fixture({ submittedAt: '2026-09-11T12:00:00Z' })
  assert.equal((await f.call()).statusCode, 403)
  assert.equal(f.removedFiles.length, 0)
})

for (const [name, args, expected] of [
  ['another contributor photo', { assetId: 'other-photo' }, 404],
  ['another memorial contributor', { contributorToken: 'outsider' }, 404],
  ['missing contributor token', { contributorToken: null }, 400],
  ['missing photo', { assetId: 'missing' }, 404],
  ['invalid invitation', { token: 'invalid' }, 410],
]) {
  test(`rejects ${name} without deleting data`, async () => {
    const f = fixture()
    assert.equal((await f.call('delete', args)).statusCode, expected)
    assert.equal(f.removedFiles.length, 0)
    assert.equal(f.mutations.length, 0)
  })
}

test('inactive invitations cannot delete photos', async () => {
  const f = fixture({ active: false })
  assert.equal((await f.call()).statusCode, 410)
  assert.equal(f.removedFiles.length, 0)
})

test('storage failures preserve the database photo and progress flag', async () => {
  const f = fixture({ storageFails: true })
  assert.equal((await f.call()).statusCode, 400)
  assert.equal(f.db.media_assets.length, 2)
  assert.equal(f.db.contributors[0].photos_done, true)
  assert.equal(f.mutations.length, 0)
})

test('photo read exposes submitted state for redirecting the review page', async () => {
  const f = fixture({ status: 'submitted', submittedAt: '2026-09-11T12:00:00Z' })
  const response = await f.call('get')
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.contributor.status, 'submitted')
  assert.equal(response.body.photos.length, 1)
})
