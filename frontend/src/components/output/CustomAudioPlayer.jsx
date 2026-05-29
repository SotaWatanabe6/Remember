'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function PlayIcon() {
  return (
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function clampAudioTime(value, duration) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return value;

  return Math.min(value, duration);
}

export default function CustomAudioPlayer({
  src,
  title,
  recordingId,
  isActive,
  onPlay,
  onPause,
  onEnded,
  className = '',
  durationSeconds,
  resetOnInactive = false,
}) {
  const audioRef = useRef(null);
  const isControlled = typeof isActive === 'boolean';
  const fallbackDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [loadedDuration, setLoadedDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [canPlay, setCanPlay] = useState(false);

  const hasSource = typeof src === 'string' && src.trim().length > 0;
  const safeDuration = loadedDuration > 0 ? loadedDuration : fallbackDuration;
  const isUnavailable = !hasSource || hasError;
  const progressPercent = safeDuration > 0 ? Math.min((currentTime / safeDuration) * 100, 100) : 0;
  const remainingTime = safeDuration > 0 ? Math.max(safeDuration - currentTime, 0) : 0;

  const statusText = useMemo(() => {
    if (!hasSource) return 'Audio unavailable';
    if (hasError) return 'Audio could not be loaded';
    if (!canPlay && safeDuration === 0) return 'Loading audio';
    return null;
  }, [canPlay, hasError, hasSource, safeDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    function syncDuration() {
      setLoadedDuration((previousDuration) => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
        return Number.isFinite(previousDuration) && previousDuration > 0 ? previousDuration : 0;
      });
    }

    function syncCurrentTime() {
      if (!isSeeking) setCurrentTime(clampAudioTime(audio.currentTime, audio.duration));
    }

    function handleCanPlay() {
      setCanPlay(true);
      setHasError(false);
      syncDuration();
    }

    function handleError() {
      setHasError(true);
      setCanPlay(false);
      setIsPlaying(false);
    }

    function handlePlay() {
      setIsPlaying(true);
    }

    function handlePause() {
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
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', syncDuration);
      audio.removeEventListener('durationchange', syncDuration);
      audio.removeEventListener('timeupdate', syncCurrentTime);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isSeeking, onEnded, recordingId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.load();
    setIsPlaying(false);
    setCurrentTime(0);
    setLoadedDuration(0);
    setCanPlay(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (!isControlled || isActive) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();

    if (resetOnInactive) {
      audio.currentTime = 0;
    }
  }, [isActive, isControlled, resetOnInactive]);

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
    }
  }

  function pauseAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    onPause?.(recordingId);
  }

  function togglePlayback() {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }

  function seekTo(value) {
    const audio = audioRef.current;
    const nextTime = clampAudioTime(Number(value), safeDuration);

    setCurrentTime(nextTime);

    if (audio && safeDuration > 0) {
      audio.currentTime = nextTime;
    }
  }

  function handleSeekChange(event) {
    seekTo(event.target.value);
  }

  function handleSeekEnd(event) {
    seekTo(event.target.value);
    setIsSeeking(false);
  }

  function handlePointerSeek(event) {
    if (isUnavailable || safeDuration === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    seekTo(ratio * safeDuration);
  }

  function handleTrackPointerDown(event) {
    setIsSeeking(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    handlePointerSeek(event);
  }

  function handleTrackPointerMove(event) {
    if (!isSeeking || event.buttons !== 1) return;
    handlePointerSeek(event);
  }

  function handleTrackPointerUp(event) {
    handlePointerSeek(event);
    setIsSeeking(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-auth transition-colors ${isUnavailable ? 'opacity-70' : ''} ${className}`}
      data-recording-id={recordingId}
    >
      {title && (
        <p className="mb-3 truncate text-sm font-medium text-neutral-950 sm:text-base">{title}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={isUnavailable}
            aria-label={isPlaying ? 'Pause recording' : 'Play recording'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:opacity-100"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="min-w-0 flex-1">
            <div
              className="relative h-5"
              onPointerDown={handleTrackPointerDown}
              onPointerMove={handleTrackPointerMove}
              onPointerUp={handleTrackPointerUp}
            >
              <input
                type="range"
                min="0"
                max={safeDuration || 0}
                step="0.01"
                value={safeDuration > 0 ? Math.min(currentTime, safeDuration) : 0}
                onChange={handleSeekChange}
                onInput={handleSeekChange}
                onPointerDown={() => setIsSeeking(true)}
                onPointerUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                onMouseUp={handleSeekEnd}
                disabled={isUnavailable || safeDuration === 0}
                aria-label="Audio progress"
                aria-valuetext={`${formatAudioTime(currentTime)} elapsed, ${formatAudioTime(remainingTime)} remaining`}
                className="peer absolute inset-0 z-10 h-5 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed disabled:pointer-events-none"
              />
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-slate-400" />
              <div
                className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-500"
                style={{ width: `${progressPercent}%` }}
                aria-hidden="true"
              />
            </div>

            {statusText && (
              <p className="mt-1 text-xs text-slate-500" role={hasError || !hasSource ? 'status' : undefined}>
                {statusText}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 pl-14 text-xs tabular-nums text-slate-500 sm:w-[108px] sm:justify-end sm:pl-0">
          <span>{formatAudioTime(currentTime)}</span>
          <span aria-hidden="true">/</span>
          <span>-{formatAudioTime(remainingTime)}</span>
        </div>
      </div>

      {hasSource && <audio ref={audioRef} src={src} preload="metadata" />}
    </div>
  );
}
