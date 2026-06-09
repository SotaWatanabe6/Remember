require('dotenv').config()
const OpenAI = require('openai')
const { toFile } = require('openai')

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

function parseJson(content) {
  const clean = (content || '').replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

/**
 * Transcribe contributor audio and extract a documentary-ready highlight clip.
 */
async function processVoiceRecording({ fileBuffer, mimeType, fileName, subjectName, contributorName }) {
  if (!openai || !fileBuffer?.length) {
    return {
      transcript_text: null,
      key_quote: null,
      intro_line: null,
      clip_start_seconds: 0,
      clip_end_seconds: null,
      ai_category: 'memory',
    }
  }

  let transcriptText = ''
  try {
    const file = await toFile(fileBuffer, fileName || 'recording.webm', { type: mimeType || 'audio/webm' })
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    })
    transcriptText = (transcription.text || '').trim()
  } catch (err) {
    console.error('[voice] whisper error:', err.message)
    return {
      transcript_text: null,
      key_quote: null,
      intro_line: null,
      clip_start_seconds: 0,
      clip_end_seconds: null,
      ai_category: 'memory',
      error: err.message,
    }
  }

  if (!transcriptText) {
    return {
      transcript_text: '',
      key_quote: null,
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
  "intro_line": "One short narrator line (max 12 words) the documentary host says BEFORE playing the clip, e.g. Grandma loved sunshine — inspired by the memo, not verbatim.",
  "key_quote": "The most memorable phrase from the memo (max 25 words, can be lightly edited for clarity)",
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
