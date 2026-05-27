'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { uploadPhotos, deletePhoto } from '@/lib/api';

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span className="text-2xl leading-8 text-neutral-950">Remember</span>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-base text-neutral-950 hover:text-slate-600 transition-colors"
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
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 transition-colors ${
        dragging ? 'border-neutral-400 bg-neutral-50' : 'border-neutral-300 bg-white'
      }`}
    >
      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" className="text-neutral-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12" />
      </svg>
      <p className="text-base text-slate-500">Click to upload or drag and drop</p>
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

function PhotoThumb({ asset, onDelete, uploading }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
      {asset.previewUrl ? (
        <img src={asset.previewUrl} alt={asset.file_name} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-neutral-200" />
      )}

      {uploading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-300">
          <div className="h-full w-1/2 animate-pulse bg-blue-500 rounded-full" />
        </div>
      )}

      {!uploading && (
        <div className="absolute right-2 top-2 flex gap-1.5">
          <button
            className="rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white transition-colors"
            aria-label="Edit caption"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(asset.id)}
            className="rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white transition-colors"
            aria-label="Delete photo"
          >
            <svg width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function PhotosPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  const [assets, setAssets] = useState([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingIds, setUploadingIds] = useState(new Set());

  const handleFiles = useCallback(async (files) => {
    const previews = files.map((file, i) => ({
      id: `pending-${Date.now()}-${i}`,
      file_name: file.name,
      previewUrl: URL.createObjectURL(file),
      pending: true,
    }));
    setAssets((prev) => [...prev, ...previews]);
    setUploading(true);

    const pendingIds = new Set(previews.map((p) => p.id));
    setUploadingIds(pendingIds);

    try {
      const result = await uploadPhotos(inviteToken, files, caption.trim() || null);
      setAssets((prev) => {
        const kept = prev.filter((a) => !a.pending);
        const newAssets = result.assets.map((a, i) => ({
          ...a,
          previewUrl: previews[i]?.previewUrl || null,
        }));
        return [...kept, ...newAssets];
      });
    } catch (err) {
      setAssets((prev) => prev.filter((a) => !a.pending));
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      setUploadingIds(new Set());
    }
  }, [inviteToken, caption]);

  async function handleDelete(assetId) {
    try {
      await deletePhoto(inviteToken, assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function handleContinue() {
    router.push(`/contribute/${inviteToken}/voice`);
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        <div className="text-center">
          <h1 className="text-[40px] font-medium leading-tight text-neutral-950">
            Upload your memories
          </h1>
          <p className="mt-2 text-base text-slate-500">Upload photos below.</p>
        </div>

        <DropZone onFiles={handleFiles} />

        {/* Caption input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="caption" className="text-sm font-medium text-neutral-700">
            Caption <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="caption"
            type="text"
            placeholder="e.g. John's 50th birthday party"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>

        {assets.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-auth">
            <p className="mb-4 text-base font-medium text-slate-600">
              Uploaded photos
            </p>
            <div className="grid grid-cols-3 gap-3">
              {assets.map((asset) => (
                <PhotoThumb
                  key={asset.id}
                  asset={asset}
                  onDelete={handleDelete}
                  uploading={uploadingIds.has(asset.id)}
                />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="w-full rounded-full bg-neutral-950 py-4 text-base font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70"
        >
          Continue
        </button>

      </div>
    </main>
  );
}