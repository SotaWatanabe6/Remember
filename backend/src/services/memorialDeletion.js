const { publicError, sendCaughtError } = require('../lib/httpErrors')
const { isOwnCoverPhoto, isSameCoverPhoto } = require('./coverPhoto')
const { getSignedStorageObject, isHttpUrl } = require('./storageUrls')

const PAGE_SIZE = 1000

async function readAll(supabase, table, fields, filter) {
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await filter(supabase.from(table).select(fields))
      .order('id').range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

async function collectMemorialFiles(supabase, memorial, userId) {
  const filter = (query) => query.eq('memorial_id', memorial.id)
  const [photos, voices, responses, documents] = await Promise.all([
    readAll(supabase, 'media_assets', 'id, storage_bucket, storage_path', filter),
    readAll(supabase, 'voice_recordings', 'id, storage_bucket, storage_path', filter),
    readAll(supabase, 'questionnaire_responses', 'id, response_audio_url', filter),
    readAll(supabase, 'documents', 'id, file_url', filter),
  ])
  const files = new Map()
  function add(bucket, path) {
    if (!bucket || !path) return
    if (!files.has(bucket)) files.set(bucket, new Set())
    files.get(bucket).add(path)
  }
  for (const asset of [...photos, ...voices]) add(asset.storage_bucket, asset.storage_path)

  // Only delete this project's stored objects, never external URLs or files
  // belonging to another memorial referenced by legacy document/audio data.
  for (const value of [...responses.map((row) => row.response_audio_url), ...documents.map((row) => row.file_url)]) {
    const object = isHttpUrl(value)
      ? getSignedStorageObject(supabase, value)
      : { bucket: 'memorial-assets', path: value }
    if (object?.path?.startsWith(`memorials/${memorial.id}/`)) add(object.bucket, object.path)
  }

  const cover = memorial.cover_photo_url
  if (isOwnCoverPhoto(supabase, cover, userId)) {
    const others = await readAll(supabase, 'memorials', 'id, cover_photo_url', (query) => (
      query.neq('id', memorial.id)
    ))
    if (!others.some((other) => isSameCoverPhoto(supabase, cover, other.cover_photo_url))) {
      const object = isHttpUrl(cover)
        ? getSignedStorageObject(supabase, cover)
        : { bucket: 'memorial-assets', path: cover.replace(/^\//, '') }
      add(object.bucket, object.path)
    }
  }
  return files
}

function registerMemorialDeletion(router, supabase, authMiddleware) {
  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.sub
      const { data: memorial, error } = await supabase.from('memorials')
        .select('id, status, cover_photo_url').eq('id', req.params.id).eq('user_id', userId).maybeSingle()
      if (error) throw error
      if (!memorial) throw publicError(403, 'Not authorized to delete this memorial.')

      const { data: jobs, error: jobError } = await supabase.from('ai_jobs')
        .select('id').eq('memorial_id', memorial.id).in('status', ['queued', 'processing']).limit(1)
      if (jobError) throw jobError
      if (memorial.status === 'generating' || (jobs || []).length) {
        throw publicError(409, 'Please wait for memorial generation to finish before deleting it.')
      }

      const files = await collectMemorialFiles(supabase, memorial, userId)
      // Keep the parent and its file references until storage cleanup succeeds,
      // so a failed request can be retried. Storage removal is idempotent.
      for (const [bucket, paths] of files) {
        const list = [...paths]
        for (let offset = 0; offset < list.length; offset += PAGE_SIZE) {
          const { error: storageError } = await supabase.storage.from(bucket).remove(list.slice(offset, offset + PAGE_SIZE))
          if (storageError) throw storageError
        }
      }

      // A single parent deletion lets PostgreSQL atomically cascade to the
      // contributions, themes, jobs, output, and invitation/share links.
      const { data: deleted, error: deleteError } = await supabase.from('memorials')
        .delete().eq('id', memorial.id).eq('user_id', userId).or('status.is.null,status.neq.generating').select('id').maybeSingle()
      if (deleteError) throw deleteError
      if (!deleted) throw publicError(409, 'The memorial changed while deleting. Please try again.')
      return res.json({ deleted: true })
    } catch (error) {
      return sendCaughtError(res, error)
    }
  })
}

module.exports = { registerMemorialDeletion }
