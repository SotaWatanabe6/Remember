'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { addVoice, removeVoice, updateVoiceTitle, getStore } from '@/lib/contributionStore';

const FONT = "'Cormorant Garamond', Georgia, serif";

const COLORS = {
  bg: '#F0EAE2',
  cardBg: '#E8E0D8',
  border: '#D4CAC0',
};

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span style={{ fontFamily: FONT }} className="text-2xl leading-8 text-[#423F39]">Remember</span>
      <Link
        href={backHref}
        style={{ fontFamily: FONT }}
        className="flex items-center gap-1.5 text-base text-[#5F5A52] hover:text-[#423F39] transition-colors"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
    <div className="flex items-center gap-4" style={{ borderTop: '1px solid #D4CAC0', paddingTop: '14px' }}>
      <button
        onClick={togglePlay}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#423F39', color: 'white' }}
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
            className="w-full rounded px-2 py-0.5 text-sm focus:outline-none"
            style={{ border: '1px solid #D4CAC0', color: '#423F39', fontFamily: FONT, backgroundColor: '#FBF9F6' }}
          />
        ) : (
          <p className="truncate text-sm font-medium" style={{ color: '#423F39', fontFamily: FONT }}>{title}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative h-1 flex-1 rounded-full" style={{ backgroundColor: '#D4CAC0' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: '#4A7FA5' }}
            />
          </div>
          <span className="shrink-0 text-xs" style={{ color: '#97877B', fontFamily: FONT }}>
            {formatDuration(recording.duration_seconds)}
          </span>
        </div>
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
        <button
          onClick={() => setEditingTitle(true)}
          className="p-1.5 transition-colors"
          style={{ color: '#97877B' }}
          aria-label="Edit title"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(recording.id)}
          className="p-1.5 transition-colors"
          style={{ color: '#C0503A' }}
          aria-label="Delete recording"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TitleModal({ fileName, onConfirm, onCancel }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    if (!title.trim()) { setError('Please add a title for this recording.'); return; }
    onConfirm(title.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(66,63,57,0.3)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8 shadow-xl" style={{ backgroundColor: '#FBF9F6', fontFamily: FONT }}>
        <h2 className="text-xl font-semibold" style={{ color: '#423F39' }}>Name this recording</h2>
        <p className="mt-1 text-sm" style={{ color: '#97877B' }}>{fileName}</p>
        <input
          autoFocus
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          placeholder="e.g. Voicemail from Christmas 2019"
          className="mt-5 w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
          style={{ border: '1px solid #D4CAC0', color: '#423F39', fontFamily: FONT, backgroundColor: 'transparent' }}
        />
        {error && <p className="mt-1.5 text-xs" style={{ color: '#C0503A' }}>{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full py-3 text-sm transition-colors"
            style={{ border: '1px solid #D4CAC0', color: '#5F5A52', fontFamily: FONT, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E8E0D8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-full py-3 text-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#C4B49A', color: '#5F5A52', border: 'none', fontFamily: FONT }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Fix full-page cream background
  useEffect(() => {
    const prevBody = document.body.style.backgroundColor;
    const prevHtml = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = COLORS.bg;
    document.documentElement.style.backgroundColor = COLORS.bg;
    return () => {
      document.body.style.backgroundColor = prevBody;
      document.documentElement.style.backgroundColor = prevHtml;
    };
  }, []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = '';
  }

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
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, contributor_title: newTitle } : r))
    );
  }

  function handleContinue() { router.push(`/contribute/${inviteToken}/review`); }
  function handleSkip() { router.push(`/contribute/${inviteToken}/review`); }

  return (
    <main
      className="min-h-screen px-6 py-10 sm:px-[50px]"
      style={{ backgroundColor: '#F0EAE2', fontFamily: FONT, color: '#423F39' }}
    >
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        <div className="text-center">
          <h1 className="text-[44px] font-bold leading-tight" style={{ color: '#423F39', letterSpacing: '-0.01em' }}>
            Upload your memories
          </h1>
          <p className="mt-2 text-[17px]" style={{ color: '#5F5A52' }}>Upload a voice memo below.</p>
        </div>

        {/* Upload only — no record button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl py-16 transition-colors"
          style={{ border: '1.5px dashed #D4CAC0', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E8E0D8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="28" height="28" fill="none" stroke="#5F5A52" strokeWidth="1.6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12" />
          </svg>
          <span className="text-base" style={{ color: '#97877B' }}>Click to upload or drag and drop</span>
          <span className="text-sm" style={{ color: '#B8AEA4' }}>MP3, WAV, M4A, OGG up to 50MB</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.ogg"
          className="hidden"
          onChange={handleFileChange}
        />

        {recordings.length > 0 && (
          <div className="rounded-2xl p-6" style={{ border: '1px solid #D4CAC0' }}>
            <p className="mb-4 text-[20px] font-semibold" style={{ color: '#423F39' }}>Uploaded audio</p>
            <div className="flex flex-col gap-4">
              {recordings.map((rec) => (
                <AudioRow
                  key={rec.id}
                  recording={rec}
                  onDelete={handleDelete}
                  onEditTitle={handleEditTitle}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            className="w-full rounded-full py-4 text-[16px] transition-opacity hover:opacity-80 active:opacity-70"
            style={{ backgroundColor: '#C4B49A', color: '#5F5A52', border: 'none', fontFamily: FONT, letterSpacing: '0.02em' }}
          >
            Continue
          </button>
          {recordings.length === 0 && (
            <button
              onClick={handleSkip}
              className="w-full py-3 text-sm transition-colors"
              style={{ color: '#97877B', fontFamily: FONT }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#423F39'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#97877B'; }}
            >
              Skip - I don&apos;t have any voice recordings
            </button>
          )}
        </div>

      </div>

      {pendingFile && (
        <TitleModal
          fileName={pendingFile.name}
          onConfirm={handleTitleConfirm}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </main>
  );
}