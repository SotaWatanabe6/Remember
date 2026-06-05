require('dotenv').config()

const DEFAULT_VOICE_ID = 'CbcSCAj3eHmU52Bu7tys'
const DEFAULT_MODEL = 'eleven_multilingual_v2'
const MAX_CHARS = 2500

function getVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
}

function isConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY && getVoiceId())
}

/**
 * Synthesize speech with ElevenLabs. Returns MP3 bytes or null if unavailable.
 */
async function synthesizeSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = getVoiceId()
  const trimmed = String(text || '').trim()

  if (!apiKey || !voiceId || !trimmed) return null
  if (trimmed.length > MAX_CHARS) {
    throw new Error(`Narration exceeds ${MAX_CHARS} characters`)
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL,
      voice_settings: {
        stability: Number(process.env.ELEVENLABS_STABILITY) || 0.45,
        similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY) || 0.8,
        style: Number(process.env.ELEVENLABS_STYLE) || 0.15,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${detail}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

module.exports = {
  synthesizeSpeech,
  isConfigured,
  getVoiceId,
}
