'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export default function PhotoReviewEnlargement({ photo, onClose }) {
  const dialogRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const label = photo.file_name || 'Photo';

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog ref={dialogRef} aria-label={label}
      onClose={(event) => {
        // Ignore a queued cleanup event if React has already reopened it.
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) {
          event.currentTarget.close();
        }
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[1100px] overflow-y-auto rounded-2xl bg-r-bg p-0 text-r-text shadow-xl backdrop:bg-black/70">
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <p className="min-w-0 truncate text-body-2" title={label}>{label}</p>
        <button type="button" aria-label="Close enlarged photo"
          onClick={() => dialogRef.current.close()}
          className="min-h-11 shrink-0 rounded-full px-4 text-body-2 hover:bg-r-card focus-visible:outline-2 focus-visible:outline-r-text">
          Close
        </button>
      </div>
      <div className="relative h-[75dvh] max-h-[800px] w-full">
        {failed ? (
          <p role="alert" className="flex h-full items-center justify-center p-6 text-center text-r-secondary">
            This photo could not be loaded. Please close this view and try again.
          </p>
        ) : (
          <Image src={photo.url || photo.photo_url || photo.previewUrl} alt={photo.caption || label}
            fill sizes="(max-width: 1132px) calc(100vw - 32px), 1100px" unoptimized
            className="object-contain" onError={() => setFailed(true)} />
        )}
      </div>
    </dialog>
  );
}
