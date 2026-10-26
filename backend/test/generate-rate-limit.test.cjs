const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

// Generation makes many paid OpenAI calls, so each organizer account may only
// start it a limited number of times per hour, independent of their IP.
function generateLimiter() {
  const filename = path.resolve(__dirname, '../src/routes/ai.js')
  const realRequire = createRequire(filename)
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, process, console, setTimeout, clearTimeout,
    require(name) {
      if (name === 'dotenv') return { config() {} }
      if (name === '../supabase') return {}
      if (name === '../middleware/auth') return (req, res, next) => next()
      return realRequire(name)
    },
  }, { filename })
  const route = module.exports.stack.find((layer) => layer.route?.path === '/memorials/:id/generate').route
  return route.stack[1].handle
}

function call(limiter, user, ip = '203.0.113.7') {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(key, value) { this.headers[key] = value }, getHeader() {},
      status(code) { this.statusCode = code; return this },
      json() { resolve(this.statusCode) }, send() { resolve(this.statusCode) },
    }
    limiter({ user: { sub: user }, ip, headers: {}, app: { get: () => false }, method: 'POST' }, res, () => resolve('allowed'))
  })
}

test('an organizer is limited to ten generation starts per hour', async () => {
  const limiter = generateLimiter()
  for (let i = 0; i < 10; i += 1) assert.equal(await call(limiter, 'organizer-a'), 'allowed')
  assert.equal(await call(limiter, 'organizer-a'), 429)
})

test('the limit follows the account, not the IP address', async () => {
  const limiter = generateLimiter()
  for (let i = 0; i < 10; i += 1) await call(limiter, 'organizer-a', `198.51.100.${i}`)
  assert.equal(await call(limiter, 'organizer-a', '192.0.2.1'), 429, 'switching IP does not reset the limit')
  assert.equal(await call(limiter, 'organizer-b', '198.51.100.1'), 'allowed', 'another organizer on the same IP is unaffected')
})
