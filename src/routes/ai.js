require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const authMiddleware = require('../middleware/auth')
const { resolveOutputMediaUrls } = require('../services/storageUrls')
const {
  buildMemoryCorpus,
  extractThemes,
  analyzePhotoWithVision,
  assignPhotosToThemes,
  composeStorySlideshow,
  composeThemeQuotes,
} = require('../services/memorialGeneration')
const { processVoiceRecording } = require('../services/voiceProcessing')

async function updateJob(jobId, progress, current_step, status = 'processing') {
  console.log(`[Pipeline] ${progress}% — ${current_step}`)
  await supabase.from('ai_jobs').update({ progress, current_step, status }).eq('id', jobId)
}

async function saveOutput(memorialId, jobId, outputType, outputJson) {
  console.log('[Pipeline] saving output...')
  await supabase.from('ai_outputs').insert({
    memorial_id: memorialId,
    ai_job_id: jobId,
    output_type: outputType,
    output_json: outputJson,
  })
}

async function runPipelinesWithTimeout(memorialId, jobId) {
  const timeoutMs = Number(process.env.AI_PIPELINE_TIMEOUT_MS) || 8 * 60 * 1000
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Pipeline timed out after ${timeoutMs / 60000} minutes`)), timeoutMs),
  )
  return Promise.race([runPipelines(memorialId, jobId), timeoutPromise])
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

    const memoryCorpus = buildMemoryCorpus(
      responses || [],
      contributors || [],
      memorial.subject_name,
      memorial,
    )
    console.log('[Pipeline] data — responses:', responses?.length, 'photos:', photos?.length)

    await updateJob(jobId, 20, 'Finding themes from questionnaire memories...')
    const themes = await extractThemes(
      responses || [],
      contributors || [],
      memorial.subject_name,
      memorial,
    )
    console.log('[Pipeline] themes found:', themes.length)

    await updateJob(jobId, 40, 'Understanding photos...')
    let analyzedPhotos = []
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        try {
          const { data: urlData } = await supabase.storage
            .from(photo.storage_bucket || 'memorial-assets')
            .createSignedUrl(photo.storage_path, 300)
          if (urlData?.signedUrl) {
            const analysis = await analyzePhotoWithVision(
              urlData.signedUrl,
              memorial.subject_name,
            )
            analyzedPhotos.push({
              ...photo,
              analysis,
              matched_theme_ids: [],
            })
          } else {
            analyzedPhotos.push({ ...photo, analysis: null, matched_theme_ids: [] })
          }
        } catch (err) {
          console.error('[Vision] failed for photo:', photo.id, err.message)
          analyzedPhotos.push({ ...photo, analysis: null, matched_theme_ids: [] })
        }
      }

      await updateJob(jobId, 50, 'Matching photos to themes from your memories...')
      analyzedPhotos = await assignPhotosToThemes(
        analyzedPhotos,
        themes,
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
    }
    console.log('[Pipeline] photos analyzed:', analyzedPhotos.length)

    await updateJob(jobId, 65, 'Transcribing voice memos...')
    const enrichedRecordings = []
    for (const recording of recordings || []) {
      let row = recording
      if (!recording.transcript_text && recording.storage_path) {
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

    await updateJob(jobId, 70, 'Composing the memorial story...')
    let storySlides = await composeStorySlideshow({
      subjectName: memorial.subject_name,
      memorial,
      themes,
      analyzedPhotos,
      responses: responses || [],
      contributors: contributors || [],
      voiceMoments,
    })

    await updateJob(jobId, 75, 'Processing voice recordings...')
    const voices = enrichedRecordings.map((r) => {
      const tags = typeof r.ai_tags === 'object' && r.ai_tags ? r.ai_tags : {}
      return {
        id: r.id,
        contributor_title: r.contributor_title,
        key_quote: r.key_quote || r.transcript_text?.slice(0, 150) || 'No transcript yet',
        transcript_text: r.transcript_text || 'Transcription pending',
        ai_category: r.ai_category || 'memory',
        audio_url: r.storage_path,
        intro_line: tags.intro_line || null,
        clip_start_seconds: tags.clip_start_seconds ?? 0,
        clip_end_seconds: tags.clip_end_seconds ?? null,
      }
    })

    await updateJob(jobId, 85, 'Building the constellation map...')
    const constellationNodes = []
    for (const theme of themes) {
      const themePhotos = analyzedPhotos.filter((p) =>
        p.matched_theme_ids?.includes(theme.id),
      )
      const themeQuotes = await composeThemeQuotes(theme, responses || [], contributors || [])
      constellationNodes.push({
        id: theme.id,
        label: theme.label,
        summary: theme.summary,
        prominence_score: theme.prominence_score,
        quotes: themeQuotes,
        photo_urls: themePhotos.slice(0, 6).map((p) => p.storage_path),
      })
    }

    const edges =
      themes.length > 1
        ? themes.slice(0, -1).map((theme, i) => ({
            source: theme.id,
            target: themes[i + 1].id,
            relationship_type: contributors?.[0]?.relationship_type || 'friend',
            weight: 0.6,
          }))
        : []

    const albums = themes.map((theme) => {
      const themePhotos = analyzedPhotos.filter((p) =>
        p.matched_theme_ids?.includes(theme.id),
      )
      return {
        name: theme.label,
        album_name: theme.label,
        cover_photo_url: themePhotos[0]?.storage_path || null,
        photo_count: themePhotos.length,
        photos: themePhotos.map((p) => {
          const contributor = contributors?.find((c) => c.id === p.contributor_id)
          return {
            id: p.id,
            url: p.storage_path,
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
      constellation: { nodes: constellationNodes, edges },
      voices,
      photos: { albums },
    })
    await saveOutput(memorialId, jobId, 'full', outputPayload)

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

router.post('/memorials/:id/generate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.sub
    const { data: memorial, error: memError } = await supabase
      .from('memorials')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()
    if (memError || !memorial) return res.status(403).json({ error: 'Not authorized' })
    if (memorial.status === 'generating') {
      return res.status(400).json({ error: 'Generation already in progress' })
    }

    const { data: contributors } = await supabase
      .from('contributors')
      .select('id')
      .eq('memorial_id', req.params.id)
      .eq('status', 'submitted')
    if (!contributors || contributors.length === 0) {
      return res.status(400).json({
        error: 'At least one contributor must have submitted before generating',
      })
    }

    const { data: job, error: jobError } = await supabase.from('ai_jobs').insert({
      memorial_id: req.params.id,
      status: 'queued',
      progress: 0,
      current_step: 'Starting...',
      started_at: new Date().toISOString(),
    }).select().single()
    if (jobError) return res.status(400).json({ error: jobError.message })

    await supabase.from('memorials').update({ status: 'generating' }).eq('id', req.params.id)

    console.log('[Generate] starting pipeline for job:', job.id)
    runPipelinesWithTimeout(req.params.id, job.id).catch(async (err) => {
      console.error('[Generate] pipeline error:', err.message)
      await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          current_step: 'Failed',
          error_message: err.message,
        })
        .eq('id', job.id)
      await supabase.from('memorials').update({ status: 'collecting' }).eq('id', req.params.id)
    })

    res.status(201).json({
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        current_step: job.current_step,
      },
    })
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
