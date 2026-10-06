'use client';

import MemorialCoverImage from '@/components/memorial/MemorialCoverImage';
import { getMemorialYearRange } from '@/lib/viewer/memorialViewer.mjs';
import styles from './MemorialViewer.module.css';

export default function ViewerLanding({ memorial, onStart }) {
  const years = getMemorialYearRange(memorial);

  return (
    <main className={styles.landing} tabIndex={-1} data-viewer-screen="intro">
      <div className={styles.profile}>
        <MemorialCoverImage
          src={memorial.cover_photo_url}
          name={memorial.subject_name}
          width={314}
          height={314}
          className={styles.portrait}
          fallbackClassName="bg-r-card text-r-secondary"
        />
        <div className={styles.personInfo}>
          <h1>{memorial.subject_name}</h1>
          {years ? <p className={styles.years}>{years}</p> : null}
          {memorial.biography ? <p className={styles.biography}>{memorial.biography}</p> : null}
        </div>
      </div>
      <button type="button" className={styles.start} onClick={onStart}>Start</button>
    </main>
  );
}
