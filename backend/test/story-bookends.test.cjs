const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const vm = require('node:vm')
const { buildOpeningSlide } = require('../src/services/storyBookends')
const { resolveOutputMediaUrls } = require('../src/services/storageUrls')
const { addStoryBookends, buildQuoteCandidates } = require('../src/services/storyBookends')

function composer(create) {
  const filename = path.resolve(__dirname, '../src/services/memorialGeneration.js')
  const realRequire = createRequire(filename)
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, console,
    process: { env: create ? { OPENAI_API_KEY: 'fixture' } : {} },
    require(name) {
      if (name === 'dotenv') return { config() {} }
      if (name === 'openai') return class { chat = { completions: { create } } }
      return realRequire(name)
    },
  }, { filename })
  return module.exports.composeStorySlideshow
}

const memorial = { subject_name: 'Robin', cover_photo_url: 'cover/robin.jpg', date_of_birth: '1950-01-01', date_of_passing: '2026-02-03' }
const input = { memorial, subjectName: 'Robin', themes: [], analyzedPhotos: [], responses: [], contributors: [] }

test('opening contains organizer data only, with optional photo and dates', () => {
  assert.deepEqual(buildOpeningSlide(memorial), {
    id: 'story-opening', slide_type: 'opening', subject_name: 'Robin',
    photo_url: 'cover/robin.jpg', date_of_birth: '1950-01-01', date_of_passing: '2026-02-03',
  })
  assert.equal(buildOpeningSlide({ subject_name: 'Robin' }).photo_url, null)
})

test('no-photo memorial gets an opening without calling the model', async () => {
  const slides = await composer(() => { throw new Error('Must not call model') })(input)
  assert.equal(slides[0].slide_type, 'opening')
  assert.equal(slides[0].order_index, 1)
})

test('opening stays first when AI succeeds, fails, or is unavailable', async () => {
  for (const create of [undefined, async () => { throw new Error('offline') }, async (request) => {
    assert.equal(request.messages[0].content.includes('organizer_cover_'), false)
    return { choices: [{ message: { content: JSON.stringify({ slides: [{ slide_type: 'photo', photo_id: 'p1', chapter: 'who_they_were', photo_description: 'Robin taught us to sail.' }] }) } }] }
  }]) {
    const slides = await composer(create)({ ...input, analyzedPhotos: [{ id: 'p1', storage_path: 'photo.jpg', analysis: {} }] })
    assert.equal(slides[0].slide_type, 'opening')
    assert.equal(slides[0].photo_url, memorial.cover_photo_url)
    assert.equal(slides[0].matched_quote, undefined)
    assert.equal(slides[0].narration, undefined)
  }
})

test('opening cover supports the legacy cover bucket when signing output URLs', async () => {
  const supabase = { storage: { from: (bucket) => ({ createSignedUrl: async (path) => bucket === 'memorial_cover_photo'
    ? { data: { signedUrl: `https://fixture.invalid/${bucket}/${path}` } }
    : { error: { message: 'Not in this bucket' } } }) } }
  const output = await resolveOutputMediaUrls(supabase, { story: [buildOpeningSlide(memorial)] })
  assert.equal(output.story[0].photo_url, 'https://fixture.invalid/memorial_cover_photo/cover/robin.jpg')
})

const contributors = [{ id: 'c1', name: 'Jane', relationship_type: 'child' }]
const responses = [{ contributor_id: 'c1', question_id: 'child_6', response_text: 'I will carry your love of the sea with me.' }]
const selecting = (result) => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(result) } }] }) } } })

test('farewell reuses an exact closing sentence with source attribution', async () => {
  const slides = await addStoryBookends([], { memorial, contributors, responses, client: selecting({ farewell: 0 }) })
  const farewell = slides.at(-1)
  assert.equal(farewell.slide_type, 'farewell')
  assert.equal(farewell.farewell_message, responses[0].response_text)
  assert.equal(farewell.contributor_id, 'c1')
  assert.equal(farewell.contributor_name, 'Jane')
  assert.equal(farewell.date_of_passing, memorial.date_of_passing)
})

test('missing, invented, or invalid selections always use the fixed unattributed farewell', async () => {
  for (const client of [undefined, selecting({ farewell: null }), selecting({ farewell: 99 }), selecting({ farewell: -1 }), selecting({ farewell: '0' }), selecting({ farewell: 'A life well lived.' }), selecting({ farewell: 0.5 })]) {
    const slides = await addStoryBookends([], { memorial: {}, contributors, responses, client })
    assert.equal(slides.at(-1).farewell_message, 'In loving memory')
    assert.equal(slides.at(-1).contributor_name, null)
    assert.equal(slides.at(-1).date_of_passing, null)
  }
})

test('only known, unflagged contributors supply candidates; anonymous attribution stays anonymous', () => {
  const candidates = buildQuoteCandidates([
    ...responses,
    { ...responses[0], contributor_id: 'unknown' },
    { ...responses[0], is_flagged: true },
    { ...responses[0], response_text: 'I do not know. ' + 'word '.repeat(60) },
  ], [{ ...contributors[0], is_anonymous: true }])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].contributor_name, 'Anonymous')
  assert.ok(candidates.every((candidate) => candidate.text.length <= 320))
})

test('selection failure keeps a usable farewell', async () => {
  const client = { chat: { completions: { create: async () => { throw new Error('offline') } } } }
  const slides = await addStoryBookends([], { memorial, contributors, responses, client })
  assert.equal(slides.at(-1).farewell_message, 'In loving memory')
})
