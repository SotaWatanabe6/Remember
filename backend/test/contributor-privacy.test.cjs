const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const vm = require('node:vm')
const { createClient } = require('@supabase/supabase-js')
const { getContributorDisplayName, withContributorDisplayNames, withOutputDisplayNames } = require('../src/services/contributorPrivacy')

const people = [
  { id: 'anonymous-1', name: 'Jane Doe', is_anonymous: true, relationship_type: 'Family', relationship_label: 'Cousin', status: 'approved' },
  { id: 'anonymous-2', name: 'Jane Doe', is_anonymous: true, relationship_type: 'Friend', status: 'submitted' },
  { id: 'named', name: 'Sam Smith', is_anonymous: false, relationship_type: 'Colleague', status: 'approved' },
]

test('public identity resolves by relationship while stored organizer identity is untouched', () => {
  const before = structuredClone(people)
  const displayed = withContributorDisplayNames(people)
  assert.deepEqual(displayed.map((person) => person.display_name), ['Cousin', 'Friend', 'Sam Smith'])
  assert.deepEqual(displayed.map((person) => person.name), ['Cousin', 'Friend', 'Sam Smith'])
  assert.equal(getContributorDisplayName({ name: 'Private', is_anonymous: true, relationship_type: 'aunt_uncle' }), 'Aunt uncle')
  assert.equal(getContributorDisplayName({ name: 'Private', is_anonymous: true, relationship_label: '  ', relationship_type: '  ' }), 'Contributor')
  assert.equal(getContributorDisplayName(null), null)
  assert.deepEqual(people, before)
})

const saved = {
  story: [
    { contributor_id: 'anonymous-1', contributor_name: 'Jane Doe', matched_quote: 'She drove four hours to my game.' },
    { contributor_name: 'Jane Doe', photo_id: 'legacy-photo' },
    { slide_type: 'farewell', contributor_id: 'anonymous-2', contributor_name: 'Anonymous' },
    { slide_type: 'credits', contributors: people.map((person) => ({ contributor_id: person.id, contributor_name: person.name })) },
  ],
  constellation: { nodes: [{ id: 'anonymous-1', label: 'Jane Doe', name: 'Jane Doe', quotes: [{ contributor_id: 'anonymous-1', contributor_name: 'Jane Doe' }] }] },
  discovery_themes: [{ attributions: [{ contributor_id: 'anonymous-2', contributor_name: 'Jane Doe' }] }],
  relationships: [{ contributors: [{ contributor_id: 'anonymous-1', contributor_name: 'Jane Doe' }] }],
  voices: [{ contributor_id: 'named', contributor_name: 'Sam Smith' }],
  photos: { albums: [{ photos: [{ contributor_id: 'anonymous-2', contributor_name: 'Jane Doe' }] }] },
}

test('all saved output attributions use current display names, retaining distinct IDs and source text', () => {
  const before = structuredClone(saved)
  const output = withOutputDisplayNames(saved, people)
  assert.equal(JSON.stringify(output).includes('Jane Doe'), false)
  assert.equal(output.story[0].contributor_name, 'Cousin')
  assert.equal(output.story[0].matched_quote, saved.story[0].matched_quote)
  assert.equal(output.story[1].contributor_name, 'Contributor', 'ambiguous legacy name must not expose either identity')
  assert.equal(output.story[2].contributor_name, 'Friend')
  assert.deepEqual(output.story[3].contributors.map((person) => person.contributor_name), ['Cousin', 'Friend', 'Sam Smith'])
  assert.equal(output.constellation.nodes[0].label, 'Cousin')
  assert.equal(output.constellation.nodes[0].name, 'Cousin')
  assert.equal(output.photos.albums[0].photos[0].contributor_id, 'anonymous-2')
  assert.deepEqual(saved, before)
  assert.deepEqual(withOutputDisplayNames(output, people), output)
})

test('legacy outputs resolve anonymous labels without altering subject names or authored content', () => {
  const output = withOutputDisplayNames({
    story: [{ subject_name: 'Jane Doe', contributor_name: 'Anonymous', relationship_type: 'Friend', narration: 'Jane Doe told this story.' }],
  }, people)
  assert.equal(output.story[0].contributor_name, 'Friend')
  assert.equal(output.story[0].subject_name, 'Jane Doe')
  assert.equal(output.story[0].narration, 'Jane Doe told this story.')
})

function routerFixture(routeFile, { failContributors = false, output = saved } = {}) {
  const db = {
    invite_links: [{ id: 'share', token: 'share-token', memorial_id: 'memorial', link_type: 'share', is_active: true }],
    memorials: [{ id: 'memorial', user_id: 'organizer', subject_name: 'Robin', status: 'complete' }],
    contributors: [...people.map((person) => ({ ...person, memorial_id: 'memorial' })),
      { id: 'draft', name: 'Unsubmitted', status: 'in_progress', memorial_id: 'memorial' }],
    ai_outputs: [{ id: 'output', memorial_id: 'memorial', output_json: output }],
    contributor_stories: [], media_assets: [], voice_recordings: [], questionnaire_responses: [],
  }
  const signedPaths = []
  const supabase = createClient('https://privacy-fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input) => {
      const url = new URL(input)
      if (url.pathname.startsWith('/storage/v1/object/sign/')) {
        const objectPath = url.pathname.slice('/storage/v1/object/sign/'.length)
        signedPaths.push(objectPath)
        return Response.json({ signedURL: `/object/sign/${objectPath}?token=fresh` })
      }
      const table = url.pathname.split('/').pop()
      if (table === 'contributors' && failContributors) return Response.json({ message: 'offline' }, { status: 500 })
      const rows = db[table].filter((row) => [...url.searchParams].every(([key, value]) => {
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3)
        if (value.startsWith('in.')) return value.slice(4, -1).split(',').includes(row[key])
        return true
      }))
      const fields = url.searchParams.get('select')
      const selected = !fields || fields === '*' ? rows : rows.map((row) => Object.fromEntries(fields.split(',').map((key) => [key.trim(), row[key.trim()]])))
      return Response.json(['contributors', 'contributor_stories', 'media_assets', 'voice_recordings', 'questionnaire_responses'].includes(table) ? selected : selected[0])
    } },
  })
  const filename = path.resolve(__dirname, `../src/routes/${routeFile}.js`)
  const module = { exports: {} }
  const realRequire = createRequire(filename)
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, console, process,
    require(name) {
      if (name === '../supabase') return supabase
      if (name === '../middleware/auth') return (req, res, next) => next()
      if (name === 'dotenv') return { config() {} }
      return realRequire(name)
    },
  }, { filename })
  return { db, signedPaths, async call(routePath, params) {
    const route = module.exports.stack.find((layer) => layer.route?.path === routePath && layer.route.methods.get).route
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
    await route.stack.at(-1).handle({ params, user: { sub: 'organizer' } }, res)
    return res
  } }
}

test('share and memorial viewer endpoints mask nested stored output and never change organizer records', async () => {
  for (const [file, route, params] of [['share', '/:token', { token: 'share-token' }], ['memorials', '/:id/output', { id: 'memorial' }]]) {
    const fixture = routerFixture(file)
    const before = JSON.stringify(fixture.db)
    const res = await fixture.call(route, params)
    assert.equal(res.statusCode, 200)
    assert.equal(JSON.stringify(res.body).includes('Jane Doe'), false)
    assert.equal(JSON.stringify(res.body).includes('Unsubmitted'), false)
    assert.equal(res.body.contributor[0].display_name, 'Cousin')
    assert.equal(res.body.voices[0].contributor_name, 'Sam Smith')
    assert.equal(JSON.stringify(fixture.db), before)
  }
})

test('failed contributor lookup never returns unmasked saved output', async () => {
  for (const [file, route, params] of [['share', '/:token', { token: 'share-token' }], ['memorials', '/:id/output', { id: 'memorial' }]]) {
    const fixture = routerFixture(file, { failContributors: true })
    const res = await fixture.call(route, params)
    assert.ok(res.statusCode >= 400)
    assert.equal(res.body.story, undefined)
  }
})

test('both viewer endpoints renew saved photo URLs without rewriting output or anonymous attribution', async () => {
  const expired = 'https://privacy-fixture.invalid/storage/v1/object/sign/memorial-assets/old.jpg?token=expired'
  const output = { photos: { albums: [{ photos: [{ id: 'photo-1', contributor_id: 'anonymous-1', contributor_name: 'Jane Doe', url: expired }] }] } }
  for (const [file, route, params] of [['share', '/:token', { token: 'share-token' }], ['memorials', '/:id/output', { id: 'memorial' }]]) {
    const fixture = routerFixture(file, { output })
    const before = JSON.stringify(fixture.db)
    const res = await fixture.call(route, params)
    assert.equal(res.statusCode, 200)
    const photo = res.body.photos.albums[0].photos[0]
    assert.match(photo.url, /token=fresh$/)
    assert.equal(photo.contributor_name, 'Cousin')
    assert.deepEqual(fixture.signedPaths, ['memorial-assets/old.jpg'])
    assert.equal(JSON.stringify(fixture.db), before)
  }
})

test('share response resolves the memorial cover and renews saved media together without exposing private identity', async () => {
  const expired = 'https://privacy-fixture.invalid/storage/v1/object/sign/memorial-assets/old.jpg?token=expired'
  const output = { photos: { albums: [{ photos: [{ contributor_id: 'anonymous-1', contributor_name: 'Jane Doe', url: expired }] }] } }
  for (const cover of ['covers/robin.jpg', 'https://privacy-fixture.invalid/storage/v1/object/sign/memorial-assets/covers/robin.jpg?token=expired']) {
    const fixture = routerFixture('share', { output })
    fixture.db.memorials[0].cover_photo_url = cover
    const before = JSON.stringify(fixture.db)
    const res = await fixture.call('/:token', { token: 'share-token' })
    assert.equal(res.statusCode, 200)
    assert.match(res.body.memorial.cover_photo_url, /\/covers\/robin\.jpg\?token=fresh$/)
    assert.match(res.body.photos.albums[0].photos[0].url, /\/old\.jpg\?token=fresh$/)
    assert.equal(res.body.photos.albums[0].photos[0].contributor_name, 'Cousin')
    assert.equal(Object.hasOwn(res.body.memorial, 'user_id'), false)
    assert.equal(JSON.stringify(res.body).includes('Jane Doe'), false)
    assert.deepEqual(fixture.signedPaths, ['memorial-assets/old.jpg', 'memorial-assets/covers/robin.jpg'])
    assert.equal(JSON.stringify(fixture.db), before)
  }
})

test('an inactive share link cannot renew or return photo URLs', async () => {
  const fixture = routerFixture('share', { output: { photos: [{ photos: [{ url: 'private/photo.jpg' }] }] } })
  fixture.db.memorials[0].cover_photo_url = 'private/cover.jpg'
  fixture.db.invite_links[0].is_active = false
  const res = await fixture.call('/:token', { token: 'share-token' })
  assert.equal(res.statusCode, 410)
  assert.deepEqual(fixture.signedPaths, [])
  assert.equal(res.body.photos, undefined)
})

test('organizer contributor review still receives real names for anonymous contributions', async () => {
  const fixture = routerFixture('memorials')
  const res = await fixture.call('/:id/contributors', { id: 'memorial' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.contributors.slice(0, 3).map((person) => person.name), ['Jane Doe', 'Jane Doe', 'Sam Smith'])
  assert.equal(res.body.contributors[0].is_anonymous, true)
})
