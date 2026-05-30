require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const authMiddleware = require('../middleware/auth')

async function updateJob(jobId, progress, current_step, status = 'processing') {
  console.log(`[Pipeline] updateJob: ${progress}% — ${current_step}`)
  const { error } = await supabase
    .from('ai_jobs')
    .update({ progress, current_step, status })
    .eq('id', jobId)
  if (error) console.error('[Pipeline] updateJob error:', error)
}

async function saveOutput(memorialId, jobId, outputType, outputJson) {
  console.log('[Pipeline] saving output...')
  const { error } = await supabase
    .from('ai_outputs')
    .insert({
      memorial_id: memorialId,
      ai_job_id: jobId,
      output_type: outputType,
      output_json: outputJson
    })
  if (error) console.error('[Pipeline] saveOutput error:', error)
}

async function runPipelines(memorialId, jobId) {
  console.log('[Pipeline] runPipelines started — memorial:', memorialId, 'job:', jobId)
  try {
    await updateJob(jobId, 10, 'Gathering contributions...')

    const { data: responses } = await supabase
      .from('questionnaire_responses')
      .select('*')
      .eq('memorial_id', memorialId)

    const { data: photos } = await supabase
      .from('media_assets')
      .select('*')
      .eq('memorial_id', memorialId)

    const { data: recordings } = await supabase
      .from('voice_recordings')
      .select('*')
      .eq('memorial_id', memorialId)

    const { data: contributors } = await supabase
      .from('contributors')
      .select('*')
      .eq('memorial_id', memorialId)
      .eq('status', 'submitted')

    const { data: memorial } = await supabase
      .from('memorials')
      .select('*')
      .eq('id', memorialId)
      .single()

    console.log('[Pipeline] data collected — responses:', responses?.length, 'photos:', photos?.length)

    await updateJob(jobId, 25, 'Finding the themes across contributions...')

    const themes = responses && responses.length > 0 ? [
      {
        id: 'theme_001',
        label: 'warmth',
        category: 'personality',
        summary: `${memorial.subject_name} had a warmth that contributors consistently described.`,
        prominence_score: 0.9,
        quotes: responses.slice(0, 2).map(r => ({
          text: r.response_text,
          contributor_id: r.contributor_id,
          relationship_type: contributors?.find(c => c.id === r.contributor_id)?.relationship_type || 'unknown'
        }))
      },
      {
        id: 'theme_002',
        label: 'humor',
        category: 'personality',
        summary: `A sense of humor came through in many memories shared about ${memorial.subject_name}.`,
        prominence_score: 0.7,
        quotes: responses.slice(0, 1).map(r => ({
          text: r.response_text,
          contributor_id: r.contributor_id,
          relationship_type: contributors?.find(c => c.id === r.contributor_id)?.relationship_type || 'unknown'
        }))
      }
    ] : []

    await updateJob(jobId, 50, 'Analyzing photos and matching to themes...')

    const storySlides = photos ? photos.map((photo, i) => ({
      order_index: i + 1,
      photo_url: photo.storage_path,
      quote: responses && responses[i] ? responses[i].response_text : null,
      contributor_name: contributors?.find(c => c.id === photo.contributor_id)?.name || 'A contributor',
      relationship_type: contributors?.find(c => c.id === photo.contributor_id)?.relationship_type || 'unknown',
      theme_label: themes[0]?.label || null
    })) : []

    const albums = themes.map(theme => ({
      name: theme.label,
      cover_photo_url: photos && photos[0] ? photos[0].storage_path : null,
      photo_count: photos ? photos.length : 0,
      photos: photos ? photos.map(p => ({
        id: p.id,
        url: p.storage_path,
        caption: p.caption,
        year: p.taken_at ? new Date(p.taken_at).getFullYear().toString() : null,
        contributor_name: contributors?.find(c => c.id === p.contributor_id)?.name || 'A contributor'
      })) : []
    }))

    await updateJob(jobId, 75, 'Processing voice recordings...')

    const voices = recordings ? recordings.map(r => ({
      id: r.id,
      contributor_title: r.contributor_title,
      key_quote: r.key_quote || r.transcript_text?.slice(0, 100) || 'No transcript yet',
      transcript_text: r.transcript_text || 'Transcription pending',
      ai_category: r.ai_category || 'memory',
      audio_url: r.storage_path
    })) : []

    await updateJob(jobId, 85, 'Building the constellation map...')

    const constellation = {
      nodes: themes.map(theme => ({
        id: theme.id,
        label: theme.label,
        summary: theme.summary,
        prominence_score: theme.prominence_score,
        quotes: theme.quotes,
        photo_urls: photos ? photos.slice(0, 3).map(p => p.storage_path) : []
      })),
      edges: themes.length > 1 ? [{
        source: themes[0].id,
        target: themes[1].id,
        relationship_type: 'family',
        weight: 0.6
      }] : []
    }

    await updateJob(jobId, 95, 'Saving your memorial...')

    const finalOutput = { story: storySlides, constellation, voices, photos: { albums } }

    await saveOutput(memorialId, jobId, 'full', finalOutput)

    await supabase
      .from('ai_jobs')
      .update({ status: 'complete', progress: 100, current_step: 'Complete', completed_at: new Date().toISOString() })
      .eq('id', jobId)

    await supabase
      .from('memorials')
      .update({ status: 'complete' })
      .eq('id', memorialId)

    console.log('[Pipeline] complete!')

  } catch (err) {
    console.error('[Pipeline] error:', err)
    await supabase
      .from('ai_jobs')
      .update({ status: 'failed', current_step: 'Failed', error_message: err.message })
      .eq('id', jobId)
    await supabase
      .from('memorials')
      .update({ status: 'collecting' })
      .eq('id', memorialId)
  }
}

router.post('/memorials/:id/generate', authMiddleware, async (req, res) => {
  try {
    const { data: memorial, error: memError } = await supabase
      .from('memorials')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    if (memError || !memorial) return res.status(403).json({ error: 'Not authorized' })
    if (memorial.status === 'generating') return res.status(400).json({ error: 'Generation already in progress' })

    const { data: contributors } = await supabase
      .from('contributors')
      .select('id')
      .eq('memorial_id', req.params.id)
      .eq('status', 'submitted')

    if (!contributors || contributors.length === 0) {
      return res.status(400).json({ error: 'At least one contributor must have submitted before generating' })
    }

    const { data: job, error: jobError } = await supabase
      .from('ai_jobs')
      .insert({ memorial_id: req.params.id, status: 'queued', progress: 0, current_step: 'Starting...', started_at: new Date().toISOString() })
      .select()
      .single()

    if (jobError) return res.status(400).json({ error: jobError.message })

    await supabase.from('memorials').update({ status: 'generating' }).eq('id', req.params.id)

    console.log('[Generate] starting pipeline for job:', job.id)
    runPipelines(req.params.id, job.id).catch(err => console.error('[Generate] pipeline error:', err))

    res.status(201).json({ job: { id: job.id, status: job.status, progress: job.progress, current_step: job.current_step } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/jobs/:id/status', authMiddleware, async (req, res) => {
  try {
    const { data: job, error } = await supabase
      .from('ai_jobs')
      .select('id, status, progress, current_step, error_message')
      .eq('id', req.params.id)
      .single()

    if (error || !job) return res.status(404).json({ error: 'Job not found' })
    res.json({ job })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
