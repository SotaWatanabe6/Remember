require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const authMiddleware = require('../middleware/auth')
const crypto = require('crypto')

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
    res.json({ memorials: data })
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
      .single()
    if (error) return res.status(404).json({ error: 'Memorial not found' })
    res.json({ memorial: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /memorials/:id/invite-link — generate invite link
router.post('/:id/invite-link', authMiddleware, async (req, res) => {
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

// GET /memorials/:id/output — return full four-tab output
router.get('/:id/output', authMiddleware, async (req, res) => {
  try {
    const { data: output, error } = await supabase
      .from('ai_outputs')
      .select('*')
      .eq('memorial_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error || !output) {
      return res.status(404).json({ error: 'Output not found. Generation may not be complete yet.' })
    }
    res.json(output.output_json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /memorials/:id/share — generate viewer share token
router.post('/:id/share', authMiddleware, async (req, res) => {
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
    const token = crypto.randomBytes(12).toString('hex')
    const { data, error } = await supabase
      .from('invite_links')
      .insert({
        memorial_id: req.params.id,
        token,
        created_by: req.user.sub,
        is_active: true,
      })
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({
      share_link: {
        token: data.token,
        url: `${process.env.FRONTEND_URL}/share/${data.token}`
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router