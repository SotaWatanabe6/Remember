'use client';

import { useMemo, useState } from 'react';
import VoiceRecordingCard from './VoiceRecordingCard';

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function getVoicesSource(output, voices) {
  const source = voices ?? output?.voices ?? output?.data?.voices ?? output?.output?.voices;

  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.recordings)) return source.recordings;
  if (Array.isArray(source?.items)) return source.items;
  if (Array.isArray(source?.data)) return source.data;

  return [];
}

export function normalizeVoiceRecording(recording, index = 0) {
  const id = recording?.recording_id || recording?.recordingId || recording?.voice_id || recording?.id || `voice-${index}`;
  const title =
    recording?.title ||
    recording?.contributor_title ||
    recording?.contributorTitle ||
    recording?.name ||
    `Voice recording ${index + 1}`;

  return {
    id: String(id),
    title,
    audioUrl: recording?.audio_url || recording?.audioUrl || recording?.file_url || recording?.fileUrl || recording?.url || '',
    keyQuote: recording?.key_quote || recording?.keyQuote || '',
    transcriptText: recording?.transcript_text || recording?.transcript || recording?.transcriptText || '',
    transcriptSegments: asArray(recording?.transcript_segments || recording?.transcriptSegments).filter(Boolean),
    category: recording?.ai_category || recording?.category || '',
    tags: normalizeTags(recording?.ai_tags || recording?.tags),
    contributorName: recording?.contributor_name || recording?.contributorName || '',
    relationshipType: recording?.relationship_type || recording?.relationshipType || '',
    durationSeconds: Number(recording?.duration_seconds ?? recording?.durationSeconds ?? recording?.duration) || undefined,
  };
}

function VoicesLoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading voice recordings">
      {[0, 1].map((item) => (
        <div key={item} className="animate-pulse rounded-[10px] border border-[#90a1b9]/50 bg-[#90a1b9]/15 p-6">
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-6 w-2/3 rounded bg-slate-200" />
          <div className="mt-4 h-16 rounded bg-white/70" />
          <div className="mt-5 h-20 rounded-2xl bg-white/80" />
        </div>
      ))}
    </div>
  );
}

function VoicesErrorState({ message }) {
  return (
    <div className="rounded-[10px] border border-[#90a1b9]/50 bg-[#90a1b9]/15 px-6 py-10 text-center">
      <p className="text-base font-medium text-neutral-950">Voice recordings are unavailable right now.</p>
      {message ? <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p> : null}
    </div>
  );
}

function VoicesEmptyState() {
  return (
    <div className="rounded-[10px] border border-[#90a1b9]/50 bg-[#90a1b9]/15 px-6 py-12 text-center">
      <p className="text-base font-medium text-neutral-950">No voice recordings were submitted for this memorial.</p>
    </div>
  );
}

export default function VoicesTab({ output, voices, loading = false, error = null }) {
  const [activeRecordingId, setActiveRecordingId] = useState(null);
  const recordings = useMemo(
    () => getVoicesSource(output, voices).map(normalizeVoiceRecording),
    [output, voices],
  );

  if (loading) return <VoicesLoadingState />;
  if (error) return <VoicesErrorState message={typeof error === 'string' ? error : error?.message} />;
  if (recordings.length === 0) return <VoicesEmptyState />;

  return (
    <section aria-label="Voice recordings" className="flex flex-col gap-4">
      {recordings.map((recording) => (
        <VoiceRecordingCard
          key={recording.id}
          recording={recording}
          isActive={activeRecordingId === recording.id}
          onPlay={setActiveRecordingId}
          onPause={(recordingId) => {
            if (activeRecordingId === recordingId) setActiveRecordingId(null);
          }}
          onEnded={(recordingId) => {
            if (activeRecordingId === recordingId) setActiveRecordingId(null);
          }}
        />
      ))}
    </section>
  );
}
