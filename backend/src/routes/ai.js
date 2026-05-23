require('dotenv').config()
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const authMiddleware = require('../middleware/auth')

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

    // create ai_job row
    const { data: job, error: jobError } = await supabase
      .from('ai_jobs')
      .insert({
        memorial_id: req.params.id,
        status: 'queued',
        progress: 0,
        current_step: 'Starting...'
      })
      .select()
      .single()

    if (jobError) return res.status(400).json({ error: jobError.message })

    // update memorial status to generating
    await supabase
      .from('memorials')
      .update({ status: 'generating' })
      .eq('id', req.params.id)

    res.status(201).json({
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        current_step: job.current_step
      }
    })
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