require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const authMiddleware = require('../middleware/auth')
const crypto = require('crypto')
const multer = require('multer')
const upload = multer()

// After the existing requires:
const { enrichMemorialsForClient, enrichMemorialForClient } = require('../services/storageUrls')

const CONTRIBUTOR_REVIEW_STATUSES = new Set(['in_progress', 'submitted', 'approved', 'rejected'])

async function getOwnedMemorial(memorialId, userId) {
  const { data, error } = await supabase
    .from('memorials')
    .select('id')
    .eq('id', memorialId)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data
}

function countByContributor(items = []) {
  return items.reduce((counts, item) => {
    const contributorId = item?.contributor_id
    if (!contributorId) return counts
    counts[contributorId] = (counts[contributorId] || 0) + 1
    return counts
  }, {})
}

function enrichContributors(contributors = [], stories = [], photos = [], voices = []) {
  const storyCounts = countByContributor(stories)
  const photoCounts = countByContributor(photos)
  const voiceCounts = countByContributor(voices)

  return contributors.map((contributor) => {
    const story_count = storyCounts[contributor.id] || 0
    const photo_count = photoCounts[contributor.id] || 0
    const voice_count = voiceCounts[contributor.id] || 0

    return {
      ...contributor,
      story_count,
      photo_count,
      voice_count,
      contribution_count: story_count + photo_count + voice_count,
    }
  })
}

async function createSignedAssetUrls(items = [], urlKey) {
  return Promise.all((items || []).map(async (item) => {
    let signedUrl = null

    if (item.storage_bucket && item.storage_path) {
      const { data } = await supabase.storage
        .from(item.storage_bucket)
        .createSignedUrl(item.storage_path, 60 * 60)

      signedUrl = data?.signedUrl || null
    }

    return {
      ...item,
      [urlKey]: signedUrl,
      url: signedUrl,
    }
  }))
}

// POST /memorials/cover-photo — upload cover photo, returns storage URL
router.post('/cover-photo', authMiddleware, async (req, res) => {
  try {

    upload.single('file')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message })
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

      const userId = req.user?.id ?? req.user?.sub
      const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `covers/${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('memorial-assets')
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        })

      if (uploadError) return res.status(400).json({ error: uploadError.message })

      const { data: urlData } = await supabase.storage
        .from('memorial-assets')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

      res.status(201).json({
        cover_photo_url: urlData?.signedUrl || storagePath,
        storage_path: storagePath,
      })
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /memorials — create a new memorial
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      subject_name,
      nickname,
      date_of_birth,
      date_of_passing,
      biography,
      related_people,
      cover_photo_url,
    } = req.body
    if (!subject_name) {
      return res.status(400).json({ error: 'subject_name is required' })
    }

    const biographyText = String(biography || '').trim()

    const memorialPayload = {
      user_id: req.user.sub,
      subject_name,
      nickname: nickname || null,
      date_of_birth: date_of_birth || null,
      date_of_passing: date_of_passing || null,
      biography: biographyText || null,
      related_people: Array.isArray(related_people) ? related_people : [],
      cover_photo_url: cover_photo_url || null,
      status: 'collecting'
    }

    const { data, error } = await supabase
      .from('memorials')
      .insert(memorialPayload)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ memorial: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /memorials — get all memorials for logged in organizer
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('memorials')
      .select('*')
      .eq('user_id', req.user.sub)
      .order('created_at', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })
    const enriched = await enrichMemorialsForClient(supabase, data || [])
    res.json({ memorials: enriched })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /memorials/:id — get a single memorial
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('memorials')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.sub)
      .single()

    if (error) return res.status(404).json({ error: 'Memorial not found' })
    const enriched = await enrichMemorialForClient(supabase, data)
    res.json({ memorial: enriched })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /memorials/:id — update memorial fields (e.g. attach cover photo)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: memorial, error: memError } = await supabase
      .from('memorials')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.sub)
      .single()

    if (memError || !memorial) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const allowedFields = [
      'subject_name',
      'nickname',
      'date_of_birth',
      'date_of_passing',
      'biography',
      'cover_photo_url',
      'status',
    ]

    const updates = {}
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    })

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('memorials')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    const enriched = await enrichMemorialForClient(supabase, data)
    res.json({ memorial: enriched })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /memorials/:id/invite-link — generate invite link
router.post('/:id/invite-link', authMiddleware, async (req, res) => {
  try {
    // verify organizer owns this memorial
    const { data: memorial, error: memError } = await supabase
      .from('memorials')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.sub)
      .single()

    if (memError || !memorial) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // check if active invite link already exists
    const { data: existing } = await supabase
      .from('invite_links')
      .select('*')
      .eq('memorial_id', req.params.id)
      .eq('is_active', true)
      .single()

    if (existing) {
      return res.json({
        invite_link: {
          ...existing,
          url: `${process.env.FRONTEND_URL}/contribute/${existing.token}`
        }
      })
    }

    // generate new token
    const token = crypto.randomBytes(8).toString('hex')
    const { expires_at, max_uses } = req.body

    const { data, error } = await supabase
      .from('invite_links')
      .insert({
        memorial_id: req.params.id,
        token,
        created_by: req.user.sub,
        is_active: true,
        expires_at: expires_at || null,
        max_uses: max_uses || null,
        use_count: 0
      })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    res.status(201).json({
      invite_link: {
        ...data,
        url: `${process.env.FRONTEND_URL}/contribute/${token}`
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /memorials/:id/invite-link — deactivate or reactivate invite link
router.patch('/:id/invite-link', authMiddleware, async (req, res) => {
  try {
    const { is_active } = req.body

    const { data, error } = await supabase
      .from('invite_links')
      .update({ is_active })
      .eq('memorial_id', req.params.id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ invite_link: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /memorials/:id/contributors — get all contributors
router.get('/:id/contributors', authMiddleware, async (req, res) => {
  try {
    const memorial = await getOwnedMemorial(req.params.id, req.user.sub)
    if (!memorial) return res.status(403).json({ error: 'Not authorized' })

    const { data: contributors, error } = await supabase
      .from('contributors')
      .select('id, name, relationship_type, relationship_label, status, questionnaire_done, photos_done, voice_done, submitted_at, created_at, updated_at')
      .eq('memorial_id', req.params.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })

    const contributorIds = (contributors || []).map((contributor) => contributor.id)

    if (!contributorIds.length) {
      return res.json({ contributors: [] })
    }

    const [
      { data: stories, error: storiesError },
      { data: photos, error: photosError },
      { data: voices, error: voicesError },
    ] = await Promise.all([
      supabase.from('contributor_stories').select('id, contributor_id').in('contributor_id', contributorIds),
      supabase.from('media_assets').select('id, contributor_id').in('contributor_id', contributorIds),
      supabase.from('voice_recordings').select('id, contributor_id').in('contributor_id', contributorIds),
    ])

    const countError = storiesError || photosError || voicesError
    if (countError) return res.status(400).json({ error: countError.message })

    res.json({ contributors: enrichContributors(contributors, stories, photos, voices) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /memorials/:id/contributors/:contributorId/submission — get review details for one contributor
router.get('/:id/contributors/:contributorId/submission', authMiddleware, async (req, res) => {
  try {
    const memorial = await getOwnedMemorial(req.params.id, req.user.sub)
    if (!memorial) return res.status(403).json({ error: 'Not authorized' })

    const { data: contributor, error: contributorError } = await supabase
      .from('contributors')
      .select('id, name, relationship_type, relationship_label, status, questionnaire_done, photos_done, voice_done, submitted_at, created_at, updated_at')
      .eq('id', req.params.contributorId)
      .eq('memorial_id', req.params.id)
      .single()

    if (contributorError || !contributor) return res.status(404).json({ error: 'Contributor not found' })

    const [
      { data: responses, error: responsesError },
      { data: stories, error: storiesError },
      { data: photos, error: photosError },
      { data: voices, error: voicesError },
    ] = await Promise.all([
      supabase
        .from('questionnaire_responses')
        .select('id, question_text, response_text, response_audio_url, order_index, created_at, updated_at')
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', req.params.id)
        .order('order_index', { ascending: true }),
      supabase
        .from('contributor_stories')
        .select('id, contributor_id, client_story_id, title, body, created_at, updated_at')
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', req.params.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('media_assets')
        .select('id, contributor_id, storage_path, storage_bucket, file_name, file_type, file_size_bytes, taken_at, caption, is_flagged, flagged_reason, created_at')
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', req.params.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('voice_recordings')
        .select('id, contributor_id, storage_path, storage_bucket, file_name, file_type, file_size_bytes, duration_seconds, contributor_title, transcript_text, key_quote, is_flagged, flagged_reason, created_at')
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', req.params.id)
        .order('created_at', { ascending: true }),
    ])

    const detailError = responsesError || storiesError || photosError || voicesError
    if (detailError) return res.status(400).json({ error: detailError.message })

    const photosWithUrls = await createSignedAssetUrls(photos, 'photo_url')
    const voicesWithUrls = await createSignedAssetUrls(voices, 'audio_url')
    const [enrichedContributor] = enrichContributors([contributor], stories, photos, voices)

    res.json({
      contributor: enrichedContributor,
      photos: photosWithUrls,
      responses: responses || [],
      stories: stories || [],
      voices: voicesWithUrls,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /memorials/:id/contributors/:contributorId/status — organizer review status
router.patch('/:id/contributors/:contributorId/status', authMiddleware, async (req, res) => {
  try {
    const memorial = await getOwnedMemorial(req.params.id, req.user.sub)
    if (!memorial) return res.status(403).json({ error: 'Not authorized' })

    const status = String(req.body?.status || '').trim().toLowerCase()
    if (!CONTRIBUTOR_REVIEW_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid contributor status' })
    }

    const { data, error } = await supabase
      .from('contributors')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.contributorId)
      .eq('memorial_id', req.params.id)
      .select('id, name, relationship_type, relationship_label, status, questionnaire_done, photos_done, voice_done, submitted_at, created_at, updated_at')
      .single()

    if (error || !data) return res.status(404).json({ error: 'Contributor not found' })
    res.json({ contributor: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /memorials/:id/contributors/:contributorId — remove a contributor submission
router.delete('/:id/contributors/:contributorId', authMiddleware, async (req, res) => {
  try {
    const memorial = await getOwnedMemorial(req.params.id, req.user.sub)
    if (!memorial) return res.status(403).json({ error: 'Not authorized' })

    const { data: contributor, error: contributorError } = await supabase
      .from('contributors')
      .select('id')
      .eq('id', req.params.contributorId)
      .eq('memorial_id', req.params.id)
      .single()

    if (contributorError || !contributor) return res.status(404).json({ error: 'Contributor not found' })

    const [
      { data: photos },
      { data: voices },
    ] = await Promise.all([
      supabase
        .from('media_assets')
        .select('id, storage_path, storage_bucket')
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', req.params.id),
      supabase
        .from('voice_recordings')
        .select('id, storage_path, storage_bucket')
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', req.params.id),
    ])

    const assetsByBucket = [...(photos || []), ...(voices || [])].reduce((groups, asset) => {
      if (!asset.storage_bucket || !asset.storage_path) return groups
      groups[asset.storage_bucket] = groups[asset.storage_bucket] || []
      groups[asset.storage_bucket].push(asset.storage_path)
      return groups
    }, {})

    await Promise.all(Object.entries(assetsByBucket).map(([bucket, paths]) => (
      supabase.storage.from(bucket).remove(paths)
    )))

    const [
      { error: responseDeleteError },
      { error: storyDeleteError },
      { error: photoDeleteError },
      { error: voiceDeleteError },
    ] = await Promise.all([
      supabase.from('questionnaire_responses').delete().eq('contributor_id', contributor.id).eq('memorial_id', req.params.id),
      supabase.from('contributor_stories').delete().eq('contributor_id', contributor.id).eq('memorial_id', req.params.id),
      supabase.from('media_assets').delete().eq('contributor_id', contributor.id).eq('memorial_id', req.params.id),
      supabase.from('voice_recordings').delete().eq('contributor_id', contributor.id).eq('memorial_id', req.params.id),
    ])

    const deleteError = responseDeleteError || storyDeleteError || photoDeleteError || voiceDeleteError
    if (deleteError) return res.status(400).json({ error: deleteError.message })

    const { error } = await supabase
      .from('contributors')
      .delete()
      .eq('id', contributor.id)
      .eq('memorial_id', req.params.id)

    if (error) return res.status(400).json({ error: error.message })
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /memorials/:id/output
router.get('/:id/output', authMiddleware, async (req, res) => {
  try {
    const { data: output, error } = await supabase
      .from('ai_outputs')
      .select('*')
      .eq('memorial_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error || !output) return res.status(404).json({ error: 'Output not found. Generation may not be complete yet.' })
    res.json(output.output_json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /memorials/:id/share
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const { data: memorial, error: memError } = await supabase
      .from('memorials').select('id').eq('id', req.params.id).eq('user_id', req.user.sub).single()
    if (memError || !memorial) return res.status(403).json({ error: 'Not authorized' })
    const token = crypto.randomBytes(12).toString('hex')
    const { data, error } = await supabase
      .from('invite_links')
      .insert({ memorial_id: req.params.id, token, created_by: req.user.sub, is_active: true })
      .select().single()
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ share_link: { token: data.token, url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${data.token}` } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
