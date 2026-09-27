// Read the whole memorial pool, including rows beyond the API's default page limit.
async function loadGenerationPhotos(supabase, memorialId, contributorIds) {
  if (!contributorIds.length) return []
  const photos = []
  while (true) {
    const { data, error } = await supabase.from('media_assets').select('*')
      .eq('memorial_id', memorialId).in('contributor_id', contributorIds)
      .order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(photos.length, photos.length + 199)
    if (error) throw error
    if (!data?.length) return photos
    photos.push(...data)
  }
}

module.exports = { loadGenerationPhotos }
