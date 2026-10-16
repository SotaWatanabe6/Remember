import test from 'node:test';
import assert from 'node:assert/strict';
import { navigateViewerScreen } from '../src/lib/viewer/viewerNavigation.mjs';

test('chapter entry adds history while slide playback replaces the current entry', () => {
  const previousWindow = globalThis.window;
  const calls = [];
  const events = [];
  globalThis.window = {
    location: { href: 'https://example.test/share/token#story' },
    history: Object.fromEntries(['pushState', 'replaceState'].map((method) => [method, (_state, _title, url) => {
      calls.push([method, url.hash]);
      window.location.href = url.href;
    }])),
    dispatchEvent: (event) => events.push(event.type),
  };
  try {
    navigateViewerScreen('story/slide/0');
    navigateViewerScreen('story/slide/1', { replace: true });
    navigateViewerScreen('story/slide/1', { replace: true });
    assert.deepEqual(calls, [['pushState', '#story/slide/0'], ['replaceState', '#story/slide/1']]);
    assert.deepEqual(events, ['remember:viewer-navigation', 'remember:viewer-navigation']);
  } finally { globalThis.window = previousWindow; }
});
