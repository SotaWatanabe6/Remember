function seconds(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

// The API contract uses seconds. Do not guess units or invent timing from text.
export function normalizeTranscriptSegments(value) {
  if (!Array.isArray(value)) return [];
  const segments = value.map((segment) => {
    const text = typeof segment === 'string' ? segment : segment?.text || segment?.transcript || segment?.transcript_text;
    const start = seconds(segment?.start ?? segment?.start_seconds ?? segment?.start_time ?? segment?.startTime);
    const end = seconds(segment?.end ?? segment?.end_seconds ?? segment?.end_time ?? segment?.endTime);
    const timed = start !== null && end !== null && end > start;
    return {
      text: typeof text === 'string' ? text.trim() : '',
      start: timed ? start : null,
      end: timed ? end : null,
      speaker: segment?.speaker || segment?.speaker_name || '',
    };
  }).filter((segment) => segment.text);
  // Partial timing would silently omit spoken content. Keep those transcripts static.
  if (segments.some((segment) => segment.start === null)) {
    return segments.map((segment) => ({ ...segment, start: null, end: null }));
  }
  return segments.sort((a, b) => a.start - b.start);
}

export function activeTranscriptSegment(segments, currentTime) {
  if (!Number.isFinite(currentTime) || currentTime < 0) return -1;
  // Start-inclusive/end-exclusive: silence and the end of playback have no active line.
  return segments.findIndex((segment) => segment.start !== null && segment.end !== null
    && currentTime >= segment.start && currentTime < segment.end);
}
