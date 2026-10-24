const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { Readable } = require('node:stream')
const { test } = require('node:test')
const vm = require('node:vm')

// Cover uploads are named and typed from the file's bytes, never from the
// client's file name or MIME type, and oversized files are refused.
function fixture() {
  const stored = []
  const supabase = {
    storage: {
      from(bucket) {
        return {
          async upload(storagePath, buffer, options) {
            stored.push({ bucket, storagePath, contentType: options.contentType, bytes: buffer.length })
            return { error: null }
          },
          async createSignedUrl(storagePath) {
            return { data: { signedUrl: `https://fixture.invalid/sign/${storagePath}` } }
          },
        }
      },
    },
  }
  const filename = path.resolve(__dirname, '../src/routes/memorials.js')
  const realRequire = createRequire(filename)
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, process, console, Buffer,
    require(name) {
      if (name === '../supabase') return supabase
      if (name === 'dotenv') return { config() {} }
      if (name === '../middleware/auth') return (req, res, next) => next()
      if (name === '../services/moderationReview') return { registerModerationReview() {}, getModerationItems() {} }
      if (name === '../services/storageUrls') return { enrichMemorialsForClient: async (_c, rows) => rows, enrichMemorialForClient: async (_c, row) => row }
      if (name === '../services/contributorHighlights') return { getContributorHighlights() {} }
      if (name === '../services/contributorPrivacy') return { withContributorDisplayNames: (v) => v, withOutputDisplayNames: (v) => v }
      return realRequire(name)
    },
  }, { filename })

  async function upload(bytes, fileName, type) {
    const form = new FormData()
    form.append('file', new Blob([bytes], { type }), fileName)
    const encoded = new Request('http://fixture.invalid', { method: 'POST', body: form })
    const body = Buffer.from(await encoded.arrayBuffer())
    const req = Readable.from([body])
    Object.assign(req, {
      method: 'POST',
      user: { id: 'organizer', sub: 'organizer' },
      headers: { 'content-type': encoded.headers.get('content-type'), 'content-length': String(body.length) },
    })
    const layer = module.exports.stack.find((candidate) => candidate.route?.path === '/cover-photo' && candidate.route.methods.post)
    const handler = layer.route.stack[layer.route.stack.length - 1].handle
    return new Promise((resolve) => {
      const response = {
        statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this },
        json(payload) { this.body = payload; resolve(this); return this },
      }
      handler(req, response)
    })
  }
  return { stored, upload }
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(1024)])

test('a cover is stored under the organizer folder with the extension and type of its bytes', async () => {
  const f = fixture()
  const response = await f.upload(PNG, 'portrait.html', 'text/html')
  assert.equal(response.statusCode, 201)
  assert.equal(f.stored.length, 1)
  assert.match(f.stored[0].storagePath, /^covers\/organizer\/\d+\.png$/)
  assert.equal(f.stored[0].contentType, 'image/png')
})

test('a file name cannot steer the storage path', async () => {
  const f = fixture()
  const response = await f.upload(PNG, 'x.png/../../other-user/evil', 'image/png')
  assert.equal(response.statusCode, 201)
  assert.match(f.stored[0].storagePath, /^covers\/organizer\/\d+\.png$/)
})

test('an SVG cover is rejected and never stored', async () => {
  const f = fixture()
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'.padEnd(1024))
  const response = await f.upload(svg, 'portrait.png', 'image/png')
  assert.equal(response.statusCode, 400)
  assert.equal(f.stored.length, 0)
})

test('a cover over 15 MB is refused with 413', async () => {
  const f = fixture()
  const response = await f.upload(Buffer.concat([PNG, Buffer.alloc(16 * 1024 * 1024)]), 'huge.png', 'image/png')
  assert.equal(response.statusCode, 413)
  assert.equal(f.stored.length, 0)
})
