const assert = require('node:assert/strict')
const { test } = require('node:test')
const { GENERIC_ERROR_MESSAGE, sendInternalError, publicError, sendCaughtError } = require('../src/lib/httpErrors')

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
}

function quietly(fn) {
  const original = console.error
  const logged = []
  console.error = (...args) => logged.push(args.join(' '))
  try { fn() } finally { console.error = original }
  return logged
}

test('internal errors keep their status but hide the message from the client', () => {
  const res = response()
  const logged = quietly(() => sendInternalError(res, new Error('duplicate key value violates unique constraint "contributors_pkey"'), 400))
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, GENERIC_ERROR_MESSAGE)
  assert.match(logged[0], /contributors_pkey/)
})

test('caught errors default to a generic 500', () => {
  const res = response()
  quietly(() => sendCaughtError(res, new TypeError("Cannot read properties of undefined (reading 'id')")))
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.error, GENERIC_ERROR_MESSAGE)
})

test('errors raised for the user keep their status and message', () => {
  const res = response()
  sendCaughtError(res, publicError(413, 'This upload is too large.'))
  assert.equal(res.statusCode, 413)
  assert.equal(res.body.error, 'This upload is too large.')
})

test('a library error that happens to carry a status is still hidden', () => {
  const res = response()
  const error = Object.assign(new Error('Bucket not found: memorial-assets'), { status: 404 })
  quietly(() => sendCaughtError(res, error))
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.error, GENERIC_ERROR_MESSAGE)
})
