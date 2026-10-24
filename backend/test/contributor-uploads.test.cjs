const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { Readable } = require('node:stream')
const { test } = require('node:test')
const vm = require('node:vm')
const { createClient } = require('@supabase/supabase-js')

// Uploaded files must be stored with a content type derived on the server,
// never the browser-supplied one, so nothing can be served as SVG or HTML.
// Runs the real route against an in-memory fixture; no live storage is used.
function fixture() {
  const db = {
    invite_links: [{ id: 'invite', token: 'invite-token', link_type: 'contribute', memorial_id: 'memorial', is_active: true, expires_at: null }],
    contributors: [{ id: 'owner', session_token: 'owner-session', memorial_id: 'memorial', status: 'in_progress', submitted_at: null }],
    media_assets: [],
    voice_recordings: [],
  }
  const stored = []
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const supabase = createClient('https://upload-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options = {}) => {
      const url = new URL(input)
      const method = options.method || 'GET'
      if (url.pathname.startsWith('/storage/v1/object/')) {
        if (method === 'POST') {
          const headers = new Headers(options.headers)
          stored.push({ path: url.pathname, contentType: headers.get('content-type') })
          return json({ Key: url.pathname })
        }
        return json([])
      }
      const table = url.pathname.split('/').pop()
      assert.ok(db[table], `Unexpected request: ${method} ${url.pathname}`)
      let rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) =>
        !value.startsWith('eq.') || String(row[key]) === value.slice(3)))
      if (method === 'POST') {
        rows = [].concat(JSON.parse(options.body)).map((row, index) => ({ id: `${table}-${db[table].length + index}`, ...row }))
        db[table].push(...rows)
      }
      if (method === 'PATCH') rows.forEach((row) => Object.assign(row, JSON.parse(options.body)))
      if (method === 'HEAD') return new Response(null, { headers: { 'content-range': `0-0/${rows.length}` } })
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
      if (name === '../services/exif') return { extractImageMetadata: async () => null }
      if (name === '../services/duration') return { extractAudioDuration: async () => null }
      return realRequire(name)
    },
  }, { filename })

  async function upload(kind, fields) {
    const form = new FormData()
    form.append('contributor_token', 'owner-session')
    for (const [key, value] of fields) form.append(key, ...[].concat(value))
    const encoded = new Request('http://fixture.invalid', { method: 'POST', body: form })
    const req = Readable.from([Buffer.from(await encoded.arrayBuffer())])
    Object.assign(req, { method: 'POST', params: { token: 'invite-token' }, headers: { 'content-type': encoded.headers.get('content-type') } })
    return handle(kind, req)
  }

  async function handle(kind, req) {
    const route = module.exports.stack.find((layer) => layer.route?.path === `/:token/${kind}` && layer.route.methods.post).route
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(payload) { this.body = payload; return this } }
    await route.stack[0].handle(req, response)
    return response
  }
  return { db, stored, upload, handle }
}

const kb = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(2048)])
const JPEG = kb([0xff, 0xd8, 0xff, 0xe0])
const SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">${' '.repeat(2048)}</svg>`)

test('a real JPEG is stored as image/jpeg even when the browser claims another type', async () => {
  const f = fixture()
  const response = await f.upload('photos', [['files', [new Blob([JPEG], { type: 'image/png' }), 'holiday.png']]])
  assert.equal(response.statusCode, 201)
  assert.equal(f.stored[0].contentType, 'image/jpeg')
  assert.equal(f.db.media_assets[0].file_type, 'image/jpeg')
})

test('an SVG disguised as a PNG is rejected and never stored', async () => {
  const f = fixture()
  const response = await f.upload('photos', [['files', [new Blob([SVG], { type: 'image/svg+xml' }), 'innocent.png']]])
  assert.equal(response.statusCode, 400)
  assert.equal(f.stored.length, 0)
  assert.equal(f.db.media_assets.length, 0)
})

test('one disguised file does not block the genuine photos in the same batch', async () => {
  const f = fixture()
  const response = await f.upload('photos', [
    ['files', [new Blob([JPEG], { type: 'image/jpeg' }), 'one.jpg']],
    ['files', [new Blob([SVG], { type: 'image/png' }), 'two.png']],
  ])
  assert.equal(response.statusCode, 207)
  assert.equal(f.stored.length, 1)
  assert.equal(response.body.errors.length, 1)
  assert.equal(response.body.errors[0].file_name, 'two.png')
})

const AUDIO = kb([...Buffer.from('ID3'), 3, 0])

test('a voice recording is stored with the type of its allowed extension, not the browser type', async () => {
  const f = fixture()
  const response = await f.upload('voice', [['contributor_title', 'Birthday'], ['file', [new Blob([AUDIO], { type: 'text/html' }), 'birthday.mp3']]])
  assert.equal(response.statusCode, 201)
  assert.equal(f.stored[0].contentType, 'audio/mpeg')
  assert.equal(f.db.voice_recordings[0].file_type, 'audio/mpeg')
})

for (const [name, fileName, type] of [
  ['an HTML page labelled as audio', 'page.html', 'audio/mpeg'],
  ['an SVG labelled as audio', 'image.svg', 'audio/wav'],
  ['an unsupported audio extension', 'memo.aac', 'audio/aac'],
]) {
  test(`voice upload rejects ${name}`, async () => {
    const f = fixture()
    const response = await f.upload('voice', [['contributor_title', 'Memo'], ['file', [new Blob([AUDIO], { type }), fileName]]])
    assert.equal(response.statusCode, 400)
    assert.equal(f.stored.length, 0)
    assert.equal(f.db.voice_recordings.length, 0)
  })
}

const MB = 1024 * 1024
function multipartRequest(chunks, headers = {}) {
  const req = Readable.from(chunks)
  Object.assign(req, { method: 'POST', params: { token: 'invite-token' }, headers: { 'content-type': 'multipart/form-data; boundary=probe', ...headers } })
  return req
}

test('a request declaring a body over the cap is refused before it is read', async () => {
  const f = fixture()
  const req = multipartRequest([Buffer.alloc(16)], { 'content-length': String(500 * MB) })
  const response = await f.handle('photos', req)
  assert.equal(response.statusCode, 413)
  assert.equal(req.readableDidRead, false)
  assert.equal(f.stored.length, 0)
})

test('a streamed body that grows past the voice cap is cut off with 413', async () => {
  const f = fixture()
  let sentBytes = 0
  async function* oversized() {
    for (let i = 0; i < 60; i += 1) { sentBytes += MB; yield Buffer.alloc(MB) }
  }
  const response = await f.handle('voice', multipartRequest(oversized()))
  assert.equal(response.statusCode, 413)
  assert.ok(sentBytes < 60 * MB, 'stopped reading before the whole body arrived')
  assert.equal(f.stored.length, 0)
})
