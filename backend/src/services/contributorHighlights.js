// What a memorial viewer may see about one contributor when they open that
// contributor's node in the constellation: their photos and the answer used as
// their quote. Mirrors generation, which only reads submitted/approved work.
const VISIBLE_CONTRIBUTOR_STATUSES = ['submitted', 'approved']
const QUOTE_ORDER_INDEX = 3
const SIGNED_URL_SECONDS = 60 * 60

async function getContributorHighlights(supabase, memorialId, contributorId) {
  const { data: contributor, error: contributorError } = await supabase
    .from('contributors')
    .select('id')
    .eq('id', contributorId)
    .eq('memorial_id', memorialId)
    .in('status', VISIBLE_CONTRIBUTOR_STATUSES)
    .maybeSingle()
  if (contributorError) throw contributorError
  if (!contributor) return null

  const [{ data: photos, error: photosError }, { data: quote, error: quoteError }] = await Promise.all([
    supabase
      .from('media_assets')
      .select('id, storage_path, storage_bucket')
      .eq('contributor_id', contributor.id)
      .eq('memorial_id', memorialId)
      .order('created_at', { ascending: true }),
    supabase
      .from('questionnaire_responses')
      .select('response_text')
      .eq('contributor_id', contributor.id)
      .eq('memorial_id', memorialId)
      .eq('order_index', QUOTE_ORDER_INDEX)
      .limit(1)
      .maybeSingle(),
  ])
  if (photosError) throw photosError
  if (quoteError) throw quoteError

  const photosWithUrls = await Promise.all((photos || []).map(async (photo) => {
    const { data } = await supabase.storage
      .from(photo.storage_bucket || 'memorial-assets')
      .createSignedUrl(photo.storage_path, SIGNED_URL_SECONDS)
    return { id: photo.id, photo_url: data?.signedUrl || null }
  }))

  return {
    photos: photosWithUrls.filter((photo) => photo.photo_url),
    quote: String(quote?.response_text || '').trim() || null,
  }
}

module.exports = { getContributorHighlights }
