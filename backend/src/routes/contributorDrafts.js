const express = require('express')

// Match the contributor session used by the invitation flow and NS-2. Never
// authorize an item by its ID alone, or allow a previously submitted draft.
async function getContributorForInvite(supabase, req, res, requireDraft = true) {
  const contributorToken = req.body?.contributor_token || req.query?.contributor_token
  if (!contributorToken) {
    res.status(400).json({ error: 'contributor_token is required' })
    return null
  }

  const { data: invite, error: inviteError } = await supabase
    .from('invite_links')
    .select('id, memorial_id, is_active, expires_at')
    .eq('token', req.params.token)
    .single()
  if (inviteError || !invite || !invite.is_active ||
      (invite.expires_at && new Date(invite.expires_at) < new Date())) {
    res.status(410).json({ error: 'This link is no longer active.' })
    return null
  }

  const { data: contributor, error } = await supabase
    .from('contributors')
    .select('id, memorial_id, status, submitted_at')
    .eq('id', contributorToken)
    .eq('memorial_id', invite.memorial_id)
    .single()
  if (error || !contributor) {
    res.status(404).json({ error: 'Contributor not found' })
    return null
  }
  if (requireDraft && (contributor.status !== 'in_progress' || contributor.submitted_at)) {
    res.status(403).json({ error: 'Memories cannot be changed after your contribution has been submitted.' })
    return null
  }
  return contributor
}

function createContributorDraftRouter(supabase) {
  const router = express.Router()

  router.get('/:token/voice', async (req, res) => {
    try {
      const contributor = await getContributorForInvite(supabase, req, res, false)
      if (!contributor) return
      const { data, error } = await supabase.from('voice_recordings')
        .select('id, contributor_title, file_name, file_type, file_size_bytes, storage_path, storage_bucket, duration_seconds, created_at')
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', contributor.memorial_id)
        .order('created_at', { ascending: true })
      if (error) return res.status(400).json({ error: error.message })
      const voice = await Promise.all((data || []).map(async (recording) => {
        const { data: signed } = await supabase.storage.from(recording.storage_bucket)
          .createSignedUrl(recording.storage_path, 60 * 60)
        return { ...recording, audio_url: signed?.signedUrl || null }
      }))
      res.json({ contributor, voice })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  router.patch('/:token/voice/:recordingId', async (req, res) => {
    try {
      const contributor = await getContributorForInvite(supabase, req, res)
      if (!contributor) return
      const title = req.body.contributor_title
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Please add a title for this recording.' })
      }
      const { data, error } = await supabase.from('voice_recordings')
        .update({ contributor_title: title.trim(), updated_at: new Date().toISOString() })
        .eq('id', req.params.recordingId)
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', contributor.memorial_id)
        .select('id, contributor_title')
        .maybeSingle()
      if (error) return res.status(400).json({ error: error.message })
      if (!data) return res.status(404).json({ error: 'Recording not found' })
      res.json({ recording: data })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  router.delete('/:token/voice/:recordingId', async (req, res) => {
    try {
      const contributor = await getContributorForInvite(supabase, req, res)
      if (!contributor) return
      const { data: recording, error: lookupError } = await supabase.from('voice_recordings')
        .select('id, storage_path, storage_bucket')
        .eq('id', req.params.recordingId)
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', contributor.memorial_id)
        .single()
      if (lookupError || !recording) return res.status(404).json({ error: 'Recording not found' })

      const { error: storageError } = await supabase.storage.from(recording.storage_bucket)
        .remove([recording.storage_path])
      if (storageError) return res.status(400).json({ error: storageError.message })

      const { error: deleteError } = await supabase.from('voice_recordings').delete()
        .eq('id', recording.id)
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', contributor.memorial_id)
      if (deleteError) return res.status(400).json({ error: deleteError.message })

      const { count, error: countError } = await supabase.from('voice_recordings')
        .select('id', { count: 'exact', head: true })
        .eq('contributor_id', contributor.id)
        .eq('memorial_id', contributor.memorial_id)
      if (countError) return res.status(400).json({ error: countError.message })
      const { error: progressError } = await supabase.from('contributors')
        .update({ voice_done: count > 0, updated_at: new Date().toISOString() })
        .eq('id', contributor.id)
      if (progressError) return res.status(400).json({ error: progressError.message })
      res.json({ deleted: true })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  return router
}

module.exports = { createContributorDraftRouter, getContributorForInvite }
