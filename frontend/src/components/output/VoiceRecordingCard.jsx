'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const WAVE_BARS = [16, 26, 20, 34, 24, 42, 18, 30, 46, 22, 36, 28, 44, 24, 34, 48, 22, 40, 30, 36, 20, 32];

function PlayIcon() {
  return (
    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}

function clampAudioTime(value, duration) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return value;
  return Math.min(value, duration);
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

function joinClassNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function VoiceWavePlayer({
  src,
  recordingId,
  durationSeconds,
  isActive,
  onPlay,
  onPause,
  onEnded,
  size = 'organizer',
}) {
  const audioRef = useRef(null);
  const waveRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadedDuration, setLoadedDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasError, setHasError] = useState(false);

  const fallbackDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  const hasSource = typeof src === 'string' && src.trim().length > 0;
  const safeDuration = loadedDuration > 0 ? loadedDuration : fallbackDuration;
  const progressPercent = safeDuration > 0 ? Math.min((currentTime / safeDuration) * 100, 100) : 0;
  const isUnavailable = !hasSource || hasError;
  const isLarge = size === 'viewer';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    function syncDuration() {
      setLoadedDuration((previousDuration) => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
        return previousDuration > 0 ? previousDuration : 0;
      });
    }

    function syncCurrentTime() {
      setCurrentTime(clampAudioTime(audio.currentTime, audio.duration));
    }

    function handleCanPlay() {
      setHasError(false);
      syncDuration();
    }

    function handleError() {
      setHasError(true);
      setIsPlaying(false);
    }

    function handleEnded() {
      audio.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      onEnded?.(recordingId);
    }

    audio.addEventListener('loadedmetadata', syncDuration);
    audio.addEventListener('durationchange', syncDuration);
    audio.addEventListener('timeupdate', syncCurrentTime);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', syncDuration);
      audio.removeEventListener('durationchange', syncDuration);
      audio.removeEventListener('timeupdate', syncCurrentTime);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onEnded, recordingId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.load();
    setIsPlaying(false);
    setCurrentTime(0);
    setLoadedDuration(0);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (isActive) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  }, [isActive]);

  async function playAudio() {
    const audio = audioRef.current;
    if (!audio || isUnavailable) return;

    try {
      onPlay?.(recordingId);
      await audio.play();
      setIsPlaying(true);
      setHasError(false);
    } catch {
      setIsPlaying(false);
      setHasError(true);
      onPause?.(recordingId);
    }
  }

  function stopAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    onPause?.(recordingId);
  }

  function togglePlayback() {
    if (isPlaying) stopAudio();
    else playAudio();
  }

  function seekTo(nextTime) {
    const clampedTime = clampAudioTime(nextTime, safeDuration);

    setCurrentTime(clampedTime);
    if (audioRef.current) audioRef.current.currentTime = clampedTime;
  }

  function seekFromPointer(event) {
    if (isUnavailable || safeDuration === 0 || !waveRef.current) return;

    const rect = waveRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    seekTo(ratio * safeDuration);
  }

  function handleWaveKeyDown(event) {
    if (isUnavailable || safeDuration === 0) return;

    const step = Math.max(safeDuration / 20, 1);

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      seekTo(currentTime + step);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      seekTo(currentTime - step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      seekTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      seekTo(safeDuration);
    }
  }

  return (
    <div className={joinClassNames('flex items-center', isLarge ? 'gap-[14px]' : 'gap-[10px]')}>
      <button
        type="button"
        onClick={togglePlayback}
        disabled={isUnavailable}
        aria-label={isPlaying ? 'Stop recording' : 'Play recording'}
        className={joinClassNames(
          'grid shrink-0 place-items-center rounded-full bg-r-text text-r-bg transition hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus disabled:cursor-not-allowed disabled:bg-r-border disabled:text-r-muted',
          isLarge ? 'size-[68px]' : 'size-[50px]',
        )}
      >
        {isPlaying ? <StopIcon /> : <PlayIcon />}
      </button>

      <div
        ref={waveRef}
        role="slider"
        tabIndex={isUnavailable || safeDuration === 0 ? -1 : 0}
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration || 0)}
        aria-valuenow={Math.round(currentTime)}
        onClick={seekFromPointer}
        onKeyDown={handleWaveKeyDown}
        className={joinClassNames(
          'flex shrink-0 cursor-pointer items-center gap-[3px] rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus',
          isLarge ? 'h-[68px] w-[235px]' : 'h-[50px] w-[173px]',
          isUnavailable ? 'cursor-not-allowed opacity-45' : '',
        )}
      >
        {WAVE_BARS.map((height, index) => {
          const position = ((index + 1) / WAVE_BARS.length) * 100;
          const isPlayed = position <= progressPercent;
          const scaledHeight = isLarge ? height * 1.25 : height;

          return (
            <span
              key={`${recordingId}-wave-${index}`}
              aria-hidden="true"
              className={joinClassNames(
                'w-[4px] rounded-full transition-colors',
                isPlayed ? 'bg-r-text' : 'bg-[#b7c19a]',
              )}
              style={{ height: `${scaledHeight}px` }}
            />
          );
        })}
      </div>

      {hasSource && <audio ref={audioRef} src={src} preload="metadata" />}
    </div>
  );
}

function SegmentTranscript({ segments }) {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  return (
    <div className="space-y-3">
      {segments.map((segment, index) => {
        const text = getSegmentText(segment);
        if (!text) return null;

        const start = formatSegmentTime(segment?.start ?? segment?.start_time ?? segment?.startTime);
        const end = formatSegmentTime(segment?.end ?? segment?.end_time ?? segment?.endTime);
        const speaker = segment?.speaker || segment?.speaker_name;
        const label = [speaker, start && end ? `${start}-${end}` : start].filter(Boolean).join(' - ');

        return (
          <div key={`${label || 'segment'}-${index}`}>
            {label ? <p className="mb-1 text-caption uppercase text-r-muted">{label}</p> : null}
            <p className="text-body-2 text-r-text">{text}</p>
          </div>
        );
      })}
    </div>
  );
}

function TranscriptBlock({ recording, className = '', id }) {
  const hasSegments = Array.isArray(recording.transcriptSegments) && recording.transcriptSegments.length > 0;

  if (!recording.transcriptText && !hasSegments) {
    return <p id={id} className={joinClassNames('text-body-2 text-r-muted', className)}>Transcript unavailable.</p>;
  }

  return (
    <div id={id} className={className}>
      {recording.transcriptText ? (
        <p className="whitespace-pre-line text-body-2 text-r-text">&ldquo;{recording.transcriptText}&rdquo;</p>
      ) : null}
      <SegmentTranscript segments={recording.transcriptSegments} />
    </div>
  );
}

function VoiceTag({ label }) {
  if (!label) return null;

  return (
    <span className="inline-flex h-[50px] min-w-[207px] items-center justify-center rounded-[14px] bg-[#b7c19a] px-8 text-center text-caption text-r-secondary">
      {label}
    </span>
  );
}

export default function VoiceRecordingCard({
  recording,
  isActive,
  onPlay,
  onPause,
  onEnded,
  variant = 'organizer',
}) {
  const transcriptId = `voice-transcript-${recording.id}`;
  const tagLabel = recording.category || recording.tags?.[0] || '';
  const quote = recording.keyQuote ? recording.keyQuote.replace(/^[\s"'`]+|[\s"'`]+$/g, '') : '';
  const submittedLine = recording.submittedLabel ? `Submitted ${recording.submittedLabel}` : '';
  const isViewer = variant === 'viewer';

  const audioControl = useMemo(() => (
    <VoiceWavePlayer
      src={recording.audioUrl}
      recordingId={recording.id}
      durationSeconds={recording.durationSeconds}
      isActive={isActive}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
      size={isViewer ? 'viewer' : 'organizer'}
    />
  ), [isActive, isViewer, onEnded, onPause, onPlay, recording.audioUrl, recording.durationSeconds, recording.id]);

  if (isViewer) {
    return (
      <section aria-label={recording.title} className="flex w-full max-w-[658px] flex-col items-start justify-center gap-[50px]">
        {audioControl}
        <TranscriptBlock recording={recording} className="max-w-full" />
        <VoiceTag label={tagLabel} />
      </section>
    );
  }

  return (
    <article className="rounded-[10px] border border-r-muted bg-transparent p-6 sm:p-[50px]">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex w-full max-w-[433px] flex-col items-start gap-[30px]">
          {audioControl}

          {quote ? (
            <blockquote className="font-display text-[24px] font-medium italic leading-[1.15] text-r-text">
              &ldquo;{quote}&rdquo;
            </blockquote>
          ) : null}

          <div className="flex flex-col items-start gap-[10px]">
            <div className="flex flex-col gap-[10px] text-r-secondary">
              <h3 className="max-w-[260px] text-h4">{recording.title}</h3>
              {submittedLine ? <p className="text-caption">{submittedLine}</p> : null}
            </div>
            <VoiceTag label={tagLabel} />
          </div>
        </div>

        <TranscriptBlock
          recording={recording}
          className="w-full max-w-[560px]"
          id={transcriptId}
        />
      </div>
    </article>
  );
}
