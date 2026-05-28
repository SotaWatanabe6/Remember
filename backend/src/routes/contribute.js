require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

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
      .update({ relationship_type, relationship_label: relationship_label || null })
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

    const rows = responses.map(r => ({
      memorial_id: contributor.memorial_id,
      contributor_id: contributor_token,
      question_text: r.question_text,
      response_text: r.response_text,
      order_index: r.order_index
    }))

    const { error } = await supabase
      .from('questionnaire_responses')
      .insert(rows)
    if (error) return res.status(400).json({ error: error.message })

    await supabase
      .from('contributors')
      .update({ questionnaire_done: true })
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

// POST /contribute/:token/photos
router.post('/:token/photos', async (req, res) => {
  try {
    const { contributor_token } = req.body
    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' })

    const { data: contributor } = await supabase
      .from('contributors')
      .select('memorial_id')
      .eq('id', contributor_token)
      .single()

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' })

    // For MVP — just return success, Daniel's upload.js handles actual file storage
    await supabase
      .from('contributors')
      .update({ photos_done: true })
      .eq('id', contributor_token)

    res.status(201).json({
      uploaded: 0,
      files: []
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// POST /contribute/:token/voice
router.post('/:token/voice', async (req, res) => {
  try {
    const { contributor_token, contributor_title } = req.body
    if (!contributor_token) return res.status(400).json({ error: 'contributor_token is required' })
    if (!contributor_title) return res.status(400).json({ error: 'contributor_title is required' })

    const { data: contributor } = await supabase
      .from('contributors')
      .select('memorial_id')
      .eq('id', contributor_token)
      .single()

    if (!contributor) return res.status(404).json({ error: 'Contributor not found' })

    await supabase
      .from('contributors')
      .update({ voice_done: true })
      .eq('id', contributor_token)

    res.status(201).json({
      recording: {
        id: null,
        contributor_title,
        storage_path: null
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router