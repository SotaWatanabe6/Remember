'use client';

import { useMemo, useState } from 'react';
import CustomAudioPlayer from './CustomAudioPlayer';

function formatRelationship(value) {
  if (!value) return null;
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSegmentTime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getSegmentText(segment) {
  if (typeof segment === 'string') return segment;
  return segment?.text || segment?.transcript || segment?.transcript_text || '';
}

function SegmentTranscript({ segments }) {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {segments.map((segment, index) => {
        const text = getSegmentText(segment);
        if (!text) return null;

        const start = formatSegmentTime(segment?.start ?? segment?.start_time ?? segment?.startTime);
        const end = formatSegmentTime(segment?.end ?? segment?.end_time ?? segment?.endTime);
        const speaker = segment?.speaker || segment?.speaker_name;
        const label = [speaker, start && end ? `${start}-${end}` : start].filter(Boolean).join(' - ');

        return (
          <div key={`${label || 'segment'}-${index}`} className="rounded-lg bg-white/70 px-4 py-3">
            {label ? (
              <p className="mb-1 text-xs font-medium uppercase leading-4 text-slate-500">{label}</p>
            ) : null}
            <p className="text-sm leading-6 text-slate-700">{text}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function VoiceRecordingCard({
  recording,
  isActive,
  onPlay,
  onPause,
  onEnded,
}) {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const transcriptId = `voice-transcript-${recording.id}`;
  const relationship = formatRelationship(recording.relationshipType);
  const hasSegments = Array.isArray(recording.transcriptSegments) && recording.transcriptSegments.length > 0;
  const hasTranscript = Boolean(recording.transcriptText) || hasSegments;
  const contributorLine = useMemo(() => {
    return [recording.contributorName, relationship].filter(Boolean).join(' - ');
  }, [recording.contributorName, relationship]);

  return (
    <article className="rounded-[10px] border border-[#90a1b9]/60 bg-[#90a1b9]/15 p-5 shadow-auth sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {recording.category ? (
              <span className="rounded-full bg-[#b8cae0] px-3 py-1 text-xs font-medium text-[#2d3748]">
                {recording.category}
              </span>
            ) : null}
            {recording.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#90a1b9]/60 bg-white/70 px-2.5 py-1 text-xs text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="mt-4 text-xl font-medium leading-7 text-neutral-950">{recording.title}</h3>
          {contributorLine ? (
            <p className="mt-1 text-sm leading-5 text-slate-500">{contributorLine}</p>
          ) : null}

          {recording.keyQuote ? (
            <blockquote className="mt-4 border-l-2 border-[#90a1b9] pl-4 text-base italic leading-7 text-slate-700">
              &ldquo;{recording.keyQuote}&rdquo;
            </blockquote>
          ) : null}
        </div>
      </div>

      <CustomAudioPlayer
        src={recording.audioUrl}
        title={null}
        recordingId={recording.id}
        durationSeconds={recording.durationSeconds}
        isActive={isActive}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        resetOnInactive={true}
        className="mt-5 border-[#90a1b9]/50 bg-white/90"
      />

      <div className="mt-5 border-t border-[#90a1b9]/30 pt-4">
        <button
          type="button"
          onClick={() => setIsTranscriptOpen((open) => !open)}
          disabled={!hasTranscript}
          aria-expanded={isTranscriptOpen}
          aria-controls={transcriptId}
          className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-neutral-950 transition hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155dfc] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <span>{hasTranscript ? 'Transcript' : 'Transcript unavailable'}</span>
          {hasTranscript ? (
            <span className="flex items-center gap-2 text-xs text-slate-500">
              {isTranscriptOpen ? 'Hide' : 'Show'}
              <svg
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`transition-transform ${isTranscriptOpen ? 'rotate-180' : ''}`}
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </span>
          ) : null}
        </button>

        {isTranscriptOpen && hasTranscript ? (
          <div id={transcriptId} className="pt-4">
            {recording.transcriptText ? (
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                {recording.transcriptText}
              </p>
            ) : null}
            <SegmentTranscript segments={recording.transcriptSegments} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
