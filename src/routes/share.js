require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { resolveOutputMediaUrls, enrichMemorialForClient } = require('../services/storageUrls')
const { aggregateLabeledPeople } = require('../services/labeledPeople')

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
    console.log(invite.memorial_id);
    if (outputError || !output) {
      return res.status(404).json({ error: 'Memorial output not found.' })
    }

    const { data: memorial } = await supabase
      .from('memorials')
      .select('id, subject_name, cover_photo_url, date_of_birth, date_of_passing, nickname, biography')
      .eq('id', invite.memorial_id)
      .single()

    const { data: contributors } = await supabase
      .from('contributors')
      .select('id, name, relationship_type, status, submitted_at, created_at')
      .eq('memorial_id', invite.memorial_id)
      .order('created_at', { ascending: false })

    const { data: labeledAssets } = await supabase
      .from('media_assets')
      .select('id, people_labels, storage_path, storage_bucket')
      .eq('memorial_id', invite.memorial_id)

    const labeled_people = await aggregateLabeledPeople(supabase, labeledAssets || [])

    let resolved = output.output_json
    try {
      resolved = await Promise.race([
        resolveOutputMediaUrls(supabase, output.output_json),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Media URL signing timed out')), 25_000),
        ),
      ])
    } catch (signErr) {
      console.warn('[share] using unsigned output:', signErr.message)
    }

    const memorialForClient = await enrichMemorialForClient(supabase, memorial)

    res.json({
      ...resolved,
      memorial: memorialForClient || null,
      contributors: contributors || [],
      labeled_people,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
