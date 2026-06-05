const { resolveStorageUrl, isHttpUrl } = require('./storageUrls')

function normalizeKey(name = '', relationship = '') {
  return `${String(name).trim().toLowerCase()}|${String(relationship).trim().toLowerCase()}`
}

function isPlaceholderName(name = '') {
  const trimmed = String(name).trim()
  return !trimmed || /^someone$/i.test(trimmed)
}

function labelMatchesPersonId(label, personId) {
  const name = typeof label?.name === 'string' ? label.name.trim() : ''
  const relationship = typeof label?.relationship === 'string' ? label.relationship.trim() : ''
  if (relationship === 'memorial_subject') return false
  if (!relationship) return false

  const keys = new Set([
    normalizeKey(name, relationship),
    normalizeKey('', relationship),
    normalizeKey('someone', relationship),
  ])
  if (isPlaceholderName(name)) {
    keys.add(normalizeKey('', relationship))
    keys.add(normalizeKey('someone', relationship))
  }
  return keys.has(personId)
}

/**
 * Aggregate people_labels across memorial photos into unique relationship nodes.
 */
async function aggregateLabeledPeople(supabase, assets = []) {
  const map = new Map()

  for (const asset of assets) {
    const labels = Array.isArray(asset.people_labels) ? asset.people_labels : []
    if (!labels.length) continue

    let photoUrl = null
    if (asset.url && isHttpUrl(asset.url)) {
      photoUrl = asset.url
    } else if (asset.storage_path) {
      photoUrl = await resolveStorageUrl(
        supabase,
        asset.storage_path,
        asset.storage_bucket || 'memorial-assets',
      )
    }

    for (const label of labels) {
      const name = typeof label?.name === 'string' ? label.name.trim() : ''
      const relationship = typeof label?.relationship === 'string' ? label.relationship.trim() : ''
      if (relationship === 'memorial_subject') continue
      if (!relationship) continue

      const placeholder = isPlaceholderName(name)
      const key = normalizeKey(placeholder ? '' : name, relationship)
      const displayName = placeholder ? 'Someone' : name

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: displayName,
          needs_name: placeholder,
          relationship_type: relationship || 'Other',
          photo_count: 0,
          photo_urls: [],
          photo_ids: [],
        })
      }

      const entry = map.get(key)
      entry.photo_count += 1
      if (photoUrl && entry.photo_urls.length < 6 && !entry.photo_urls.includes(photoUrl)) {
        entry.photo_urls.push(photoUrl)
      }
      if (asset.id && !entry.photo_ids.includes(asset.id)) {
        entry.photo_ids.push(asset.id)
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.photo_count - a.photo_count)
}

/**
 * Rename a placeholder ("Someone") or unnamed labeled person across all memorial photos.
 */
async function renameLabeledPerson(supabase, memorialId, personId, newName) {
  const trimmed = String(newName || '').trim()
  if (!trimmed) {
    return { error: 'Please enter a name.' }
  }
  if (isPlaceholderName(trimmed)) {
    return { error: 'Please choose a real name, not "Someone".' }
  }

  const { data: assets, error } = await supabase
    .from('media_assets')
    .select('id, people_labels')
    .eq('memorial_id', memorialId)

  if (error) return { error: error.message }

  let photosUpdated = 0
  for (const asset of assets || []) {
    const labels = Array.isArray(asset.people_labels) ? asset.people_labels : []
    if (!labels.length) continue

    let changed = false
    const nextLabels = labels.map((label) => {
      if (!labelMatchesPersonId(label, personId)) return label
      changed = true
      return { ...label, name: trimmed }
    })

    if (!changed) continue

    const { error: updateError } = await supabase
      .from('media_assets')
      .update({ people_labels: nextLabels, updated_at: new Date().toISOString() })
      .eq('id', asset.id)

    if (updateError) return { error: updateError.message }
    photosUpdated += 1
  }

  if (!photosUpdated) {
    return { error: 'No matching photos found for this person.' }
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('media_assets')
    .select('id, people_labels, storage_path, storage_bucket')
    .eq('memorial_id', memorialId)

  if (refreshError) return { error: refreshError.message }

  const people = await aggregateLabeledPeople(supabase, refreshed || [])
  return { people, photos_updated: photosUpdated }
}

module.exports = {
  aggregateLabeledPeople,
  normalizeKey,
  isPlaceholderName,
  labelMatchesPersonId,
  renameLabeledPerson,
}
