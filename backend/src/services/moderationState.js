function needsModeration(row) {
  return !row.is_flagged && !row.moderation_resolution
}

function isPendingModeration(row) {
  return Boolean(row?.is_flagged && !row.moderation_resolution)
}

function isEligible(row) {
  return !row?.is_flagged && row?.moderation_resolution !== 'excluded'
}

async function persistModeration(supabase, table, row, result, extra = {}) {
  const patch = {
    is_flagged: Boolean(result.is_flagged),
    flagged_reason: result.flagged_reason || null,
    ...extra,
  }
  const { data, error } = await supabase.from(table).update(patch)
    .eq('id', row.id).eq('memorial_id', row.memorial_id)
    .select('id').single()
  if (error || !data) throw new Error(`Could not save moderation for ${table}: ${error?.message || 'row missing'}`)
  Object.assign(row, patch)
}

module.exports = { needsModeration, isPendingModeration, isEligible, persistModeration }
