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
  const farewell = slides.at(-2)
  assert.equal(farewell.slide_type, 'farewell')
  assert.equal(farewell.farewell_message, responses[0].response_text)
  assert.equal(farewell.contributor_id, 'c1')
  assert.equal(farewell.contributor_name, 'Jane')
  assert.equal(farewell.date_of_passing, memorial.date_of_passing)
})

test('missing, invented, or invalid selections always use the fixed unattributed farewell', async () => {
  for (const client of [undefined, selecting({ farewell: null }), selecting({ farewell: 99 }), selecting({ farewell: -1 }), selecting({ farewell: '0' }), selecting({ farewell: 'A life well lived.' }), selecting({ farewell: 0.5 })]) {
    const slides = await addStoryBookends([], { memorial: {}, contributors, responses, client })
    assert.equal(slides.at(-2).farewell_message, 'In loving memory')
    assert.equal(slides.at(-2).contributor_name, null)
    assert.equal(slides.at(-2).date_of_passing, null)
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
  assert.equal(slides.at(-2).farewell_message, 'In loving memory')
})

test('credits reuse Story then Voices quotes and list everyone once', async () => {
  const people = [...contributors, { id: 'c2', name: 'Sam', relationship_type: 'friend' }, { id: 'c3', name: 'Alex', relationship_type: 'colleague' }, contributors[0]]
  const story = [{ slide_type: 'photo', photo_url: 'photo.jpg', matched_quote: responses[0].response_text }]
  const voiceRecordings = [
    { contributor_id: 'c1', key_quote: 'A different voice quote.' },
    { contributor_id: 'c2', key_quote: 'Robin taught me to sail on the lake.' },
    { contributor_id: 'c2', key_quote: 'Another selected quote.' },
  ]
  const slides = await addStoryBookends(story, { memorial, responses, contributors: people, voiceRecordings })
  assert.deepEqual(slides.map((slide) => slide.slide_type), ['opening', 'photo', 'farewell', 'credits'])
  assert.deepEqual(slides.map((slide) => slide.order_index), [1, 2, 3, 4])
  const credits = slides.at(-1).contributors
  assert.equal(credits.length, 3)
  assert.equal(credits[0].quote, responses[0].response_text)
  assert.equal(credits[1].quote, voiceRecordings[1].key_quote)
  assert.equal(credits[2].quote, null)
  assert.equal(credits[2].relationship_type, 'colleague')
})

test('fallback selection only fills missing credits, with one source sentence per contributor', async () => {
  const people = [...contributors, { id: 'c2', name: 'Sam', relationship_type: 'friend' }]
  const answers = [...responses,
    { contributor_id: 'c2', response_text: 'Robin taught me to sail on the lake.' },
    { contributor_id: 'c2', response_text: 'Robin tied every knot with one hand.' },
  ]
  let requests = 0
  const client = { chat: { completions: { create: async (request) => {
    requests++
    const payload = JSON.parse(request.messages.at(-1).content)
    assert.deepEqual(payload.missing_quote_ids, ['c2'])
    return { choices: [{ message: { content: JSON.stringify({ farewell: null, credits: [0, 1, 2, 100, '1'] }) } }] }
  } } } }
  const slides = await addStoryBookends([], {
    memorial, responses: answers, contributors: people, client,
    voiceRecordings: [{ contributor_id: 'c1', key_quote: 'An upstream voice quote.' }],
  })
  assert.equal(requests, 1, 'farewell and missing credits use one selection pass')
  assert.equal(slides.at(-1).contributors[0].quote, 'An upstream voice quote.')
  assert.equal(slides.at(-1).contributors[1].quote, answers[1].response_text)
})

test('anonymous contributors remain distinct and ambiguous Story quotes are not misattributed', async () => {
  const people = ['c1', 'c2'].map((id) => ({ id, name: 'Private name', is_anonymous: true, relationship_type: 'family', relationship_label: 'Cousin' }))
  const answers = people.map((person) => ({ contributor_id: person.id, response_text: 'We planted tomatoes together every summer.' }))
  const slides = await addStoryBookends([{ matched_quote: answers[0].response_text, contributor_name: 'Anonymous' }], {
    memorial, contributors: people, responses: answers,
    voiceRecordings: [{ contributor_id: 'c1', key_quote: 'A selected voice quote.' }, { contributor_id: 'c2', key_quote: 'Flagged quote', is_flagged: true }],
  })
  const credits = slides.at(-1).contributors
  assert.equal(credits.length, 2)
  assert.ok(credits.every((credit) => credit.contributor_name === 'Anonymous' && credit.relationship_type === 'Cousin'))
  assert.equal(credits[0].quote, 'A selected voice quote.')
  assert.equal(credits[1].quote, null)
  assert.equal(JSON.stringify(slides).includes('Private name'), false)
})

test('empty memorial still ends in farewell followed by empty credits', async () => {
  const slides = await addStoryBookends([], { memorial: {} })
  assert.deepEqual(slides.map((slide) => slide.slide_type), ['opening', 'farewell', 'credits'])
  assert.deepEqual(slides.at(-1).contributors, [])
})
