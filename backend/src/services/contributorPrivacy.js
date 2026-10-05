// Contributors choose on the privacy step whether their name is shown to
// viewers of the finished memorial. The real name always stays on the
// contributors row so organizers can still tell who contributed what — it is
// only the viewer-facing display name that is masked.

const ANONYMOUS_CONTRIBUTOR_NAME = 'Anonymous'

function getContributorDisplayName(contributor) {
  if (!contributor) return null
  if (contributor.is_anonymous) return ANONYMOUS_CONTRIBUTOR_NAME
  return contributor.name || null
}

// Returns copies of the contributors with `name` replaced by the viewer-facing
// display name, so every downstream `contributor.name` read is already masked.
function withContributorDisplayNames(contributors = []) {
  return (contributors || []).map((contributor) => ({
    ...contributor,
    name: getContributorDisplayName(contributor),
  }))
}

module.exports = {
  ANONYMOUS_CONTRIBUTOR_NAME,
  getContributorDisplayName,
  withContributorDisplayNames,
}
