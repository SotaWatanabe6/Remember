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
    const { subject_name, date_of_birth, date_of_passing, cover_photo_url } = req.body
    if (!subject_name) {
      return res.status(400).json({ error: 'subject_name is required' })
    }

    const { data, error } = await supabase
      .from('memorials')
      .insert({
        user_id: req.user.sub,
        subject_name,
        date_of_birth: date_of_birth || null,
        date_of_passing: date_of_passing || null,
        cover_photo_url: cover_photo_url || null,
        status: 'collecting'
      })
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
    const { data, error } = await supabase
      .from('contributors')
      .select('id, name, relationship_type, status, submitted_at, created_at')
      .eq('memorial_id', req.params.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })
    res.json({ contributors: data })
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