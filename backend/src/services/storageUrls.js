const DEFAULT_BUCKET = 'memorial-assets'
const DEFAULT_EXPIRES_SECONDS = 60 * 60 * 24 // 24 hours

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

/**
 * Turn a Supabase storage path into a signed URL the browser can load.
 */
async function resolveStorageUrl(supabase, storagePath, bucket = DEFAULT_BUCKET, expiresIn = DEFAULT_EXPIRES_SECONDS) {
  if (!storagePath || typeof storagePath !== 'string') return null
  if (isHttpUrl(storagePath)) return storagePath

  const cleanPath = storagePath.replace(/^\//, '')
  const { data, error } = await supabase.storage.from(bucket || DEFAULT_BUCKET).createSignedUrl(cleanPath, expiresIn)

  if (error || !data?.signedUrl) {
    console.warn('[storageUrls] could not sign path:', cleanPath, error?.message)
    return null
  }

  return data.signedUrl
}

async function resolveMediaRecord(supabase, record) {
  if (!record || typeof record !== 'object') return record
  const bucket = record.storage_bucket || DEFAULT_BUCKET
  const path = record.storage_path || record.url || record.photo_url
  const signedUrl = await resolveStorageUrl(supabase, path, bucket)
  const photoIdentity =
    record.photo_identity ||
    (typeof record.ai_labels === 'object' && record.ai_labels?.photo_identity
      ? record.ai_labels.photo_identity
      : null)
  return {
    ...record,
    url: signedUrl || (isHttpUrl(record.url) ? record.url : null),
    photo_url: signedUrl || (isHttpUrl(record.photo_url) ? record.photo_url : null),
    photo_identity: photoIdentity,
  }
}

async function resolveUrlList(supabase, urls = []) {
  return Promise.all(
    urls.map(async (entry) => {
      if (typeof entry === 'string') {
        return resolveStorageUrl(supabase, entry)
      }
      if (entry && typeof entry === 'object') {
        const resolved = await resolveMediaRecord(supabase, entry)
        return resolved.url || resolved.photo_url || null
      }
      return null
    }),
  )
}

/**
 * Add signed URLs throughout memorial output JSON (story, constellation, photos, voices).
 */
async function resolveOutputMediaUrls(supabase, output) {
  if (!output || typeof output !== 'object') return output

  const resolved = { ...output }

  if (Array.isArray(resolved.story)) {
    resolved.story = await Promise.all(
      resolved.story.map(async (slide) => {
        const rawPhotoPath = slide.photo_url || slide.url
        const photoUrl =
          slide.slide_type === 'intro'
            ? await resolveMemorialCoverUrl(supabase, rawPhotoPath)
            : await resolveStorageUrl(supabase, rawPhotoPath)
        const audioUrl = await resolveStorageUrl(
          supabase,
          slide.audio_url,
          slide.storage_bucket || process.env.CONTRIBUTOR_VOICE_BUCKET || DEFAULT_BUCKET,
        )
        const narrationAudioUrl = await resolveStorageUrl(
          supabase,
          slide.narration_audio_url,
          slide.narration_storage_bucket || DEFAULT_BUCKET,
        )
        return {
          ...slide,
          photo_url: photoUrl,
          url: photoUrl,
          audio_url: audioUrl || slide.audio_url,
          narration_audio_url: narrationAudioUrl || slide.narration_audio_url,
        }
      }),
    )
  }

  if (resolved.constellation?.nodes) {
    resolved.constellation = {
      ...resolved.constellation,
      nodes: await Promise.all(
        resolved.constellation.nodes.map(async (node) => {
          const photoUrls = await resolveUrlList(supabase, node.photo_urls || [])
          return { ...node, photo_urls: photoUrls.filter(Boolean) }
        }),
      ),
    }
  }

  if (resolved.voices) {
    resolved.voices = await Promise.all(
      resolved.voices.map(async (voice) => {
        const audioUrl = await resolveStorageUrl(supabase, voice.audio_url || voice.storage_path)
        return { ...voice, audio_url: audioUrl }
      }),
    )
  }

  const photoAlbums = Array.isArray(resolved.photos)
    ? resolved.photos
    : resolved.photos?.albums

  if (photoAlbums?.length) {
    const albums = await Promise.all(
      photoAlbums.map(async (album) => {
        const cover = await resolveStorageUrl(supabase, album.cover_photo_url)
        const photos = await Promise.all(
          (album.photos || []).map(async (photo) => {
            const url = await resolveStorageUrl(supabase, photo.url || photo.storage_path)
            return { ...photo, url }
          }),
        )
        return {
          ...album,
          album_name: album.album_name || album.name || 'Album',
          cover_photo_url: cover,
          photos,
        }
      }),
    )
    resolved.photos = Array.isArray(resolved.photos) ? albums : { ...resolved.photos, albums }
  }

  return resolved
}

/**
 * Turn memorial cover_photo_url (storage path or legacy public URL) into a browser-ready URL.
 */
async function resolveMemorialCoverUrl(supabase, coverPhotoUrl) {
  if (!coverPhotoUrl || typeof coverPhotoUrl !== 'string') return null
  if (isHttpUrl(coverPhotoUrl)) return coverPhotoUrl

  const cleanPath = coverPhotoUrl.replace(/^\//, '')
  const buckets = [
    process.env.MEMORIAL_ASSETS_BUCKET || 'memorial-assets',
    process.env.MEMORIAL_COVER_BUCKET || 'memorial_cover_photo',
  ]

  for (const bucket of buckets) {
    const signed = await resolveStorageUrl(supabase, cleanPath, bucket)
    if (signed) return signed
  }

  return null
}

async function enrichMemorialForClient(supabase, memorial) {
  if (!memorial) return memorial
  const displayUrl = await resolveMemorialCoverUrl(supabase, memorial.cover_photo_url)
  return {
    ...memorial,
    cover_photo_url: displayUrl || memorial.cover_photo_url,
  }
}

async function enrichMemorialsForClient(supabase, memorials = []) {
  return Promise.all(memorials.map((m) => enrichMemorialForClient(supabase, m)))
}

module.exports = {
  resolveStorageUrl,
  resolveMemorialCoverUrl,
  enrichMemorialForClient,
  enrichMemorialsForClient,
  resolveMediaRecord,
  resolveOutputMediaUrls,
  isHttpUrl,
}
