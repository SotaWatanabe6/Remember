require('dotenv').config()
const OpenAI = require('openai')
const { resolveQuestionPrompt } = require('../lib/questionnaireQuestions')

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const MAX_STORY_SLIDES = 20

function parseJson(content) {
  const clean = (content || '').replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

function resolvePhotoYear(photo) {
  if (photo?.taken_at) {
    const year = new Date(photo.taken_at).getFullYear()
    if (Number.isFinite(year) && year > 1800 && year < 2100) return String(year)
  }
  const estimated = Number(photo?.analysis?.estimated_year)
  if (Number.isFinite(estimated) && estimated > 1800 && estimated < 2100) {
    return String(Math.round(estimated))
  }
  return null
}

function resolvePhotoEraLabel(photo) {
  const explicit = photo?.analysis?.estimated_era_label
  if (explicit && typeof explicit === 'string') return explicit.trim()
  const year = resolvePhotoYear(photo)
  return year || null
}

const LIFE_STAGE_MID_AGE = {
  infancy: 1,
  early_childhood: 5,
  childhood: 9,
  pre_teen: 12,
  teenager: 16,
  young_adult: 22,
  twenties: 25,
  thirties: 35,
  forties: 45,
  fifties: 55,
  sixties: 65,
  seventies: 75,
  eighties: 85,
  nineties: 92,
  elderly: 80,
  unknown: null,
}

function resolveMemorialBirthYear(memorial) {
  if (!memorial?.date_of_birth) return null
  const year = parseInt(String(memorial.date_of_birth).split('-')[0], 10)
  return Number.isFinite(year) && year > 1800 && year < 2100 ? year : null
}

function resolveSubjectApparentAge(photo) {
  const flatAge = Number(photo?.subject_apparent_age)
  if (Number.isFinite(flatAge) && flatAge > 0 && flatAge < 120) return Math.round(flatAge)
  const age = Number(photo?.analysis?.subject_apparent_age)
  if (Number.isFinite(age) && age > 0 && age < 120) return Math.round(age)
  const stage = photo?.subject_life_stage || photo?.analysis?.subject_life_stage
  if (stage && LIFE_STAGE_MID_AGE[stage] != null) return LIFE_STAGE_MID_AGE[stage]
  return null
}

function resolveChronologicalSortKey(photo, memorial = null) {
  const presetKey = Number(photo?.chronological_sort_key)
  if (Number.isFinite(presetKey) && presetKey < 9999) return presetKey

  const year = Number(resolvePhotoYear(photo))
  if (Number.isFinite(year) && year > 1800 && year < 2100) return year

  const birthYear = resolveMemorialBirthYear(memorial)
  const apparentAge = resolveSubjectApparentAge(photo)
  if (birthYear && apparentAge != null) return birthYear + apparentAge

  const rank = Number(photo?.analysis?.chronological_rank)
  if (Number.isFinite(rank) && rank > 0 && rank <= 100) return rank

  const stageAge = LIFE_STAGE_MID_AGE[photo?.analysis?.subject_life_stage]
  if (birthYear && stageAge != null) return birthYear + stageAge
  if (stageAge != null) return stageAge

  return 9999
}

function chronologicalSortKey(photo, memorial = null) {
  return resolveChronologicalSortKey(photo, memorial)
}

function sortPhotosChronologically(photos = [], memorial = null) {
  return [...photos].sort((a, b) => {
    const keyA = resolveChronologicalSortKey(a, memorial)
    const keyB = resolveChronologicalSortKey(b, memorial)
    if (keyA !== keyB) return keyA - keyB
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
}

function selectStoryPhotoCatalog(photoCatalog = []) {
  if (photoCatalog.length <= MAX_STORY_SLIDES) return photoCatalog

  const selected = new Map()
  const lastIndex = photoCatalog.length - 1

  for (let i = 0; i < MAX_STORY_SLIDES; i += 1) {
    const index = Math.round((i * lastIndex) / (MAX_STORY_SLIDES - 1))
    const photo = photoCatalog[index]
    if (photo?.photo_id) selected.set(photo.photo_id, photo)
  }

  for (const photo of photoCatalog) {
    if (selected.size >= MAX_STORY_SLIDES) break
    if (photo?.photo_id && !selected.has(photo.photo_id)) {
      selected.set(photo.photo_id, photo)
    }
  }

  return [...selected.values()].sort((a, b) => {
    const keyA = Number(a.chronological_sort_key) || 9999
    const keyB = Number(b.chronological_sort_key) || 9999
    if (keyA !== keyB) return keyA - keyB
    return String(a.photo_id || '').localeCompare(String(b.photo_id || ''))
  })
}

function sortSlidesChronologically(slides = [], photoById = {}, memorial = null) {
  return [...slides].sort((a, b) => {
    const photoA = photoById[a.photo_id] || {}
    const photoB = photoById[b.photo_id] || {}
    const keyA = Number(a.chronological_sort_key) || resolveChronologicalSortKey(photoA, memorial)
    const keyB = Number(b.chronological_sort_key) || resolveChronologicalSortKey(photoB, memorial)
    if (keyA !== keyB) return keyA - keyB
    return (a.order_index ?? 0) - (b.order_index ?? 0)
  })
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

function formatMemorialDate(value) {
  if (!value) return null
  // Split the date string directly to avoid UTC midnight timezone shift
  const parts = String(value).split('T')[0].split('-')
  if (parts.length < 3) return String(value)
  const [year, month, day] = parts.map(Number)
  if (!year || !month || !day) return String(value)
  const date = new Date(year, month - 1, day) // month - 1 because JS months are 0-indexed
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildMemorialFacts(memorial, subjectName) {
  const birth = formatMemorialDate(memorial?.date_of_birth)
  const passing = formatMemorialDate(memorial?.date_of_passing)
  const nickname = memorial?.nickname?.trim()
  const biography = memorial?.biography?.trim()
  const relatedPeople = Array.isArray(memorial?.related_people) ? memorial.related_people : []

  const lines = []
  if (birth && passing) {
    lines.push(`${subjectName} was born on ${birth} and passed away on ${passing}.`)
  } else if (birth) {
    lines.push(`${subjectName} was born on ${birth}.`)
  } else if (passing) {
    lines.push(`${subjectName} passed away on ${passing}.`)
  }
  if (nickname) {
    lines.push(`Those closest to ${subjectName} often called them ${nickname}.`)
  }
  if (biography) lines.push(biography)
  for (const person of relatedPeople.slice(0, 6)) {
    if (person?.name && person?.relationship) {
      lines.push(`${person.name} (${person.relationship}) was part of ${subjectName}'s life.`)
    }
  }

  return lines.join(' ')
}

function buildContributorPerspectiveContext(responses, contributors, subjectName) {
  const contributorById = new Map((contributors || []).map((c) => [c.id, c]))
  const grouped = new Map()

  for (const response of responses || []) {
    const text = response.response_text?.trim()
    if (!text) continue
    const contributor = contributorById.get(response.contributor_id)
    if (!contributor) continue
    const key = contributor.relationship_type || 'loved_one'
    if (!grouped.has(key)) grouped.set(key, new Map())
    const people = grouped.get(key)
    if (!people.has(contributor.id)) {
      people.set(contributor.id, {
        contributor_id: contributor.id,
        contributor_name: contributor.name,
        relationship_type: key,
        relationship_label: contributor.relationship_label || null,
        memories: [],
      })
    }
    people.get(contributor.id).memories.push({
      question: resolveQuestionPrompt(response),
      text,
    })
  }

  return Array.from(grouped.entries()).map(([relationshipType, peopleMap]) => ({
    relationship_type: relationshipType,
    perspective_audience_hint: `To ${subjectName}'s ${relationshipType.replace(/_/g, ' ')}`,
    contributors: Array.from(peopleMap.values()),
  }))
}

function buildLifeChapterContext(themes, responses, contributors) {
  return (themes || []).slice(0, 6).map((theme) => {
    const keywords = [
      ...(theme.matching_keywords || []),
      ...(theme.memory_anchors || []),
      theme.label,
    ].map((kw) => String(kw).toLowerCase())

    const memories = (responses || [])
      .filter((response) => {
        const text = (response.response_text || '').toLowerCase()
        return keywords.some((kw) => kw && text.includes(kw))
      })
      .slice(0, 5)
      .map((response) => {
        const contributor = contributors?.find((c) => c.id === response.contributor_id)
        return {
          contributor_name: contributor?.name || 'A contributor',
          relationship_type: contributor?.relationship_type || '',
          text: response.response_text?.trim(),
          question: resolveQuestionPrompt(response),
        }
      })

    return {
      theme_id: theme.id,
      title: theme.label,
      category: theme.category,
      summary: theme.summary,
      memories,
    }
  })
}

function ensureBiographicalBookends(slides, { subjectName, memorial }) {
  const result = [...slides]
  const hasIntro = result.some((s) => s.slide_type === 'intro')
  const hasClosing = result.some((s) => s.slide_type === 'closing')

  if (!hasIntro) {
    const facts = buildMemorialFacts(memorial, subjectName)
    result.unshift({
      slide_type: 'intro',
      photo_id: null,
      photo_url: null,
      photo_description: facts || `${subjectName}'s life, remembered.`,
      narration: null,
      order_index: 0,
    })
  }

  if (!hasClosing) {
    result.push({
      slide_type: 'closing',
      photo_id: null,
      photo_url: null,
      photo_description: `${subjectName} left a mark on everyone who knew them.`,
      narration: 'A life worth remembering.',
      order_index: result.length,
    })
  }

  return result
}

function applyStorySlidePolicies(slides, memorial) {
  return slides.map((slide) => {
    if (slide.slide_type === 'intro') {
      return {
        ...slide,
        photo_id: null,
        photo_url: memorial?.cover_photo_url || slide.photo_url || null,
      }
    }
    if (slide.slide_type === 'closing') {
      return {
        ...slide,
        photo_id: null,
        photo_url: null,
      }
    }
    return slide
  })
}

function finalizeBiographicalSlideshow(slides, { memorial, voiceSlides }) {
  let storySlides = applyStorySlidePolicies(slides, memorial)
  storySlides = storySlides.map((slide, index) => ({ ...slide, order_index: index + 1 }))
  return interleaveVoiceSlides(storySlides, voiceSlides)
}

/** Constellation discovery themes — from questionnaire only, no inference. */
async function extractThemes(responses, contributors, subjectName, memorial) {
  const memories = buildMemoryCorpus(responses, contributors, subjectName, memorial)

  if (!openai) {
    return [
      {
        id: 'theme_001',
        label: 'How she spent her mornings',
        category: 'daily_life',
        summary: `Contributors described parts of ${subjectName}'s daily routine.`,
        prominence_score: 0.9,
        matching_keywords: ['morning', 'coffee', 'routine'],
        memory_anchors: ['daily routine'],
      },
    ]
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1400,
      messages: [{
        role: 'user',
        content: `You are helping family discover ${subjectName} through their own words.

Read the questionnaire responses below. Extract 4–6 DISCOVERY themes — each should feel like opening a door to something specific you can learn about ${subjectName}. Aim for at least 4 themes when enough source material exists (there are 6 contributor questions).

STRICT RULES:
- Only use details explicitly stated in the text. Do NOT infer personality traits, values, or feelings that are not directly said.
- Labels: plain, specific, 3–5 words — like a chapter title in a biography, not poetry
- Summary: 2–3 sentences in clear, neutral prose. State what contributors actually mentioned. Use "contributors said" / "one person recalled" when helpful.
- matching_keywords: exact words or short phrases from the source text (5–10)
- memory_anchors: 1–3 short factual anchors from the text (habits, places, objects, routines mentioned)

Memories:
${memories}

Return JSON only:
{
  "themes": [
    {
      "id": "theme_001",
      "label": "...",
      "category": "daily_life|relationships|humor|work|home|traditions",
      "summary": "neutral factual summary from source text only",
      "prominence_score": 0.0 to 1.0,
      "matching_keywords": ["phrase from text"],
      "memory_anchors": ["factual anchor"]
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

/** Photo album themes — derived from photos only, not questionnaire. */
async function extractPhotoAlbumThemes(analyzedPhotos, subjectName) {
  if (!analyzedPhotos?.length) return []

  const photoSummaries = analyzedPhotos.map((p) => ({
    photo_id: p.id,
    year: resolvePhotoYear(p),
    era_label: resolvePhotoEraLabel(p),
    scene: p.analysis?.scene || '',
    setting: p.analysis?.setting || '',
    life_moment_type: p.analysis?.life_moment_type || '',
    tags: p.analysis?.tags || [],
    visual_mood: p.analysis?.visual_mood || '',
  }))

  if (!openai) {
    return [
      {
        id: 'album_001',
        label: 'Everyday moments',
        category: 'photos',
        summary: 'Photos grouped by shared setting and activity.',
        prominence_score: 0.8,
        matching_keywords: photoSummaries.flatMap((p) => p.tags).slice(0, 8),
        memory_anchors: [],
      },
    ]
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `Group memorial photos of ${subjectName} into 3–6 album themes using ONLY what is visible in the photo analyses below.

STRICT RULES:
- use questionnaire text, biography, or guesswork about the person's inner life
- Themes must come from visual patterns: settings (kitchen, garden), activities (cooking, travel), life stages (childhood photos, celebrations), seasons, gatherings
- Labels: plain and descriptive (e.g. "At the kitchen table", "Summer outdoors", "Family gatherings")
- Summary: 1–2 neutral sentences describing what kinds of photos are in this album
- matching_keywords: visual tags and settings from the photos in this group

Photo analyses:
${JSON.stringify(photoSummaries, null, 2)}

Return JSON only:
{
  "themes": [
    {
      "id": "album_001",
      "label": "...",
      "category": "photos",
      "summary": "...",
      "prominence_score": 0.0 to 1.0,
      "matching_keywords": ["visual tag"],
      "memory_anchors": []
    }
  ]
}`,
      }],
    })
    const parsed = parseJson(completion.choices[0].message.content)
    return (parsed.themes || []).slice(0, 6)
  } catch (err) {
    console.error('[PhotoAlbumThemes] error:', err.message)
    return [
      {
        id: 'album_001',
        label: 'Photo collection',
        category: 'photos',
        summary: `Photos of ${subjectName}.`,
        prominence_score: 0.8,
        matching_keywords: [],
        memory_anchors: [],
      },
    ]
  }
}

async function analyzePhotoWithVision(storageUrl, subjectName, options = {}) {
  const {
    dateOfBirth = null,
    dateOfPassing = null,
    deceasedPresent = null,
  } = options

  const birthYear = dateOfBirth ? new Date(dateOfBirth).getFullYear() : null
  const passingYear = dateOfPassing ? new Date(dateOfPassing).getFullYear() : null
  const lifeSpanHint =
    birthYear && passingYear
      ? `${subjectName} lived from ${birthYear} to ${passingYear}.`
      : birthYear
        ? `${subjectName} was born in ${birthYear}.`
        : ''

  if (!openai) {
    return {
      scene: 'unknown',
      emotion: 'neutral',
      people_count: 0,
      setting: 'unknown',
      tags: [],
      visual_mood: '',
      life_moment_type: 'unknown',
      subject_in_photo: deceasedPresent ?? null,
      subject_apparent_age: null,
      subject_life_stage: 'unknown',
      subject_life_stage_label: null,
      chronological_rank: null,
      photo_description: null,
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 650,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: storageUrl, detail: 'high' },
          },
          {
            type: 'text',
            text: `This photo is part of a memorial for ${subjectName}. ${lifeSpanHint}
${deceasedPresent === true ? `${subjectName} appears in this photo.` : deceasedPresent === false ? `${subjectName} may not appear in this photo.` : ''}

Analyze the image carefully for a chronological life story slideshow.

Return JSON only:
{
  "scene": "one clear sentence describing what is visibly happening",
  "photo_description": "2–3 observant sentences: who is present, what they are doing, setting, clothing/era clues, mood",
  "emotion": "visible mood if clear, else neutral",
  "people_count": number,
  "setting": "indoor|outdoor|home|celebration|medical|nature|work|unknown",
  "tags": ["5-8 concrete visual tags"],
  "visual_mood": "e.g. calm, lively, formal",
  "life_moment_type": "e.g. everyday_routine, celebration, caregiving, travel, childhood, gathering, portrait",
  "subject_in_photo": true or false — is ${subjectName} visible?,
  "subject_apparent_age": number or null — best estimate of how old ${subjectName} looks if they are in the photo,
  "subject_life_stage": "infancy|early_childhood|childhood|pre_teen|teenager|young_adult|twenties|thirties|forties|fifties|sixties|seventies|eighties|nineties|elderly|unknown",
  "subject_life_stage_label": "short human label e.g. As a young child, In her thirties, Later years",
  "estimated_year": number or null (from photo quality, fashion, context, or age estimate),
  "estimated_era_label": "e.g. 1970s, Early childhood, Her 40s",
  "chronological_rank": 1–100 integer — relative age in life where 1=very young and 100=very old appearance of ${subjectName}; use scene era if ${subjectName} is not visible
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
      subject_in_photo: deceasedPresent ?? null,
      subject_apparent_age: null,
      subject_life_stage: 'unknown',
      subject_life_stage_label: null,
      chronological_rank: null,
      photo_description: null,
    }
  }
}

async function assignPhotosToThemes(analyzedPhotos, themes, _memories, subjectName) {
  if (!themes.length) return analyzedPhotos

  const photoSummaries = analyzedPhotos.map((p) => ({
    photo_id: p.id,
    year: resolvePhotoYear(p),
    era_label: resolvePhotoEraLabel(p),
    scene: p.analysis?.scene || '',
    emotion: p.analysis?.emotion || '',
    tags: p.analysis?.tags || [],
    visual_mood: p.analysis?.visual_mood || '',
    life_moment_type: p.analysis?.life_moment_type || '',
    setting: p.analysis?.setting || '',
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
        content: `Match each photo to the best photo-album theme(s) for ${subjectName}.

Use ONLY visual information from the photos — do not use questionnaire memories or guess inner life.

Album themes (from photos only):
${JSON.stringify(themes.map((t) => ({
  id: t.id,
  label: t.label,
  summary: t.summary,
  keywords: t.matching_keywords,
})), null, 2)}

Photos:
${JSON.stringify(photoSummaries, null, 2)}

Rules:
- Each photo gets 1 theme id based on setting, activity, era, and visual tags
- Do NOT assign all photos to the same theme unless they truly belong together
- Prefer grouping by visible context (kitchen, garden, celebration, childhood, etc.)

Return JSON only:
{ "assignments": [{ "photo_id": "uuid", "theme_ids": ["album_001"], "reason": "brief" }] }`,
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

function interleaveVoiceSlides(storySlides, voiceSlides) {
  if (!voiceSlides.length) return storySlides
  if (!storySlides.length) return voiceSlides

  const hasAiVoiceSlides = storySlides.some((s) => s.slide_type === 'voice_clip')
  if (hasAiVoiceSlides) return storySlides

  const photoCount = storySlides.filter((s) => s.slide_type === 'photo').length
  if (!photoCount) {
    const closingIndex = storySlides.findIndex((s) => s.slide_type === 'closing')
    const result = [...storySlides]
    if (closingIndex >= 0) {
      result.splice(closingIndex, 0, ...voiceSlides)
    } else {
      result.push(...voiceSlides)
    }
    return result.map((slide, index) => ({ ...slide, order_index: index + 1 }))
  }

  const result = []
  let voiceIndex = 0
  let seenPhotos = 0
  const interval = Math.max(2, Math.floor(photoCount / (voiceSlides.length + 1)))

  storySlides.forEach((slide) => {
    result.push(slide)
    if (slide.slide_type === 'photo') {
      seenPhotos += 1
      if (seenPhotos % interval === 0 && voiceIndex < voiceSlides.length) {
        result.push(voiceSlides[voiceIndex])
        voiceIndex += 1
      }
    }
  })

  while (voiceIndex < voiceSlides.length) {
    const closingIndex = result.findIndex((s) => s.slide_type === 'closing')
    if (closingIndex >= 0) {
      result.splice(closingIndex, 0, voiceSlides[voiceIndex])
    } else {
      result.push(voiceSlides[voiceIndex])
    }
    voiceIndex += 1
  }

  return result.map((slide, index) => ({ ...slide, order_index: index + 1 }))
}

function buildPhotoCatalogEntry(photo, contributors, themes, memorial) {
  const contributor = contributors?.find((c) => c.id === photo.contributor_id)
  const theme = themes.find((t) => photo.matched_theme_ids?.includes(t.id))
  const chronologicalSortKey = resolveChronologicalSortKey(photo, memorial)
  const photoYear = resolvePhotoYear(photo)
  const eraLabel =
    resolvePhotoEraLabel(photo) ||
    photo.analysis?.subject_life_stage_label ||
    null

  return {
    photo_id: photo.id,
    storage_path: photo.storage_path,
    contributor_name: contributor?.name || 'A contributor',
    relationship_type: contributor?.relationship_type || '',
    theme_label: theme?.label || null,
    scene: photo.analysis?.scene || '',
    vision_description: photo.analysis?.photo_description || photo.analysis?.scene || '',
    visual_mood: photo.analysis?.visual_mood || '',
    life_moment_type: photo.analysis?.life_moment_type || '',
    tags: photo.analysis?.tags || [],
    subject_in_photo: photo.analysis?.subject_in_photo ?? photo.photo_identity?.deceased_present ?? null,
    subject_apparent_age: resolveSubjectApparentAge(photo),
    subject_life_stage: photo.analysis?.subject_life_stage || 'unknown',
    subject_life_stage_label: photo.analysis?.subject_life_stage_label || eraLabel,
    chronological_sort_key: chronologicalSortKey,
    photo_year: photoYear,
    photo_era_label: eraLabel,
    taken_at: photo.taken_at || null,
  }
}

function buildOrganizerCoverPhotoCatalogEntry(memorial, subjectName) {
  if (!memorial?.cover_photo_url) return null

  return {
    photo_id: `organizer_cover_${memorial.id || 'photo'}`,
    storage_path: memorial.cover_photo_url,
    contributor_name: 'Organizer',
    relationship_type: '',
    theme_label: null,
    scene: 'Organizer-selected memorial photo',
    vision_description: `Organizer-selected memorial photo for ${subjectName}.`,
    visual_mood: '',
    life_moment_type: 'memorial_cover',
    tags: ['organizer selected', 'memorial cover'],
    subject_in_photo: null,
    subject_apparent_age: null,
    subject_life_stage: 'unknown',
    subject_life_stage_label: null,
    chronological_sort_key: 0,
    photo_year: null,
    photo_era_label: null,
    taken_at: null,
  }
}

function buildStorySlideFromCatalog(photo, index) {
  return {
    order_index: index + 1,
    slide_type: 'photo',
    photo_id: photo.photo_id,
    photo_url: photo.storage_path,
    quote: '',
    photo_description: '',
    narration: null,
    matched_quote: null,
    contributor_name: photo.contributor_name,
    relationship_type: photo.relationship_type,
    theme_label: photo.theme_label,
    photo_year: photo.photo_year,
    photo_era_label: photo.photo_era_label,
    subject_life_stage_label: photo.subject_life_stage_label,
    chronological_sort_key: photo.chronological_sort_key,
  }
}

function stripStorySlideDisplayFields(slide) {
  return {
    ...slide,
    photo_year: null,
    photo_era_label: null,
    subject_life_stage_label: null,
    chronological_sort_key: null,
    theme_label: null,
    chapter_title: null,
    perspective_label: null,
  }
}

function finalizePhotoStorySlides(slides = []) {
  return slides
    .filter((slide) => slide?.slide_type === 'photo' && slide?.photo_id && slide?.photo_url)
    .map((slide, index) => {
      const storyText = slide.photo_description || slide.narration || ''

      return stripStorySlideDisplayFields({
        ...slide,
        slide_type: 'photo',
        quote: storyText,
        photo_description: storyText,
        narration: null,
        order_index: index + 1,
      })
    })
}

function enrichStorySlide(slide, photoById, memorial, index) {
  const slideType = slide.slide_type || (slide.photo_id ? 'photo' : 'narration')
  const photo = slide.photo_id ? photoById[slide.photo_id] || {} : {}
  const description =
    slide.photo_description ||
    slide.quote ||
    slide.narration ||
    ''

  return {
    ...slide,
    slide_type: slideType,
    order_index: Number.isFinite(Number(slide.order_index)) ? Number(slide.order_index) : index + 1,
    photo_url: slide.photo_url || photo.storage_path || null,
    quote: description,
    photo_description: description,
    narration: description === slide.narration ? null : slide.narration || null,
    matched_quote: slide.matched_quote || null,
    chapter_title: slide.chapter_title || slide.theme_label || null,
    perspective_label: slide.perspective_label || null,
    contributor_name: slide.contributor_name || photo.contributor_name || null,
    relationship_type: slide.relationship_type || photo.relationship_type || null,
    theme_label: slide.theme_label || photo.theme_label || null,
    chronological_sort_key:
      slide.chronological_sort_key ||
      photo.chronological_sort_key ||
      (slide.photo_id ? resolveChronologicalSortKey(photo, memorial) : null),
    photo_year: slide.photo_year || photo.photo_year || null,
    photo_era_label:
      slide.photo_era_label ||
      photo.photo_era_label ||
      photo.subject_life_stage_label ||
      null,
    subject_life_stage_label:
      slide.subject_life_stage_label || photo.subject_life_stage_label || null,
  }
}

function finalizeStorySlides(slides, photoCatalog, memorial) {
  const photoById = Object.fromEntries(photoCatalog.map((p) => [p.photo_id, p]))
  const usedPhotoIds = new Set(slides.filter((s) => s.photo_id).map((s) => s.photo_id))
  const merged = slides.map((slide, index) => enrichStorySlide(slide, photoById, memorial, index))

  const missingPhotos = photoCatalog.filter((photo) => !usedPhotoIds.has(photo.photo_id))
  if (missingPhotos.length) {
    const closingIndex = merged.findIndex((s) => s.slide_type === 'closing')
    const insertAt = closingIndex >= 0 ? closingIndex : merged.length
    const photoSlides = sortSlidesChronologically(
      missingPhotos.map((photo, i) => buildStorySlideFromCatalog(photo, insertAt + i)),
      photoById,
      memorial,
    )
    merged.splice(insertAt, 0, ...photoSlides)
  }

  return merged
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((slide, index) => ({ ...slide, order_index: index + 1 }))
}

function sortSlidesByPhotoCatalogOrder(slides = [], photoCatalog = []) {
  const photoOrder = new Map(photoCatalog.map((photo, index) => [photo.photo_id, index]))

  return [...slides]
    .sort((a, b) => {
      const orderA = photoOrder.has(a.photo_id) ? photoOrder.get(a.photo_id) : Number.MAX_SAFE_INTEGER
      const orderB = photoOrder.has(b.photo_id) ? photoOrder.get(b.photo_id) : Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) return orderA - orderB
      return (a.order_index ?? 0) - (b.order_index ?? 0)
    })
    .map((slide, index) => ({ ...slide, order_index: index + 1 }))
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
  const birthYear = resolveMemorialBirthYear(memorial)
  const passingYear = memorial?.date_of_passing
    ? new Date(memorial.date_of_passing).getFullYear()
    : null

  const selectedPhotoCatalog = selectStoryPhotoCatalog(
    sortPhotosChronologically(analyzedPhotos, memorial).map((p) =>
      buildPhotoCatalogEntry(p, contributors, themes, memorial),
    ),
  )
  const organizerCoverPhoto = buildOrganizerCoverPhotoCatalogEntry(memorial, subjectName)
  const photoCatalog = organizerCoverPhoto
    ? [
        organizerCoverPhoto,
        ...selectedPhotoCatalog.filter((p) => p.storage_path !== organizerCoverPhoto.storage_path),
      ].slice(0, MAX_STORY_SLIDES)
    : selectedPhotoCatalog

  const buildFallbackSlideshow = () =>
    finalizePhotoStorySlides(
      sortSlidesByPhotoCatalogOrder(finalizeStorySlides([], photoCatalog, memorial), photoCatalog),
    )

  if (!photoCatalog.length) {
    return []
  }

  if (!openai) {
    return buildFallbackSlideshow()
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 12000,
      messages: [{
        role: 'user',
        content: `Write Story slideshow descriptions for ${subjectName}'s memorial photo slideshow.

LIFE SPAN: ${birthYear ? `Born ${birthYear}` : 'Birth year unknown'}${passingYear ? `, passed ${passingYear}` : ''}.

OUTPUT RULES (critical):
- Return EXACTLY ${photoCatalog.length} slides — one per photo in the catalog below.
- Every slide MUST have slide_type "photo" and a photo_id from the catalog.
- Do NOT create intro, chapter, perspective, closing, voice, or text-only slides.
- Use photo analysis only for broad tone, era, and sequencing. Do not state or imply that a questionnaire memory happened in, is shown by, or is directly connected to a specific photo unless the source data explicitly says so.
- The description should feel appropriate beside the photo, but it must stand on its own as remembrance language. Avoid phrases like "in this photo", "this moment shows", "here we see", or "surrounded by family" unless those facts are explicitly supported.
- photo_description: 2–4 warm, specific, conversational third-person sentences about ${subjectName} when there is enough questionnaire or organizer biography detail to ground the description. Anchor descriptions in concrete source details when available: habits, sayings, quirks, routines, places, roles, accomplishments, repeated memories, or small human details. It should feel like a close friend giving a memorial toast: human, grounded, undecorated, and never AI-written.
- The first slide should use the organizer-selected memorial photo and function as the opening: include birth/passing context when available and quickly ground the viewer in who ${subjectName} was — their personality, what they loved, or the kind of presence they had.
- Middle slides should move through ${subjectName}'s life organically. Tell the ${subjectName}'s life by drawing specific stories from the questionnaire responses. Cover their life stories based on the following examples but is not limited to - character, quirks, relationships, roles, significant moments, accomplishments, and repeated details contributors mentioned - without forcing a fixed order.
- The final slide should function as the closing: honor ${subjectName} with a sincere remembrance, legacy reflection, or natural final words that do not feel abrupt.
- narration: leave null. All story text belongs in photo_description.
- matched_quote: optional contributor phrase, max 22 words, copied verbatim or minimally trimmed from the questionnaire text when it clearly fits the slide.
- If no contributor phrase clearly fits a slide, set matched_quote to null. Do not invent, paraphrase, or polish a quote into something the contributor did not say.
- If matched_quote is present, contributor_name and relationship_type must identify the contributor who wrote that phrase.
- Synthesize all contributors into one cohesive voice across the slideshow. Third person only.
- Prefer specific details over general statements. Avoid broad claims like "they were kind" or "they loved family" unless paired with a concrete example from the responses. If multiple contributors said something similar, surface that convergence directly.
- Do not fabricate details, repeat the same descriptive language across slides, overwrite grief, manufacture emotion, or use sympathy-card filler such as "a life well-lived", "touched many hearts", or "left a lasting impression".
- Do not include specific timelines or ages about the ${subjectName} in the description.
- Don't assume relationships of anyone in the photo regardless of the contributor relationship type.
- Do not include descriptions for the sake of having them. If there are not enough questionnaire responses to give every photo a distinct grounded description, associate multiple adjacent photos with one grounded description by reusing the same photo_description where appropriate.
- If a photo cannot be associated with a grounded description without inventing or overgeneralizing, set photo_description to an empty string, matched_quote to null, contributor_name to null, and relationship_type to null.

Photos (LOCKED order — first photo is organizer-selected when present, then youngest to oldest; use photo_id exactly):
${JSON.stringify(photoCatalog.map((p) => ({
  photo_id: p.photo_id,
  subject_life_stage_label: p.subject_life_stage_label,
  life_moment_type: p.life_moment_type,
  vision_description: p.vision_description,
  visual_mood: p.visual_mood,
  tags: p.tags,
  contributor_name: p.contributor_name,
  relationship_type: p.relationship_type,
})), null, 2)}

Questionnaire memories (primary source — do not invent facts):
${memories}

Discovery themes (use as broad story context, not as proof that a memory belongs to a specific photo):
${JSON.stringify((themes || []).map((t) => ({ label: t.label, summary: t.summary })), null, 2)}

Return JSON only:
{
  "slides": [
    {
      "order_index": 1,
      "slide_type": "photo",
      "photo_id": "uuid from catalog",
      "photo_description": "grounded biographical caption, repeated grouped caption, or empty string",
      "narration": null,
      "matched_quote": "contributor phrase or null",
      "contributor_name": "string or null",
      "relationship_type": "string or null"
    }
  ]
}`,
      }],
    })

    const parsed = parseJson(completion.choices[0].message.content)
    const photoById = Object.fromEntries(photoCatalog.map((p) => [p.photo_id, p]))

    const aiSlides = (parsed.slides || [])
      .filter((s) => {
        if (s.slide_type === 'photo' && s.photo_id) return Boolean(photoById[s.photo_id])
        return false
      })
      .map((s, i) => ({
        ...s,
        order_index: s.order_index ?? i + 1,
        slide_type: 'photo',
      }))

    return finalizePhotoStorySlides(
      sortSlidesByPhotoCatalogOrder(finalizeStorySlides(aiSlides, photoCatalog, memorial), photoCatalog),
    )
  } catch (err) {
    console.error('[StoryCompose] error:', err.message)
    return buildFallbackSlideshow()
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

Write 2–3 short excerpts for a memorial constellation discovery panel.

RULES:
- Stay close to what was actually written — light editing only for clarity
- Neutral tone — no flowery language, no inference beyond the text
- Each quote should help someone discover something specific about this person
- Max 40 words each

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

function buildConstellationPhotoSummary(photo) {
  return {
    photo_id: photo.id,
    year: resolvePhotoYear(photo),
    era_label: resolvePhotoEraLabel(photo),
    scene: photo.analysis?.scene || '',
    setting: photo.analysis?.setting || '',
    life_moment_type: photo.analysis?.life_moment_type || '',
    tags: photo.analysis?.tags || [],
    visual_mood: photo.analysis?.visual_mood || '',
    deceased_present: photo.analysis?.deceased_present ?? photo.photo_identity?.deceased_present ?? null,
    people_count: photo.analysis?.people_count ?? null,
  }
}

function scorePhotoAgainstConstellationTheme(photoAnalysis, theme) {
  const photoText = [
    photoAnalysis?.scene,
    photoAnalysis?.setting,
    photoAnalysis?.visual_mood,
    photoAnalysis?.life_moment_type,
    ...(photoAnalysis?.tags || []),
    resolvePhotoYear({ analysis: photoAnalysis }),
    resolvePhotoEraLabel({ analysis: photoAnalysis }),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const themeText = [
    theme.label,
    theme.summary,
    ...(theme.matching_keywords || []),
    ...(theme.memory_anchors || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const keywords = themeText.split(/\W+/).filter((w) => w.length > 3)
  return keywords.filter((kw) => photoText.includes(kw)).length
}

function pickBestConstellationTheme(photo, themes) {
  if (!themes.length) return null
  const scored = themes
    .map((theme) => ({
      id: theme.id,
      score: scorePhotoAgainstConstellationTheme(photo.analysis, theme),
    }))
    .sort((a, b) => b.score - a.score)
  return scored[0]?.id || themes[0].id
}

function averageThemeYear(theme, photoById) {
  const years = (theme.photo_ids || [])
    .map((id) => Number(resolvePhotoYear(photoById[id] || {})))
    .filter((y) => Number.isFinite(y))
  if (!years.length) return 9999
  return years.reduce((sum, y) => sum + y, 0) / years.length
}

function buildConstellationEdges(themes, photoById) {
  if (themes.length < 2) return []
  const ordered = [...themes].sort(
    (a, b) => averageThemeYear(a, photoById) - averageThemeYear(b, photoById),
  )
  return ordered.slice(0, -1).map((theme, index) => ({
    source: theme.id,
    target: ordered[index + 1].id,
    relationship_type: 'chapter',
    weight: 0.5 + Math.min(0.4, (theme.photo_ids?.length || 0) / 20),
  }))
}

function buildConstellationPhotoQuotes(themePhotos, contributors = []) {
  return themePhotos
    .filter((p) => p.analysis?.scene || p.caption)
    .slice(0, 3)
    .map((p) => {
      const contributor = contributors.find((c) => c.id === p.contributor_id)
      return {
        text: p.caption || p.analysis?.scene || '',
        contributor_name: contributor?.name || 'A contributor',
        relationship_type: contributor?.relationship_type || 'unknown',
      }
    })
}

/**
 * Constellation themes — photo-only, separate from albums and questionnaire discovery.
 * Every photo is assigned to exactly one theme; themes with zero photos are dropped.
 */
async function buildConstellationFromPhotos(analyzedPhotos, subjectName, contributors = []) {
  if (!analyzedPhotos?.length) {
    return { themes: [], photos: [], edges: [] }
  }

  const photoSummaries = analyzedPhotos.map(buildConstellationPhotoSummary)
  const photoById = Object.fromEntries(analyzedPhotos.map((p) => [p.id, p]))

  let rawThemes = []
  if (!openai) {
    rawThemes = [
      {
        id: 'constellation_001',
        label: `Life in pictures`,
        category: 'life_chapter',
        summary: `Photos that show ${subjectName} across different moments.`,
        prominence_score: 0.9,
        matching_keywords: [],
        memory_anchors: [],
        photo_ids: analyzedPhotos.map((p) => p.id),
      },
    ]
  } else {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are building a PHOTO CONSTELLATION for ${subjectName}'s memorial — a map of discovery themes drawn ONLY from contributor photos.

This is NOT a photo album. Albums group by setting/activity (kitchen, garden, parties). The constellation groups photos into LIFE DISCOVERY chapters — what someone can learn about ${subjectName} by exploring connected images (life stages, eras, relationships visible in frames, recurring places, kinds of moments over time).

STRICT RULES:
- Use ONLY visual information from the photo analyses below
- Do NOT use questionnaire text or biography
- Partition ALL ${analyzedPhotos.length} photos: each photo_id appears in EXACTLY ONE theme
- Every theme MUST contain at least one photo — do not create empty themes
- Labels: 3–7 words, discovery-oriented (e.g. "Her early years", "People she held close", "Everyday quiet moments")
- Summary: 2 neutral sentences describing what these photos reveal visually
- 3–6 themes total, or fewer if there are very few photos
- matching_keywords: visual tags/eras/settings from the photos in that theme

Photo analyses:
${JSON.stringify(photoSummaries, null, 2)}

Return JSON only:
{
  "themes": [
    {
      "id": "constellation_001",
      "label": "...",
      "category": "life_chapter|relationships|place|era|moments",
      "summary": "...",
      "prominence_score": 0.0 to 1.0,
      "matching_keywords": ["visual tag or era"],
      "memory_anchors": ["short visual anchor"],
      "photo_ids": ["uuid"]
    }
  ]
}`,
        }],
      })
      const parsed = parseJson(completion.choices[0].message.content)
      rawThemes = parsed.themes || []
    } catch (err) {
      console.error('[ConstellationPhotos] error:', err.message)
      rawThemes = []
    }
  }

  const assignedPhotoIds = new Set()
  const themes = []

  for (const theme of rawThemes) {
    const photoIds = (theme.photo_ids || []).filter(
      (id) => photoById[id] && !assignedPhotoIds.has(id),
    )
    if (!photoIds.length) continue
    photoIds.forEach((id) => assignedPhotoIds.add(id))
    themes.push({
      ...theme,
      id: theme.id || `constellation_${String(themes.length + 1).padStart(3, '0')}`,
      photo_ids: photoIds,
      photo_count: photoIds.length,
    })
  }

  const unassigned = analyzedPhotos.filter((p) => !assignedPhotoIds.has(p.id))
  if (unassigned.length) {
    if (!themes.length) {
      themes.push({
        id: 'constellation_001',
        label: 'Memories in pictures',
        category: 'moments',
        summary: `Contributor photos of ${subjectName}.`,
        prominence_score: 0.8,
        matching_keywords: [],
        memory_anchors: [],
        photo_ids: unassigned.map((p) => p.id),
        photo_count: unassigned.length,
      })
      unassigned.forEach((p) => assignedPhotoIds.add(p.id))
    } else {
      for (const photo of unassigned) {
        const themeId = pickBestConstellationTheme(photo, themes)
        const theme = themes.find((t) => t.id === themeId) || themes[0]
        theme.photo_ids.push(photo.id)
        theme.photo_count = theme.photo_ids.length
        assignedPhotoIds.add(photo.id)
      }
    }
  }

  const photosWithThemes = analyzedPhotos.map((photo) => {
    const theme = themes.find((t) => t.photo_ids.includes(photo.id))
    return {
      ...photo,
      constellation_theme_id: theme?.id || themes[0]?.id || null,
    }
  })

  const activeThemes = themes
    .filter((t) => t.photo_ids.length > 0)
    .map((t) => ({
      ...t,
      prominence_score: Math.min(
        1,
        0.4 + t.photo_ids.length / Math.max(analyzedPhotos.length, 1),
      ),
      photo_count: t.photo_ids.length,
    }))
    .sort((a, b) => b.photo_count - a.photo_count)

  const edges = buildConstellationEdges(activeThemes, photoById)

  return {
    themes: activeThemes,
    photos: photosWithThemes,
    edges,
    buildNodePayload: (theme) => {
      const themePhotos = theme.photo_ids.map((id) => photoById[id]).filter(Boolean)
      return {
        id: theme.id,
        label: theme.label,
        category: theme.category,
        summary: theme.summary,
        prominence_score: theme.prominence_score,
        photo_urls: themePhotos.map((p) => p.storage_path),
        photo_ids: theme.photo_ids,
        photo_count: themePhotos.length,
        quotes: buildConstellationPhotoQuotes(themePhotos, contributors),
      }
    },
  }
}

module.exports = {
  buildMemoryCorpus,
  extractThemes,
  extractPhotoAlbumThemes,
  analyzePhotoWithVision,
  assignPhotosToThemes,
  buildConstellationFromPhotos,
  composeStorySlideshow,
  composeThemeQuotes,
  fallbackMatchPhotoToThemes,
  buildVoiceStorySlides,
  interleaveVoiceSlides,
  resolvePhotoYear,
  resolvePhotoEraLabel,
  resolveChronologicalSortKey,
  sortPhotosChronologically,
}
