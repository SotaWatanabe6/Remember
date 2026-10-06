require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const authMiddleware = require('../middleware/auth')
const { resolveOutputMediaUrls } = require('../services/storageUrls')
const {
  buildMemoryCorpus,
  extractPhotoAlbumThemes,
  analyzePhotoWithVision,
  moderatePhotoContent,
  moderateQuestionnaireResponse,
  moderateContribution,
  assignPhotosToThemes,
  buildConstellationFromMemories,
  composeStorySlideshow,
} = require('../services/memorialGeneration')
const { processVoiceRecording, transcribeVoiceRecording } = require('../services/voiceProcessing')
const { withContributorDisplayNames } = require('../services/contributorPrivacy')

const { loadGenerationPhotos } = require('../services/generationPhotos')
const { needsModeration, isPendingModeration, isEligible, persistModeration } = require('../services/moderationState')
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
  const { error } = await supabase
    .from('ai_jobs')
    .update({ progress, current_step, status })
    .eq('id', jobId)
  if (error) throw error
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
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Pipeline timed out after ${timeoutMs / 60000} minutes`)), timeoutMs)
  })
  try { return await Promise.race([runPipelines(memorialId, jobId), timeoutPromise]) }
  finally { clearTimeout(timer) }
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

    const { data: contributorRows, error: contributorsError } = await supabase
      .from('contributors')
      .select('*')
      .eq('memorial_id', memorialId)
      .in('status', ['submitted', 'approved'])
    if (contributorsError) throw contributorsError
    // Contributors who chose to stay anonymous on the privacy step are credited
    // by their relationship everywhere the generated memorial names them.
    let contributors = withContributorDisplayNames(contributorRows || [])
    const contributorIds = contributors.map((contributor) => contributor.id)
    let { data: responses, error: responsesError } = contributorIds.length
      ? await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('memorial_id', memorialId)
        .in('contributor_id', contributorIds)
      : { data: [] }
    if (responsesError) throw responsesError
    const photos = await loadGenerationPhotos(supabase, memorialId, contributorIds)
    const { data: recordings, error: recordingsError } = contributorIds.length
      ? await supabase
        .from('voice_recordings')
        .select('*')
        .eq('memorial_id', memorialId)
        .in('contributor_id', contributorIds)
      : { data: [] }
    if (recordingsError) throw recordingsError
    const { data: memorial, error: memorialError } = await supabase
      .from('memorials')
      .select('*')
      .eq('id', memorialId)
      .single()

    if (memorialError || !memorial) throw new Error('Memorial not found')

    await updateJob(jobId, 12, 'Reviewing questionnaire answers...')
    const reviewableIds = new Set(contributors.filter(c => c.moderation_resolution !== 'excluded').map(c => c.id))
    for (const response of responses || []) {
      if (!reviewableIds.has(response.contributor_id)) continue
      if (!needsModeration(response)) continue
      const responseModeration = await moderateQuestionnaireResponse(response, memorial.subject_name)
      if (responseModeration.is_flagged) await persistModeration(supabase, 'questionnaire_responses', response, responseModeration)
    }

    await updateJob(jobId, 16, 'Reviewing full contributions...')
    for (const contributor of contributors || []) {
      if (!needsModeration(contributor)) continue
      const contributionModeration = await moderateContribution(
        responses || [], contributor, contributors || [], memorial.subject_name,
      )
      if (contributionModeration.is_flagged) {
        await persistModeration(supabase, 'contributors', contributor, contributionModeration)
      }
    }

    // Check the full photo pool before analysis/matching can remove any rows.
    await updateJob(jobId, 20, 'Reviewing photos...')
    for (const photo of photos) {
      if (!reviewableIds.has(photo.contributor_id)) continue
      if (!needsModeration(photo)) continue
      let signedUrl = null
      if (CAN_USE_OPENAI && photo.storage_path) {
        const { data, error } = await supabase.storage.from(photo.storage_bucket || 'memorial-assets')
          .createSignedUrl(photo.storage_path, 300)
        if (error || !data?.signedUrl) throw new Error('Could not read photo for moderation')
        signedUrl = data.signedUrl
      }
      const moderation = await moderatePhotoContent(signedUrl, memorial.subject_name, { biography: memorial.biography })
      await persistModeration(supabase, 'media_assets', photo, moderation, {
        is_blurry: Boolean(moderation.is_blurry),
        blur_reason: moderation.blur_reason || null,
        ai_labels: { ...(photo.ai_labels || {}), moderation },
      })
    }
    const pending = contributors.some(isPendingModeration) || [...(responses || []), ...photos, ...(recordings || [])]
      .some(row => reviewableIds.has(row.contributor_id) && isPendingModeration(row))
    if (pending) {
      await updateJob(jobId, 20, 'Review flagged contributions, then resume generation.', 'awaiting_review')
      const { error } = await supabase.from('memorials').update({ status: 'collecting' }).eq('id', memorialId)
      if (error) throw error
      return
    }
    contributors = contributors.filter(isEligible)
    const eligibleIds = new Set(contributors.map(c => c.id))
    responses = (responses || []).filter(r => isEligible(r) && eligibleIds.has(r.contributor_id))
    const eligiblePhotos = photos.filter(p => isEligible(p) && eligibleIds.has(p.contributor_id))
    const eligibleRecordings = (recordings || []).filter(r => isEligible(r) && eligibleIds.has(r.contributor_id))
    if (!contributors.length) throw new Error('No contributions remain eligible after moderation review')

    const memoryCorpus = buildMemoryCorpus(
      responses || [],
      contributors || [],
      memorial.subject_name,
      memorial,
    )
    console.log('[Pipeline] data — responses:', responses?.length || 0, 'photos:', photos?.length || 0)

    let discoveryThemes = []

    await updateJob(jobId, 40, 'Understanding photos...')
    let analyzedPhotos = []
    for (const photo of eligiblePhotos) {
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
    const albumThemes = await extractPhotoAlbumThemes(analyzedPhotos, memorial.subject_name, contributors || [])
    analyzedPhotos = await assignPhotosToThemes(analyzedPhotos, albumThemes, memoryCorpus, memorial.subject_name, contributors || [])

    for (const photo of analyzedPhotos) {
      const { error } = await supabase
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
      if (error) throw error
    }

    await updateJob(jobId, 65, 'Processing voice recordings...')
    const enrichedRecordings = []
    for (const recording of eligibleRecordings) {
      let row = recording
      const needsTranscript = !recording.transcript_text
      const needsTimings = !Array.isArray(recording.transcript_segments) || !recording.transcript_segments.length
      if (process.env.ASSEMBLYAI_API_KEY && (needsTranscript || needsTimings) && recording.storage_path) {
        try {
          const { data: blob } = await supabase.storage
            .from(recording.storage_bucket || 'memorial-assets')
            .download(recording.storage_path)
          if (blob) {
            const buffer = Buffer.from(await blob.arrayBuffer())
            const contributor = contributors?.find((c) => c.id === recording.contributor_id)
            const voiceMeta = needsTranscript ? await processVoiceRecording({
              fileBuffer: buffer,
              mimeType: recording.file_type || 'audio/webm',
              fileName: recording.file_name,
              subjectName: memorial.subject_name,
              contributorName: contributor?.name,
            }) : await transcribeVoiceRecording(buffer)
            // A failed timing backfill must not erase an existing transcript or highlight.
            if (!voiceMeta.transcript_text) {
              if (needsTranscript) await supabase.from('voice_recordings').update({ transcription_status: 'failed' }).eq('id', recording.id)
              enrichedRecordings.push(recording)
              continue
            }
            const updates = {
              transcript_text: voiceMeta.transcript_text,
              transcript_segments: voiceMeta.transcript_segments,
              transcription_status: 'complete',
              ...(needsTranscript ? {
                key_quote: voiceMeta.key_quote,
                ai_category: voiceMeta.ai_category,
                ai_tags: {
                  intro_line: voiceMeta.intro_line,
                  clip_start_seconds: voiceMeta.clip_start_seconds ?? 0,
                  clip_end_seconds: voiceMeta.clip_end_seconds ?? null,
                },
              } : {}),
            }
            const { data: updated, error: updateError } = await supabase
              .from('voice_recordings')
              .update(updates)
              .eq('id', recording.id)
              .select('*')
              .single()
            if (updateError) throw updateError
            row = updated || { ...recording, ...updates }
          }
        } catch (voiceErr) {
          console.error('[Pipeline] voice transcription failed:', recording.id, voiceErr.message)
        }
      }
      enrichedRecordings.push(row)
    }

    await updateJob(jobId, 75, 'Composing the memorial story...')
    const storySlides = await composeStorySlideshow({
      subjectName: memorial.subject_name,
      memorial,
      themes: albumThemes,
      analyzedPhotos,
      responses: responses || [],
      contributors: contributors || [],
      voiceRecordings: enrichedRecordings,
    })

    const voices = enrichedRecordings.map((r) => {
      const tags = typeof r.ai_tags === 'object' && r.ai_tags ? r.ai_tags : {}
      const contributor = contributors.find((person) => person.id === r.contributor_id)
      return {
        id: r.id,
        contributor_id: r.contributor_id,
        contributor_name: contributor?.display_name || 'A contributor',
        contributor_title: r.contributor_title,
        key_quote: r.key_quote || r.transcript_text?.slice(0, 150) || 'No transcript yet',
        transcript_text: r.transcript_text || 'Transcription pending',
        transcript_segments: Array.isArray(r.transcript_segments) ? r.transcript_segments : [],
        duration_seconds: r.duration_seconds,
        ai_category: r.ai_category || 'memory',
        audio_url: r.storage_path,
        storage_bucket: r.storage_bucket,
        intro_line: tags.intro_line || null,
        clip_start_seconds: tags.clip_start_seconds ?? 0,
        clip_end_seconds: tags.clip_end_seconds ?? null,
      }
    })

    await updateJob(jobId, 85, 'Building the constellation map...')
    const constellation = await buildConstellationFromMemories({
      analyzedPhotos,
      subjectName: memorial.subject_name,
      contributors: contributors || [],
      responses: responses || [],
    })

    discoveryThemes = constellation.nodes || []

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
            contributor_id: p.contributor_id,
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
      constellation,
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
      .in('status', ['submitted', 'approved'])

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
      .select('id, memorial_id, status, progress, current_step, error_message')
      .eq('id', req.params.id)
      .single()

    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    const { data: memorial } = await supabase
      .from('memorials')
      .select('id')
      .eq('id', job.memorial_id)
      .eq('user_id', req.user.sub)
      .maybeSingle()

    // Same response as a missing job so job ids of other memorials are not confirmed.
    if (!memorial) return res.status(404).json({ error: 'Job not found' })

    const { memorial_id: _memorialId, ...jobStatus } = job
    res.json({ job: jobStatus })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
