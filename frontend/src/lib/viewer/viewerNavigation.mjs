const NAVIGATION_EVENT = 'remember:viewer-navigation';

export function subscribeToViewerNavigation(callback) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  window.addEventListener(NAVIGATION_EVENT, callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
    window.removeEventListener(NAVIGATION_EVENT, callback);
  };
}

export function getViewerScreenSnapshot() {
  return window.location.hash.slice(1) || 'intro';
}

export function navigateViewerScreen(screen, { replace = false } = {}) {
  const url = new URL(window.location.href);
  url.hash = screen === 'intro' ? '' : screen;
  if (url.href === window.location.href) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}
