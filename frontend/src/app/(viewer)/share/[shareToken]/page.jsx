'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getShareToken } from '@/lib/api';
import { normalizeViewerData } from '@/lib/viewer/memorialViewer.mjs';
import MemorialViewer from '@/components/viewer/MemorialViewer';
import ViewerSectionContent from '@/components/viewer/ViewerSectionContent';

function renderSection(section, data) {
  return <ViewerSectionContent section={section} data={data} />;
}

export default function SharePage() {
  const { shareToken } = useParams();
  const [requestVersion, setRequestVersion] = useState(0);
  const [result, setResult] = useState({ token: null, data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const payload = await getShareToken(shareToken);
        if (!cancelled) setResult({ token: shareToken, data: normalizeViewerData(payload), error: null, loading: false });
      } catch (error) {
        if (!cancelled) setResult({ token: shareToken, data: null, error: error.message || 'The memorial could not be loaded.', loading: false });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [shareToken, requestVersion]);

  function handleRetry() {
    setResult({ token: shareToken, data: null, error: null, loading: true });
    setRequestVersion((version) => version + 1);
  }

  return (
    <MemorialViewer
      key={shareToken}
      data={result.data}
      loading={result.token !== shareToken || result.loading}
      error={result.error}
      onRetry={handleRetry}
      renderSection={renderSection}
    />
  );
}
