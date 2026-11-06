"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import ViewerDialog from '@/components/viewer/ViewerDialog';
import ViewerTransition from '@/components/viewer/ViewerTransition';

export default function PhotoDialog({ photos, index, onClose, onChange }) {
  const photo = photos[index];
  const hasMany = photos.length > 1;

  if (!photo) return null;

  return (
    <ViewerDialog label="Photo" background="transparent" variant="popup" className="flex flex-col items-center justify-center" onClose={onClose} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft' && hasMany) { event.preventDefault(); onChange((index - 1 + photos.length) % photos.length); }
      if (event.key === 'ArrowRight' && hasMany) { event.preventDefault(); onChange((index + 1) % photos.length); }
    }}>
      <button
        type="button"
        onClick={onClose}
        autoFocus
        aria-label="Close photo"
        className="absolute left-5 top-5 rounded-full p-2 text-r-modal transition-colors hover:bg-r-modal/20"
      >
        <img src="/icons/design/close-photo.svg" width={50} height={50} alt="" aria-hidden="true" />
      </button>

      {hasMany ? (
        <>
          <button
            type="button"
            onClick={() => onChange((index - 1 + photos.length) % photos.length)}
            aria-label="Previous photo"
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full p-2 text-r-modal transition-colors hover:bg-r-modal/20 sm:left-4"
          >
            <ChevronLeft size={36} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onChange((index + 1) % photos.length)}
            aria-label="Next photo"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-2 text-r-modal transition-colors hover:bg-r-modal/20 sm:right-4"
          >
            <ChevronRight size={36} aria-hidden="true" />
          </button>
        </>
      ) : null}

      <ViewerTransition motionKey={photo.id} path={`photo/${index}`} className="w-full max-w-[886px]" focusOnEnter={false} name="photo">
        <EnlargedPhoto key={photo.id} photo={photo} />
        <div className="mt-5 flex flex-col gap-1">
          {photo.caption ? <p className="text-body-2 text-r-modal">{photo.caption}</p> : null}
          {photo.contributorName ? <p className="text-body-2 text-r-modal/80">Submitted by {photo.contributorName}</p> : null}
          {photo.dateLabel ? <p className="text-body-2 text-r-modal/80">{photo.dateLabel}</p> : null}
          <p className="mt-2 text-sm text-r-modal/80" aria-live="polite">{index + 1} / {photos.length}</p>
        </div>
      </ViewerTransition>
    </ViewerDialog>
  );
}

function EnlargedPhoto({ photo }) {
  const [failed, setFailed] = useState(false);
  return photo.url && !failed ? (
    <img src={photo.url} alt={photo.caption || ''} onError={() => setFailed(true)} className="mx-auto max-h-[min(62svh,max(100px,calc(100svh-260px)))] w-auto max-w-full object-contain" />
  ) : (
    <div className="flex min-h-48 flex-col items-center justify-center gap-4 p-6 text-center">
      <ImageOff size={32} aria-hidden="true" /><p>This photo is unavailable</p>
    </div>
  );
}

