const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

function fixture(status = 'collecting') {
  const memorials = [
    {
      id: 'memorial',
      user_id: 'organizer',
      status,
      subject_name: 'John Smith',
      biography: 'Original biography',
    },
  ]

  const supabase = {
    from(table) {
      assert.equal(table, 'memorials')
      let filters = []
      let patch = null

      const query = {
        select() { return query },
        update(value) { patch = value; return query },
        eq(field, value) { filters.push([field, value]); return query },
        async single() {
          const row = memorials.find((candidate) =>
            filters.every(([field, value]) => String(candidate[field]) === String(value)),
          )

          if (!row) return { data: null, error: { message: 'Not found' } }
          if (patch) Object.assign(row, patch)
          return { data: { ...row }, error: null }
        },
      }

      return query
    },
  }

  const filename = path.resolve(__dirname, '../src/routes/memorials.js')
  const realRequire = createRequire(filename)
  const module = { exports: {} }

  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module,
    exports: module.exports,
    process,
    console,
    Buffer,
    require(name) {
      if (name === '../supabase') return supabase
      if (name === 'dotenv') return { config() {} }
      if (name === '../middleware/auth') return (req, res, next) => next()
      if (name === '../services/moderationReview') {
        return { registerModerationReview() {}, getModerationItems() {} }
      }
      if (name === '../services/storageUrls') {
        return {
          enrichMemorialsForClient: async (_client, rows) => rows,
          enrichMemorialForClient: async (_client, row) => row,
        }
      }
      if (name === '../services/contributorHighlights') return { getContributorHighlights() {} }
      if (name === '../services/contributorPrivacy') {
        return { withContributorDisplayNames: (value) => value, withOutputDisplayNames: (value) => value }
      }
      return realRequire(name)
    },
  }, { filename })

  async function update(body, user = 'organizer') {
    const layer = module.exports.stack.find(
      (candidate) => candidate.route?.path === '/:id' && candidate.route.methods.patch,
    )
    const handler = layer.route.stack[layer.route.stack.length - 1].handle
    const response = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this },
      json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this },
    }

    await handler(
      { params: { id: 'memorial' }, body, user: { sub: user } },
      response,
    )
    return response
  }

  return { memorials, update }
}

test('organizer can edit memorial profile fields before generation completes', async () => {
  const f = fixture('collecting')
  const response = await f.update({
    subject_name: 'Jane Smith',
    biography: 'Updated biography',
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.memorial.subject_name, 'Jane Smith')
  assert.equal(f.memorials[0].biography, 'Updated biography')
  assert.ok(f.memorials[0].updated_at)
})

test('generated memorial profile is locked even for its organizer', async () => {
  const f = fixture('complete')
  const response = await f.update({ subject_name: 'Changed after generation' })

  assert.equal(response.statusCode, 409)
  assert.equal(response.body.code, 'memorial_profile_locked')
  assert.equal(f.memorials[0].subject_name, 'John Smith')
})

test('another organizer cannot edit the memorial profile', async () => {
  const f = fixture('collecting')
  const response = await f.update({ subject_name: 'Unauthorized edit' }, 'someone-else')

  assert.equal(response.statusCode, 403)
  assert.equal(f.memorials[0].subject_name, 'John Smith')
})
