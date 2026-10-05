'use client';

import { useMemo, useState } from 'react';
import VoiceRecordingCard from './VoiceRecordingCard';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently added' },
  { value: 'name', label: 'Name' },
  { value: 'length', label: 'Length' },
  { value: 'oldest', label: 'Oldest' },
];

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

function normalizeDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatSubmittedDate(date) {
  if (!date) return '';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function compareDatesDesc(a, b) {
  const aTime = a.submittedAt?.getTime() ?? 0;
  const bTime = b.submittedAt?.getTime() ?? 0;
  return bTime - aTime;
}

function compareDatesAsc(a, b) {
  const aTime = a.submittedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.submittedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
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
  const submittedAt = normalizeDate(
    recording?.submitted_at ||
    recording?.submittedAt ||
    recording?.submitted_date ||
    recording?.submittedDate ||
    recording?.created_at ||
    recording?.createdAt ||
    recording?.updated_at ||
    recording?.updatedAt,
  );

  return {
    id: String(id),
    title,
    audioUrl: recording?.audio_url || recording?.audioUrl || recording?.file_url || recording?.fileUrl || recording?.url || '',
    keyQuote: recording?.key_quote || recording?.keyQuote || '',
    transcriptText: recording?.transcript_text || recording?.transcript || recording?.transcriptText || '',
    transcriptSegments: asArray(recording?.transcript_segments || recording?.transcriptSegments).filter(Boolean),
    category: recording?.ai_category || recording?.aiCategory || recording?.category || '',
    tags: normalizeTags(recording?.ai_tags || recording?.aiTags || recording?.tags),
    contributorName: recording?.contributor_name || recording?.contributorName || '',
    relationshipType: recording?.relationship_type || recording?.relationshipType || '',
    durationSeconds: Number(recording?.duration_seconds ?? recording?.durationSeconds ?? recording?.duration) || undefined,
    submittedAt,
    submittedLabel: formatSubmittedDate(submittedAt),
  };
}

function sortRecordings(recordings, sortBy) {
  const sorted = [...recordings];

  if (sortBy === 'name') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  } else if (sortBy === 'length') {
    sorted.sort((a, b) => (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0));
  } else if (sortBy === 'oldest') {
    sorted.sort(compareDatesAsc);
  } else {
    sorted.sort(compareDatesDesc);
  }

  return sorted;
}

function VoicesLoadingState({ variant }) {
  const isViewer = variant === 'viewer';

  return (
    <div
      className={isViewer ? 'grid gap-12 lg:grid-cols-[minmax(260px,433px)_minmax(320px,658px)] lg:justify-between' : 'space-y-5'}
      aria-label="Loading voice recordings"
    >
      {[0, 1].map((item) => (
        <div key={item} className="animate-pulse rounded-[10px] border border-r-muted/60 bg-transparent p-6 sm:p-[50px]">
          <div className="h-12 w-56 rounded-full bg-r-border" />
          <div className="mt-7 h-8 w-2/3 rounded bg-r-border" />
          <div className="mt-7 h-24 rounded bg-r-border/70" />
        </div>
      ))}
    </div>
  );
}

function VoicesErrorState({ message }) {
  return (
    <div className="rounded-[10px] border border-r-muted bg-transparent px-6 py-10 text-center">
      <p className="text-body-2 font-medium text-r-text">Voice recordings are unavailable right now.</p>
      {message ? <p className="mt-2 text-body-2 text-r-muted">{message}</p> : null}
    </div>
  );
}

function VoicesEmptyState() {
  return (
    <div className="rounded-[10px] border border-r-muted bg-transparent px-6 py-12 text-center">
      <p className="text-body-2 font-medium text-r-text">No voice recordings were submitted for this memorial.</p>
    </div>
  );
}

function ViewerVoicesTab({
  recordings,
  activeRecordingId,
  setActiveRecordingId,
}) {
  const [selectedRecordingId, setSelectedRecordingId] = useState(recordings[0]?.id ?? null);
  const [sortBy, setSortBy] = useState('recent');
  const sortedRecordings = useMemo(() => sortRecordings(recordings, sortBy), [recordings, sortBy]);
  const selectedRecording = sortedRecordings.find((recording) => recording.id === selectedRecordingId) ?? sortedRecordings[0];

  return (
    <section aria-label="Voice recordings" className="flex w-full flex-col gap-6">
      <h2 className="w-full text-left font-display text-[40px] font-bold leading-none text-r-text">Voices</h2>
      <div className="grid gap-12 lg:grid-cols-[minmax(260px,433px)_minmax(320px,658px)] lg:items-start lg:justify-start lg:gap-[clamp(48px,17vw,248px)]">
        <div className="flex flex-col gap-10 lg:gap-[50px]">
          <label className="relative block">
            <span className="sr-only">Sort voice recordings</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-[64px] w-full appearance-none rounded-[13px] border border-r-muted bg-transparent px-[18px] pr-12 font-display text-[24px] font-medium leading-none text-r-text outline-none transition focus:border-r-text focus:ring-2 focus:ring-r-border-focus"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-[18px] top-1/2 size-0 -translate-y-1/2 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-r-text" />
          </label>

          <div className="flex flex-col gap-[28px] lg:gap-[50px]">
            {sortedRecordings.map((recording) => {
              const isSelected = recording.id === selectedRecording?.id;

              return (
                <button
                  key={recording.id}
                  type="button"
                  onClick={() => setSelectedRecordingId(recording.id)}
                  className={`h-[48px] w-full border-b px-[18px] text-left font-display text-[24px] font-medium leading-none text-r-text transition ${
                    isSelected ? 'border-b-2 border-r-text bg-[#d6d8c8]' : 'border-r-muted bg-transparent hover:bg-r-card/50'
                  }`}
                >
                  <span className="block truncate">{recording.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedRecording ? (
          <VoiceRecordingCard
            key={selectedRecording.id}
            recording={selectedRecording}
            variant="viewer"
            isActive={activeRecordingId === selectedRecording.id}
            onPlay={setActiveRecordingId}
            onPause={(recordingId) => {
              if (activeRecordingId === recordingId) setActiveRecordingId(null);
            }}
            onEnded={(recordingId) => {
              if (activeRecordingId === recordingId) setActiveRecordingId(null);
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

export default function VoicesTab({ output, voices, loading = false, error = null, variant = 'organizer' }) {
  const [activeRecordingId, setActiveRecordingId] = useState(null);
  const recordings = useMemo(
    () => getVoicesSource(output, voices).map(normalizeVoiceRecording),
    [output, voices],
  );

  if (loading) return <VoicesLoadingState variant={variant} />;
  if (error) return <VoicesErrorState message={typeof error === 'string' ? error : error?.message} />;
  if (recordings.length === 0) return <VoicesEmptyState />;

  if (variant === 'viewer') {
    return (
      <ViewerVoicesTab
        recordings={recordings}
        activeRecordingId={activeRecordingId}
        setActiveRecordingId={setActiveRecordingId}
      />
    );
  }

  return (
    <section aria-label="Voice recordings" className="flex flex-col gap-5">
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
