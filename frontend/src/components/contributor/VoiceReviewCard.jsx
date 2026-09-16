'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Pause } from 'lucide-react';

export default function VoiceReviewCard({ recording, disabled, editing, saving, onEdit, onCancel, onSave, onDelete }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const audioUrl = recording.audio_url || recording.previewUrl;
  const displayTitle = recording.contributor_title || recording.file_name || 'Voice recording';
  const duration = Math.max(0, Math.floor(recording.duration_seconds || 0));

  async function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else {
      try { await audioRef.current.play(); } catch { setPlaying(false); }
    }
  }

  return (
    <article aria-label={displayTitle} className="rounded-[20px] border border-r-border p-5 sm:p-[30px]">
      <div className="flex items-start gap-4 sm:gap-8">
        <button type="button" onClick={togglePlay} disabled={!audioUrl}
          aria-label={`${playing ? 'Pause' : 'Play'} ${displayTitle}`}
          className="flex size-[50px] shrink-0 items-center justify-center rounded-full disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4">
          {playing ? <span className="flex size-[50px] items-center justify-center rounded-full bg-r-text text-r-modal"><Pause size={24} fill="currentColor" /></span>
            : <Image src="/icons/review-play.svg" width={50} height={50} alt="" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm text-r-text">{displayTitle}</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-r-border" aria-hidden="true">
              <div className="h-full bg-[var(--color-r-progress,#45839d)]" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-body-2 text-r-text">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</span>
          </div>
          {!audioUrl && <p className="mt-2 text-caption text-r-muted">Audio preview unavailable.</p>}
        </div>
        {!editing && (
          <div className="flex shrink-0 gap-2 max-sm:flex-col">
            <button type="button" disabled={disabled} aria-label={`Edit title for ${displayTitle}`}
              onClick={() => { setTitle(recording.contributor_title || ''); onEdit(); }}
              className="p-1 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4">
              <Image src="/icons/review-edit.svg" width={24} height={24} alt="" />
            </button>
            <button type="button" disabled={disabled} onClick={onDelete} aria-label={`Delete recording ${displayTitle}`}
              className="p-1 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4">
              <Image src="/icons/review-trash.svg" width={24} height={24} alt="" />
            </button>
          </div>
        )}
      </div>
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata"
        onTimeUpdate={() => {
          const audio = audioRef.current;
          setProgress(audio?.duration ? Math.min(100, audio.currentTime / audio.duration * 100) : 0);
        }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }} />}
      {editing && (
        <form className="mt-6" onSubmit={async (event) => {
          event.preventDefault();
          if (title.trim() && !disabled) await onSave(title.trim());
        }}>
          <label htmlFor={`voice-title-${recording.id}`} className="text-body-2 text-r-text">Recording title</label>
          <input id={`voice-title-${recording.id}`} autoFocus required value={title} disabled={disabled}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape' && !disabled) onCancel(); }}
            className="mt-2 w-full rounded-2xl border border-r-border bg-transparent px-5 py-3 text-body-2 focus:outline-2 focus:outline-r-text" />
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={disabled || !title.trim()} className="rounded-full bg-r-btn px-6 py-3 text-r-btn-text disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" disabled={disabled} onClick={onCancel} className="rounded-full border border-r-border px-6 py-3 disabled:opacity-40">Cancel</button>
          </div>
        </form>
      )}
    </article>
  );
}
