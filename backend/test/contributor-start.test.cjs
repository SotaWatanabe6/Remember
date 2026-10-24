const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const { createClient } = require('@supabase/supabase-js')

// Starting a contribution must honour the same invite limits as validating the
// link: inactive, expired and used-up invitations create no contributor.
function fixture(invite = {}) {
  const db = {
    invite_links: [{
      id: 'invite', token: 'invite-token', link_type: 'contribute', memorial_id: 'memorial',
      is_active: true, expires_at: null, max_uses: null, use_count: 0, ...invite,
    }],
    contributors: [],
  }
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const supabase = createClient('https://start-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options = {}) => {
      const url = new URL(input)
      const method = options.method || 'GET'
      const table = url.pathname.split('/').pop()
      assert.ok(db[table], `Unexpected request: ${method} ${url.pathname}`)
      let rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) =>
        !value.startsWith('eq.') || String(row[key]) === value.slice(3)))
      if (method === 'POST') {
        rows = [].concat(JSON.parse(options.body)).map((row, index) => ({ id: `contributor-${db[table].length + index}`, ...row }))
        db[table].push(...rows)
      }
      if (method === 'PATCH') rows.forEach((row) => Object.assign(row, JSON.parse(options.body)))
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

  async function start(body = { name: 'Jamie Lee' }) {
    const route = module.exports.stack.find((layer) => layer.route?.path === '/:token/start' && layer.route.methods.post).route
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(payload) { this.body = payload; return this } }
    await route.stack[0].handle({ params: { token: 'invite-token' }, body }, response)
    return response
  }
  return { db, start }
}

test('an active invitation starts a contributor with a secret session token', async () => {
  const f = fixture({ max_uses: 2, use_count: 1, expires_at: '2999-01-01T00:00:00Z' })
  const response = await f.start()
  assert.equal(response.statusCode, 201)
  assert.equal(f.db.contributors.length, 1)
  assert.match(response.body.contributor_token, /^[0-9a-f]{64}$/)
  assert.notEqual(response.body.contributor_token, response.body.contributor.id)
  assert.equal(f.db.invite_links[0].use_count, 2)
})

for (const [name, invite] of [
  ['inactive', { is_active: false }],
  ['expired', { expires_at: '2020-01-01T00:00:00Z' }],
  ['used up', { max_uses: 3, use_count: 3 }],
]) {
  test(`an ${name} invitation creates no contributor`, async () => {
    const f = fixture(invite)
    assert.equal((await f.start()).statusCode, 410)
    assert.equal(f.db.contributors.length, 0)
  })
}
