const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

function generationServices(create) {
  const filename = path.resolve(__dirname, '../src/services/memorialGeneration.js')
  const module = { exports: {} }, realRequire = createRequire(filename)
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, console, process: { env: create ? { OPENAI_API_KEY: 'fixture' } : {} },
    require(name) {
      if (name === 'dotenv') return { config() {} }
      if (name === 'openai') return class { chat = { completions: { create } } }
      return realRequire(name)
    },
  }, { filename })
  return module.exports
}

function fixture({ answerFlag = false, photoFlag = false, blur = false, contributionFlag = false, writeError = null } = {}) {
  const db = {
    memorials: [{ id: 'm1', subject_name: 'Robin', status: 'generating' }],
    contributors: [{ id: 'c1', memorial_id: 'm1', name: 'Jonah', status: 'approved' }],
    questionnaire_responses: [{ id: 'r1', memorial_id: 'm1', contributor_id: 'c1', response_text: 'She taught me to garden when I was twelve.' }],
    media_assets: [{ id: 'p1', memorial_id: 'm1', contributor_id: 'c1', storage_path: 'p1.jpg' }, { id: 'p2', memorial_id: 'm1', contributor_id: 'c1', storage_path: 'p2.jpg' }],
    voice_recordings: [{ id: 'v1', memorial_id: 'm1', contributor_id: 'c1', storage_path: 'v1.wav', transcript_text: 'We gardened together.', key_quote: 'We gardened together.' }],
    ai_jobs: [{ id: 'j1', status: 'processing' }], ai_outputs: [],
  }
  const updates = [], downstream = [], calls = { answer: 0, photo: 0, contribution: 0 }
  const supabase = {
    storage: { from: () => ({ createSignedUrl: async file => ({ data: { signedUrl: `https://fixture.invalid/${file}` } }) }) },
    from(table) {
      const filters = []; let patch, inserted, one = false, from, to
      const query = {
        select() { return this }, order() { return this }, single() { one = true; return this },
        eq(key, value) { filters.push(row => row[key] === value); return this },
        in(key, values) { filters.push(row => values.includes(row[key])); return this },
        update(value) { patch = value; return this }, insert(value) { inserted = value; return this },
        range(a, b) { from = a; to = b; return this },
        then(resolve, reject) {
          if (patch && table === writeError) return Promise.resolve({ error: { message: 'missing moderation column' } }).then(resolve, reject)
          let rows = db[table].filter(row => filters.every(filter => filter(row)))
          if (from !== undefined) rows = rows.slice(from, to + 1)
          if (patch) { updates.push({ table, ids: rows.map(r => r.id), patch }); rows.forEach(row => Object.assign(row, patch)) }
          if (inserted) { db[table].push(inserted); rows = [inserted] }
          return Promise.resolve({ data: one ? rows[0] : rows }).then(resolve, reject)
        },
      }
      return query
    },
  }
  const realServices = generationServices(async request => ({ choices: [{ message: { content: JSON.stringify(
    request.messages[0].content.startsWith('Write Story') ? { slides: ['p1', 'p2'].map(photo_id => ({ slide_type: 'photo', photo_id, chapter: 'what_they_loved', photo_description: 'Robin taught us to garden.' })) } : { farewell: null, credits: [] }
  ) } }] }))
  const services = {
    ...realServices,
    moderateQuestionnaireResponse: async () => { calls.answer++; return { is_flagged: answerFlag, flagged_reason: 'Wrong question' } },
    moderateContribution: async () => { calls.contribution++; return { is_flagged: contributionFlag, flagged_reason: 'Wrong person' } },
    moderatePhotoContent: async () => { calls.photo++; return { is_flagged: photoFlag, flagged_reason: 'Explicit', is_blurry: blur, blur_reason: 'Subject unidentifiable' } },
    analyzePhotoWithVision: async () => ({ scene: 'garden', people_count: 1 }),
    extractPhotoAlbumThemes: async photos => { downstream.push(photos); return [{ id: 'garden', label: 'Garden' }] },
    assignPhotosToThemes: async photos => photos.map(p => ({ ...p, matched_theme_ids: ['garden'] })),
    buildConstellationFromMemories: async input => { downstream.push(input); return { version: 2, nodes: [], edges: [] } },
  }
  const filename = path.resolve(__dirname, '../src/routes/ai.js'), realRequire = createRequire(filename)
  const run = vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\nrunPipelines', {
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
  return { db, updates, downstream, calls, run: () => run('m1', 'j1') }
}

for (const [name, options, table] of [
  ['answer', { answerFlag: true }, 'questionnaire_responses'],
  ['photo', { photoFlag: true }, 'media_assets'],
  ['whole contribution', { contributionFlag: true }, 'contributors'],
]) test(`new ${name} concerns pause before any generation and keep sources`, async () => {
  const f = fixture(options); await f.run()
  assert.equal(f.db[table][0].is_flagged, true)
  assert.equal(f.db.ai_jobs[0].status, 'awaiting_review')
  assert.equal(f.db.memorials[0].status, 'collecting')
  assert.equal(f.db.ai_outputs.length, 0)
  assert.equal(f.downstream.length, 0)
  assert.equal(f.db.media_assets.length, 2)
  assert.equal(f.updates.filter(u => u.table === 'media_assets').length, 2, 'every photo result is persisted before matching')
})

test('severe blur excludes photos from Story but retains them in albums; mild blur stays in Story', async () => {
  for (const blur of [true, false]) {
    const f = fixture({ blur }); await f.run()
    const output = f.db.ai_outputs[0].output_json
    assert.equal(f.db.media_assets[0].is_blurry, blur)
    assert.equal(f.db.media_assets[0].is_flagged, false)
    assert.equal(output.story.filter(s => s.slide_type === 'photo').length, blur ? 0 : 2)
    assert.equal(output.photos.albums[0].photo_count, 2)
  }
})

test('approval overrides are not reflagged when generation resumes', async () => {
  const f = fixture({ answerFlag: true, photoFlag: true, contributionFlag: true })
  for (const table of ['contributors', 'questionnaire_responses', 'media_assets']) {
    f.db[table].forEach(row => Object.assign(row, { is_flagged: false, moderation_resolution: 'approved' }))
  }
  await f.run()
  assert.equal(f.calls.answer + f.calls.photo + f.calls.contribution, 0)
  assert.equal(f.db.ai_jobs[0].status, 'complete')
  assert.equal(f.db.ai_outputs[0].output_json.voices.length, 1)
})

test('excluded contributor cannot supply voice, photos, Story or credit quotes', async () => {
  const f = fixture({ answerFlag: true, contributionFlag: true })
  Object.assign(f.db.contributors[0], { is_flagged: true, moderation_resolution: 'excluded' })
  f.db.questionnaire_responses[0].is_flagged = true
  f.db.contributors.push({ id: 'c2', memorial_id: 'm1', name: 'Cousin', status: 'approved', moderation_resolution: 'approved' })
  await f.run()
  const output = f.db.ai_outputs[0].output_json
  assert.equal(output.voices.length, 0)
  assert.equal(output.story.find(s => s.slide_type === 'credits').contributors.length, 1)
  assert.equal(output.story.find(s => s.slide_type === 'credits').contributors[0].contributor_id, 'c2')
  assert.equal(output.photos.albums[0].photo_count, 0)
})

for (const table of ['questionnaire_responses', 'contributors', 'media_assets']) test(`failed ${table} moderation persistence never publishes`, async () => {
  const f = fixture({ answerFlag: table === 'questionnaire_responses', contributionFlag: table === 'contributors', writeError: table })
  await f.run()
  assert.equal(f.db.ai_outputs.length, 0)
  assert.equal(f.db.ai_jobs[0].status, 'failed')
  assert.match(f.db.ai_jobs[0].error_message, /Could not save moderation/)
})

test('moderation confidence varies with harm; unreadable/error cases require review', async () => {
  for (const [category, confidence, flagged] of [['violent', 0.4, true], ['disturbing', 0.4, true], ['sensitive', 0.4, true], ['wrong_subject', 0.4, false], ['wrong_subject', 0.8, true], ['off_topic', 0.8, true]]) {
    const service = generationServices(async () => ({ choices: [{ message: { content: JSON.stringify({ category, confidence, is_blurry: false }) } }] }))
    assert.equal((await service.moderatePhotoContent('photo', 'Robin')).is_flagged, flagged)
  }
  const service = generationServices(async () => { throw new Error('unreadable') })
  assert.equal((await service.moderatePhotoContent('photo', 'Robin')).is_flagged, true)
  assert.equal((await service.moderatePhotoContent(null, 'Robin')).is_flagged, true)
  await assert.rejects(service.moderateQuestionnaireResponse({ response_text: 'a memory' }, 'Robin'), /unavailable/)
})

test('malformed moderation decisions cannot silently approve content', async () => {
  for (const result of [{}, { category: 'unknown', confidence: 1 }, { category: 'none', confidence: '0.9' }, { category: 'none', confidence: 2 }]) {
    const service = generationServices(async () => ({ choices: [{ message: { content: JSON.stringify(result) } }] }))
    assert.equal((await service.moderatePhotoContent('photo', 'Robin')).is_flagged, true)
    await assert.rejects(service.moderateQuestionnaireResponse({ response_text: 'A memory' }, 'Robin'), /unavailable/)
    await assert.rejects(service.moderateContribution([{ contributor_id: 'c1', response_text: 'A memory' }], { id: 'c1' }, [], 'Robin'), /unavailable/)
  }
})

test('saved constellation merges the gardening example and attaches only each contributor’s own summary', async () => {
  const answers = ['She taught me to garden the summer I turned twelve.', 'She taught me and Jonah how to garden together that summer.']
  const responses = answers.map((response_text, i) => ({ id: `r${i}`, contributor_id: `c${i}`, response_text }))
  const contributors = [{ id: 'c0', name: 'Jonah', relationship_type: 'grandchild' }, { id: 'c1', name: 'Cousin', relationship_type: 'cousin' }]
  const summaries = []
  const services = generationServices(async request => {
    let result
    if (request.messages[0].role === 'system') {
      const input = JSON.parse(request.messages[1].content)
      result = input.answers ? { memories: answers.map((excerpt, source_index) => ({ source_index, excerpt, label: 'Learning to garden' })) } : { pairs: [{ a: 0, b: 1, who: 'match', action: 'match', setting: 'match' }] }
    } else {
      const prompt = request.messages[0].content
      const own = prompt.includes('as if Jonah') ? answers[0] : answers[1]
      const other = own === answers[0] ? answers[1] : answers[0]
      assert.equal(prompt.includes(other), false, 'another contributor’s account must never enter this summary prompt')
      summaries.push(own)
      result = { summary: own }
    }
    return { choices: [{ message: { content: JSON.stringify(result) } }] }
  })
  const output = await services.buildConstellationFromMemories({ contributors, responses, analyzedPhotos: [], subjectName: 'Robin' })
  assert.equal(output.nodes.length, 1)
  assert.equal(output.nodes[0].contributor_count, 2)
  assert.ok(output.nodes[0].prominence_score > 0.7)
  assert.deepEqual(Array.from(output.nodes[0].attributions, a => a.contributor_summary), answers)
  assert.equal(summaries.length, 2)
  assert.deepEqual(output.nodes[0].photo_ids, [])
})
