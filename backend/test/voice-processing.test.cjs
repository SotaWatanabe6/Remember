const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const vm = require('node:vm')
const { buildTranscriptSegments } = require('../src/services/transcriptSegments')

test('provider word milliseconds become readable second-based lines', () => {
  assert.deepEqual(buildTranscriptSegments([
    { text: 'Every', start: 250, end: 500 }, { text: 'Sunday.', start: 600, end: 1200 },
    { text: 'Together', start: 1800, end: 2300 }, { text: 'again.', start: 2400, end: 3000 },
  ]), [{ start: 0.25, end: 1.2, text: 'Every Sunday.' }, { start: 1.8, end: 3, text: 'Together again.' }])
})

test('long speech and pauses produce bounded lines without losing words', () => {
  const words = Array.from({ length: 30 }, (_, i) => ({ text: `word${i}`, start: i * 500, end: i * 500 + 300 }))
  const result = buildTranscriptSegments(words)
  assert.ok(result.every((line) => line.text.split(' ').length <= 12 && line.end - line.start <= 8))
  assert.equal(result.map((line) => line.text).join(' '), words.map((word) => word.text).join(' '))
  assert.equal(buildTranscriptSegments([{ text: 'Before', start: 0, end: 500 }, { text: 'After', start: 2500, end: 3000 }]).length, 2)
})

test('absent or invalid provider timing is never fabricated', () => {
  for (const words of [null, [], [{ text: 'Text' }], [{ text: 'Text', start: null, end: 100 }], [{ text: 'Text', start: 100, end: 0 }]]) {
    assert.deepEqual(buildTranscriptSegments(words), [])
  }
})

function fixture({ withOpenAI = false, highlightFails = false, transcriptionFails = false, noKey = false } = {}) {
  const filename = path.resolve(__dirname, '../src/services/voiceProcessing.js')
  const realRequire = createRequire(filename)
  const module = { exports: {} }
  const requests = []
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, Buffer, console: { error() {} }, setTimeout,
    process: { env: { ...(!noKey ? { ASSEMBLYAI_API_KEY: 'fixture' } : {}), ...(withOpenAI ? { OPENAI_API_KEY: 'fixture' } : {}) } },
    require(name) {
      if (name === 'dotenv') return { config() {} }
      if (name === 'openai') return class { chat = { completions: { create: async () => {
        if (highlightFails) throw new Error('Highlight offline')
        return { choices: [{ message: { content: JSON.stringify({ key_quote: 'Sunday.', clip_start_seconds: 0, clip_end_seconds: 2 }) } }] }
      } } } }
      return realRequire(name)
    },
    fetch: async (url, options = {}) => {
      requests.push({ url, options })
      if (url.endsWith('/upload')) return { ok: true, json: async () => ({ upload_url: 'https://fixture/audio' }) }
      if (options.method === 'POST') return { ok: true, json: async () => ({ id: 'transcript' }) }
      return { ok: true, json: async () => transcriptionFails ? { status: 'error', error: 'Bad audio' } : {
        status: 'completed', text: 'Every Sunday.', words: [{ text: 'Every', start: 250, end: 500 }, { text: 'Sunday.', start: 600, end: 1200 }],
      } }
    },
  }, { filename })
  return { ...module.exports, requests }
}

test('timings survive highlight success, failure and missing OpenAI', async () => {
  for (const options of [{}, { withOpenAI: true }, { withOpenAI: true, highlightFails: true }]) {
    const f = fixture(options)
    const result = await f.processVoiceRecording({ fileBuffer: Buffer.from('audio'), subjectName: 'Robin' })
    assert.equal(result.transcript_text, 'Every Sunday.')
    assert.equal(JSON.stringify(result.transcript_segments), JSON.stringify([{ start: 0.25, end: 1.2, text: 'Every Sunday.' }]))
    assert.equal(JSON.parse(f.requests[1].options.body).speaker_labels, undefined)
  }
})

test('unavailable transcription returns safe empty timings', async () => {
  for (const options of [{ noKey: true }, { transcriptionFails: true }]) {
    const result = await fixture(options).processVoiceRecording({ fileBuffer: Buffer.from('audio') })
    assert.equal(result.transcript_text, null)
    assert.equal(result.transcript_segments.length, 0)
  }
})

async function generateFixture(recording, { fail = false, noKey = false, persistFails = false } = {}) {
  const filename = path.resolve(__dirname, '../src/routes/ai.js')
  const realRequire = createRequire(filename)
  const rows = {
    contributors: [{ id: 'person', name: 'Robin', relationship_type: 'Friend' }],
    questionnaire_responses: [], media_assets: [], voice_recordings: [{ contributor_id: 'person', storage_path: 'voice.wav', storage_bucket: 'audio', ...recording }],
    memorials: { subject_name: 'Alex' },
  }
  const calls = []
  const updates = []
  let saved
  const db = {
    storage: { from: () => ({
      download: async () => ({ data: { arrayBuffer: async () => Buffer.from('audio') } }),
      createSignedUrl: async () => ({ data: { signedUrl: 'https://fixture/audio.wav' } }),
    }) },
    from(table) {
      let update
      const query = {
        select() { return this }, eq() { return this }, in() { return this }, single() { return this }, order() { return this },
        update(value) { update = value; if (table === 'voice_recordings') updates.push(value); return this },
        insert(value) { if (table === 'ai_outputs') saved = value.output_json; return this },
        range() { return Promise.resolve({ data: [] }) },
        then(resolve, reject) {
          const data = update ? (table === 'voice_recordings' ? { ...rows.voice_recordings[0], ...update } : null) : rows[table]
          return Promise.resolve(persistFails && table === 'voice_recordings' && update ? { error: new Error('DB offline') } : { data }).then(resolve, reject)
        },
      }
      return query
    },
  }
  const transcript = { transcript_text: 'Every Sunday.', transcript_segments: [{ start: 0.25, end: 1.2, text: 'Every Sunday.' }] }
  const services = {
    buildMemoryCorpus: () => '', extractThemes: async () => [], extractPhotoAlbumThemes: async () => [],
    analyzePhotoWithVision: async () => null, assignPhotosToThemes: async (photos) => photos,
    composeStorySlideshow: async () => [], attachPhotosToMemoryNodes: (_photos, nodes) => nodes,
    attachContributorSummariesToMemoryNodes: async (nodes) => nodes,
    buildConstellationFromMemories: async () => ({ nodes: [], edges: [] }),
  }
  const run = vm.runInNewContext(`${readFileSync(filename, 'utf8')}\nrunPipelines`, {
    module: { exports: {} }, Buffer, console: { log() {}, error() {} }, process: { env: noKey ? {} : { ASSEMBLYAI_API_KEY: 'fixture' } },
    require(name) {
      if (name === 'dotenv') return { config() {} }
      if (name === 'express') return { Router: () => ({ post() {}, get() {} }) }
      if (name === '../supabase') return db
      if (name === '../middleware/auth') return () => {}
      if (name === '../services/memorialGeneration') return services
      if (name === '../services/voiceProcessing') return {
        async processVoiceRecording() { calls.push('process'); return fail ? { transcript_text: null } : { ...transcript, key_quote: 'Sunday.', ai_category: 'Sunday visits' } },
        async transcribeVoiceRecording() { calls.push('backfill'); if (fail) throw new Error('Provider offline'); return transcript },
      }
      return realRequire(name)
    },
  }, { filename })
  await run('memorial', 'job')
  return { voice: saved.voices[0], calls, updates }
}

test('generation persists and emits timed transcripts even without OpenAI', async () => {
  const result = await generateFixture({ id: 'new', duration_seconds: 10 })
  assert.deepEqual(result.calls, ['process'])
  assert.equal(result.updates[0].transcription_status, 'complete')
  assert.equal(result.voice.transcript_segments[0].start, 0.25)
  assert.equal(result.voice.duration_seconds, 10)
  assert.equal(result.voice.audio_url, 'https://fixture/audio.wav')
})

test('legacy timing backfill preserves selected highlights and clip metadata', async () => {
  const result = await generateFixture({ id: 'old', transcript_text: 'Old text', key_quote: 'Approved quote', ai_category: 'Family visits', ai_tags: { intro_line: 'Original intro', clip_start_seconds: 2, clip_end_seconds: 6 } })
  assert.deepEqual(result.calls, ['backfill'])
  assert.equal(result.updates[0].key_quote, undefined)
  assert.equal(result.updates[0].ai_tags, undefined)
  assert.equal(result.voice.key_quote, 'Approved quote')
  assert.equal(result.voice.clip_start_seconds, 2)
  assert.equal(result.voice.intro_line, 'Original intro')
  assert.equal(result.voice.transcript_segments.length, 1)
})

test('already timed recordings reuse their transcript without calling providers', async () => {
  const result = await generateFixture({ id: 'ready', transcript_text: 'Saved text', transcript_segments: [{ start: 0, end: 1, text: 'Saved text' }] })
  assert.deepEqual(result.calls, [])
  assert.deepEqual(result.updates, [])
  assert.equal(result.voice.transcript_segments[0].text, 'Saved text')
})

test('failed backfill, failed persistence and missing provider key preserve existing text', async () => {
  for (const options of [{ fail: true }, { persistFails: true }, { noKey: true }]) {
    const result = await generateFixture({ id: 'old', transcript_text: 'Original text', key_quote: 'Approved quote' }, options)
    assert.equal(result.voice.transcript_text, 'Original text')
    assert.equal(result.voice.key_quote, 'Approved quote')
    assert.equal(result.voice.transcript_segments.length, 0)
  }
})
