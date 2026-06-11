require('dotenv').config()
const OpenAI = require('openai')
const { resolveStorageUrl, resolveMemorialCoverUrl } = require('./storageUrls')

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

function parseJson(content) {
  const clean = (content || '').replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

function hasCompleteIdentity(asset) {
  const identity = asset?.ai_labels?.photo_identity
  return Boolean(identity && (identity.deceased_match || identity.deceased_present != null))
}

/**
 * Compare a contributor photo against the memorial reference portrait (organizer cover photo).
 */
async function analyzePhotoAgainstReference({
  photoSignedUrl,
  referencePortraitUrl,
  subjectName,
  contributorRelationship = null,
}) {
  if (!openai || !photoSignedUrl || !referencePortraitUrl) {
    return {
      deceased_present: null,
      deceased_match: 'unknown',
      match_confidence: 0,
      other_people: [],
      reasoning: 'Reference portrait or analysis unavailable.',
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are helping label photos for a memorial honoring ${subjectName}.

IMAGE 1 is the reference portrait of ${subjectName} (uploaded by the organizer when creating the memorial).
IMAGE 2 is a photo uploaded by a contributor${contributorRelationship ? ` (${contributorRelationship})` : ''}.

Determine whether ${subjectName} appears in Image 2 by comparing faces and context to Image 1.

Rules:
- Only mark deceased_present true when you are reasonably confident it is the same person as the reference
- If the photo is a group shot, still check if ${subjectName} is among the people
- For other visible people (not ${subjectName}), describe briefly and guess relationship to ${subjectName} only when visually obvious (e.g. child beside adult) — otherwise use "unknown"
- Be conservative; use uncertain/not_present when unsure

Return JSON only:
{
  "deceased_present": true or false,
  "deceased_match": "likely_same_person" | "uncertain" | "not_present",
  "match_confidence": 0.0 to 1.0,
  "other_people": [
    {
      "description": "brief visible description",
      "relationship_guess": "e.g. child, spouse, friend, unknown",
      "confidence": 0.0 to 1.0
    }
  ],
  "reasoning": "one short neutral sentence"
}`,
          },
          {
            type: 'image_url',
            image_url: { url: referencePortraitUrl, detail: 'high' },
          },
          {
            type: 'image_url',
            image_url: { url: photoSignedUrl, detail: 'high' },
          },
        ],
      }],
    })

    const parsed = parseJson(completion.choices[0].message.content)
    return {
      deceased_present: Boolean(parsed.deceased_present),
      deceased_match: parsed.deceased_match || 'unknown',
      match_confidence: Number(parsed.match_confidence) || 0,
      other_people: Array.isArray(parsed.other_people) ? parsed.other_people : [],
      reasoning: parsed.reasoning || '',
      reference_subject: subjectName,
    }
  } catch (err) {
    console.error('[PhotoIdentity] error:', err.message)
    return {
      deceased_present: null,
      deceased_match: 'unknown',
      match_confidence: 0,
      other_people: [],
      reasoning: err.message,
    }
  }
}

async function resolveReferencePortraitUrl(supabase, memorial) {
  if (!memorial?.cover_photo_url) return null
  return resolveMemorialCoverUrl(supabase, memorial.cover_photo_url)
}

/**
 * Run identity analysis and persist results on media_assets.ai_labels.photo_identity.
 */
async function analyzeAndUpdateMediaAsset(supabase, memorial, asset, contributor = null) {
  if (!memorial?.cover_photo_url || !asset?.storage_path) return asset
  if (hasCompleteIdentity(asset)) return asset

  const referenceUrl = await resolveReferencePortraitUrl(supabase, memorial)
  const photoUrl = await resolveStorageUrl(
    supabase,
    asset.storage_path,
    asset.storage_bucket || 'memorial-assets',
  )

  if (!referenceUrl || !photoUrl) return asset

  const photoIdentity = await analyzePhotoAgainstReference({
    photoSignedUrl: photoUrl,
    referencePortraitUrl: referenceUrl,
    subjectName: memorial.subject_name || memorial.nickname || 'the person honored',
    contributorRelationship: contributor?.relationship_type || contributor?.relationship_label || null,
  })

  const aiLabels = {
    ...(typeof asset.ai_labels === 'object' && asset.ai_labels ? asset.ai_labels : {}),
    photo_identity: photoIdentity,
  }

  const { data: updated, error } = await supabase
    .from('media_assets')
    .update({
      ai_labels: aiLabels,
      ai_analysis_status: 'complete',
      ai_people_count: photoIdentity.other_people?.length
        ? photoIdentity.other_people.length + (photoIdentity.deceased_present ? 1 : 0)
        : photoIdentity.deceased_present
          ? 1
          : asset.ai_people_count,
      updated_at: new Date().toISOString(),
    })
    .eq('id', asset.id)
    .select('*')
    .single()

  if (error) {
    console.error('[PhotoIdentity] db update failed:', asset.id, error.message)
    return { ...asset, ai_labels: aiLabels }
  }

  return updated || { ...asset, ai_labels: aiLabels }
}

async function analyzeMediaAssetsForMemorial(supabase, memorial, assets = [], contributor = null) {
  if (!memorial?.cover_photo_url || !assets.length) {
    return assets
  }

  const results = []
  for (const asset of assets) {
    try {
      results.push(await analyzeAndUpdateMediaAsset(supabase, memorial, asset, contributor))
    } catch (err) {
      console.error('[PhotoIdentity] asset failed:', asset.id, err.message)
      results.push(asset)
    }
  }
  return results
}

module.exports = {
  analyzePhotoAgainstReference,
  analyzeAndUpdateMediaAsset,
  analyzeMediaAssetsForMemorial,
  resolveReferencePortraitUrl,
  hasCompleteIdentity,
}
