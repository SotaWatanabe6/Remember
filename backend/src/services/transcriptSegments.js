// AssemblyAI word timestamps are milliseconds; our playback contract is seconds.
function buildTranscriptSegments(words) {
  if (!Array.isArray(words) || words.length === 0) return []
  if (words.some((word) => typeof word?.text !== 'string' || !word.text.trim()
    || !Number.isFinite(word.start) || !Number.isFinite(word.end)
    || word.start < 0 || word.end <= word.start)) return []

  const segments = []
  let line = []
  function flush() {
    if (!line.length) return
    segments.push({ start: line[0].start / 1000, end: line.at(-1).end / 1000, text: line.map((word) => word.text).join(' ') })
    line = []
  }
  for (const word of [...words].sort((a, b) => a.start - b.start)) {
    if (line.length && (word.start - line.at(-1).end > 1000 || word.end - line[0].start > 8000)) flush()
    line.push(word)
    if (line.length >= 12 || /[.!?]["”']?$/.test(word.text)) flush()
  }
  flush()
  return segments
}

module.exports = { buildTranscriptSegments }
