const { createHash } = require('crypto')
const { synthesizeSpeech, isConfigured } = require('./elevenLabsTts')

const STORY_TTS_BUCKET =
  process.env.MEMORIAL_ASSETS_BUCKET ||
  process.env.STORAGE_BUCKET ||
  'memorial-assets'

function narrationTextForSlide(slide) {
  const quote = (slide.quote || slide.narration || '').trim()
  if (!quote) return ''
  if (slide.slide_type === 'voice_clip') return quote
  const matched = (slide.matched_quote || '').trim()
  if (matched && !quote.includes(matched)) {
    return `${quote} ${matched}`
  }
  return quote
}

function storagePathForSlide(memorialId, slide, index) {
  const seed = slide.photo_id || slide.order_index || index
  const hash = createHash('sha256').update(narrationTextForSlide(slide)).digest('hex').slice(0, 12)
  return `memorials/${memorialId}/story-narration/${seed}-${hash}.mp3`
}

/**
 * Pre-generate ElevenLabs narration MP3s for story slides and attach storage paths.
 */
async function attachNarrationAudioToSlides(supabase, memorialId, slides = []) {
  if (!isConfigured() || !slides.length) return slides

  const enriched = []
  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    const text = narrationTextForSlide(slide)
    if (!text) {
      enriched.push(slide)
      continue
    }

    try {
      const audioBuffer = await synthesizeSpeech(text)
      if (!audioBuffer?.length) {
        enriched.push(slide)
        continue
      }

      const storagePath = storagePathForSlide(memorialId, slide, index)
      const { error: uploadError } = await supabase.storage
        .from(STORY_TTS_BUCKET)
        .upload(storagePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        })

      if (uploadError) {
        console.error('[StoryTTS] upload failed:', storagePath, uploadError.message)
        enriched.push(slide)
        continue
      }

      enriched.push({
        ...slide,
        narration_audio_url: storagePath,
        narration_storage_bucket: STORY_TTS_BUCKET,
      })
    } catch (err) {
      console.error('[StoryTTS] slide', index, err.message)
      enriched.push(slide)
    }
  }

  return enriched
}

module.exports = {
  attachNarrationAudioToSlides,
  narrationTextForSlide,
  STORY_TTS_BUCKET,
}
