'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMemorialViewerPath } from '@/services/viewerService';
import MemorialViewer from './MemorialViewer';

export default function MemorialViewerRedirect() {
  const { id } = useParams();
  const router = useRouter();
  const [requestVersion, setRequestVersion] = useState(0);
  const [result, setResult] = useState({ id: null, error: null });

  useEffect(() => {
    let cancelled = false;
    async function openPublicViewer() {
      try {
        const path = await getMemorialViewerPath(id);
        if (!cancelled) router.replace(path);
      } catch (error) {
        if (!cancelled) setResult({ id, error: error.message || 'The memorial could not be opened.' });
      }
    }
    openPublicViewer();
    return () => { cancelled = true; };
  }, [id, requestVersion, router]);

  function retry() {
    setResult({ id: null, error: null });
    setRequestVersion((version) => version + 1);
  }

  const error = result.id === id ? result.error : null;
  return <MemorialViewer loading={!error} error={error} onRetry={retry} />;
}
