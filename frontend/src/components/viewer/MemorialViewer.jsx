'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RememberLogo from '@/components/brand/RememberLogo';
import { resolveViewerScreen } from '@/lib/viewer/memorialViewer.mjs';
import { getViewerScreenSnapshot, navigateViewerScreen, subscribeToViewerNavigation } from '@/lib/viewer/viewerNavigation.mjs';
import ViewerLanding from './ViewerLanding';
import ViewerNavigation from './ViewerNavigation';
import styles from './MemorialViewer.module.css';

export default function MemorialViewer({ data, loading = false, error = null, onRetry, renderSection }) {
  const requestedScreen = useSyncExternalStore(subscribeToViewerNavigation, getViewerScreenSnapshot, () => 'intro');
  const screen = resolveViewerScreen(requestedScreen, data?.output);
  const fullScreen = screen === 'relationships' || screen === 'story';
  const contentRef = useRef(null);
  const previousScreen = useRef(screen);

  useEffect(() => {
    if (screen !== previousScreen.current) {
      contentRef.current?.querySelector('main, nav')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
      previousScreen.current = screen;
    }
  }, [screen]);

  const showHeader = loading || Boolean(error) || screen === 'intro' || screen === 'navigation';

  return (
    <div className={`${styles.shell} overflow-x-clip`}>
      {showHeader ? (
        <header className={styles.header}>
          <RememberLogo markSrc="/images/viewer/logo.png" />
          {!loading && !error && screen === 'intro' ? <Link className={styles.login} href="/login">Log In / Sign Up</Link> : null}
        </header>
      ) : null}
      <div ref={contentRef}>
        {loading ? (
          <main className={styles.status} role="status" aria-label="Loading memorial">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-r-border border-t-r-text motion-reduce:animate-none" aria-hidden="true" />
            <p>Loading memorial...</p>
          </main>
        ) : error ? (
          <main className={styles.status}>
            <h1>This memorial is unavailable</h1>
            <p role="alert">{error}</p>
            {onRetry ? <button type="button" className={styles.start} onClick={onRetry}>Try again</button> : null}
          </main>
        ) : screen === 'intro' ? (
          <ViewerLanding memorial={data.memorial} onStart={() => navigateViewerScreen('navigation')} />
        ) : screen === 'navigation' ? (
          <ViewerNavigation memorial={data.memorial} output={data.output} onSelect={navigateViewerScreen} />
        ) : (
          <main className={`${styles.sectionMain} ${fullScreen ? styles.fullScreenSection : ''}`} tabIndex={-1} data-viewer-screen={screen} aria-label={`${screen === 'relationships' ? 'Relationships' : screen === 'story' ? 'Story' : screen === 'voices' ? 'Voices' : 'Photos'} memorial section`}>
            {!fullScreen ? <button type="button" className={styles.back} onClick={() => navigateViewerScreen('navigation')}>
              <ArrowLeft size={25} aria-hidden="true" />
              Back
            </button> : null}
            <div className={styles.sectionContent}>{renderSection(screen, data, { onBack: () => navigateViewerScreen('navigation') })}</div>
          </main>
        )}
      </div>
    </div>
  );
}
