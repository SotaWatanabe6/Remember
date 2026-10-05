require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { withContributorDisplayNames, withOutputDisplayNames } = require('../services/contributorPrivacy')
const { getContributorHighlights } = require('../services/contributorHighlights')

// Viewer share links only; contributor invite links are rejected.
async function findActiveShareLink(token) {
  const { data: invite, error } = await supabase
    .from('invite_links')
    .select('id, memorial_id, is_active, expires_at')
    .eq('token', token)
    .eq('link_type', 'share')
    .maybeSingle()
  if (error || !invite) return { status: 404 }
  if (!invite.is_active || (invite.expires_at && new Date(invite.expires_at) < new Date())) return { status: 410 }
  return { invite }
}

// GET /share/:token — get memorial output via viewer share link
router.get('/:token', async (req, res) => {
  try {
    const { invite, status } = await findActiveShareLink(req.params.token)
    if (!invite) {
      return res.status(status).json({ error: status === 410 ? 'This link is no longer active.' : 'Memorial not found.' })
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
      // Only what the viewer page renders; never the organizer's user_id.
      .select('id, subject_name, nickname, biography, related_people, cover_photo_url, date_of_birth, date_of_passing, status')
      .eq('id', output.memorial_id)
      .single()
    if (memorialError || !memorial) {
      return res.status(404).json({ error: 'Memorial output not found.' })
    }      
    const { data: contributor, error: contributorError } = await supabase.from('contributors').select('id, name, is_anonymous, relationship_type, relationship_label, status, submitted_at, created_at').eq('memorial_id', output.memorial_id).order('created_at', { ascending: false })
    if (contributorError || !contributor) {
      return res.status(404).json({ error: 'Contributors not found.' })
    }
    // Viewers of a shared memorial never see the real name behind an anonymous contribution.
    const visibleContributors = contributor.filter((person) => ['submitted', 'approved'].includes(person.status))
    res.json({ ...withOutputDisplayNames(output.output_json, contributor), memorial: memorial || null, contributor: withContributorDisplayNames(visibleContributors) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /share/:token/contributors/:contributorId/highlights — one contributor's
// photos and quote for the constellation, scoped to the shared memorial
router.get('/:token/contributors/:contributorId/highlights', async (req, res) => {
  try {
    const { invite, status } = await findActiveShareLink(req.params.token)
    if (!invite) {
      return res.status(status).json({ error: status === 410 ? 'This link is no longer active.' : 'Memorial not found.' })
    }

    const highlights = await getContributorHighlights(supabase, invite.memorial_id, req.params.contributorId)
    if (!highlights) return res.status(404).json({ error: 'Contributor not found' })
    res.json(highlights)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
