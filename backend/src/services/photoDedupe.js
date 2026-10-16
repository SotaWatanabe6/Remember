const crypto = require('crypto')
const sharp = require('sharp') // run `npm ls sharp`; if missing: npm i sharp

const NEAR_DUPLICATE_MAX_DISTANCE = 5 // out of 64 bits; raise cautiously, burst shots are legitimately different photos

/** Exact fingerprint (sha256 of bytes) + perceptual fingerprint (64-bit dHash). */
async function fingerprintPhoto(buffer) {
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')
  let dhash = null
  try {
    const data = await sharp(buffer).rotate().grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
    let bits = ''
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        bits += data[y * 9 + x] > data[y * 9 + x + 1] ? '1' : '0'
      }
    }
    dhash = bits
  } catch (err) {
    console.warn('[PhotoDedupe] perceptual hash unavailable:', err.message)
  }
  return { sha256, dhash }
}

function hammingDistance(a, b) {
  let distance = 0
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) distance += 1
  return distance
}

function isDuplicate(a, b) {
  if (!a || !b) return false
  if (a.sha256 === b.sha256) return true
  return Boolean(a.dhash && b.dhash) && hammingDistance(a.dhash, b.dhash) <= NEAR_DUPLICATE_MAX_DISTANCE
}

/**
 * Keeps one photo per duplicate group (the largest file, i.e. highest resolution).
 * Returns Map(duplicatePhotoId -> keptPhotoId).
 */
function findDuplicatePhotos(photos) {
  const kept = []
  const duplicateOf = new Map()
  for (const photo of photos) {
    if (!photo.fingerprint) { kept.push(photo); continue }
    const match = kept.find((k) => isDuplicate(k.fingerprint, photo.fingerprint))
    if (!match) { kept.push(photo); continue }
    if ((photo.file_size_bytes || 0) > (match.file_size_bytes || 0)) {
      duplicateOf.set(match.id, photo.id)
      kept[kept.indexOf(match)] = photo
    } else {
      duplicateOf.set(photo.id, match.id)
    }
  }
  return duplicateOf
}

module.exports = { fingerprintPhoto, findDuplicatePhotos }