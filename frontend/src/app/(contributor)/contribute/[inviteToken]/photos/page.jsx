'use client';

// src/app/(contributor)/contribute/[inviteToken]/photos/page.jsx

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// Sungjun's contributionStore — photos saved locally, uploaded on submit
import { addPhotos, removePhoto, getStore } from '@/lib/contributionStore';

// ─── Nav ──────────────────────────────────────────────────────────────────────

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span className="text-r-text text-2xl leading-8">Remember</span>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-body-2 text-r-secondary transition-colors"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
// border + backgroundColor dynamic (dragging state) — stays inline
// SVG stroke uses CSS var

function DropZone({ onFiles }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl px-6 py-16 transition-colors"
      style={{
        border: `1.5px dashed ${dragging ? 'var(--color-r-border-focus)' : 'var(--color-r-border)'}`,
        backgroundColor: dragging ? 'var(--color-r-card)' : 'transparent',
      }}
    >
      <svg width="32" height="32" fill="none" stroke="var(--color-r-secondary)" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12" />
      </svg>
      <p className="text-body-2 text-r-secondary">Click to upload or drag and drop</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ─── Photo Thumb ──────────────────────────────────────────────────────────────
// Store operations are synchronous — no uploading state needed
// rgba overlay stays inline, SVG strokes use CSS vars

function PhotoThumb({ asset, onDelete }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-r-card">
      {asset.previewUrl ? (
        <img src={asset.previewUrl} alt={asset.file_name} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-r-border" />
      )}
      <div className="absolute right-2 top-2 flex gap-1.5">
        <button
          className="rounded-full p-1.5 shadow-sm transition-colors"
          style={{ backgroundColor: 'rgba(240,234,226,0.9)' }}
          aria-label="Edit caption"
        >
          <svg width="12" height="12" fill="none" stroke="var(--color-r-secondary)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(asset.id)}
          className="rounded-full p-1.5 shadow-sm transition-colors"
          style={{ backgroundColor: 'rgba(240,234,226,0.9)' }}
          aria-label="Delete photo"
        >
          <svg width="12" height="12" fill="none" stroke="var(--color-r-danger)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhotosPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [assets, setAssets] = useState([]);
  const [caption, setCaption] = useState('');

  // Load existing photos from store on mount (Sungjun's store)
  useEffect(() => {
    setAssets(getStore().photos);
  }, []);

  // Store operations are synchronous — no async upload, no uploading state
  const handleFiles = useCallback((files) => {
    const newAssets = addPhotos(files, caption.trim() || null);
    setAssets((prev) => [...prev, ...newAssets]);
  }, [caption]);

  function handleDelete(assetId) {
    removePhoto(assetId);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }

  function handleContinue() {
    router.push(`/contribute/${inviteToken}/voice`);
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="page-shell">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        <div className="text-center">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="mt-2 text-body-2 text-r-secondary">Upload photos below.</p>
        </div>

        <DropZone onFiles={handleFiles} />

        {/* Caption input — from main, styled with globals.css tokens */}
        <div className="flex flex-col gap-2">
          <label htmlFor="caption" className="text-h4 text-r-secondary">
            Caption <span className="font-normal text-r-muted">(optional)</span>
          </label>
          <input
            id="caption"
            type="text"
            placeholder="e.g. John's 50th birthday party"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-body-2 text-r-text bg-r-card focus:outline-none"
            style={{ border: '1px solid var(--color-r-border)' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-r-border-focus)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-r-border)'; }}
          />
        </div>

        {assets.length > 0 && (
          <div className="rounded-2xl p-6 border border-r-border">
            <p className="mb-4 text-h3 text-r-text">Uploaded photos</p>
            <div className="grid grid-cols-3 gap-3">
              {assets.map((asset) => (
                <PhotoThumb
                  key={asset.id}
                  asset={asset}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="w-full rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 bg-r-btn text-r-btn-text border-none"
        >
          Continue
        </button>

      </div>
    </main>
  );
}
