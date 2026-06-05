'use client';

// src/app/(contributor)/contribute/[inviteToken]/photos/page.jsx

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { deletePhoto, getContributorSummary, uploadPhotos } from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PHOTO_ACCEPT = 'image/*,.heic,.heif,.jpg,.jpeg,.png,.webp';
const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function isAcceptedPhotoFile(file) {
  const extension = getFileExtension(file.name);
  const isImageMime = file.type ? file.type.startsWith('image/') : false;
  return isImageMime || ALLOWED_EXTENSIONS.has(extension);
}

function formatCount(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function createSelectedPhoto(file, index) {
  const previewUrl = typeof URL !== 'undefined' ? URL.createObjectURL(file) : null;
  return {
    id: `selected-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    file,
    file_name: file.name || `Photo ${index + 1}`,
    file_type: file.type,
    file_size_bytes: file.size,
    previewUrl,
    previewFailed: false,
  };
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between pt-2 sm:pt-4">
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
// disabled prop — Sungjun's logic
// border + backgroundColor dynamic — CSS vars inline

function DropZone({ onFiles, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const inputId = 'contributor-photo-upload-input';

  function handleFiles(fileList) {
    onFiles(Array.from(fileList ?? []));
    if (inputRef.current) inputRef.current.value = '';
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(event.dataTransfer.files);
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl px-6 py-14 text-center transition-colors sm:py-16"
      style={{
        border: `1.5px dashed ${dragging ? 'var(--color-r-border-focus)' : 'var(--color-r-border)'}`,
        backgroundColor: dragging ? 'var(--color-r-card)' : 'transparent',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <svg width="32" height="32" fill="none" stroke="var(--color-r-secondary)" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12" />
      </svg>
      <span className="text-body-2 text-r-secondary">Select photos from your camera roll</span>
      <span className="text-caption text-r-muted">Single photos, bulk selections, JPG, PNG, WebP, HEIC, or HEIF</span>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </label>
  );
}

// ─── Photo Thumb ──────────────────────────────────────────────────────────────
// Sungjun's full logic — uploading state, preview error, conditional delete
// Styling uses CSS tokens

function PhotoThumb({ asset, onDelete, uploading, onPreviewError }) {
  const canRenderPreview = asset.previewUrl && !asset.previewFailed;

  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-r-card">
      {canRenderPreview ? (
        <Image
          src={asset.previewUrl}
          alt={asset.file_name}
          fill
          sizes="(min-width: 640px) 200px, 30vw"
          className="object-cover"
          unoptimized
          onError={() => onPreviewError?.(asset.id)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center bg-r-border text-caption text-r-muted">
          {asset.file_name}
        </div>
      )}

      {uploading ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-r-border">
          <div
            className="h-full w-1/2 animate-pulse rounded-full"
            style={{ backgroundColor: 'var(--color-r-accent)' }}
          />
        </div>
      ) : null}

      {!uploading && onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(asset.id)}
          className="absolute right-2 top-2 rounded-full p-1.5 shadow-sm transition-colors"
          style={{ backgroundColor: 'rgba(242,236,228,0.92)' }}
          aria-label={`Remove ${asset.file_name}`}
        >
          <svg width="12" height="12" fill="none" stroke="var(--color-r-danger)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhotosPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [uploadedAssets, setUploadedAssets] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const selectedPhotosRef = useRef([]);
  const uploadedAssetsRef = useRef([]);

  const handleFiles = useCallback((files) => {
    setErrorMessage('');
    setMessage('');

    if (!files.length) {
      setErrorMessage('No photos were selected.');
      return;
    }

    const validPhotos = [];
    const rejectedPhotos = [];

    files.forEach((file) => {
      if (!isAcceptedPhotoFile(file)) { rejectedPhotos.push(file.name || 'A selected file'); return; }
      if (file.size > MAX_PHOTO_BYTES) { rejectedPhotos.push(file.name || 'A selected file'); return; }
      validPhotos.push(file);
    });

    if (rejectedPhotos.length) {
      setErrorMessage(`${formatCount(rejectedPhotos.length, 'file')} could not be added. Please choose image files under 50 MB.`);
    }

    if (!validPhotos.length) return;

    const nextSelectedPhotos = validPhotos.map(createSelectedPhoto);
    setSelectedPhotos((current) => [...current, ...nextSelectedPhotos]);
    setStatus('selected');
  }, []);

  const revokePreviewUrls = useCallback((photos) => {
    if (typeof URL === 'undefined') return;
    photos.forEach((photo) => {
      if (photo.previewUrl?.startsWith?.('blob:')) URL.revokeObjectURL(photo.previewUrl);
    });
  }, []);

  async function handleUpload() {
    if (status === 'uploading') return;
    if (!selectedPhotos.length) {
      setErrorMessage('Please select at least one photo before uploading.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');
    setMessage('');

    try {
      const selectedAtUpload = selectedPhotos;
      const result = await uploadPhotos(inviteToken, selectedAtUpload.map((photo) => photo.file));
      const previewQueues = new Map();
      selectedAtUpload.forEach((photo) => {
        const queue = previewQueues.get(photo.file_name) ?? [];
        queue.push(photo);
        previewQueues.set(photo.file_name, queue);
      });
      const uploadedPreviewIds = new Set();
      const uploadedWithPreviews = result.assets.map((asset, index) => ({
        ...asset,
        previewUrl: (previewQueues.get(asset.file_name)?.shift() ?? selectedAtUpload[index])?.previewUrl ?? null,
        previewFailed: false,
      })).map((asset) => {
        const matchingPhoto = selectedAtUpload.find(
          (photo) => photo.previewUrl === asset.previewUrl && !uploadedPreviewIds.has(photo.id),
        );
        if (matchingPhoto) uploadedPreviewIds.add(matchingPhoto.id);
        return asset;
      });
      const failedSelections = result.partialFailure
        ? selectedAtUpload.filter((photo) => !uploadedPreviewIds.has(photo.id))
        : [];

      setUploadedAssets((current) => [...current, ...uploadedWithPreviews]);
      setSelectedPhotos(failedSelections);
      setStatus(failedSelections.length ? 'selected' : 'success');
      setMessage(
        result.partialFailure
          ? `${formatCount(uploadedWithPreviews.length, 'photo')} uploaded. Some photos could not be saved.`
          : `${formatCount(uploadedWithPreviews.length, 'photo')} uploaded successfully.`,
      );
      if (result.partialFailure) {
        setErrorMessage('Please review the selected photos and try again for anything that did not upload.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'We could not upload those photos. Please try again.',
      );
    }
  }

  async function handleDelete(assetId) {
    try {
      await deletePhoto(inviteToken, assetId);
      setUploadedAssets((current) => current.filter((asset) => asset.id !== assetId));
    } catch {
      setErrorMessage('We could not remove that photo. Please try again.');
    }
  }

  function handleRemoveSelected(assetId) {
    setSelectedPhotos((current) => {
      const photoToRemove = current.find((photo) => photo.id === assetId);
      if (photoToRemove) revokePreviewUrls([photoToRemove]);
      const nextPhotos = current.filter((photo) => photo.id !== assetId);
      if (!nextPhotos.length && !uploadedAssets.length) setStatus('idle');
      return nextPhotos;
    });
  }

  function handlePreviewError(assetId) {
    setSelectedPhotos((current) =>
      current.map((photo) => (photo.id === assetId ? { ...photo, previewFailed: true } : photo)),
    );
    setUploadedAssets((current) =>
      current.map((asset) => (asset.id === assetId ? { ...asset, previewFailed: true } : asset)),
    );
  }

  function handleContinue() {
    router.push(`/contribute/${inviteToken}/voice`);
  }

  // Load existing photos on mount
  useEffect(() => {
    let isMounted = true;
    async function loadExistingPhotos() {
      try {
        const summary = await getContributorSummary(inviteToken);
        if (isMounted && summary.photos.length) {
          setUploadedAssets(summary.photos.map((photo) => ({ ...photo, previewFailed: false })));
          setStatus('success');
          setMessage(`${formatCount(summary.photos.length, 'photo')} already uploaded.`);
        }
      } catch {
        if (isMounted) setErrorMessage('We could not check for previously uploaded photos in this browser.');
      }
    }
    loadExistingPhotos();
    return () => { isMounted = false; };
  }, [inviteToken]);

  // Ref sync + blob URL cleanup
  useEffect(() => { selectedPhotosRef.current = selectedPhotos; }, [selectedPhotos]);
  useEffect(() => { uploadedAssetsRef.current = uploadedAssets; }, [uploadedAssets]);
  useEffect(() => {
    return () => {
      revokePreviewUrls(selectedPhotosRef.current);
      revokePreviewUrls(uploadedAssetsRef.current);
    };
  }, [revokePreviewUrls]);

  const selectedCount = selectedPhotos.length;
  const uploadedCount = uploadedAssets.length;
  const hasUnuploadedSelection = selectedCount > 0;
  const isUploading = status === 'uploading';
  const canContinue = !isUploading && !hasUnuploadedSelection;
  const continueLabel = uploadedCount > 0 ? 'Continue' : 'Skip photos for now';

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="page-shell">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        <div className="text-center">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="mt-2 text-body-2 text-r-secondary">
            Add photos from your camera roll. You can select one photo or several at once.
          </p>
        </div>

        <DropZone onFiles={handleFiles} disabled={isUploading} />

        {selectedCount > 0 ? (
          <section className="rounded-2xl p-5 sm:p-6 border border-r-border">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-h3 text-r-text">Ready to upload</p>
                <p className="text-caption text-r-muted">{formatCount(selectedCount, 'photo')} selected</p>
              </div>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="rounded-full px-5 py-2.5 text-body-2 font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 border-none"
                style={{ backgroundColor: 'var(--color-r-text)', color: '#FBF9F6' }}
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedCount === 1 ? 'photo' : 'photos'}`}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {selectedPhotos.map((asset) => (
                <PhotoThumb
                  key={asset.id}
                  asset={asset}
                  onDelete={isUploading ? null : handleRemoveSelected}
                  uploading={isUploading}
                  onPreviewError={handlePreviewError}
                />
              ))}
            </div>
          </section>
        ) : null}

        {uploadedCount > 0 ? (
          <section className="rounded-2xl p-5 sm:p-6 border border-r-border">
            <div className="mb-4 flex flex-col gap-1">
              <p className="text-h3 text-r-text">Uploaded photos</p>
              <p className="text-caption text-r-muted">
                {formatCount(uploadedCount, 'photo')} saved to this contribution
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {uploadedAssets.map((asset) => (
                <PhotoThumb
                  key={asset.id}
                  asset={asset}
                  onDelete={handleDelete}
                  uploading={false}
                  onPreviewError={handlePreviewError}
                />
              ))}
            </div>
          </section>
        ) : null}

        {message ? (
          <p
            className="rounded-2xl px-4 py-3 text-center text-caption"
            style={{ backgroundColor: '#E4E8D8', color: 'var(--color-r-colleague)' }}
            role="status"
          >
            {message}
          </p>
        ) : null}

        {errorMessage ? (
          <p
            className="rounded-2xl px-4 py-3 text-center text-caption"
            style={{ backgroundColor: '#F5DDD6', color: 'var(--color-r-danger)' }}
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-55 bg-r-btn text-r-btn-text border-none"
        >
          {isUploading ? 'Uploading photos...' : hasUnuploadedSelection ? 'Upload selected photos to continue' : continueLabel}
        </button>

      </div>
    </main>
  );
}
