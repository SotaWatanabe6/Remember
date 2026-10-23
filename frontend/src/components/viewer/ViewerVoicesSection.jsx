'use client';

// frontend/src/components/viewer/ViewerVoicesSection.jsx
// Viewer-facing Voices tab (Figma: voice player + "Voices" list overlay).
// The organizer's VoicesTab / VoiceRecordingCard are untouched.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUp, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { normalizeVoiceRecording } from '@/components/output/VoicesTab';

function getRecordings(output) {
  const source = output?.voices;
  const list = Array.isArray(source) ? source : source?.recordings ?? source?.items ?? source?.data ?? [];
  return (Array.isArray(list) ? list : []).map(normalizeVoiceRecording);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function toSeconds(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Accepts [{ start, end, text }] in seconds (or milliseconds, detected from the
// recording length). Plain strings are treated as untimed lines.
function readSegments(segments, durationSeconds) {
  const parsed = (segments || [])
    .map((segment) => {
      if (typeof segment === 'string') return { start: null, end: null, text: segment.trim() };
      return {
        start: toSeconds(segment?.start ?? segment?.start_time ?? segment?.startTime ?? segment?.from),
        end: toSeconds(segment?.end ?? segment?.end_time ?? segment?.endTime ?? segment?.to),
        text: String(segment?.text ?? segment?.content ?? segment?.transcript ?? '').trim(),
      };
    })
    .filter((segment) => segment.text);

  const latest = Math.max(0, ...parsed.map((segment) => segment.end ?? segment.start ?? 0));
  const looksLikeMilliseconds = durationSeconds && latest > durationSeconds * 5;
  if (!looksLikeMilliseconds) return parsed;

  return parsed.map((segment) => ({
    ...segment,
    start: segment.start === null ? null : segment.start / 1000,
    end: segment.end === null ? null : segment.end / 1000,
  }));
}

function getTranscriptLine(recording, segments, currentTime) {
  const timed = segments.filter((segment) => segment.start !== null);
  if (timed.length) {
    const passed = timed.filter((segment) => segment.start <= currentTime);
    return (passed.length ? passed[passed.length - 1] : timed[0]).text;
  }
  if (recording.keyQuote) return recording.keyQuote;
  if (segments.length) return segments[0].text;
  return recording.transcriptText ? recording.transcriptText.slice(0, 220) : '';
}

function VoicesListOverlay({ recordings, activeIndex, onSelect, onClose }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-r-panel" role="dialog" aria-modal="true" aria-label="Voices">
      <button
        type="button"
        onClick={onClose}
        autoFocus
        aria-label="Close voices list"
        className="absolute left-[60px] top-[96px] text-r-modal transition-opacity hover:opacity-80 max-sm:left-5 max-sm:top-6"
      >
        <X size={32} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <h2 className="pt-[88px] text-center font-display text-[40px] font-bold leading-[48px] text-r-modal max-sm:pt-6">Voices</h2>
      <ul className="mx-auto mt-[90px] flex w-full max-w-[433px] flex-col gap-5 px-5 pb-16 max-sm:mt-10">
        {recordings.map((recording, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={recording.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isActive ? 'true' : undefined}
                className={`flex h-[100px] w-full items-center justify-center rounded-[20px] px-6 text-center font-display text-[24px] font-medium leading-tight transition ${
                  isActive
                    ? 'bg-r-modal text-r-secondary'
                    : 'border border-r-modal/80 text-r-modal hover:bg-r-modal/10'
                }`}
              >
                <span className="line-clamp-2">{recording.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ViewerVoicesSection({ output }) {
  const recordings = useMemo(() => getRecordings(output), [output]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef(null);
  const wantsPlayRef = useRef(false);

  const recording = recordings[index] ?? null;
  const segments = useMemo(
    () => (recording ? readSegments(recording.transcriptSegments, recording.durationSeconds) : []),
    [recording],
  );

  if (!recording) return null;

  const transcriptLine = getTranscriptLine(recording, segments, currentTime);
  const total = duration || recording.durationSeconds || 0;
  const progress = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;

  function selectTrack(nextIndex, { autoplay = wantsPlayRef.current } = {}) {
    if (nextIndex < 0 || nextIndex >= recordings.length) return;
    wantsPlayRef.current = autoplay;
    setIndex(nextIndex);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setAudioError(false);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      wantsPlayRef.current = true;
      audio.play().catch(() => setAudioError(true));
    } else {
      wantsPlayRef.current = false;
      audio.pause();
    }
  }

  function handleSeek(event) {
    const audio = audioRef.current;
    const next = Number(event.target.value);
    if (audio && Number.isFinite(next)) audio.currentTime = next;
    setCurrentTime(next);
  }

  function handleEnded() {
    setIsPlaying(false);
    if (index < recordings.length - 1) {
      selectTrack(index + 1, { autoplay: true });
    } else {
      wantsPlayRef.current = false;
    }
  }

  return (
    <section aria-label="Voice recordings" className="relative flex min-h-[calc(100vh-240px)] w-full flex-col items-center pt-[14vh]">
      <audio
        key={recording.id}
        ref={audioRef}
        src={recording.audioUrl || undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
          if (wantsPlayRef.current) audio.play().catch(() => setAudioError(true));
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => setAudioError(true)}
      />

      <blockquote className="mx-auto max-w-[800px] px-6 text-center font-display text-[32px] font-bold leading-[44px] text-r-text sm:text-[40px] sm:leading-[52px]" aria-live="polite">
        {transcriptLine ? `“${transcriptLine}”` : null}
      </blockquote>

      {audioError || !recording.audioUrl ? (
        <p className="mt-8 text-body-2 text-r-muted" role="alert">This recording could not be played right now.</p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-10 h-[320px] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[1520px] w-[1520px] -translate-x-1/2 rounded-full bg-r-panel" aria-hidden="true" />

        <h2 className="absolute inset-x-0 top-[104px] px-6 text-center font-display text-[32px] font-medium italic leading-[40px] text-r-modal">
          {recording.title}
        </h2>

        <div className="absolute left-1/2 top-[168px] flex w-[min(780px,94vw)] -translate-x-1/2 items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => selectTrack(index - 1)}
            disabled={index === 0}
            aria-label="Previous recording"
            className="text-r-modal transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <SkipBack size={34} fill="currentColor" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-r-modal text-r-panel transition-opacity hover:opacity-90"
          >
            {isPlaying
              ? <Pause size={22} fill="currentColor" aria-hidden="true" />
              : <Play size={22} fill="currentColor" className="ml-0.5" aria-hidden="true" />}
          </button>

          <input
            type="range"
            min={0}
            max={total || 0}
            step={0.1}
            value={Math.min(currentTime, total || 0)}
            onChange={handleSeek}
            disabled={!total}
            aria-label="Seek"
            className="h-[10px] min-w-0 flex-1 cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-0 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:size-0 [&::-webkit-slider-thumb]:appearance-none"
            style={{ background: `linear-gradient(to right, var(--color-r-shape) ${progress}%, #D9D9D9 ${progress}%)` }}
          />

          <span className="w-10 shrink-0 text-[14px] text-r-modal tabular-nums">{formatTime(currentTime)}</span>

          <button
            type="button"
            onClick={() => selectTrack(index + 1)}
            disabled={index >= recordings.length - 1}
            aria-label="Next recording"
            className="text-r-modal transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <SkipForward size={34} fill="currentColor" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setListOpen(true)}
          aria-label="Show all voices"
          className="absolute left-1/2 top-[262px] -translate-x-1/2 text-r-modal transition-opacity hover:opacity-80"
        >
          <ChevronsUp size={34} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {listOpen ? (
        <VoicesListOverlay
          recordings={recordings}
          activeIndex={index}
          onSelect={(nextIndex) => {
            selectTrack(nextIndex);
            setListOpen(false);
          }}
          onClose={() => setListOpen(false)}
        />
      ) : null}
    </section>
  );
}
