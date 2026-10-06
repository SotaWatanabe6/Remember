'use client';

import MemorialCoverImage from '@/components/memorial/MemorialCoverImage';
import { getViewerSections } from '@/lib/viewer/memorialViewer.mjs';
import styles from './MemorialViewer.module.css';

export default function ViewerNavigation({ memorial, output, onSelect }) {
  return (
    <main className={styles.navigation} tabIndex={-1} data-viewer-screen="navigation" aria-label="Choose a memorial section">
      <nav className={styles.circleNavigation} aria-label="Memorial sections">
        <div className={styles.circlePortrait}>
          <img className={styles.circleAsset} src="/images/viewer/navigation-circle.svg" width={314} height={314} alt="" aria-hidden="true" />
          <MemorialCoverImage
            src={memorial.cover_photo_url}
            name={memorial.subject_name}
            width={314}
            height={314}
            className={styles.navigationPortrait}
            fallbackClassName="bg-r-card text-r-secondary"
          />
        </div>
        {getViewerSections(output).map(({ id, label, position }) => (
          <button
            key={id}
            type="button"
            className={`${styles.sectionLink} ${styles[position]}`}
            onClick={() => onSelect(id)}
          >
            <span className={styles.marker} aria-hidden="true">
              <img
                src={`/images/viewer/${position === 'top' || position === 'bottom' ? 'navigation-marker' : 'navigation-dot'}.svg`}
                width={position === 'top' || position === 'bottom' ? 50 : 24}
                height={position === 'top' || position === 'bottom' ? 50 : 24}
                alt=""
              />
            </span>
            <span className={styles.sectionLabel}>
              {label}
              <img className={styles.selectionLine} src="/images/viewer/navigation-line.svg" width={32} height={32} alt="" aria-hidden="true" />
            </span>
          </button>
        ))}
      </nav>
    </main>
  );
}
