require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { withContributorDisplayNames } = require('../services/contributorPrivacy')

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
    const { data: memorial, error: memorialError } = await supabase
      .from('memorials')
      .select('*')
      .eq('id', output.memorial_id)
      .single()
    if (memorialError || !memorial) {
      return res.status(404).json({ error: 'Memorial output not found.' })
    }      
    const { data: contributor, error: contributorError } = await supabase.from('contributors').select('id, name, is_anonymous, relationship_type, status, submitted_at, created_at').eq('memorial_id', output.memorial_id).order('created_at', { ascending: false })
    if (contributorError || !contributor) {
      return res.status(404).json({ error: 'Contributors not found.' })
    }
    // Viewers of a shared memorial never see the real name behind an anonymous contribution.
    res.json({ ...output.output_json, memorial: memorial || null, contributor: withContributorDisplayNames(contributor) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
