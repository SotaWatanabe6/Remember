'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { addPhotos, removePhoto, getStore } from '@/lib/contributionStore';

const FONT = "'Cormorant Garamond', Georgia, serif";

const COLORS = {
  bg: '#F0EAE2',
  text: '#1a1a1a',
  textMuted: '#6b6b6b',
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
        border: `1.5px dashed ${dragging ? '#B8AEA4' : '#D4CAC0'}`,
        backgroundColor: dragging ? '#E8E0D8' : 'transparent',
        fontFamily: FONT,
      }}
    >
      <svg width="32" height="32" fill="none" stroke="#5F5A52" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12" />
      </svg>
      <p className="text-base" style={{ color: '#5F5A52' }}>Click to upload or drag and drop</p>
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

function PhotoThumb({ asset, onDelete }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl" style={{ backgroundColor: '#E8E0D8' }}>
      {asset.previewUrl ? (
        <img src={asset.previewUrl} alt={asset.file_name} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full" style={{ backgroundColor: '#D4CAC0' }} />
      )}

      <div className="absolute right-2 top-2 flex gap-1.5">
        <button
          className="rounded-full p-1.5 shadow-sm transition-colors"
          style={{ backgroundColor: 'rgba(240,234,226,0.9)' }}
          aria-label="Edit caption"
        >
          <svg width="12" height="12" fill="none" stroke="#5F5A52" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(asset.id)}
          className="rounded-full p-1.5 shadow-sm transition-colors"
          style={{ backgroundColor: 'rgba(240,234,226,0.9)' }}
          aria-label="Delete photo"
        >
          <svg width="12" height="12" fill="none" stroke="#C0503A" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function PhotosPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  const [assets, setAssets] = useState([]);
  const [caption, setCaption] = useState('');

  // Load existing photos from store on mount
  useEffect(() => {
    setAssets(getStore().photos);
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
          <p className="mt-2 text-[17px]" style={{ color: '#5F5A52' }}>Upload photos below.</p>
        </div>

        <DropZone onFiles={handleFiles} />

        {/* Caption input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="caption" className="text-sm font-medium" style={{ color: '#5F5A52' }}>
            Caption <span style={{ color: '#8F8A82' }} className="font-normal">(optional)</span>
          </label>
          <input
            id="caption"
            type="text"
            placeholder="e.g. John's 50th birthday party"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{
              border: '1px solid #D4CAC0',
              backgroundColor: '#E8E0D8',
              color: '#423F39',
              fontFamily: FONT,
            }}
          />
        </div>

        {assets.length > 0 && (
          <div className="rounded-2xl p-6" style={{ border: '1px solid #D4CAC0' }}>
            <p className="mb-4 text-[20px] font-semibold" style={{ color: '#423F39' }}>
              Uploaded photos
            </p>
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
          className="w-full rounded-full py-4 text-[16px] transition-opacity hover:opacity-80 active:opacity-70"
          style={{
            backgroundColor: '#C4B49A',
            color: '#5F5A52',
            border: 'none',
            fontFamily: FONT,
            letterSpacing: '0.02em',
          }}
        >
          Continue
        </button>

      </div>
    </main>
  );
}