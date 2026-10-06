const { isPendingModeration } = require('./moderationState')

const TABLES = { contribution: 'contributors', photos: 'media_assets', responses: 'questionnaire_responses', voices: 'voice_recordings' }

async function getModerationItems(supabase, memorialId, contributorId) {
  const results = await Promise.all(Object.entries(TABLES).map(async ([type, table]) => {
    let query = supabase.from(table).select('*').eq('memorial_id', memorialId)
    query = query.eq(type === 'contribution' ? 'id' : 'contributor_id', contributorId)
    const { data, error } = await query
    if (error) throw error
    return [type, data || []]
  }))
  return Object.fromEntries(results)
}

function registerModerationReview(router, supabase, authMiddleware, getOwnedMemorial) {
  router.patch('/:id/contributors/:contributorId/moderation', authMiddleware, async (req, res) => {
    try {
      const memorial = await getOwnedMemorial(req.params.id, req.user.sub)
      if (!memorial) return res.status(403).json({ error: 'Not authorized' })
      if (['generating', 'complete'].includes(memorial.status)) return res.status(409).json({ error: 'Moderation can only be resolved before generation.' })
      const { type, item_id, decision, response_text, question_text } = req.body || {}
      const table = TABLES[type]
      if (!table || !['approved', 'excluded', 'edited'].includes(decision) || typeof item_id !== 'string') {
        return res.status(400).json({ error: 'Invalid moderation decision' })
      }
      const items = await getModerationItems(supabase, req.params.id, req.params.contributorId)
      if (!items.contribution.length) return res.status(404).json({ error: 'Contributor not found' })
      const row = items[type].find(item => item.id === item_id)
      if (!row) return res.status(404).json({ error: 'Contribution item not found' })
      if (!isPendingModeration(row)) return res.status(409).json({ error: 'This concern has already been resolved. Refresh the review.' })
      const reviewedAt = new Date().toISOString()
      const patch = { is_flagged: decision === 'excluded', moderation_resolution: decision === 'excluded' ? 'excluded' : 'approved', moderation_reviewed_at: reviewedAt }
      if (decision === 'edited') {
        if (type !== 'responses' || typeof response_text !== 'string' || !response_text.trim() || response_text.length > 20000 ||
          typeof question_text !== 'string' || !question_text.trim() || question_text.length > 2000) {
          return res.status(400).json({ error: 'Provide a question and a non-empty answer to save and approve.' })
        }
        Object.assign(patch, { response_text: response_text.trim(), question_text: question_text.trim(), updated_at: reviewedAt })
      }
      let query = supabase.from(table).update(patch).eq('memorial_id', req.params.id).eq('id', item_id)
      if (type !== 'contribution') query = query.eq('contributor_id', req.params.contributorId)
      const { data, error } = await query.eq('is_flagged', true).is('moderation_resolution', null).select('*').single()
      if (error || !data) return res.status(409).json({ error: error?.message || 'The review changed. Please refresh.' })
      res.json({ item: data })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
}

module.exports = { registerModerationReview, getModerationItems }
