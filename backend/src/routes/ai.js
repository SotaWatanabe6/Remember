require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const authMiddleware = require('../middleware/auth')
const { resolveOutputMediaUrls } = require('../services/storageUrls')
const {
  buildMemoryCorpus,
  extractThemes,
  extractPhotoAlbumThemes,
  analyzePhotoWithVision,
  assignPhotosToThemes,
  buildConstellationFromPhotos,
  composeStorySlideshow,
} = require('../services/memorialGeneration')
const { processVoiceRecording } = require('../services/voiceProcessing')

const MAX_GENERATION_PHOTOS = Number(process.env.AI_PIPELINE_MAX_PHOTOS) || 60
const CAN_USE_OPENAI = Boolean(process.env.OPENAI_API_KEY)

function serializeJob(job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    current_step: job.current_step,
    error_message: job.error_message ?? null,
  }
}

async function updateJob(jobId, progress, current_step, status = 'processing') {
  console.log(`[Pipeline] ${progress}% — ${current_step}`)
  await supabase
    .from('ai_jobs')
    .update({ progress, current_step, status })
    .eq('id', jobId)
}

async function saveOutput(memorialId, jobId, outputJson) {
  console.log('[Pipeline] saving output...')
  const { error } = await supabase.from('ai_outputs').insert({
    memorial_id: memorialId,
    ai_job_id: jobId,
    output_type: 'full',
    output_json: outputJson,
  })
  if (error) throw error
}

async function runPipelinesWithTimeout(memorialId, jobId) {
  const timeoutMs = Number(process.env.AI_PIPELINE_TIMEOUT_MS) || 8 * 60 * 1000
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Pipeline timed out after ${timeoutMs / 60000} minutes`)), timeoutMs),
  )
  return Promise.race([runPipelines(memorialId, jobId), timeoutPromise])
}

function startPipeline(memorialId, jobId) {
  runPipelinesWithTimeout(memorialId, jobId).catch(async (err) => {
    console.error('[Generate] pipeline error:', err.message)
    await supabase
      .from('ai_jobs')
      .update({
        status: 'failed',
        current_step: 'Failed',
        error_message: err.message,
      })
      .eq('id', jobId)
    await supabase.from('memorials').update({ status: 'collecting' }).eq('id', memorialId)
  })
}

async function runPipelines(memorialId, jobId) {
  console.log('[Pipeline] started — memorial:', memorialId, 'job:', jobId)

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
      .order('created_at', { ascending: true })
      .limit(MAX_GENERATION_PHOTOS)
    const { data: recordings } = await supabase
      .from('voice_recordings')
      .select('*')
      .eq('memorial_id', memorialId)
    const { data: contributors } = await supabase
      .from('contributors')
      .select('*')
      .eq('memorial_id', memorialId)
      .eq('status', 'submitted')
    const { data: memorial, error: memorialError } = await supabase
      .from('memorials')
      .select('*')
      .eq('id', memorialId)
      .single()

    if (memorialError || !memorial) throw new Error('Memorial not found')

    const memoryCorpus = buildMemoryCorpus(
      responses || [],
      contributors || [],
      memorial.subject_name,
      memorial,
    )
    console.log('[Pipeline] data — responses:', responses?.length || 0, 'photos:', photos?.length || 0)

    await updateJob(jobId, 20, 'Finding themes from questionnaire memories...')
    const discoveryThemes = await extractThemes(
      responses || [],
      contributors || [],
      memorial.subject_name,
      memorial,
    )

    await updateJob(jobId, 40, 'Understanding photos...')
    let analyzedPhotos = []
    for (const photo of photos || []) {
      try {
        let signedUrl = null
        if (CAN_USE_OPENAI && photo.storage_path) {
          const { data: urlData } = await supabase.storage
            .from(photo.storage_bucket || 'memorial-assets')
            .createSignedUrl(photo.storage_path, 300)
          signedUrl = urlData?.signedUrl || null
        }

        const analysis = await analyzePhotoWithVision(signedUrl, memorial.subject_name, {
          dateOfBirth: memorial.date_of_birth,
          dateOfPassing: memorial.date_of_passing,
          deceasedPresent: null,
        })

        analyzedPhotos.push({ ...photo, analysis, matched_theme_ids: [] })
      } catch (err) {
        console.error('[Vision] failed for photo:', photo.id, err.message)
        analyzedPhotos.push({ ...photo, analysis: null, matched_theme_ids: [] })
      }
    }

    await updateJob(jobId, 50, 'Matching photos to albums...')
    const albumThemes = await extractPhotoAlbumThemes(analyzedPhotos, memorial.subject_name)
    analyzedPhotos = await assignPhotosToThemes(
      analyzedPhotos,
      albumThemes,
      memoryCorpus,
      memorial.subject_name,
    )

    for (const photo of analyzedPhotos) {
      await supabase
        .from('media_assets')
        .update({
          ai_analysis_status: 'complete',
          ai_emotion: photo.analysis?.emotion || null,
          ai_scene: photo.analysis?.scene || null,
          ai_people_count: photo.analysis?.people_count || null,
          ai_labels: {
            ...(typeof photo.ai_labels === 'object' && photo.ai_labels ? photo.ai_labels : {}),
            vision: photo.analysis,
          },
          theme_ids: photo.matched_theme_ids,
        })
        .eq('id', photo.id)
    }

    await updateJob(jobId, 65, 'Processing voice recordings...')
    const enrichedRecordings = []
    for (const recording of recordings || []) {
      let row = recording
      if (CAN_USE_OPENAI && !recording.transcript_text && recording.storage_path) {
        try {
          const { data: blob } = await supabase.storage
            .from(recording.storage_bucket || 'memorial-assets')
            .download(recording.storage_path)
          if (blob) {
            const buffer = Buffer.from(await blob.arrayBuffer())
            const contributor = contributors?.find((c) => c.id === recording.contributor_id)
            const voiceMeta = await processVoiceRecording({
              fileBuffer: buffer,
              mimeType: recording.file_type || 'audio/webm',
              fileName: recording.file_name,
              subjectName: memorial.subject_name,
              contributorName: contributor?.name,
            })
            const { data: updated } = await supabase
              .from('voice_recordings')
              .update({
                transcript_text: voiceMeta.transcript_text,
                key_quote: voiceMeta.key_quote,
                ai_category: voiceMeta.ai_category,
                transcription_status: voiceMeta.transcript_text ? 'complete' : 'failed',
                ai_tags: {
                  intro_line: voiceMeta.intro_line,
                  clip_start_seconds: voiceMeta.clip_start_seconds ?? 0,
                  clip_end_seconds: voiceMeta.clip_end_seconds ?? null,
                },
              })
              .eq('id', recording.id)
              .select('*')
              .single()
            row = updated || { ...recording, ...voiceMeta, ai_tags: voiceMeta }
          }
        } catch (voiceErr) {
          console.error('[Pipeline] voice transcription failed:', recording.id, voiceErr.message)
        }
      }
      enrichedRecordings.push(row)
    }

    const voiceMoments = enrichedRecordings
      .map((r) => {
        const tags = typeof r.ai_tags === 'object' && r.ai_tags ? r.ai_tags : {}
        const contributor = contributors?.find((c) => c.id === r.contributor_id)
        return {
          id: r.id,
          intro_line: tags.intro_line || null,
          key_quote: r.key_quote,
          storage_path: r.storage_path,
          storage_bucket: r.storage_bucket,
          clip_start_seconds: tags.clip_start_seconds ?? 0,
          clip_end_seconds: tags.clip_end_seconds,
          contributor_name: contributor?.name,
          contributor_title: r.contributor_title,
          relationship_type: contributor?.relationship_type,
          ai_category: r.ai_category,
        }
      })
      .filter((v) => v.intro_line && v.storage_path)

    await updateJob(jobId, 75, 'Composing the memorial story...')
    const storySlides = await composeStorySlideshow({
      subjectName: memorial.subject_name,
      memorial,
      themes: albumThemes,
      analyzedPhotos,
      responses: responses || [],
      contributors: contributors || [],
      voiceMoments,
    })

    const voices = enrichedRecordings.map((r) => {
      const tags = typeof r.ai_tags === 'object' && r.ai_tags ? r.ai_tags : {}
      return {
        id: r.id,
        contributor_title: r.contributor_title,
        key_quote: r.key_quote || r.transcript_text?.slice(0, 150) || 'No transcript yet',
        transcript_text: r.transcript_text || 'Transcription pending',
        ai_category: r.ai_category || 'memory',
        audio_url: r.storage_path,
        storage_bucket: r.storage_bucket,
        intro_line: tags.intro_line || null,
        clip_start_seconds: tags.clip_start_seconds ?? 0,
        clip_end_seconds: tags.clip_end_seconds ?? null,
      }
    })

    await updateJob(jobId, 85, 'Building the constellation map...')
    const constellation = await buildConstellationFromPhotos(
      analyzedPhotos,
      memorial.subject_name,
      contributors || [],
    )
    const constellationNodes = (constellation.themes || []).map((theme) =>
      typeof constellation.buildNodePayload === 'function'
        ? constellation.buildNodePayload(theme)
        : theme,
    )

    const albums = albumThemes.map((theme) => {
      const themePhotos = analyzedPhotos.filter((p) =>
        p.matched_theme_ids?.includes(theme.id),
      )
      return {
        id: theme.id,
        name: theme.label,
        album_name: theme.label,
        summary: theme.summary,
        cover_photo_url: themePhotos[0]?.storage_path || null,
        photo_count: themePhotos.length,
        photos: themePhotos.map((p) => {
          const contributor = contributors?.find((c) => c.id === p.contributor_id)
          return {
            id: p.id,
            url: p.storage_path,
            storage_path: p.storage_path,
            storage_bucket: p.storage_bucket,
            caption: p.caption,
            year: p.taken_at ? new Date(p.taken_at).getFullYear().toString() : null,
            contributor_name: contributor?.name || 'A contributor',
          }
        }),
      }
    })

    await updateJob(jobId, 95, 'Saving your memorial...')
    const outputPayload = await resolveOutputMediaUrls(supabase, {
      story: storySlides,
      constellation: { nodes: constellationNodes, edges: constellation.edges || [] },
      voices,
      photos: { albums },
      discovery_themes: discoveryThemes,
    })

    await saveOutput(memorialId, jobId, outputPayload)
    await supabase
      .from('ai_jobs')
      .update({
        status: 'complete',
        progress: 100,
        current_step: 'Complete',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
    await supabase.from('memorials').update({ status: 'complete' }).eq('id', memorialId)
    console.log('[Pipeline] complete!')
  } catch (err) {
    console.error('[Pipeline] error:', err)
    await supabase
      .from('ai_jobs')
      .update({
        status: 'failed',
        current_step: 'Failed',
        error_message: err.message,
      })
      .eq('id', jobId)
    await supabase.from('memorials').update({ status: 'collecting' }).eq('id', memorialId)
  }
}

// POST /ai/memorials/:id/generate — trigger AI generation
router.post('/memorials/:id/generate', authMiddleware, async (req, res) => {
  try {
    // verify organizer owns this memorial
    const { data: memorial, error: memError } = await supabase
      .from('memorials')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('user_id', req.user.sub)
      .single()

    if (memError || !memorial) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // check there is at least 1 submitted contributor
    const { data: contributors } = await supabase
      .from('contributors')
      .select('id')
      .eq('memorial_id', req.params.id)
      .eq('status', 'submitted')

    if (!contributors || contributors.length === 0) {
      return res.status(400).json({ error: 'At least one contributor must have submitted before generating' })
    }

    if (memorial.status === 'generating') {
      const { data: existingJob } = await supabase
        .from('ai_jobs')
        .select('id, status, progress, current_step, error_message')
        .eq('memorial_id', req.params.id)
        .in('status', ['queued', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingJob) {
        console.log('[Generate] resuming pipeline for job:', existingJob.id)
        startPipeline(req.params.id, existingJob.id)
        return res.status(202).json({ job: serializeJob(existingJob) })
      }
    }

    // create ai_job row
    const { data: job, error: jobError } = await supabase
      .from('ai_jobs')
      .insert({
        memorial_id: req.params.id,
        status: 'queued',
        progress: 0,
        current_step: 'Starting...',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (jobError) return res.status(400).json({ error: jobError.message })

    // update memorial status to generating
    await supabase
      .from('memorials')
      .update({ status: 'generating' })
      .eq('id', req.params.id)

    console.log('[Generate] starting pipeline for job:', job.id)
    startPipeline(req.params.id, job.id)

    res.status(201).json({ job: serializeJob(job) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /ai/jobs/:id/status — poll job status
router.get('/jobs/:id/status', authMiddleware, async (req, res) => {
  try {
    const { data: job, error } = await supabase
      .from('ai_jobs')
      .select('id, status, progress, current_step, error_message')
      .eq('id', req.params.id)
      .single()

    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    res.json({ job })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
