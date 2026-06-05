require('dotenv').config()
const express = require('express')
const rateLimit = require('express-rate-limit')
const { synthesizeSpeech, isConfigured } = require('../services/elevenLabsTts')

const router = express.Router()

const ttsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.TTS_RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many narration requests. Please try again later.' },
})

// POST /tts/speak — ElevenLabs voiceover for story narration (API key stays on server)
router.post('/speak', ttsLimiter, async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim()
    if (!text) {
      return res.status(400).json({ error: 'text is required' })
    }

    if (!isConfigured()) {
      return res.status(503).json({ error: 'ElevenLabs voiceover is not configured on the server.' })
    }

    const audio = await synthesizeSpeech(text)
    if (!audio?.length) {
      return res.status(503).json({ error: 'Could not generate narration audio.' })
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    })
    res.send(audio)
  } catch (err) {
    console.error('[TTS]', err.message)
    res.status(500).json({ error: err.message || 'Voice synthesis failed' })
  }
})

module.exports = router
