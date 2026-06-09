require('dotenv').config()
const OpenAI = require('openai')
const { resolveQuestionPrompt } = require('../lib/questionnaireQuestions')

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const MAX_STORY_SLIDES = 12
const MIN_STORY_SLIDES = 5

function parseJson(content) {
  const clean = (content || '').replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

function trimToWords(text, maxWords) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ')}...`
}

function inferArcPhase(index, total) {
  if (index === 0) return 'beginning'
  if (index === total - 1) return 'closing'
  return 'middle'
}

function inferLifePeriod(photo, index, total) {
  const momentType = String(photo?.life_moment_type || '').toLowerCase()
  if (momentType.includes('child')) return 'Early life'
  if (momentType.includes('young') || momentType.includes('school')) return 'Early life'
  if (momentType.includes('work') || momentType.includes('caregiving') || momentType.includes('parent')) return 'Adulthood'
  if (momentType.includes('legacy') || momentType.includes('later')) return 'Later life'
  if (index === 0) return 'Early life'
  if (index === total - 1) return 'Legacy'
  return 'Adulthood'
}

function findResponseForContributor(responses, contributorId) {
  return (responses || []).find((r) => r.contributor_id === contributorId && r.response_text?.trim())
}

function balancePhotoCatalog(photoCatalog) {
  const groups = new Map()
  for (const photo of photoCatalog) {
    const key = photo.contributor_id || photo.contributor_name || 'unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(photo)
  }

  const balanced = []
  const buckets = [...groups.values()]
  let hasRemaining = true

  while (hasRemaining) {
    hasRemaining = false
    for (const bucket of buckets) {
      const next = bucket.shift()
      if (next) {
        balanced.push(next)
        hasRemaining = true
      }
    }
  }

  return balanced
}

function buildFallbackStorySlide(photo, index, total, responses, subjectName) {
  const response = findResponseForContributor(responses, photo.contributor_id)
  const sourceText = response?.response_text?.trim() || ''
  const scene = photo.scene && photo.scene !== 'unknown' ? photo.scene : ''
  const narration = sourceText
    ? trimToWords(sourceText, 45)
    : scene || `A shared moment from ${subjectName}'s life.`

  return {
    order_index: index + 1,
    slide_type: 'photo',
    arc_phase: inferArcPhase(index, total),
    life_period: inferLifePeriod(photo, index, total),
    photo_id: photo.photo_id,
    photo_url: photo.storage_path,
    quote: narration,
    narration,
    matched_quote: sourceText ? trimToWords(sourceText, 20) : null,
    contributor_name: photo.contributor_name,
    relationship_type: photo.relationship_type,
    theme_label: photo.theme_label,
  }
}

function completePhotoStorySlides(slides, photoCatalog, responses, subjectName) {
  const photoById = Object.fromEntries(photoCatalog.map((p) => [p.photo_id, p]))
  const seenPhotos = new Set()
  const targetCount = Math.min(photoCatalog.length, MAX_STORY_SLIDES)
  const requiredCount = Math.min(photoCatalog.length, MIN_STORY_SLIDES)
  const normalized = []

  for (const slide of slides || []) {
    const photo = photoById[slide.photo_id]
    if (!photo || seenPhotos.has(slide.photo_id)) continue
    seenPhotos.add(slide.photo_id)
    normalized.push({
      ...slide,
      order_index: normalized.length + 1,
      slide_type: 'photo',
      arc_phase: slide.arc_phase || inferArcPhase(normalized.length, targetCount),
      life_period: slide.life_period || inferLifePeriod(photo, normalized.length, targetCount),
      photo_id: slide.photo_id,
      photo_url: photo.storage_path,
      quote: slide.narration || slide.quote || '',
      narration: slide.narration || slide.quote || '',
      matched_quote: slide.matched_quote || null,
      contributor_name: slide.contributor_name || photo.contributor_name,
      relationship_type: slide.relationship_type || photo.relationship_type,
      theme_label: slide.theme_label || photo.theme_label,
    })
    if (normalized.length >= targetCount) break
  }

  for (const photo of photoCatalog) {
    if (normalized.length >= targetCount) break
    if (normalized.length >= requiredCount) break
    if (seenPhotos.has(photo.photo_id)) continue
    seenPhotos.add(photo.photo_id)
    normalized.push(buildFallbackStorySlide(photo, normalized.length, targetCount, responses, subjectName))
  }

  return normalized.map((slide, index) => ({
    ...slide,
    order_index: index + 1,
    arc_phase: inferArcPhase(index, normalized.length),
    life_period: slide.life_period || inferLifePeriod(photoById[slide.photo_id], index, normalized.length),
  }))
}

function buildMemoryCorpus(responses, contributors, subjectName, memorial) {
  const lines = []
  if (memorial?.biography?.trim()) {
    lines.push(`[Organizer biography]: ${memorial.biography.trim()}`)
  }

  const sorted = [...(responses || [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  )

  for (const response of sorted) {
    const text = response.response_text?.trim()
    if (!text) continue
    const contributor = contributors?.find((c) => c.id === response.contributor_id)
    const who = contributor?.name || 'A contributor'
    const rel = contributor?.relationship_type || 'someone who knew them'
    const question = resolveQuestionPrompt(response)
    lines.push(`[${who} (${rel}) — Q: ${question}]\n${text}`)
  }

  if (!lines.length) {
    return `No written questionnaire responses yet for ${subjectName}.`
  }

  return lines.join('\n\n')
}

async function extractThemes(responses, contributors, subjectName, memorial) {
  const memories = buildMemoryCorpus(responses, contributors, subjectName, memorial)

  if (!openai) {
    return [
      {
        id: 'theme_001',
        label: 'The warmth they carried',
        category: 'relationships',
        summary: `Contributors remembered how ${subjectName} made others feel.`,
        prominence_score: 0.9,
        matching_keywords: ['warm', 'feel', 'room', 'kind'],
        memory_anchors: ['how they made people feel'],
      },
    ]
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1400,
      messages: [{
        role: 'user',
        content: `You are preparing a memorial for ${subjectName}. Read the questionnaire memories below (raw words from family and friends). Extract 3–5 themes that are SPECIFIC to what was actually written — not generic words like "legacy" unless the text supports it.

Each theme must:
- Be grounded in real details, habits, stories, or feelings mentioned in the text
- Have a short evocative label (3–6 words) like a chapter title
- Include matching_keywords taken from actual phrases in the memories (5–10 words/phrases)
- Include memory_anchors: 1–3 short phrases quoting the *idea* of what people said (not necessarily verbatim)

Memories:
${memories}

Return JSON only:
{
  "themes": [
    {
      "id": "theme_001",
      "label": "...",
      "category": "personality|relationships|humor|values|daily_life",
      "summary": "2-3 sentences in warm prose summarizing this theme from the memories",
      "prominence_score": 0.0 to 1.0,
      "matching_keywords": ["phrase from text", "another"],
      "memory_anchors": ["anchor phrase"]
    }
  ]
}`,
      }],
    })
    const parsed = parseJson(completion.choices[0].message.content)
    return (parsed.themes || []).slice(0, 6)
  } catch (err) {
    console.error('[Themes] error:', err.message)
    throw err
  }
}

async function analyzePhotoWithVision(storageUrl, subjectName) {
  if (!openai) {
    return { scene: 'unknown', emotion: 'neutral', people_count: 0, setting: 'unknown', tags: [], visual_mood: '' }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: storageUrl, detail: 'high' },
          },
          {
            type: 'text',
            text: `This photo is part of a memorial for ${subjectName}. Describe what is happening visually and emotionally.

Return JSON only:
{
  "scene": "one sentence",
  "emotion": "dominant feeling in the image",
  "people_count": number,
  "setting": "indoor|outdoor|home|celebration|medical|nature|work|unknown",
  "tags": ["5-8 concrete visual tags: objects, activities, era hints, mood"],
  "visual_mood": "e.g. tender, joyful, quiet, bittersweet",
  "life_moment_type": "e.g. everyday_routine, celebration, caregiving, travel, childhood, gathering, portrait"
}`,
          },
        ],
      }],
    })
    return parseJson(response.choices[0].message.content)
  } catch (err) {
    console.error('[Vision] error:', err.message)
    return {
      scene: 'unknown',
      emotion: 'unknown',
      people_count: 0,
      setting: 'unknown',
      tags: [],
      visual_mood: '',
      life_moment_type: 'unknown',
    }
  }
}

async function assignPhotosToThemes(analyzedPhotos, themes, memories, subjectName) {
  if (!themes.length) return analyzedPhotos

  const photoSummaries = analyzedPhotos.map((p) => ({
    photo_id: p.id,
    contributor_id: p.contributor_id,
    scene: p.analysis?.scene || '',
    emotion: p.analysis?.emotion || '',
    tags: p.analysis?.tags || [],
    visual_mood: p.analysis?.visual_mood || '',
    life_moment_type: p.analysis?.life_moment_type || '',
  }))

  if (!openai) {
    return analyzedPhotos.map((p) => ({
      ...p,
      matched_theme_ids: [themes[0]?.id].filter(Boolean),
    }))
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `Match each photo to the best theme(s) for memorial ${subjectName}.

Themes (from questionnaire memories):
${JSON.stringify(themes.map((t) => ({
  id: t.id,
  label: t.label,
  summary: t.summary,
  keywords: t.matching_keywords,
  anchors: t.memory_anchors,
})), null, 2)}

Photos:
${JSON.stringify(photoSummaries, null, 2)}

Memory context (what people wrote):
${memories.slice(0, 6000)}

Rules:
- Each photo gets 1–2 theme ids that fit VISUALLY and EMOTIONALLY — not random
- A photo of a kitchen might fit "morning rituals" if memories mention coffee; a wedding photo fits celebration themes
- Do NOT assign all photos to the same theme unless they truly belong together
- Use life_moment_type and tags to align with memory_anchors

Return JSON only:
{ "assignments": [{ "photo_id": "uuid", "theme_ids": ["theme_001"], "reason": "brief" }] }`,
      }],
    })

    const parsed = parseJson(completion.choices[0].message.content)
    const byPhoto = Object.fromEntries(
      (parsed.assignments || []).map((a) => [a.photo_id, a.theme_ids || []]),
    )

    return analyzedPhotos.map((p) => {
      let ids = byPhoto[p.id] || []
      if (!ids.length && themes[0]) ids = [themes[0].id]
      return { ...p, matched_theme_ids: ids }
    })
  } catch (err) {
    console.error('[PhotoThemeAssign] error:', err.message)
    return analyzedPhotos.map((p) => ({
      ...p,
      matched_theme_ids: fallbackMatchPhotoToThemes(p.analysis, themes),
    }))
  }
}

function fallbackMatchPhotoToThemes(photoAnalysis, themes) {
  if (!photoAnalysis || !themes.length) return themes[0] ? [themes[0].id] : []
  const photoText = [
    photoAnalysis.scene,
    photoAnalysis.emotion,
    photoAnalysis.setting,
    photoAnalysis.visual_mood,
    photoAnalysis.life_moment_type,
    ...(photoAnalysis.tags || []),
  ]
    .join(' ')
    .toLowerCase()

  const scored = themes.map((theme) => {
    const keywords = [
      ...(theme.matching_keywords || []),
      ...(theme.memory_anchors || []),
      theme.label,
    ]
    const score = keywords.filter((kw) => photoText.includes(String(kw).toLowerCase())).length
    return { id: theme.id, score }
  })
  scored.sort((a, b) => b.score - a.score)
  if (scored[0]?.score > 0) return [scored[0].id]
  return [themes[0].id]
}

function buildVoiceStorySlides(voiceMoments = []) {
  return voiceMoments
    .filter((v) => v.intro_line && v.storage_path)
    .map((v, i) => ({
      order_index: 500 + i,
      slide_type: 'voice_clip',
      photo_id: null,
      photo_url: null,
      quote: v.intro_line,
      narration: v.intro_line,
      matched_quote: v.key_quote || null,
      audio_url: v.storage_path,
      storage_bucket: v.storage_bucket || null,
      clip_start_seconds: Number(v.clip_start_seconds) || 0,
      clip_end_seconds: Number(v.clip_end_seconds) || null,
      contributor_name: v.contributor_name || 'A contributor',
      contributor_title: v.contributor_title || null,
      relationship_type: v.relationship_type || '',
      theme_label: v.ai_category || 'Voice',
    }))
}

function interleaveVoiceSlides(photoSlides, voiceSlides) {
  if (!voiceSlides.length) return photoSlides
  if (!photoSlides.length) return voiceSlides

  const result = []
  let voiceIndex = 0
  const interval = Math.max(2, Math.floor(photoSlides.length / (voiceSlides.length + 1)))

  photoSlides.forEach((slide, index) => {
    result.push(slide)
    if ((index + 1) % interval === 0 && voiceIndex < voiceSlides.length) {
      result.push(voiceSlides[voiceIndex])
      voiceIndex += 1
    }
  })

  while (voiceIndex < voiceSlides.length) {
    result.push(voiceSlides[voiceIndex])
    voiceIndex += 1
  }

  return result.map((slide, index) => ({ ...slide, order_index: index + 1 }))
}

async function composeStorySlideshow({
  subjectName,
  memorial,
  themes,
  analyzedPhotos,
  responses,
  contributors,
}) {
  const memories = buildMemoryCorpus(responses, contributors, subjectName, memorial)

  const photoCatalog = balancePhotoCatalog(analyzedPhotos.map((p) => {
    const contributor = contributors?.find((c) => c.id === p.contributor_id)
    const theme = themes.find((t) => p.matched_theme_ids?.includes(t.id))
    return {
      photo_id: p.id,
      contributor_id: p.contributor_id,
      storage_path: p.storage_path,
      contributor_name: contributor?.name || 'A contributor',
      relationship_type: contributor?.relationship_type || '',
      theme_label: theme?.label || null,
      scene: p.analysis?.scene || '',
      visual_mood: p.analysis?.visual_mood || '',
      life_moment_type: p.analysis?.life_moment_type || '',
      tags: p.analysis?.tags || [],
    }
  }))

  if (!openai || !photoCatalog.length) {
    return completePhotoStorySlides([], photoCatalog, responses, subjectName)
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `You are the story editor for a memorial slideshow about ${subjectName}.

Create a linear photo-backed life story. Rules:
- Use only the facts present in the questionnaire memories, organizer biography, and photo descriptions.
- Do not invent named people, places, dates, medical details, relationships, achievements, or events.
- Every slide must use exactly one unique photo_id from the catalog. No duplicate photos.
- Every slide must pair that photo with narration and matched_quote.
- narration can be lightly written, but it must stay traceable to the source material.
- matched_quote must be verbatim or minimally trimmed from a contributor response, max 20 words. Do not paraphrase matched_quote.
- Sequence slides as a coherent beginning / middle / closing arc, not upload order.
- Use at least 3 life_period values when the material supports it, such as "Early life", "Adulthood", "Later life", "Legacy".
- Keep the emotional tone warm, human, and dignified.
- If multiple contributors and relationship types are available, avoid letting one contributor dominate more than 60% of slides.

Available photos (use each at most once; you may skip weak fits):
${JSON.stringify(photoCatalog, null, 2)}

Themes:
${JSON.stringify(themes.map((t) => ({ id: t.id, label: t.label, summary: t.summary })), null, 2)}

Questionnaire memories (your source material; quote only short exact phrases for matched_quote):
${memories}

Create ${Math.min(photoCatalog.length, MAX_STORY_SLIDES)} slides in a meaningful emotional order. If you cannot use every photo, still return at least ${Math.min(photoCatalog.length, MIN_STORY_SLIDES)} slides when that many photos are available. Prefer pairing each slide's photo with the memory that best resonates visually and emotionally.

Return JSON only:
{
  "slides": [
    {
      "order_index": 1,
      "arc_phase": "beginning|middle|closing",
      "life_period": "Early life|Adulthood|Later life|Legacy|Other supported period",
      "photo_id": "uuid from catalog",
      "theme_label": "theme label",
      "narration": "1-3 source-grounded sentences, 40-90 words max",
      "matched_quote": "short exact source phrase",
      "contributor_name": "source contributor for the quote",
      "relationship_type": "their relationship"
    }
  ]
}`,
      }],
    })

    const parsed = parseJson(completion.choices[0].message.content)
    const slides = parsed.slides || []
    const photoById = Object.fromEntries(photoCatalog.map((p) => [p.photo_id, p]))

    const photoSlides = slides
      .filter((s) => photoById[s.photo_id])
      .map((s, i) => {
        const photo = photoById[s.photo_id]
        return {
          order_index: s.order_index ?? i + 1,
          slide_type: 'photo',
          arc_phase: s.arc_phase || inferArcPhase(i, slides.length),
          life_period: s.life_period || inferLifePeriod(photo, i, slides.length),
          photo_id: s.photo_id,
          photo_url: photo.storage_path,
          quote: s.narration || s.quote || '',
          narration: s.narration || s.quote || '',
          matched_quote: s.matched_quote || null,
          contributor_name: s.contributor_name || photo.contributor_name,
          relationship_type: s.relationship_type || photo.relationship_type,
          theme_label: s.theme_label || photo.theme_label,
        }
      })

    return completePhotoStorySlides(photoSlides, photoCatalog, responses, subjectName)
  } catch (err) {
    console.error('[StoryCompose] error:', err.message)
    const fallbackPhoto = photoCatalog.map((p, i) => {
      const response = responses?.find((r) => {
        const c = contributors?.find((x) => x.id === r.contributor_id)
        return c?.name === p.contributor_name
      })
      return {
        order_index: i + 1,
        slide_type: 'photo',
        arc_phase: inferArcPhase(i, photoCatalog.length),
        life_period: inferLifePeriod(p, i, photoCatalog.length),
        photo_id: p.photo_id,
        photo_url: p.storage_path,
        quote: response?.response_text?.slice(0, 180) || p.scene || null,
        narration: response?.response_text?.slice(0, 180) || p.scene || null,
        matched_quote: response?.response_text ? trimToWords(response.response_text, 20) : null,
        contributor_name: p.contributor_name,
        relationship_type: p.relationship_type,
        theme_label: p.theme_label,
      }
    })
    return completePhotoStorySlides(fallbackPhoto, photoCatalog, responses, subjectName)
  }
}

async function composeThemeQuotes(theme, responses, contributors) {
  const relevant = (responses || []).filter((r) => {
    const text = (r.response_text || '').toLowerCase()
    const keywords = [
      ...(theme.matching_keywords || []),
      ...(theme.memory_anchors || []),
      theme.label,
    ]
    return keywords.some((kw) => text.includes(String(kw).toLowerCase()))
  })

  if (!relevant.length) {
    return []
  }

  if (!openai) {
    return relevant.slice(0, 3).map((r) => {
      const contributor = contributors?.find((c) => c.id === r.contributor_id)
      return {
        text: r.response_text?.slice(0, 200),
        contributor_id: r.contributor_id,
        contributor_name: contributor?.name || 'A contributor',
        relationship_type: contributor?.relationship_type || 'unknown',
      }
    })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Theme: "${theme.label}" — ${theme.summary}

Source responses:
${relevant.map((r) => {
  const c = contributors?.find((x) => x.id === r.contributor_id)
  return `[${c?.name || 'Contributor'}]: ${r.response_text}`
}).join('\n\n')}

Write 2–3 short quotes (max 35 words each) for a memorial constellation. Paraphrase in elevated prose — same meaning, not verbatim.

Return JSON: { "quotes": [{ "text": "...", "contributor_name": "...", "relationship_type": "..." }] }`,
      }],
    })
    const parsed = parseJson(completion.choices[0].message.content)
    return (parsed.quotes || []).slice(0, 3).map((q, i) => ({
      text: q.text,
      contributor_id: relevant[i]?.contributor_id,
      contributor_name: q.contributor_name || 'A contributor',
      relationship_type: q.relationship_type || 'unknown',
    }))
  } catch {
    return relevant.slice(0, 3).map((r) => {
      const contributor = contributors?.find((c) => c.id === r.contributor_id)
      return {
        text: r.response_text?.slice(0, 200),
        contributor_id: r.contributor_id,
        contributor_name: contributor?.name || 'A contributor',
        relationship_type: contributor?.relationship_type || 'unknown',
      }
    })
  }
}

module.exports = {
  buildMemoryCorpus,
  extractThemes,
  analyzePhotoWithVision,
  assignPhotosToThemes,
  composeStorySlideshow,
  composeThemeQuotes,
  fallbackMatchPhotoToThemes,
  buildVoiceStorySlides,
  interleaveVoiceSlides,
}
