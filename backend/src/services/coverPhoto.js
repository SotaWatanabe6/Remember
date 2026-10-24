const { getSignedStorageObject, isHttpUrl } = require('./storageUrls')

// The API re-signs whatever a memorial's cover_photo_url points at and shows it
// to share-link viewers and contributors, so an arbitrary value would let an
// organizer read any object in storage. New values must be the organizer's own
// upload from POST /memorials/cover-photo.
const COVER_BUCKET = 'memorial-assets'

// { bucket, path } for this project's storage (bucket is null for a bare
// path, which is resolved across buckets at read time), or null otherwise.
function getCoverStorageObject(supabase, value) {
  if (typeof value !== 'string' || !value.trim()) return null
  if (isHttpUrl(value)) return getSignedStorageObject(supabase, value)
  return { bucket: null, path: value.trim().replace(/^\//, '') }
}

function isOwnCoverPhoto(supabase, value, userId) {
  const object = getCoverStorageObject(supabase, value)
  if (!object || (object.bucket && object.bucket !== COVER_BUCKET)) return false
  const [folder, owner, fileName, ...rest] = object.path.split('/')
  return folder === 'covers' && owner === String(userId) && Boolean(fileName) &&
    fileName !== '..' && fileName !== '.' && rest.length === 0
}

// Editing re-submits the cover the API returned, freshly signed, so accept any
// value that points at the same object as the one already saved.
function isSameCoverPhoto(supabase, saved, submitted) {
  if (saved === submitted) return true
  const a = getCoverStorageObject(supabase, saved)
  const b = getCoverStorageObject(supabase, submitted)
  return Boolean(a && b && a.path === b.path && (!a.bucket || !b.bucket || a.bucket === b.bucket))
}

module.exports = { isOwnCoverPhoto, isSameCoverPhoto }
