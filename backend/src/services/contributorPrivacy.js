// Contributors choose on the privacy step whether their name is shown to
// viewers of the finished memorial. The real name always stays on the
// contributors row so organizers can still tell who contributed what — it is
// only the viewer-facing display name that is masked.

const ANONYMOUS_CONTRIBUTOR_NAME = 'Contributor'

function getContributorDisplayName(contributor) {
  if (!contributor) return null
  if (contributor.is_anonymous) {
    return String(contributor.relationship_label || '').trim()
      || String(contributor.relationship_type || '').trim().replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
      || ANONYMOUS_CONTRIBUTOR_NAME
  }
  return contributor.name || null
}

// Returns copies of the contributors with `name` replaced by the viewer-facing
// display name, so every downstream `contributor.name` read is already masked.
function withContributorDisplayNames(contributors = []) {
  return (contributors || []).map((contributor) => ({
    ...contributor,
    name: getContributorDisplayName(contributor),
    display_name: getContributorDisplayName(contributor),
  }))
}

// Apply current attribution choices when reading saved output, including older
// outputs that stored names without contributor IDs. Do not rewrite source
// quotes, transcripts, or the memorial subject's name.
function withOutputDisplayNames(output, contributors = []) {
  const byId = new Map(contributors.map((person) => [person.id, person]))
  const anonymousByName = new Map()
  for (const person of contributors) {
    if (!person.is_anonymous || !person.name) continue
    const key = person.name.trim().toLowerCase()
    const names = anonymousByName.get(key) || new Set()
    names.add(getContributorDisplayName(person))
    anonymousByName.set(key, names)
  }

  function resolve(value) {
    if (Array.isArray(value)) return value.map(resolve)
    if (!value || typeof value !== 'object') return value
    const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item)]))
    const person = byId.get(value.contributor_id) || byId.get(value.id)
    if (person) {
      const displayName = getContributorDisplayName(person)
      for (const key of ['contributor_name', 'name', 'display_name']) {
        if (Object.hasOwn(value, key)) result[key] = displayName
      }
      // Old relationship graphs used the contributor's name as the node label.
      if (value.label === person.name || value.label === 'Anonymous') result.label = displayName
      if (Object.hasOwn(value, 'contributor_name') || Object.hasOwn(value, 'name')) result.display_name = displayName
    } else if (typeof value.contributor_name === 'string') {
      const names = anonymousByName.get(value.contributor_name.trim().toLowerCase())
      if (names) result.contributor_name = names.size === 1 ? [...names][0] : ANONYMOUS_CONTRIBUTOR_NAME
      else if (value.contributor_name === 'Anonymous') {
        result.contributor_name = getContributorDisplayName({ ...value, is_anonymous: true })
      }
      result.display_name = result.contributor_name
    }
    return result
  }

  return resolve(output)
}

module.exports = {
  ANONYMOUS_CONTRIBUTOR_NAME,
  getContributorDisplayName,
  withContributorDisplayNames,
  withOutputDisplayNames,
}
