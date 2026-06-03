require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /share/:token — get memorial output via viewer share link
router.get('/:token', async (req, res) => {
  try {
    // validate share token
    const { data: invite, error: inviteError } = await supabase
      .from('invite_links')
      .select('*')
      .eq('token', req.params.token)
      .single()

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Memorial not found.' })
    }

    if (!invite.is_active) {
      return res.status(410).json({ error: 'This link is no longer active.' })
    }

    // get the output
    const { data: output, error: outputError } = await supabase
      .from('ai_outputs')
      .select('*')
      .eq('memorial_id', invite.memorial_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (outputError || !output) {
      return res.status(404).json({ error: 'Memorial output not found.' })
    }

    const { data: memorial } = await supabase
      .from('memorials')
      .select('id, subject_name, date_of_birth, date_of_passing, cover_photo_url')
      .eq('id', invite.memorial_id)
      .single()

    res.json({ ...output.output_json, memorial: memorial || null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
