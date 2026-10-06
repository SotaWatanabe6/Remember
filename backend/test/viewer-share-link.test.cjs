const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const vm = require('node:vm')
const { createClient } = require('@supabase/supabase-js')

function shareFixture({ links = [], owner = 'organizer', failLookup = false } = {}) {
  const inserted = []
  let lookups = 0
  const supabase = createClient('https://viewer-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(input)
      const table = url.pathname.split('/').pop()
      const headers = new Headers(init.headers)
      if (table === 'memorials') {
        const authorized = url.searchParams.get('user_id') === `eq.${owner}`
        return Response.json(authorized ? { id: 'm1' } : null)
      }
      if (init.method === 'POST') {
        const link = { ...JSON.parse(init.body), created_at: new Date().toISOString() }
        inserted.push(link)
        links.push(link)
        return Response.json(link, { status: 201 })
      }
      lookups += 1
      if (failLookup) return Response.json({ message: 'Unavailable' }, { status: 500 })
      const now = new Date(url.searchParams.get('or').match(/expires_at\.gt\.([^)]*)/)[1])
      const rows = links.filter(link => link.memorial_id === 'm1' && link.link_type === 'share' && link.is_active && (!link.expires_at || new Date(link.expires_at) > now))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 1)
        .map(({ token }) => ({ token }))
      return Response.json(headers.get('accept')?.includes('object') ? rows[0] ?? null : rows)
    } },
  })
  const filename = path.resolve(__dirname, '../src/routes/memorials.js')
  const module = { exports: {} }
  const realRequire = createRequire(filename)
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, console,
    process: { env: { NEXT_PUBLIC_APP_URL: 'https://remember.example' } },
    require(name) {
      if (name === '../supabase') return supabase
      if (name === '../middleware/auth') return (req, res, next) => next()
      if (name === 'dotenv') return { config() {} }
      return realRequire(name)
    },
  }, { filename })
  return { inserted, get lookups() { return lookups }, async call() {
    const route = module.exports.stack.find(layer => layer.route?.path === '/:id/share' && layer.route.methods.post).route
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
    await route.stack.at(-1).handle({ params: { id: 'm1' }, user: { sub: 'organizer' } }, res)
    return res
  } }
}

const active = { token: 'active-token', memorial_id: 'm1', link_type: 'share', is_active: true, expires_at: null, created_at: '2026-01-01' }

test('View Memorial and Share reuse the latest active public link', async () => {
  const fixture = shareFixture({ links: [{ ...active, token: 'older', created_at: '2025-01-01' }, active] })
  const first = await fixture.call()
  const second = await fixture.call()
  assert.equal(first.statusCode, 200)
  assert.equal(first.body.share_link.url, 'https://remember.example/share/active-token')
  assert.deepEqual(second.body, first.body)
  assert.equal(fixture.inserted.length, 0)
})

test('expired, disabled, contributor, and other memorial links are never reused', async () => {
  const fixture = shareFixture({ links: [
    { ...active, expires_at: '2020-01-01' },
    { ...active, is_active: false },
    { ...active, link_type: 'contribute' },
    { ...active, memorial_id: 'other' },
  ] })
  const first = await fixture.call()
  assert.equal(first.statusCode, 201)
  assert.equal(fixture.inserted.length, 1)
  assert.equal(fixture.inserted[0].link_type, 'share')
  assert.equal(fixture.inserted[0].created_by, 'organizer')
  assert.notEqual(first.body.share_link.token, active.token)
  const second = await fixture.call()
  assert.deepEqual(second.body, first.body)
  assert.equal(fixture.inserted.length, 1)
})

test('a future expiry remains reusable and ownership is checked before any link lookup', async () => {
  const fixture = shareFixture({ links: [{ ...active, expires_at: '2099-01-01' }] })
  assert.equal((await fixture.call()).body.share_link.token, 'active-token')
  const denied = shareFixture({ links: [active], owner: 'someone-else' })
  assert.equal((await denied.call()).statusCode, 403)
  assert.equal(denied.lookups, 0)
  assert.equal(denied.inserted.length, 0)
})

test('a failed lookup reports an error instead of generating another link', async () => {
  const fixture = shareFixture({ failLookup: true })
  assert.equal((await fixture.call()).statusCode, 500)
  assert.equal(fixture.inserted.length, 0)
})
