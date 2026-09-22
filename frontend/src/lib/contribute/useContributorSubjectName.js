'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useContributorSubjectName(inviteToken) {
  return useSyncExternalStore(subscribe, () => {
    try {
      const session = JSON.parse(localStorage.getItem(`remember_contributor_session:${inviteToken}`) || '{}');
      return session?.memorialSubjectName || session?.deceasedName || session?.subjectName || '';
    } catch {
      return '';
    }
  }, () => '');
}
