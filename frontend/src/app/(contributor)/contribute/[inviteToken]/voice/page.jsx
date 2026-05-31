'use client';

// src/app/(contributor)/contribute/[inviteToken]/voice/page.jsx

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// Sungjun's contributionStore — voice saved locally, uploaded on submit
import { addVoice, removeVoice, updateVoiceTitle, getStore } from '@/lib/contributionStore';

// ─── Nav ──────────────────────────────────────────────────────────────────────

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span className="text-r-text text-2xl leading-8">Remember</span>
      <Link href={backHref} className="flex items-center gap-1.5 text-body-2 text-r-secondary transition-colors">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Audio Row ────────────────────────────────────────────────────────────────
// borderTop stays inline (individual border side)
// play button bg stays inline (dark brown)
// progress bar stays inline (dynamic width)

function AudioRow({ recording, onDelete, onEditTitle }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(recording.contributor_title);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  }

  function onTimeUpdate() {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  }

  return (
    <div
      className="flex items-center gap-4"
      style={{ borderTop: '1px solid var(--color-r-border)', paddingTop: '14px' }}
    >
      <button
        onClick={togglePlay}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-r-text)', color: 'white' }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { setEditingTitle(false); onEditTitle(recording.id, title); }}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            className="w-full rounded px-2 py-0.5 text-sm focus:outline-none text-r-text bg-r-modal"
            style={{ border: '1px solid var(--color-r-border)' }}
          />
        ) : (
          <p className="truncate text-body-2 font-medium text-r-text">{title}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative h-1 flex-1 rounded-full bg-r-border">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: 'var(--color-r-accent)' }}
            />
          </div>
          <span className="shrink-0 text-caption text-r-muted">{formatDuration(recording.duration_seconds)}</span>
        </div>
        {/* previewUrl from store (main's approach) instead of audio_url from backend */}
        {recording.previewUrl && (
          <audio
            ref={audioRef}
            src={recording.previewUrl}
            onTimeUpdate={onTimeUpdate}
            onEnded={() => { setPlaying(false); setProgress(0); }}
          />
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <button onClick={() => setEditingTitle(true)} className="p-1.5 transition-colors text-r-muted" aria-label="Edit title">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
          </svg>
        </button>
        <button onClick={() => onDelete(recording.id)} className="p-1.5 transition-colors text-r-danger" aria-label="Delete recording">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Title Modal ──────────────────────────────────────────────────────────────

function TitleModal({ fileName, onConfirm, onCancel }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    if (!title.trim()) { setError('Please add a title for this recording.'); return; }
    onConfirm(title.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(66,63,57,0.3)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8 shadow-xl bg-r-modal">
        <h2 className="text-h3 text-r-text">Name this recording</h2>
        <p className="mt-1 text-caption text-r-muted">{fileName}</p>
        <input
          autoFocus
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          placeholder="e.g. Voicemail from Christmas 2019"
          className="mt-5 w-full rounded-xl px-4 py-3 text-sm focus:outline-none text-r-text bg-transparent"
          style={{ border: '1px solid var(--color-r-border)' }}
        />
        {error && <p className="mt-1.5 text-caption text-r-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full py-3 text-body-2 transition-colors text-r-secondary bg-transparent"
            style={{ border: '1px solid var(--color-r-border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-r-card)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-full py-3 text-body-2 transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VoicePage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const fileInputRef = useRef(null);
  const [recordings, setRecordings] = useState([]);
  const [pendingFile, setPendingFile] = useState(null);

  // Load existing recordings from store on mount
  useEffect(() => {
    const stored = getStore().voice.map((r) => ({
      ...r,
      contributor_title: r.title,
      duration_seconds: 0,
    }));
    setRecordings(stored);
  }, []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = '';
  }

  // Store operations are synchronous — no async upload, no uploading state
  function handleTitleConfirm(title) {
    if (!pendingFile) return;
    const recording = addVoice(pendingFile, title);
    setRecordings((prev) => [...prev, {
      ...recording,
      contributor_title: recording.title,
      duration_seconds: 0,
    }]);
    setPendingFile(null);
  }

  function handleDelete(recordingId) {
    removeVoice(recordingId);
    setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
  }

  function handleEditTitle(id, newTitle) {
    updateVoiceTitle(id, newTitle);
    setRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, contributor_title: newTitle } : r)));
  }

  function handleContinue() { router.push(`/contribute/${inviteToken}/review`); }
  function handleSkip() { router.push(`/contribute/${inviteToken}/review`); }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="page-shell">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        <div className="text-center">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="mt-2 text-body-2 text-r-secondary">Upload a voice memo below.</p>
        </div>

        {/* Single upload zone — record button removed per main's design decision */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl py-16 transition-colors bg-transparent"
          style={{ border: '1.5px dashed var(--color-r-border)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-r-card)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="28" height="28" fill="none" stroke="var(--color-r-secondary)" strokeWidth="1.6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12" />
          </svg>
          <span className="text-body-2 text-r-muted">Click to upload or drag and drop</span>
          <span className="text-caption text-r-muted">MP3, WAV, M4A, OGG up to 50MB</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.ogg"
          className="hidden"
          onChange={handleFileChange}
        />

        {recordings.length > 0 && (
          <div className="rounded-2xl p-6 border border-r-border">
            <p className="mb-4 text-h3 text-r-text">Uploaded audio</p>
            <div className="flex flex-col gap-4">
              {recordings.map((rec) => (
                <AudioRow key={rec.id} recording={rec} onDelete={handleDelete} onEditTitle={handleEditTitle} />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            className="w-full rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 bg-r-btn text-r-btn-text border-none"
          >
            Continue
          </button>
          {recordings.length === 0 && (
            <button
              onClick={handleSkip}
              className="w-full py-3 text-caption transition-colors text-r-muted"
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-r-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-r-muted)'; }}
            >
              Skip - I don&apos;t have any voice recordings
            </button>
          )}
        </div>

      </div>

      {pendingFile && (
        <TitleModal fileName={pendingFile.name} onConfirm={handleTitleConfirm} onCancel={() => setPendingFile(null)} />
      )}
    </main>
  );
}
