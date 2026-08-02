require('dotenv').config()
const OpenAI = require('openai')

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || null
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2'
// AssemblyAI speech-to-text model tier: 'best' (highest accuracy, default
// behavior if omitted) or 'nano' (faster/cheaper, lower accuracy).
// Made explicit and env-overridable rather than relying on AssemblyAI's
// implicit default, so a model change is a config change, not a surprise.
const ASSEMBLYAI_SPEECH_MODEL = process.env.ASSEMBLYAI_SPEECH_MODEL || 'universal-2'
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes safety cap

function parseJson(content) {
  const clean = (content || '').replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Upload raw audio bytes to AssemblyAI and return the hosted upload URL
 * that the transcript endpoint needs.
 */
async function uploadAudioToAssemblyAI(fileBuffer) {
  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'content-type': 'application/octet-stream',
    },
    body: fileBuffer,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`AssemblyAI upload failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  if (!data.upload_url) {
    throw new Error('AssemblyAI upload did not return an upload_url')
  }
  return data.upload_url
}

/**
 * Submit a transcription job for the uploaded audio and poll until it
 * completes (or errors / times out).
 *
 * NOTE: diarization (speaker_labels) is intentionally not requested here.
 * This is plain single-track transcription only — diarization is on hold
 * pending a separate pass. See project notes.
 */
async function transcribeWithAssemblyAI(audioUrl) {
  const createResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ audio_url: audioUrl, speech_models: [ASSEMBLYAI_SPEECH_MODEL] }),
  })

  if (!createResponse.ok) {
    const text = await createResponse.text().catch(() => '')
    throw new Error(`AssemblyAI transcript request failed (${createResponse.status}): ${text}`)
  }

  const { id } = await createResponse.json()
  if (!id) {
    throw new Error('AssemblyAI transcript request did not return an id')
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    const pollResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${id}`, {
      headers: { authorization: ASSEMBLYAI_API_KEY },
    })

    if (!pollResponse.ok) {
      const text = await pollResponse.text().catch(() => '')
      throw new Error(`AssemblyAI polling failed (${pollResponse.status}): ${text}`)
    }

    const transcript = await pollResponse.json()

    if (transcript.status === 'completed') {
      return transcript.text || ''
    }

    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI transcription error: ${transcript.error}`)
    }

    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error('AssemblyAI transcription timed out')
}

/**
 * Transcribe contributor audio and extract a documentary-ready highlight clip.
 *
 * NOTE: `mimeType` and `fileName` are kept in the signature for backward
 * compatibility with callers (ai.js), but are no longer required by
 * AssemblyAI's raw-buffer upload endpoint.
 */
async function processVoiceRecording({ fileBuffer, mimeType, fileName, subjectName, contributorName }) {
  const emptyResult = {
    transcript_text: null,
    key_quote: null,
    intro_line: null,
    clip_start_seconds: 0,
    clip_end_seconds: null,
    ai_category: 'memory',
  }

  if (!ASSEMBLYAI_API_KEY || !fileBuffer?.length) {
    return emptyResult
  }

  let transcriptText = ''
  try {
    const uploadUrl = await uploadAudioToAssemblyAI(fileBuffer)
    transcriptText = (await transcribeWithAssemblyAI(uploadUrl)).trim()
  } catch (err) {
    console.error('[voice] assemblyai error:', err.message)
    return { ...emptyResult, error: err.message }
  }

  if (!transcriptText) {
    return { ...emptyResult, transcript_text: '' }
  }

  if (!openai) {
    return {
      transcript_text: transcriptText,
      key_quote: transcriptText.slice(0, 150),
      intro_line: null,
      clip_start_seconds: 0,
      clip_end_seconds: null,
      ai_category: 'memory',
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are editing a memorial documentary about ${subjectName}.
A contributor named ${contributorName || 'someone'} recorded this voice memo:

"${transcriptText}"

Return JSON only:
{
  "intro_line": "One short narrator line (max 12 words) naming something specific and concrete the contributor actually said — a habit, phrase, place, or detail. Never a generic label like 'A memory shared' or 'A cherished routine'. Example: 'Grandma always kept sunflowers on the porch.'",
  "key_quote": "The most memorable phrase from the memo, lightly polished only — fix spelling/filler words, never change vocabulary or wording (max 25 words)",
  "clip_start_seconds": number (start of the best 3-12 second excerpt),
  "clip_end_seconds": number (end of excerpt, must be after start and within memo length),
  "ai_category": "Everyday Love|Joy|Wisdom|Humor|memory"
}

Pick a natural spoken excerpt. If the memo is very short, use clip_start_seconds 0 and clip_end_seconds for the full length.`,
      }],
    })

    const parsed = parseJson(completion.choices[0].message.content)
    const start = Math.max(0, Number(parsed.clip_start_seconds) || 0)
    let end = Number(parsed.clip_end_seconds)
    if (!Number.isFinite(end) || end <= start) {
      end = Math.min(start + 10, start + 30)
    }

    return {
      transcript_text: transcriptText,
      key_quote: parsed.key_quote || transcriptText.slice(0, 150),
      intro_line: parsed.intro_line || null,
      clip_start_seconds: start,
      clip_end_seconds: end,
      ai_category: parsed.ai_category || 'memory',
    }
  } catch (err) {
    console.error('[voice] highlight error:', err.message)
    return {
      transcript_text: transcriptText,
      key_quote: transcriptText.slice(0, 150),
      intro_line: null,
      clip_start_seconds: 0,
      clip_end_seconds: 12,
      ai_category: 'memory',
    }
  }
}

module.exports = { processVoiceRecording }
