const UNKNOWN_VALUES = new Set([
  '',
  'unknown',
  'uncertain',
  'unsure',
  'not sure',
  'n/a',
  'na',
  'none',
])

function normalizeRelationshipGuess(raw, { confidence } = {}) {
  if (raw == null || typeof raw !== 'string') {
    return { label: null, confidence: 0, reasoning: null }
  }

  const trimmed = raw.trim()
  const lower = trimmed.toLowerCase()

  if (UNKNOWN_VALUES.has(lower)) {
    return { label: null, confidence: 0, reasoning: null }
  }

  const numericConfidence =
    typeof confidence === 'number' && !Number.isNaN(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : 0.65

  const rules = [
    { pattern: /grand\s*(child|son|daughter|kid)|grandkid/i, label: 'Grandchild' },
    { pattern: /\b(son|daughter)\b|^\s*child\s*$/i, label: 'Child' },
    { pattern: /grandparent|grandma|grandpa|grandmother|grandfather/i, label: 'Grandparent' },
    { pattern: /parent|mother|father|mom|dad|mama|papa/i, label: 'Parent' },
    { pattern: /sibling|brother|sister/i, label: 'Sibling' },
    { pattern: /spouse|husband|wife|partner|married/i, label: 'Partner / Spouse' },
    { pattern: /cousin|aunt|uncle|niece|nephew|in-?law|relative|family/i, label: 'Extended family' },
    { pattern: /friend|buddy|pal/i, label: 'Friend' },
    { pattern: /colleague|coworker|co-worker|work/i, label: 'Colleague' },
    { pattern: /classmate|school/i, label: 'Classmate' },
    { pattern: /neighbor|neighbour/i, label: 'Neighbor' },
    { pattern: /community/i, label: 'Community member' },
  ]

  for (const rule of rules) {
    if (rule.pattern.test(trimmed) || rule.pattern.test(lower)) {
      return { label: rule.label, confidence: numericConfidence, reasoning: trimmed }
    }
  }

  if (/^child$/i.test(trimmed)) {
    return { label: 'Child', confidence: numericConfidence, reasoning: trimmed }
  }

  return { label: null, confidence: 0, reasoning: trimmed }
}

module.exports = { normalizeRelationshipGuess }
