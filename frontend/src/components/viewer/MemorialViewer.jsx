'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RememberLogo from '@/components/brand/RememberLogo';
import { resolveViewerScreen } from '@/lib/viewer/memorialViewer.mjs';
import ViewerLanding from './ViewerLanding';
import ViewerNavigation from './ViewerNavigation';
import styles from './MemorialViewer.module.css';

const NAVIGATION_EVENT = 'remember:viewer-navigation';

function subscribeToNavigation(callback) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  window.addEventListener(NAVIGATION_EVENT, callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
    window.removeEventListener(NAVIGATION_EVENT, callback);
  };
}

function getScreenSnapshot() {
  return window.location.hash.slice(1) || 'intro';
}

function navigateToScreen(screen) {
  const url = new URL(window.location.href);
  url.hash = screen === 'intro' ? '' : screen;
  window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export default function MemorialViewer({ data, loading = false, error = null, onRetry, renderSection }) {
  const requestedScreen = useSyncExternalStore(subscribeToNavigation, getScreenSnapshot, () => 'intro');
  const screen = resolveViewerScreen(requestedScreen, data?.output);
  const contentRef = useRef(null);
  const previousScreen = useRef(screen);

  useEffect(() => {
    if (screen !== previousScreen.current) {
      contentRef.current?.querySelector('main, nav')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
      previousScreen.current = screen;
    }
  }, [screen]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <RememberLogo markSrc="/images/viewer/logo.png" />
        {!loading && !error && screen === 'intro' ? <Link className={styles.login} href="/login">Log In / Sign Up</Link> : null}
      </header>
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
          <ViewerLanding memorial={data.memorial} onStart={() => navigateToScreen('navigation')} />
        ) : screen === 'navigation' ? (
          <ViewerNavigation memorial={data.memorial} output={data.output} onSelect={navigateToScreen} />
        ) : (
          <main className={styles.sectionMain} tabIndex={-1} data-viewer-screen={screen} aria-label={`${screen === 'relationships' ? 'Relationships' : screen === 'story' ? 'Story' : screen === 'voices' ? 'Voices' : 'Photos'} memorial section`}>
            <button type="button" className={styles.back} onClick={() => navigateToScreen('navigation')}>
              <ArrowLeft size={25} aria-hidden="true" />
              Back
            </button>
            <div className={styles.sectionContent}>{renderSection(screen, data)}</div>
          </main>
        )}
      </div>
    </div>
  );
}
