require('dotenv').config()
const express = require('express')
const { randomUUID } = require('crypto')
const { Readable } = require('stream')
const router = express.Router()
const supabase = require('../supabase')
const authMiddleware = require('../middleware/auth')
const crypto = require('crypto')
const {
  resolveOutputMediaUrls,
  resolveStorageUrl,
  enrichMemorialForClient,
  enrichMemorialsForClient,
} = require('../services/storageUrls')

const COVER_BUCKET =
  process.env.MEMORIAL_ASSETS_BUCKET ||
  process.env.STORAGE_BUCKET ||
  'memorial-assets'
const MAX_COVER_BYTES = 50 * 1024 * 1024
const ALLOWED_COVER_EXTENSIONS = new Set(['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp'])

const appBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'

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

function isFormDataFile(value) {
  return value && typeof value.name === 'string' && typeof value.arrayBuffer === 'function'
}

async function parseMultipartFormData(req) {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    const error = new Error('Upload must use multipart/form-data.')
    error.status = 415
    throw error
  }
  const request = new Request('http://remember.local/upload', {
    method: req.method,
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: 'half',
  })
  return request.formData()
}

function validateCoverFile(file) {
  const extension = getFileExtension(file.name)
  const mimeType = file.type?.startsWith('image/') ? file.type : ''
  if (!mimeType && !ALLOWED_COVER_EXTENSIONS.has(extension)) {
    return 'Only JPG, PNG, WebP, HEIC, or HEIF photos can be uploaded.'
  }
  if (file.size > MAX_COVER_BYTES) {
    return 'Photos must be smaller than 50 MB.'
  }
  return null
}

// POST /memorials/cover-photo — upload organizer portrait (before memorial exists)
router.post('/cover-photo', authMiddleware, async (req, res) => {
  try {
    const formData = await parseMultipartFormData(req)
    const file = [formData.get('file'), formData.get('photo')].find(isFormDataFile)
    if (!file) return res.status(400).json({ error: 'A photo file is required.' })

    const validationError = validateCoverFile(file)
    if (validationError) return res.status(400).json({ error: validationError })

    const userId = req.user?.id ?? req.user?.sub
    const safeFileName = sanitizeFileName(file.name)
    const storagePath = `memorials/covers/${userId}/${randomUUID()}-${safeFileName}`
    const mimeType = file.type?.startsWith('image/') ? file.type : 'image/jpeg'
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false })

    if (uploadError) return res.status(400).json({ error: uploadError.message })

    const signedUrl = await resolveStorageUrl(supabase, storagePath, COVER_BUCKET)
    res.status(201).json({
      cover_photo_url: storagePath,
      storage_path: storagePath,
      storage_bucket: COVER_BUCKET,
      url: signedUrl,
    })
  } catch (err) {
    const status = err.status || 500
    res.status(status).json({ error: err.message })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { subject_name, date_of_birth, date_of_passing, cover_photo_url, nickname, biography, related_people } = req.body
    if (!subject_name) return res.status(400).json({ error: 'subject_name is required' })
    console.log(req.body);
    const { data, error } = await supabase.from('memorials').insert({
      user_id: req.user.id, subject_name,
      date_of_birth: date_of_birth || null, date_of_passing: date_of_passing || null,
      cover_photo_url: cover_photo_url || null, nickname: nickname || null,
      biography: biography || null, related_people: related_people || null,
      status: 'collecting'
    }).select().single()
    console.log("Create memorial response:", { data, error });
    if (error) return res.status(400).json({ error: error.message })
    const memorial = await enrichMemorialForClient(supabase, data)
    res.status(201).json({ memorial })
  } catch (err) {
     res.status(500).json({ error: err.message }) }
})

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('memorials').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    const memorials = await enrichMemorialsForClient(supabase, data || [])
    res.json({ memorials })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.sub
    const updates = {}
    if (req.body.cover_photo_url !== undefined) {
      updates.cover_photo_url = req.body.cover_photo_url || null
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const { data, error } = await supabase
      .from('memorials')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) return res.status(404).json({ error: 'Memorial not found' })
    const memorial = await enrichMemorialForClient(supabase, data)
    res.json({ memorial })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.sub
    const { data, error } = await supabase
      .from('memorials')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Memorial not found' })
    const memorial = await enrichMemorialForClient(supabase, data)
    res.json({ memorial })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/invite-link', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.sub
    const { data: memorial, error: memError } = await supabase.from('memorials').select('id').eq('id', req.params.id).eq('user_id', userId).single()
    if (memError || !memorial) return res.status(403).json({ error: 'You do not own this memorial. Create it from your dashboard while logged in.' })
    const { data: existing } = await supabase.from('invite_links').select('*').eq('memorial_id', req.params.id).eq('is_active', true).maybeSingle()
    if (existing) return res.json({ invite_link: { ...existing, url: `${appBaseUrl()}/contribute/${existing.token}` } })
    const token = crypto.randomBytes(8).toString('hex')
    const { expires_at, max_uses } = req.body
    const { data, error } = await supabase.from('invite_links').insert({
      memorial_id: req.params.id, token, created_by: req.user.id,
      is_active: true, expires_at: expires_at || null, max_uses: max_uses || null, use_count: 0
    }).select().single()
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ invite_link: { ...data, url: `${appBaseUrl()}/contribute/${token}` } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/:id/invite-link', authMiddleware, async (req, res) => {
  try {
    const { is_active } = req.body
    const { data, error } = await supabase.from('invite_links').update({ is_active }).eq('memorial_id', req.params.id).select().single()
    if (error) return res.status(400).json({ error: error.message })
    res.json({ invite_link: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id/contributors', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.sub
    const { data: memorial, error: memError } = await supabase
      .from('memorials')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()
    if (memError || !memorial) {
      return res.status(403).json({ error: 'You do not own this memorial.' })
    }

    const { data, error } = await supabase
      .from('contributors')
      .select('id, name, relationship_type, status, submitted_at, created_at')
      .eq('memorial_id', req.params.id)
      .order('created_at', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    res.json({ contributors: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id/output', authMiddleware, async (req, res) => {
  try {
    const { data: output, error } = await supabase.from('ai_outputs').select('*').eq('memorial_id', req.params.id).order('created_at', { ascending: false }).limit(1).single()
    console.log(req.params.id);
    if (error || !output) return res.status(404).json({ error: 'Output not found. Generation may not be complete yet.' })

    let resolved = output.output_json
    try {
      resolved = await Promise.race([
        resolveOutputMediaUrls(supabase, output.output_json),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Media URL signing timed out')), 25_000),
        ),
      ])
    } catch (signErr) {
      console.warn('[memorials/output] using unsigned output:', signErr.message)
    }
    res.json(resolved)
  } catch (err) { 
    res.status(500).json({ error: err.message }) 
  }
})

router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.sub
    const { data: memorial, error: memError } = await supabase.from('memorials').select('id').eq('id', req.params.id).eq('user_id', userId).single()
    if (memError || !memorial) return res.status(403).json({ error: 'You do not own this memorial. Create it from your dashboard while logged in.' })
    const token = crypto.randomBytes(12).toString('hex')
    const { data, error } = await supabase.from('invite_links').insert({ memorial_id: req.params.id, token, created_by: req.user.id, is_active: true }).select().single()
    if (error) return res.status(400).json({ error: error.message })
      console.log(data);
    res.status(201).json({ share_link: { token: data.token, url: `${appBaseUrl()}/share/${data.token}` } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
