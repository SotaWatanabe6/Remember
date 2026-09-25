const test = require('node:test')
const assert = require('node:assert/strict')
const { extractMemoryNodes, matchMemoryPhotos, buildMemoryConstellation, photoEvidence } = require('../src/services/constellationMemories')
const { loadGenerationPhotos } = require('../src/services/generationPhotos')
const { resolveOutputMediaUrls } = require('../src/services/storageUrls')

const client = (reply) => ({ chat: { completions: { create: async (request) => ({
  choices: [{ message: { content: JSON.stringify(await reply(JSON.parse(request.messages[1].content), request.messages[0].content)) } }],
}) } } })
const contributors = [{ id: 'jonah', name: 'Jonah', relationship_type: 'grandchild' }]
const excerpt = 'She taught me to garden the summer I turned twelve.'
const responses = [{ id: 'answer-1', contributor_id: 'jonah', response_text: `She was patient. ${excerpt}` }]
const node = { id: 'memory-1', category: 'memory', summary: excerpt, contributor_name: 'Jonah', relationship_type: 'grandchild' }
const photo = (id, extra = {}) => ({ id, contributor_id: 'someone-else', storage_path: `${id}.jpg`, storage_bucket: 'family-photos', analysis: {
  scene: 'An adult and a child planting seedlings in a backyard garden.', setting: 'outdoor',
  photo_description: 'An adult kneels beside a child at a garden bed.', people_count: 2,
  subject_in_photo: null, estimated_year: 1980, subject_apparent_age: 40,
}, ...extra })
const candidate = (id, confidence = 0.9) => ({ photo_id: id, ...Object.fromEntries(['era', 'setting', 'people'].map((key) => [key, {
  verdict: 'match', confidence, evidence: `${key} agrees with the memory and visual analysis`,
}])) })

test('memory extraction keeps exact concrete source text and server-owned attribution', async () => {
  const nodes = await extractMemoryNodes({ subjectName: 'Robin', contributors, responses, client: client((input) => {
    assert.equal(input.answers[0].text, responses[0].response_text)
    return { memories: [
      { source_index: 0, excerpt, label: 'Learning to garden', contributor_id: 'invented' },
      { source_index: 0, excerpt, label: 'Duplicate' },
      { source_index: 0, excerpt: 'We cooked together.', label: 'Invented scene' },
      { source_index: 99, excerpt },
      { source_index: '0', excerpt },
    ] }
  }) })
  assert.equal(nodes.length, 1)
  assert.equal(nodes[0].summary, excerpt)
  assert.equal(nodes[0].source_response_id, 'answer-1')
  assert.equal(nodes[0].contributor_id, 'jonah')
  assert.equal(nodes[0].quotes[0].text, excerpt)
})

test('flagged and unknown sources are excluded; anonymous names stay private', async () => {
  const nodes = await extractMemoryNodes({ contributors: [{ ...contributors[0], is_anonymous: true }],
    responses: [...responses, { ...responses[0], is_flagged: true }, { ...responses[0], contributor_id: 'missing' }],
    client: client((input) => {
      assert.equal(input.answers.length, 1)
      return { memories: [{ source_index: 0, excerpt }] }
    }),
  })
  assert.equal(nodes[0].contributor_name, 'Anonymous')
  assert.equal(JSON.stringify(nodes).includes('Jonah'), false)
})

test('traits, unavailable AI and extraction errors never fabricate photo-derived memories', async () => {
  for (const ai of [undefined, client(() => ({ memories: [] })), client(() => { throw new Error('offline') })]) {
    const result = await buildMemoryConstellation({ responses, contributors, analyzedPhotos: [photo('p1')], client: ai })
    assert.deepEqual(result.nodes, [])
    assert.deepEqual(result.edges, [])
  }
})

test('one strong match may come from any uploader, with no answer or ownership linkage', async () => {
  const nodes = await matchMemoryPhotos({ nodes: [node], analyzedPhotos: [photo('p1')], client: client((input) => {
    assert.equal(input.photos[0].contributor_id, undefined)
    assert.equal(input.photos[0].questionnaire_response_id, undefined)
    assert.equal(input.memory.description, excerpt)
    assert.equal(input.photos[0].subject_apparent_age, 40)
    return { candidate: candidate('p1') }
  }) })
  assert.deepEqual(nodes[0].photo_ids, ['p1'])
  assert.equal(nodes[0].photo_urls[0].storage_bucket, 'family-photos')
  assert.equal(nodes[0].photo_match.score, 0.9)
})

test('wrong era, wrong activity/setting, or implausible people each veto a photo', async () => {
  for (const factor of ['era', 'setting', 'people']) {
    for (const verdict of ['unknown', 'contradiction']) {
      const match = candidate('p1')
      match[factor].verdict = verdict
      const [result] = await matchMemoryPhotos({ nodes: [node], analyzedPhotos: [photo('p1')], client: client(() => ({ candidate: match })) })
      assert.deepEqual(result.photo_ids, [], `${factor}: ${verdict}`)
      assert.equal(result.summary, excerpt)
      assert.equal(result.photo_match, null)
    }
  }
})

test('missing evidence, weak confidence, malformed values and invented IDs fail closed', async () => {
  const matches = [null, {}, candidate('foreign-photo'), candidate('p1', 0.79), candidate('p1', '0.99'), candidate('p1', 1.1),
    { ...candidate('p1'), era: { verdict: 'match', confidence: 0.99, evidence: '' } },
    { ...candidate('p1'), people: null },
  ]
  for (const match of matches) {
    const [result] = await matchMemoryPhotos({ nodes: [node], analyzedPhotos: [photo('p1')], client: client(() => ({ candidate: match })) })
    assert.deepEqual(result.photo_urls, [])
    assert.equal(result.photo_count, 0)
  }
})

test('empty/unusable pools and absent AI retain text-only nodes without calling AI', async () => {
  const unusable = [photo('flagged', { is_flagged: true }), photo('failed', { analysis: null }),
    photo('absent', { analysis: { subject_in_photo: false } }), photo('empty', { analysis: { people_count: 0 } }),
    photo('no-path', { storage_path: null })]
  for (const analyzedPhotos of [[], unusable]) {
    const [result] = await matchMemoryPhotos({ nodes: [node], analyzedPhotos, client: client(() => { assert.fail('No usable photos') }) })
    assert.equal(result.id, node.id)
    assert.deepEqual(result.photo_urls, [])
  }
  const [result] = await matchMemoryPhotos({ nodes: [node], analyzedPhotos: [photo('p1')] })
  assert.deepEqual(result.photo_ids, [])
})

test('pool beyond 60 photos is fully assessed and the strongest match wins', async () => {
  const photos = Array.from({ length: 61 }, (_, i) => photo(`p${i}`))
  const seen = []
  const [result] = await matchMemoryPhotos({ nodes: [node], analyzedPhotos: photos, client: client((input) => {
    seen.push(...input.photos.map((item) => item.photo_id))
    return { candidate: candidate(input.photos[0].photo_id, input.photos[0].photo_id === 'p60' ? 0.98 : 0.85) }
  }) })
  assert.deepEqual(seen, photos.map((item) => item.id))
  assert.deepEqual(result.photo_ids, ['p60'])
  assert.equal(result.photo_count, 1)
})

test('a failed later batch clears earlier selections instead of claiming an incomplete best match', async () => {
  for (const failure of [() => { throw new Error('offline') }, () => ({}), () => null]) {
    let calls = 0
    const [result] = await matchMemoryPhotos({ nodes: [node], analyzedPhotos: Array.from({ length: 21 }, (_, i) => photo(`p${i}`)),
      client: client(() => ++calls === 1 ? { candidate: candidate('p0') } : failure()),
    })
    assert.deepEqual(result.photo_urls, [])
  }
})

test('photo evidence retains explicit false identity rather than a legacy true value', () => {
  assert.equal(photoEvidence(photo('p1', { analysis: { subject_in_photo: false }, photo_identity: { deceased_present: true } })).subject_in_photo, false)
})

test('generated memories survive without photos and matching storage URLs use their own bucket', async () => {
  const input = { subjectName: 'Robin', contributors, responses, analyzedPhotos: [photo('p1')], client: client((input) =>
    input.answers ? { memories: [{ source_index: 0, excerpt }] } : { candidate: candidate('p1') }) }
  const constellation = await buildMemoryConstellation(input)
  assert.equal(constellation.version, 2)
  assert.equal(constellation.edges[0].target, constellation.nodes[0].id)
  const supabase = { storage: { from: (bucket) => ({ createSignedUrl: async (path) => ({ data: { signedUrl: `https://fixture.invalid/${bucket}/${path}` } }) }) } }
  const output = await resolveOutputMediaUrls(supabase, { constellation })
  assert.deepEqual(output.constellation.nodes[0].photo_urls, ['https://fixture.invalid/family-photos/p1.jpg'])
  const noPhotos = await buildMemoryConstellation({ ...input, analyzedPhotos: [] })
  assert.equal(noPhotos.nodes.length, 1)
  assert.deepEqual(noPhotos.nodes[0].photo_urls, [])
  assert.equal(noPhotos.edges.length, 1)
})

test('photo pagination is memorial/contributor scoped and tolerates server page limits', async () => {
  const all = Array.from({ length: 405 }, (_, i) => ({ id: `p${i}` }))
  const ranges = []
  const supabase = { from(table) {
    assert.equal(table, 'media_assets')
    return { select() { return this }, eq(key, value) { assert.equal(key, 'memorial_id'); assert.equal(value, 'm1'); return this },
      in(key, ids) { assert.equal(key, 'contributor_id'); assert.deepEqual(ids, ['c1']); return this }, order() { return this },
      async range(from, to) { ranges.push([from, to]); return { data: all.slice(from, Math.min(to + 1, from + 100)) } },
    }
  } }
  assert.deepEqual(await loadGenerationPhotos(supabase, 'm1', ['c1']), all)
  assert.equal(ranges.at(-1)[0], 405)
  assert.deepEqual(await loadGenerationPhotos({}, 'm1', []), [])
})

test('photo read errors abort rather than silently matching an incomplete pool', async () => {
  const query = { select() { return this }, eq() { return this }, in() { return this }, order() { return this }, range: async () => ({ error: new Error('read failed') }) }
  await assert.rejects(loadGenerationPhotos({ from: () => query }, 'm1', ['c1']), /read failed/)
})

test('generation route passes the full photo pool and answers through to saved memory output', async () => {
  const { readFileSync } = require('node:fs')
  const { createRequire } = require('node:module')
  const path = require('node:path')
  const vm = require('node:vm')
  const filename = path.resolve(__dirname, '../src/routes/ai.js')
  const realRequire = createRequire(filename)
  const photos = Array.from({ length: 61 }, (_, i) => photo(`p${i}`))
  const rows = { contributors, questionnaire_responses: responses, media_assets: photos, voice_recordings: [], memorials: { subject_name: 'Robin' } }
  let saved
  const supabase = {
    storage: { from: (bucket) => ({ createSignedUrl: async (path) => ({ data: { signedUrl: `https://fixture.invalid/${bucket}/${path}` } }) }) },
    from(table) {
      let mutation = false
      const query = {
        select() { return this }, eq() { return this }, in() { return this }, order() { return this }, single() { return this },
        update() { mutation = true; return this },
        insert(value) { if (table === 'ai_outputs') saved = value.output_json; mutation = true; return this },
        range(from, to) { return Promise.resolve({ data: rows[table].slice(from, to + 1) }) },
        then(resolve, reject) { return Promise.resolve({ data: mutation ? null : rows[table] }).then(resolve, reject) },
      }
      return query
    },
  }
  const services = {
    buildMemoryCorpus: () => '', extractThemes: async () => [], extractPhotoAlbumThemes: async () => [],
    analyzePhotoWithVision: async () => photo('fixture').analysis,
    assignPhotosToThemes: async (input) => input, composeStorySlideshow: async () => [],
    buildConstellationFromMemories: async (input) => {
      assert.equal(input.analyzedPhotos.length, 61)
      assert.equal(input.responses[0].response_text, responses[0].response_text)
      return buildMemoryConstellation({ ...input, client: client((request) => request.answers
        ? { memories: [{ source_index: 0, excerpt }] }
        : { candidate: request.photos.some((item) => item.photo_id === 'p60') ? candidate('p60') : null }) })
    },
  }
  const run = vm.runInNewContext(`${readFileSync(filename, 'utf8')}\nrunPipelines`, {
    module: { exports: {} }, console, process: { env: {} },
    require(name) {
      if (name === 'dotenv') return { config() {} }
      if (name === 'express') return { Router: () => ({ post() {}, get() {} }) }
      if (name === '../supabase') return supabase
      if (name === '../middleware/auth') return () => {}
      if (name === '../services/memorialGeneration') return services
      if (name === '../services/voiceProcessing') return {}
      return realRequire(name)
    },
  }, { filename })
  await run('m1', 'job1')
  assert.equal(saved.constellation.version, 2)
  assert.equal(saved.constellation.nodes[0].summary, excerpt)
  assert.deepEqual(saved.constellation.nodes[0].photo_ids, ['p60'])
  assert.deepEqual(saved.constellation.nodes[0].photo_urls, ['https://fixture.invalid/family-photos/p60.jpg'])
})
