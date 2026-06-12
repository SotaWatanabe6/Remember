require('dotenv').config()
const express = require('express')
const { randomUUID } = require('crypto')
const { Readable } = require('stream')
const router = express.Router()
const supabase = require('../supabase')
const { extractAudioDuration } = require('../services/duration')
const { extractImageMetadata } = require('../services/exif')

const PHOTO_STORAGE_BUCKET =
  process.env.CONTRIBUTOR_PHOTO_BUCKET ||
  process.env.MEMORIAL_ASSETS_BUCKET ||
  process.env.STORAGE_BUCKET ||
  'memorial-assets'
const VOICE_STORAGE_BUCKET =
  process.env.CONTRIBUTOR_VOICE_BUCKET ||
  process.env.MEMORIAL_ASSETS_BUCKET ||
  process.env.STORAGE_BUCKET ||
  'memorial-assets'
const MAX_PHOTO_BYTES = 50 * 1024 * 1024
const MAX_AUDIO_BYTES = 50 * 1024 * 1024
const MAX_CONTRIBUTOR_PHOTOS = 500
const MAX_PHOTO_UPLOAD_BATCH_SIZE = 20
const ALLOWED_PHOTO_EXTENSIONS = new Set(['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp'])
const ALLOWED_AUDIO_EXTENSIONS = new Set(['m4a', 'mp3', 'wav', 'webm'])
const PHOTO_MIME_BY_EXTENSION = {
  heic: 'image/heic',
  heif: 'image/heif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
}
const AUDIO_MIME_BY_EXTENSION = {
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  webm: 'audio/webm'
}

function getFileExtension(fileName = '') {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function sanitizeFileName(fileName = 'photo') {
  const cleaned = fileName
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned || 'photo'
}

function getPhotoMimeType(file) {
  const extension = getFileExtension(file.name)
  if (file.type?.startsWith('image/')) return file.type
  return PHOTO_MIME_BY_EXTENSION[extension] || ''
}

function getAudioMimeType(file) {
  const extension = getFileExtension(file.name)
  if (file.type?.startsWith('audio/')) return file.type
  return AUDIO_MIME_BY_EXTENSION[extension] || ''
}

function validatePhotoFile(file) {
  const extension = getFileExtension(file.name)
  const mimeType = getPhotoMimeType(file)

  if (!mimeType || !ALLOWED_PHOTO_EXTENSIONS.has(extension)) {
    return 'Only JPG, PNG, WebP, HEIC, or HEIF photos can be uploaded.'
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return 'Photos must be smaller than 50 MB.'
  }

  return null
}

function validateVoiceFile(file) {
  const extension = getFileExtension(file.name)
  const mimeType = getAudioMimeType(file)

  if (!mimeType && !ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return 'This file type is not supported. Please upload an M4A, MP3, or WAV file.'
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return 'This file is too large. Please choose a smaller audio file.'
  }

  return null
}

function isFormDataFile(value) {
  return value && typeof value.name === 'string' && typeof value.arrayBuffer === 'function'
}

async function parseMultipartFormData(req) {
  const contentType = req.headers['content-type'] || ''

  if (!contentType.includes('multipart/form-data')) {
    const error = new Error('Photo upload must use multipart/form-data.')
    error.status = 415
    throw error
  }

  const request = new Request('http://remember.local/upload', {
    method: req.method,
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: 'half'
  })

  return request.formData()
}

// GET /contribute/:token — validate invite token
router.get('/:token', async (req, res) => {
  try {
    const { data: invite, error } = await supabase
      .from('invite_links')
      .select('*')
      .eq('token', req.params.token)
      .single()

    if (error || !invite) {
      return res.status(404).json({ error: 'Invite link not found' })
    }

    if (!invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This link has expired.' })
    }

    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return res.status(410).json({ error: 'This link has reached its maximum uses.' })
    }

    const { data: memorial } = await supabase
      .from('memorials')
      .select('id, subject_name, cover_photo_url')
      .eq('id', invite.memorial_id)
      .single()

    res.json({
      memorial,
      invite: {
        token: invite.token,
        is_active: invite.is_active,
        use_count: invite.use_count
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/start — create contributor session
router.post('/:token/start', async (req, res) => {
  try {
    const { name, email } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const { data: invite, error } = await supabase
      .from('invite_links')
      .select('*')
      .eq('token', req.params.token)
      .single()

    if (error || !invite || !invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    const { data: contributor, error: contribError } = await supabase
      .from('contributors')
      .insert({
        memorial_id: invite.memorial_id,
        invite_link_id: invite.id,
        name,
        email: email || null,
        status: 'in_progress'
      })
      .select()
      .single()

    if (contribError) return res.status(400).json({ error: contribError.message })

    // increment use_count
    await supabase
      .from('invite_links')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)

    res.status(201).json({
      contributor: {
        id: contributor.id,
        memorial_id: contributor.memorial_id,
        name: contributor.name,
        status: contributor.status
      },
      contributor_token: contributor.id
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/relationship — save relationship type
router.post('/:token/relationship', async (req, res) => {
  try {
    const { contributor_token, relationship_type, relationship_label } = req.body
    if (!contributor_token || !relationship_type) {
      return res.status(400).json({ error: 'contributor_token and relationship_type are required' })
    }

    const { data, error } = await supabase
      .from('contributors')
      .update({
        relationship_type,
        relationship_label: relationship_label || null,
        is_anonymous: typeof req.body.is_anonymous === 'boolean' ? req.body.is_anonymous : false,
      })
      .eq('id', contributor_token)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ contributor: { id: data.id, relationship_type: data.relationship_type } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/responses — save questionnaire responses
router.post('/:token/responses', async (req, res) => {
  try {
    const { contributor_token, responses } = req.body
    if (!contributor_token || !responses || !responses.length) {
      return res.status(400).json({ error: 'contributor_token and responses are required' })
    }

    const { data: contributor } = await supabase
      .from('contributors')
      .select('memorial_id')
      .eq('id', contributor_token)
      .single()

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' })

    const now = new Date().toISOString()
    const rows = responses.map(r => ({
      memorial_id: contributor.memorial_id,
      contributor_id: contributor_token,
      question_text: r.question_text,
      response_text: r.response_text,
      order_index: r.order_index,
      updated_at: now
    }))

    const orderIndexes = rows
      .map(row => row.order_index)
      .filter(orderIndex => Number.isInteger(orderIndex))

    if (orderIndexes.length) {
      const { error: deleteError } = await supabase
        .from('questionnaire_responses')
        .delete()
        .eq('contributor_id', contributor_token)
        .in('order_index', orderIndexes)

      if (deleteError) return res.status(400).json({ error: deleteError.message })
    }

    const { error } = await supabase
      .from('questionnaire_responses')
      .insert(rows)
    if (error) return res.status(400).json({ error: error.message })

    await supabase
      .from('contributors')
      .update({ updated_at: now })
      .eq('id', contributor_token)

    res.json({ saved: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/submit — finalize contribution
router.post('/:token/submit', async (req, res) => {
  try {
    const { contributor_token } = req.body
    if (!contributor_token) {
      return res.status(400).json({ error: 'contributor_token is required' })
    }

    const { data, error } = await supabase
      .from('contributors')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', contributor_token)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ contributor: { id: data.id, status: data.status, submitted_at: data.submitted_at } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /contribute/:token/photos — list saved contributor photos
router.get('/:token/photos', async (req, res) => {
  try {
    const contributor_token = req.query.contributor_token
    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' })

    const { data: invite, error: inviteError } = await supabase
      .from('invite_links')
      .select('id, memorial_id, is_active')
      .eq('token', req.params.token)
      .single()

    if (inviteError || !invite || !invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    const { data: contributor } = await supabase
      .from('contributors')
      .select('id, memorial_id')
      .eq('id', contributor_token)
      .single()

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' })
    if (contributor.memorial_id !== invite.memorial_id) {
      return res.status(403).json({ error: 'Contributor does not belong to this invitation.' })
    }

    const { data: photos, error } = await supabase
      .from('media_assets')
      .select('id, storage_path, storage_bucket, file_name, file_type, file_size_bytes, taken_at, caption, created_at')
      .eq('contributor_id', contributor.id)
      .eq('memorial_id', contributor.memorial_id)
      .order('created_at', { ascending: true })

    if (error) return res.status(400).json({ error: error.message })

    const photosWithUrls = await Promise.all((photos || []).map(async (photo) => {
      const { data } = await supabase.storage
        .from(photo.storage_bucket || PHOTO_STORAGE_BUCKET)
        .createSignedUrl(photo.storage_path, 60 * 60)

      return {
        ...photo,
        url: data?.signedUrl || null,
        photo_url: data?.signedUrl || null
      }
    }))

    res.json({
      photos: photosWithUrls,
      count: photosWithUrls.length,
      max_photos: MAX_CONTRIBUTOR_PHOTOS,
      remaining: Math.max(MAX_CONTRIBUTOR_PHOTOS - photosWithUrls.length, 0)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /contribute/:token/photos
router.post('/:token/photos', async (req, res) => {
  try {
    const formData = await parseMultipartFormData(req)
    const contributor_token = formData.get('contributor_token')
    const submittedFiles = [
      ...formData.getAll('files[]'),
      ...formData.getAll('files'),
      ...formData.getAll('photos')
    ].filter(isFormDataFile)

    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' })
    if (!submittedFiles.length) return res.status(400).json({ error: 'At least one photo file is required.' })
    if (submittedFiles.length > MAX_PHOTO_UPLOAD_BATCH_SIZE) {
      return res.status(413).json({
        error: `Please upload no more than ${MAX_PHOTO_UPLOAD_BATCH_SIZE} photos at a time.`,
        code: 'photo_batch_too_large',
        max_batch_size: MAX_PHOTO_UPLOAD_BATCH_SIZE
      })
    }

    const { data: invite, error: inviteError } = await supabase
      .from('invite_links')
      .select('id, memorial_id, is_active')
      .eq('token', req.params.token)
      .single()

    if (inviteError || !invite || !invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    const { data: contributor } = await supabase
      .from('contributors')
      .select('id, memorial_id')
      .eq('id', contributor_token)
      .single()

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' })
    if (contributor.memorial_id !== invite.memorial_id) {
      return res.status(403).json({ error: 'Contributor does not belong to this invitation.' })
    }

    const uploadErrors = []
    const validFiles = []

    for (const file of submittedFiles) {
      const validationError = validatePhotoFile(file)
      if (validationError) {
        uploadErrors.push({ file_name: file.name || 'photo', error: validationError })
      } else {
        validFiles.push(file)
      }
    }

    if (!validFiles.length) {
      return res.status(400).json({
        error: 'No photos were uploaded.',
        uploaded: 0,
        files: [],
        errors: uploadErrors
      })
    }

    const { count: existingPhotoCount, error: countError } = await supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('contributor_id', contributor.id)
      .eq('memorial_id', contributor.memorial_id)

    if (countError) return res.status(400).json({ error: countError.message })

    const savedPhotoCount = existingPhotoCount || 0
    const remainingPhotoSlots = Math.max(MAX_CONTRIBUTOR_PHOTOS - savedPhotoCount, 0)

    if (validFiles.length > remainingPhotoSlots) {
      return res.status(409).json({
        error: `This contribution can include up to ${MAX_CONTRIBUTOR_PHOTOS} photos.`,
        code: 'photo_limit_exceeded',
        max_photos: MAX_CONTRIBUTOR_PHOTOS,
        uploaded_count: savedPhotoCount,
        remaining: remainingPhotoSlots
      })
    }

    const uploadedFiles = []

    for (const file of validFiles) {
      const safeFileName = sanitizeFileName(file.name)
      const storagePath = `memorials/${contributor.memorial_id}/contributions/${contributor.id}/photos/${randomUUID()}-${safeFileName}`
      const mimeType = getPhotoMimeType(file)
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      const exifData = await extractImageMetadata(fileBuffer)

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_STORAGE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: false
        })

      if (uploadError) {
        uploadErrors.push({ file_name: file.name || 'photo', error: uploadError.message })
        continue
      }

      const { data: mediaAsset, error: mediaError } = await supabase
        .from('media_assets')
        .insert({
          memorial_id: contributor.memorial_id,
          contributor_id: contributor.id,
          storage_path: storagePath,
          storage_bucket: PHOTO_STORAGE_BUCKET,
          file_name: file.name || safeFileName,
          file_type: mimeType,
          file_size_bytes: file.size || null,
          taken_at: exifData?.takenAt ?? null,
          caption: null
        })
        .select('id, storage_path, storage_bucket, file_name, file_type, file_size_bytes, taken_at, caption')
        .single()

      if (mediaError) {
        await supabase.storage.from(PHOTO_STORAGE_BUCKET).remove([storagePath])
        uploadErrors.push({ file_name: file.name || 'photo', error: mediaError.message })
        continue
      }

      uploadedFiles.push(mediaAsset)
    }

    if (!uploadedFiles.length) {
      return res.status(400).json({
        error: 'No photos were uploaded.',
        uploaded: 0,
        files: [],
        errors: uploadErrors
      })
    }

    await supabase
      .from('contributors')
      .update({ photos_done: true, updated_at: new Date().toISOString() })
      .eq('id', contributor.id)

    res.status(uploadErrors.length ? 207 : 201).json({
      uploaded: uploadedFiles.length,
      files: uploadedFiles,
      errors: uploadErrors
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// PATCH /contribute/:token/photos/:assetId — update caption
router.patch('/:token/photos/:assetId', async (req, res) => {
  try {
    const { contributor_token, caption } = req.body
    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' })

    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .select('id, contributor_id')
      .eq('id', req.params.assetId)
      .eq('contributor_id', contributor_token)
      .single()

    if (assetError || !asset) return res.status(404).json({ error: 'Photo not found' })

    const { data, error } = await supabase
      .from('media_assets')
      .update({ caption: caption ?? null })
      .eq('id', req.params.assetId)
      .select('id, caption')
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ asset: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /contribute/:token/photos/:assetId
router.delete('/:token/photos/:assetId', async (req, res) => {
  try {
    const { contributor_token } = req.body

    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' })

    const { data: invite, error: inviteError } = await supabase
      .from('invite_links')
      .select('id, memorial_id, is_active')
      .eq('token', req.params.token)
      .single()

    if (inviteError || !invite || !invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .select('id, contributor_id, memorial_id, storage_path, storage_bucket')
      .eq('id', req.params.assetId)
      .eq('contributor_id', contributor_token)
      .eq('memorial_id', invite.memorial_id)
      .single()

    if (assetError || !asset) return res.status(404).json({ error: 'Photo not found' })

    const { error: storageError } = await supabase.storage
      .from(asset.storage_bucket || PHOTO_STORAGE_BUCKET)
      .remove([asset.storage_path])

    if (storageError) return res.status(400).json({ error: storageError.message })

    const { error: deleteError } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', asset.id)

    if (deleteError) return res.status(400).json({ error: deleteError.message })

    const { count } = await supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('contributor_id', contributor_token)

    if (count === 0) {
      await supabase
        .from('contributors')
        .update({ photos_done: false, updated_at: new Date().toISOString() })
        .eq('id', contributor_token)
    }

    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// POST /contribute/:token/voice
router.post('/:token/voice', async (req, res) => {
  try {
    const formData = await parseMultipartFormData(req)
    const contributor_token = formData.get('contributor_token')
    const contributor_title = String(formData.get('contributor_title') || '').trim()
    const submittedFile = [
      formData.get('file'),
      formData.get('audio'),
      formData.get('recording')
    ].find(isFormDataFile)

    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' })
    if (!contributor_title) return res.status(400).json({ error: 'Please add a title for this recording.' })
    if (!submittedFile) return res.status(400).json({ error: 'Please choose an audio file.' })

    const validationError = validateVoiceFile(submittedFile)
    if (validationError) return res.status(400).json({ error: validationError })

    const { data: invite, error: inviteError } = await supabase
      .from('invite_links')
      .select('id, memorial_id, is_active')
      .eq('token', req.params.token)
      .single()

    if (inviteError || !invite || !invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    const { data: contributor } = await supabase
      .from('contributors')
      .select('id, memorial_id')
      .eq('id', contributor_token)
      .single()

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' })
    if (contributor.memorial_id !== invite.memorial_id) {
      return res.status(403).json({ error: 'Contributor does not belong to this invitation.' })
    }

    const safeFileName = sanitizeFileName(submittedFile.name || 'voice-recording')
    const storagePath = `memorials/${contributor.memorial_id}/contributions/${contributor.id}/voice/${randomUUID()}-${safeFileName}`
    const mimeType = getAudioMimeType(submittedFile)
    const fileBuffer = Buffer.from(await submittedFile.arrayBuffer())
    const durationSeconds = await extractAudioDuration(fileBuffer, mimeType)

    const { error: uploadError } = await supabase.storage
      .from(VOICE_STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      })

    if (uploadError) return res.status(400).json({ error: uploadError.message })

    const { data: recording, error: recordingError } = await supabase
      .from('voice_recordings')
      .insert({
        memorial_id: contributor.memorial_id,
        contributor_id: contributor.id,
        storage_path: storagePath,
        storage_bucket: VOICE_STORAGE_BUCKET,
        file_name: submittedFile.name || safeFileName,
        file_type: mimeType,
        file_size_bytes: submittedFile.size || null,
        duration_seconds: durationSeconds,
        contributor_title
      })
      .select('id, contributor_title, storage_path, storage_bucket, file_name, file_type, file_size_bytes, duration_seconds')
      .single()

    if (recordingError) {
      await supabase.storage.from(VOICE_STORAGE_BUCKET).remove([storagePath])
      return res.status(400).json({ error: recordingError.message })
    }

    await supabase
      .from('contributors')
      .update({ voice_done: true, updated_at: new Date().toISOString() })
      .eq('id', contributor_token)

    res.status(201).json({
      recording
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// GET /contribute/:contributorid/photoUrls — list saved contributor photos on a memorial
router.get('/:contributorid/photoUrls', async (req, res) => {
  try {
    const contributor_id = req.params.contributorid
    console.log(contributor_id);
    if (!contributor_id) return res.status(400).json({ error: 'contributor id is required' })
    const { data: contributor } = await supabase
      .from('contributors')
      .select('id, memorial_id')
      .eq('id', contributor_id)
      .single()

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' })

    const { data: photos, error } = await supabase
      .from('media_assets')
      .select('id, storage_path, storage_bucket, file_name, file_type, file_size_bytes, taken_at, caption, created_at')
      .eq('contributor_id', contributor.id)
      .eq('memorial_id', contributor.memorial_id)
      .order('created_at', { ascending: true })

    if (error) return res.status(400).json({ error: error.message })

    const photosWithUrls = await Promise.all((photos || []).map(async (photo) => {
      const { data } = await supabase.storage
        .from(photo.storage_bucket || PHOTO_STORAGE_BUCKET)
        .createSignedUrl(photo.storage_path, 60 * 60)

      return {
        ...photo,
        url: data?.signedUrl || null,
        photo_url: data?.signedUrl || null
      }
    }))

    res.json({
      photos: photosWithUrls,
      count: photosWithUrls.length,
      max_photos: MAX_CONTRIBUTOR_PHOTOS,
      remaining: Math.max(MAX_CONTRIBUTOR_PHOTOS - photosWithUrls.length, 0)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
