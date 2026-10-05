'use client';

import { useEffect, useMemo, useRef } from 'react';
import { activeTranscriptSegment, normalizeTranscriptSegments } from '@/lib/transcriptSync.mjs';

export default function SyncedTranscript({ recording, currentTime, className = '', id }) {
  const containerRef = useRef(null);
  const lineRefs = useRef([]);
  const segments = useMemo(() => normalizeTranscriptSegments(recording.transcriptSegments), [recording.transcriptSegments]);
  const hasTimings = segments.length > 0 && segments.every((segment) => segment.start !== null);
  const activeIndex = hasTimings ? activeTranscriptSegment(segments, currentTime) : -1;

  useEffect(() => {
    const container = containerRef.current;
    const line = lineRefs.current[activeIndex];
    if (!container || !line) return;
    const containerRect = container.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const top = container.scrollTop + lineRect.top - containerRect.top - (container.clientHeight - lineRect.height) / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [activeIndex]);

  if (!hasTimings) {
    const text = recording.transcriptText || segments.map((segment) => segment.text).join('\n');
    return (
      <p id={id} className={`whitespace-pre-line text-body-2 ${text ? 'text-r-text' : 'text-r-muted'} ${className}`}>
        {text || 'Transcript unavailable.'}
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      id={id}
      role="region"
      aria-label={`Transcript for ${recording.title}`}
      tabIndex={0}
      className={`max-h-[360px] min-w-0 space-y-3 overflow-y-auto overscroll-contain rounded-sm p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-r-border-focus ${className}`}
    >
      {segments.map((segment, index) => (
        <p
          key={`${segment.start}-${index}`}
          ref={(element) => { lineRefs.current[index] = element; }}
          aria-current={index === activeIndex ? 'true' : undefined}
          className={`border-l-2 px-3 py-2 text-body-2 transition-colors motion-reduce:transition-none ${index === activeIndex ? 'border-r-shape bg-r-card font-medium text-r-text' : 'border-transparent text-r-secondary'}`}
        >
          {segment.speaker ? <span className="mb-1 block text-caption">{segment.speaker}</span> : null}
          {segment.text}
        </p>
      ))}
    </div>
  );
}
