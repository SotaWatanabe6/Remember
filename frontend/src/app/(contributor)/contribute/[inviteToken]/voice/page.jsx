'use client';

// src/app/(contributor)/contribute/[inviteToken]/voice/page.jsx
// frontend/src/app/(contributor)/contribute/[inviteToken]/voice/page.jsx

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// Sungjun's contributionStore — voice saved locally, uploaded on submit
import { addVoice, removeVoice, updateVoiceTitle, getStore } from '@/lib/contributionStore';

// ─── Nav ──────────────────────────────────────────────────────────────────────
import {
  ALLOWED_AUDIO_EXTENSIONS,
  MAX_AUDIO_FILE_SIZE_BYTES,
  deleteVoice,
  getContributorSummary,
  uploadVoice,
} from '@/lib/api';

const FONT = "'Cormorant Garamond', Georgia, serif";

const COLORS = {
  bg: '#F0EAE2',
  family: '#AF5F42',
  friend: '#45556C',
  colleague: '#59763C',
  text: '#1a1a1a',
  textMuted: '#6b6b6b',
  cardBg: '#E8E0D8',
  border: '#D4CAC0',
};

const AUDIO_ACCEPT = 'audio/*,.m4a,.mp3,.wav,.webm';
const FILE_TYPE_ERROR = 'This file type is not supported. Please upload an M4A, MP3, or WAV file.';
const FILE_SIZE_ERROR = 'This file is too large. Please choose a smaller audio file.';
const GENERIC_UPLOAD_ERROR = 'Upload failed. Please try again.';
const INLINE_UPLOAD_ERROR_CODES = new Set([
  'voice_title_required',
  'voice_file_required',
  'unsupported_audio_type',
  'audio_too_large',
]);

function getFileExtension(fileName = '') {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function validateAudioFile(file) {
  if (!file) return 'Please choose an audio file.';

  const extension = getFileExtension(file.name);
  const hasAudioMime = file.type?.startsWith('audio/');
  const hasAllowedExtension = ALLOWED_AUDIO_EXTENSIONS.includes(extension);

  if (!hasAudioMime && !hasAllowedExtension) return FILE_TYPE_ERROR;
  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) return FILE_SIZE_ERROR;
  return '';
}

function statusCopy(recording) {
  if (recording.storage_path) return 'Uploaded and saved';
  return 'Voice recording uploaded';
}


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
// ─── Audio row ────────────────────────────────────────────────────────────────

function AudioRow({ recording, onDelete, onEditTitle, onDurationLoaded }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(recording.contributor_title);
  const hasPreview = Boolean(recording.audio_url);

  async function togglePlay() {
    if (!audioRef.current || !hasPreview) return;

    if (playing) {
      audioRef.current.pause();
      return;
    }

    try {
      await audioRef.current.play();
    } catch {
      setPlaying(false);
    }
  }

  function onTimeUpdate() {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  }

  function handleLoadedMetadata() {
    const duration = audioRef.current?.duration;
    if (Number.isFinite(duration) && duration > 0) {
      onDurationLoaded(recording.id, duration);
    }
  }

  function commitTitle() {
    const trimmedTitle = title.trim();
    setEditingTitle(false);

    if (!trimmedTitle) {
      setTitle(recording.contributor_title);
      return;
    }

    setTitle(trimmedTitle);
    onEditTitle(recording.id, trimmedTitle);
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
    <div className="flex items-center gap-4" style={{ borderTop: '1px solid #D4CAC0', paddingTop: '14px' }}>
      {/* Play button */}
      <button
        onClick={togglePlay}
        disabled={!hasPreview}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 disabled:opacity-100"
        style={{ backgroundColor: '#423F39', color: 'white' }}
        aria-label={hasPreview ? (playing ? 'Pause recording preview' : 'Play recording preview') : 'Recording uploaded'}
      >
        {!hasPreview ? (
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : playing ? (
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

      {/* File name + progress */}
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
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
        <p className="mt-1 text-xs" style={{ color: '#59763C' }}>{statusCopy(recording)}</p>
        <p className="truncate text-xs" style={{ color: '#97877B' }}>{recording.file_name}</p>
        {recording.audio_url && (
          <audio
            ref={audioRef}
            src={recording.audio_url}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setProgress(0); }}
          />
        )}
      </div>

      {/* Edit / Delete */}
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
          id="voice-recording-title"
          autoFocus
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          aria-describedby={error ? 'voice-recording-title-error' : undefined}
          aria-invalid={Boolean(error)}
          aria-label="Recording title"
          placeholder="e.g. Voicemail from Christmas 2019"
          className="mt-5 w-full rounded-xl px-4 py-3 text-sm focus:outline-none text-r-text bg-transparent"
          style={{ border: '1px solid var(--color-r-border)' }}
        />
        {error && <p className="mt-1.5 text-caption text-r-danger">{error}</p>}
        {error && <p id="voice-recording-title-error" className="mt-1.5 text-xs" style={{ color: '#C0503A' }}>{error}</p>}
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [failedUpload, setFailedUpload] = useState(null);
  const previewUrlsRef = useRef(new Map());

  function addPreviewUrl(recording, file) {
    if (typeof URL === 'undefined' || !file) return recording;

    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.set(recording.id, previewUrl);

    return {
      ...recording,
      audio_url: previewUrl,
      local_preview_url: true,
    };
  }

  function revokePreviewUrl(recordingId) {
    const previewUrl = previewUrlsRef.current.get(recordingId);
    if (!previewUrl) return;

    URL.revokeObjectURL(previewUrl);
    previewUrlsRef.current.delete(recordingId);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    setUploadError('');
    setUploadSuccess('');

    const validationError = validateAudioFile(file);
    if (validationError) {
      setUploadError(validationError);
      e.target.value = '';
      return;
    }

    setPendingFile(file);
    e.target.value = '';
  }

  // Store operations are synchronous — no async upload, no uploading state
  function handleTitleConfirm(title) {
  async function handleUpload(file, title) {
    if (!title.trim()) {
      setUploadError('Please add a title for this recording.');
      return;
    }

    const validationError = validateAudioFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    try {
      const result = await uploadVoice(inviteToken, file, title);
      const playableRecording = addPreviewUrl(result.recording, file);
      setRecordings((prev) => [...prev, playableRecording]);
      setFailedUpload(null);
      setUploadSuccess('Voice recording uploaded');
    } catch (err) {
      setFailedUpload({ file, title });
      setUploadError(INLINE_UPLOAD_ERROR_CODES.has(err?.code) ? err.message : GENERIC_UPLOAD_ERROR);
    } finally {
      setUploading(false);
    }
  }

  async function handleTitleConfirm(title) {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);
    await handleUpload(file, title);
  }

  async function handleDelete(recordingId) {
    try {
      await deleteVoice(inviteToken, recordingId);
      revokePreviewUrl(recordingId);
      setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
      setUploadSuccess('');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function handleEditTitle(id, newTitle) {
    updateVoiceTitle(id, newTitle);
    setRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, contributor_title: newTitle } : r)));
    setRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, contributor_title: newTitle } : r)));
  }

  function handleDurationLoaded(id, durationSeconds) {
    setRecordings((prev) => prev.map((r) => (
      r.id === id ? { ...r, duration_seconds: durationSeconds } : r
    )));
  }

  function handleContinue() { router.push(`/contribute/${inviteToken}/review`); }
  function handleSkip() { router.push(`/contribute/${inviteToken}/review`); }

  // Fix full-page cream background — no white showing around edges
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

  useEffect(() => {
    let isMounted = true;

    async function loadVoiceDraft() {
      try {
        const summary = await getContributorSummary(inviteToken);
        if (isMounted) setRecordings(Array.isArray(summary.voice) ? summary.voice : []);
      } catch (err) {
        console.error('Could not load voice draft:', err);
      }
    }

    if (inviteToken) loadVoiceDraft();
    return () => { isMounted = false; };
  }, [inviteToken]);

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;

    return () => {
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrls.clear();
    };
  }, []);

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="page-shell">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        {/* Heading */}
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
          <h1 className="text-[44px] font-bold leading-tight" style={{ color: '#423F39', letterSpacing: '-0.01em' }}>
            Upload a voice recording
          </h1>
          <p className="mt-2 text-[17px]" style={{ color: '#4A7FA5' }}>
            Upload a recording that includes their voice, such as a voicemail, message, or short audio clip.
          </p>
        </div>

        {/* Upload file */}
        <div>
          <input
            id="voice-recording-file"
            ref={fileInputRef}
            type="file"
            accept={AUDIO_ACCEPT}
            className="sr-only"
            disabled={uploading}
            aria-describedby="voice-upload-guidance voice-upload-status"
            onChange={handleFileChange}
          />
          <label
            htmlFor="voice-recording-file"
            aria-disabled={uploading}
            className="flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl px-5 py-12 text-center transition-colors"
            style={{
              border: '1.5px dashed #D4CAC0',
              backgroundColor: 'transparent',
              opacity: uploading ? 0.55 : 1,
            }}
            onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.backgroundColor = '#E8E0D8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {uploading ? (
              <svg className="animate-spin" width="28" height="28" fill="none" stroke="#5F5A52" strokeWidth="1.6" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg width="28" height="28" fill="none" stroke="#5F5A52" strokeWidth="1.6" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12" />
              </svg>
            )}
            <span className="text-base" style={{ color: '#97877B' }}>
              {uploading ? 'Uploading...' : 'Choose an audio file'}
            </span>
            <span id="voice-upload-guidance" className="text-sm" style={{ color: '#97877B' }}>
              M4A, MP3, WAV, or WebM up to 50 MB
            </span>
          </label>
          <div id="voice-upload-status" className="mt-3 min-h-6" aria-live="polite">
            {uploadError && (
              <div className="flex flex-col gap-2 text-sm" style={{ color: '#C0503A' }}>
                <p>{uploadError}</p>
                {failedUpload && (
                  <button
                    type="button"
                    onClick={() => handleUpload(failedUpload.file, failedUpload.title)}
                    disabled={uploading}
                    className="w-fit rounded-full px-4 py-2 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ border: '1px solid #C0503A', color: '#C0503A', fontFamily: FONT }}
                  >
                    Retry upload
                  </button>
                )}
              </div>
            )}
            {uploadSuccess && !uploadError && (
              <p className="text-sm" style={{ color: '#59763C' }}>{uploadSuccess}</p>
            )}
          </div>
        </div>

        {/* Uploaded recordings */}
        {recordings.length > 0 && (
          <div className="rounded-2xl p-6 border border-r-border">
            <p className="mb-4 text-h3 text-r-text">Uploaded audio</p>
            <div className="flex flex-col gap-4">
              {recordings.map((rec) => (
                <AudioRow key={rec.id} recording={rec} onDelete={handleDelete} onEditTitle={handleEditTitle} />
                <AudioRow
                  key={rec.id}
                  recording={rec}
                  onDelete={handleDelete}
                  onEditTitle={handleEditTitle}
                  onDurationLoaded={handleDurationLoaded}
                />
              ))}
            </div>
          </div>
        )}

        {/* Continue / Skip */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            className="w-full rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 bg-r-btn text-r-btn-text border-none"
            disabled={uploading}
            className="w-full rounded-full py-4 text-[16px] transition-opacity hover:opacity-80 active:opacity-70"
            style={{ backgroundColor: '#C4B49A', color: '#5F5A52', border: 'none', fontFamily: FONT, letterSpacing: '0.02em' }}
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

      {/* Title modal */}
      {pendingFile && (
        <TitleModal fileName={pendingFile.name} onConfirm={handleTitleConfirm} onCancel={() => setPendingFile(null)} />
      )}
    </main>
  );
}
