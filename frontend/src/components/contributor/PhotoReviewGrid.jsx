import Image from 'next/image';
import { useState } from 'react';
import styles from './PhotoReviewGrid.module.css';

function ReviewPhoto({ photo, index, deleting, disabled, onDelete }) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const src = photo.url || photo.photo_url || photo.previewUrl;
  const label = photo.file_name || `Photo ${index + 1}`;

  return (
    <li className="relative aspect-square min-w-0 overflow-hidden bg-r-card" aria-busy={deleting}>
      {src && !previewFailed ? (
        <Image src={src} alt={photo.caption || label} fill
          sizes="(max-width: 640px) 28vw, (max-width: 986px) 26vw, 250px"
          className="object-cover" unoptimized onError={() => setPreviewFailed(true)} />
      ) : (
        <div className="flex h-full items-center justify-center px-3 pt-10 text-center text-caption text-r-secondary">
          <span className="break-all">{label}<span className="mt-1 block">Preview unavailable</span></span>
        </div>
      )}
      <button type="button" onClick={() => onDelete(photo.id)} disabled={disabled}
        aria-label={`Remove photo ${index + 1}: ${label}`}
        className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-full bg-r-bg/90 transition hover:bg-r-modal focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-r-text disabled:cursor-wait disabled:opacity-50">
        {deleting ? (
          <span className="size-5 animate-spin rounded-full border-2 border-r-border border-t-r-text" aria-hidden="true" />
        ) : (
          <Image src="/icons/review-trash.svg" width={24} height={24} alt="" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

export default function PhotoReviewGrid({ photos, deletingPhotoId, disabled, onDelete }) {
  return (
    <div className="rounded-[20px] border border-r-muted p-3 sm:p-[30px]">
      {photos.length ? (
        <div className={styles.viewport}>
          <ul className={styles.grid} tabIndex={0} aria-label="Uploaded photos; scroll to review more">
            {photos.map((photo, index) => (
              <ReviewPhoto key={photo.id} photo={photo} index={index}
                deleting={deletingPhotoId === photo.id} disabled={disabled} onDelete={onDelete} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="py-16 text-center text-body-2 text-r-secondary">No photos added. You can submit without photos.</p>
      )}
    </div>
  );
}
