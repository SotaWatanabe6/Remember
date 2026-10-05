const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const { createClient } = require('@supabase/supabase-js')

// Contributor write routes must be authorized by the secret session token for
// this invitation, never by the contributor id, and must respect the
// post-submission lock. Runs against an in-memory fixture; no live data.
function fixture({ status = 'in_progress', submittedAt = null } = {}) {
  const db = {
    invite_links: [
      { id: 'invite', token: 'invite-token', link_type: 'contribute', memorial_id: 'memorial', is_active: true, expires_at: null },
      { id: 'share', token: 'share-token', link_type: 'share', memorial_id: 'memorial', is_active: true, expires_at: null },
    ],
    contributors: [
      { id: 'owner', name: 'Jane Doe', session_token: 'owner-session', memorial_id: 'memorial', status, submitted_at: submittedAt, is_anonymous: false, relationship_type: 'Friend', relationship_label: null },
    ],
    questionnaire_responses: [
      { id: 'answer', contributor_id: 'owner', memorial_id: 'memorial', order_index: 1, response_text: 'Original answer', approved_at: '2026-09-01T00:00:00Z' },
    ],
    media_assets: [
      { id: 'own-photo', contributor_id: 'owner', memorial_id: 'memorial', caption: 'Original caption' },
    ],
  }
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const supabase = createClient('https://session-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options = {}) => {
      const url = new URL(input)
      const method = options.method || 'GET'
      const table = url.pathname.split('/').pop()
      assert.ok(db[table], `Unexpected request: ${method} ${url.pathname}`)
      let rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) =>
        !value.startsWith('eq.') || String(row[key]) === value.slice(3)))
      if (method === 'POST') {
        const inserted = [].concat(JSON.parse(options.body))
        db[table].push(...inserted)
        rows = inserted
      }
      if (method === 'PATCH') rows.forEach((row) => Object.assign(row, JSON.parse(options.body)))
      if (method === 'DELETE') db[table] = db[table].filter((row) => !rows.includes(row))
      const headers = new Headers(options.headers)
      if (method !== 'GET' && !headers.get('prefer')?.includes('return=representation')) return new Response(null, { status: 204 })
      const fields = url.searchParams.get('select')
      if (fields && fields !== '*') rows = rows.map((row) => Object.fromEntries(fields.split(',').map((key) => [key.trim(), row[key.trim()]])))
      if (headers.get('accept')?.includes('vnd.pgrst.object')) {
        if (rows.length !== 1) return json({ message: 'Not found', code: 'PGRST116' }, 406)
        return json(rows[0])
      }
      return json(rows)
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

  async function call(method, routePath, { token = 'invite-token', contributorToken = 'owner-session', body = {}, params = {} } = {}) {
    const route = module.exports.stack.find((layer) => layer.route?.path === routePath && layer.route.methods[method]).route
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(payload) { this.body = payload; return this } }
    await route.stack[0].handle({ params: { token, ...params }, body: { contributor_token: contributorToken, ...body }, query: {} }, response)
    return response
  }
  return { db, call }
}

const writes = [
  ['post', '/:token/privacy', { body: { is_anonymous: true } }],
  ['post', '/:token/relationship', { body: { relationship_type: 'Colleague' } }],
  ['post', '/:token/responses', { body: { responses: [{ order_index: 1, question_text: 'Q', response_text: 'Rewritten' }] } }],
  ['patch', '/:token/photos/:assetId', { body: { caption: 'Rewritten' }, params: { assetId: 'own-photo' } }],
]

for (const [method, routePath, args] of writes) {
  test(`${routePath} succeeds with the contributor's session token`, async () => {
    const f = fixture()
    const response = await f.call(method, routePath, args)
    assert.ok(response.statusCode < 300, `status ${response.statusCode}: ${JSON.stringify(response.body)}`)
  })

  for (const [name, overrides, expected] of [
    ['the contributor id instead of the session token', { contributorToken: 'owner' }, 404],
    ['a missing session token', { contributorToken: null }, 400],
    ['a viewer share link', { token: 'share-token' }, 410],
  ]) {
    test(`${routePath} rejects ${name} without changing data`, async () => {
      const f = fixture()
      const before = JSON.stringify(f.db)
      assert.equal((await f.call(method, routePath, { ...args, ...overrides })).statusCode, expected)
      assert.equal(JSON.stringify(f.db), before)
    })
  }

  for (const options of [{ status: 'submitted', submittedAt: '2026-09-01T12:00:00Z' }, { status: 'approved' }]) {
    test(`${routePath} is locked for ${JSON.stringify(options)} contributions`, async () => {
      const f = fixture(options)
      const before = JSON.stringify(f.db)
      assert.equal((await f.call(method, routePath, args)).statusCode, 403)
      assert.equal(JSON.stringify(f.db), before)
    })
  }
}

test('an approved contributor cannot be moved back to submitted', async () => {
  const f = fixture({ status: 'approved' })
  assert.equal((await f.call('post', '/:token/submit')).statusCode, 403)
  assert.equal(f.db.contributors[0].status, 'approved')
})

test('privacy choice persists separately from the real name and resolves again after relationship selection', async () => {
  const f = fixture()
  const anonymous = await f.call('post', '/:token/privacy', { body: { is_anonymous: true } })
  assert.equal(anonymous.body.contributor.display_name, 'Friend')
  assert.equal(f.db.contributors[0].name, 'Jane Doe')
  const relationship = await f.call('post', '/:token/relationship', { body: { relationship_type: 'Family', relationship_label: 'Cousin' } })
  assert.equal(relationship.body.contributor.display_name, 'Cousin')
  const restored = await f.call('get', '/:token/privacy')
  assert.equal(restored.body.contributor.is_anonymous, true)
  assert.equal(restored.body.contributor.name, 'Jane Doe')
  assert.equal(restored.body.contributor.display_name, 'Cousin')
  assert.equal(restored.body.contributor.session_token, undefined)
  const named = await f.call('post', '/:token/privacy', { body: { is_anonymous: false } })
  assert.equal(named.body.contributor.display_name, 'Jane Doe')
})

test('restoring privacy is session-scoped and still works after submission', async () => {
  const f = fixture({ status: 'submitted', submittedAt: '2026-10-03T12:00:00Z' })
  assert.equal((await f.call('get', '/:token/privacy')).statusCode, 200)
  assert.equal((await f.call('get', '/:token/privacy', { contributorToken: 'owner' })).statusCode, 404)
  assert.equal((await f.call('get', '/:token/privacy', { contributorToken: null })).statusCode, 400)
  assert.equal((await f.call('get', '/:token/privacy', { token: 'share-token' })).statusCode, 410)
})

test('privacy requires an actual boolean without changing the draft', async () => {
  for (const value of ['true', 1, null, undefined]) {
    const f = fixture()
    const before = JSON.stringify(f.db)
    assert.equal((await f.call('post', '/:token/privacy', { body: { is_anonymous: value } })).statusCode, 400)
    assert.equal(JSON.stringify(f.db), before)
  }
})
