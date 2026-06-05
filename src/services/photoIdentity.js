require('dotenv').config()
const OpenAI = require('openai')
const { resolveStorageUrl, isHttpUrl } = require('./storageUrls')

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const { normalizeRelationshipGuess } = require('../lib/normalizeRelationshipGuess')

const IDENTITY_PROMPT_VERSION = 2
const MIN_GUESS_CONFIDENCE = 0.55

async function resolveImageUrl(supabase, urlOrPath, bucket = 'memorial-assets') {
  if (!urlOrPath) return null
  if (isHttpUrl(urlOrPath)) return urlOrPath
  return resolveStorageUrl(supabase, urlOrPath, bucket)
}

function parseVisionJson(content) {
  const clean = (content || '').replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

/**
 * Compare a contributor photo to the memorial cover/reference portrait.
 * Returns who is the deceased vs other people in the frame.
 */
async function analyzeContributorPhotoAgainstMemorial({
  subjectName,
  referenceImageUrl,
  contributorImageUrl,
}) {
  if (!openai || !referenceImageUrl || !contributorImageUrl) {
    return {
      deceased_present: false,
      deceased_name: subjectName,
      other_people_count: 0,
      prompt_type: 'generic',
      prompt_text: `Who is in this photo related to ${subjectName}?`,
      other_person: null,
      tags: [],
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Image 1 is the reference portrait of ${subjectName}, the person who passed away.
Image 2 is a photo uploaded by someone who knew them.

Tasks:
1. Decide if ${subjectName} (from image 1) appears in image 2.
2. If other people appear with them, estimate how they are related using visual cues:
   - Apparent ages (child vs teen vs adult vs elderly)
   - Age gap between ${subjectName} and the other person (rough years if possible)
   - Typical family patterns: ~25–40 year gap often suggests child; ~50–65+ gap may suggest grandchild; similar age may suggest sibling, spouse, or friend
   - Context (hospital bed, holiday, wedding, etc.) only as a weak hint

Return JSON only:
{
  "deceased_present": boolean,
  "deceased_name": "${subjectName}",
  "other_people_count": number,
  "other_person": {
    "description": "brief description of the other person",
    "estimated_age_range": "child | teen | young_adult | middle_aged | elderly | unknown",
    "age_gap_years_estimate": number or null,
    "relationship_guess": "Child | Grandchild | Parent | Sibling | Partner / Spouse | Extended family | Friend | Colleague | Other | null",
    "relationship_confidence": 0.0 to 1.0,
    "relationship_reasoning": "one short sentence explaining the guess",
    "position": "e.g. beside them on the right"
  } or null,
  "prompt_type": "beside_deceased" | "only_others" | "only_deceased" | "generic",
  "tags": ["short", "tags"]
}

Rules:
- Use relationship_guess null (not the word "unknown") when you are not at least 55% confident.
- Prefer Child vs Grandchild using age gap: elderly deceased + young child often = Grandchild; elderly + middle-aged adult often = Child.
- Do not guess a specific name; only relationship category.
- relationship_confidence must match how sure you are.

Use prompt_type "beside_deceased" when ${subjectName} and at least one other person are both visible.
Use "only_deceased" when only ${subjectName} is clearly visible.
Use "only_others" when other people appear but ${subjectName} from the reference is NOT in image 2.
Use "generic" when unsure.`,
          },
          { type: 'image_url', image_url: { url: referenceImageUrl, detail: 'low' } },
          { type: 'image_url', image_url: { url: contributorImageUrl, detail: 'high' } },
        ],
      }],
    })

    const parsed = parseVisionJson(response.choices[0].message.content)
    const otherCount = Number(parsed.other_people_count) || (parsed.other_person ? 1 : 0)
    const deceasedPresent = Boolean(parsed.deceased_present)

    const rawGuess =
      parsed.other_person?.relationship_guess ||
      parsed.relationship_guess ||
      null
    const rawConfidence = Number(parsed.other_person?.relationship_confidence)
    const normalized = normalizeRelationshipGuess(rawGuess, {
      confidence: Number.isFinite(rawConfidence) ? rawConfidence : undefined,
    })

    const relationshipGuess =
      normalized.label && normalized.confidence >= MIN_GUESS_CONFIDENCE
        ? normalized.label
        : null

    const otherPerson = parsed.other_person
      ? {
          ...parsed.other_person,
          relationship_guess: relationshipGuess,
          relationship_confidence: normalized.confidence,
          relationship_reasoning:
            parsed.other_person.relationship_reasoning ||
            normalized.reasoning ||
            null,
        }
      : null

    let promptType = parsed.prompt_type || 'generic'
    let promptText = `Who is in this photo related to ${subjectName}?`

    if (deceasedPresent && otherCount > 0) {
      promptType = 'beside_deceased'
      promptText = relationshipGuess
        ? `Who is beside ${subjectName}? We think they may be ${relationshipGuess.toLowerCase()}.`
        : `Who is beside ${subjectName}?`
    } else if (deceasedPresent && otherCount === 0) {
      promptType = 'only_deceased'
      promptText = `Does this photo look like ${subjectName}?`
    } else if (!deceasedPresent && otherCount > 0) {
      promptType = 'only_others'
      promptText = `Who is in this photo, and how did they know ${subjectName}?`
    }

    return {
      version: IDENTITY_PROMPT_VERSION,
      deceased_present: deceasedPresent,
      deceased_name: subjectName,
      other_people_count: otherCount,
      other_person: otherPerson,
      prompt_type: promptType,
      prompt_text: promptText,
      relationship_guess: relationshipGuess,
      relationship_confidence: normalized.confidence,
      relationship_reasoning: otherPerson?.relationship_reasoning || null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    }
  } catch (err) {
    console.error('[photoIdentity] vision error:', err.message)
    return {
      deceased_present: false,
      deceased_name: subjectName,
      other_people_count: 0,
      prompt_type: 'generic',
      prompt_text: `Who is in this photo related to ${subjectName}?`,
      other_person: null,
      tags: [],
      error: err.message,
    }
  }
}

function needsIdentityAnalysis(asset) {
  if (!asset) return false
  const identity = asset.ai_labels?.identity
  if (
    asset.ai_analysis_status === 'complete' &&
    identity &&
    (identity.version >= IDENTITY_PROMPT_VERSION ||
      (identity.relationship_guess && identity.relationship_guess !== 'unknown'))
  ) {
    return false
  }
  return true
}

async function analyzeAndUpdateMediaAsset(supabase, memorial, asset) {
  if (!needsIdentityAnalysis(asset)) return asset

  const referenceUrl = await resolveImageUrl(
    supabase,
    memorial.cover_photo_url,
    'memorial-assets',
  )
  const contributorUrl = await resolveImageUrl(
    supabase,
    asset.storage_path,
    asset.storage_bucket || 'memorial-assets',
  )

  if (!referenceUrl) {
    console.warn('[photoIdentity] no reference portrait for memorial', memorial.id)
    await supabase
      .from('media_assets')
      .update({
        ai_analysis_status: 'skipped',
        ai_labels: {
          identity: {
            prompt_type: 'generic',
            prompt_text: `Who is in this photo related to ${memorial.subject_name}?`,
            deceased_present: false,
            reference_missing: true,
          },
        },
        ai_people_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', asset.id)
    return asset
  }

  const identity = await analyzeContributorPhotoAgainstMemorial({
    subjectName: memorial.subject_name,
    referenceImageUrl: referenceUrl,
    contributorImageUrl: contributorUrl,
  })

  const aiLabels = {
    identity,
    tags: identity.tags,
    relationship_guess: identity.relationship_guess,
  }

  const { data: updated } = await supabase
    .from('media_assets')
    .update({
      ai_analysis_status: 'complete',
      ai_labels: aiLabels,
      ai_people_count: identity.other_people_count + (identity.deceased_present ? 1 : 0),
      ai_emotion: null,
      ai_scene: identity.other_person?.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', asset.id)
    .select('*')
    .single()

  return updated || asset
}

module.exports = {
  analyzeContributorPhotoAgainstMemorial,
  analyzeAndUpdateMediaAsset,
  needsIdentityAnalysis,
  resolveImageUrl,
}
