'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMemorialViewerPath } from '@/services/viewerService';

export default function ViewMemorialButton({ memorialId, className }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(null);

  async function openMemorial() {
    if (opening || !memorialId) return;
    setOpening(true);
    setError(null);
    try {
      router.push(await getMemorialViewerPath(memorialId));
    } catch (error) {
      setError(error.message || 'The memorial could not be opened.');
      setOpening(false);
    }
  }

  return (
    <div>
      <button type="button" className={className} onClick={openMemorial} disabled={opening || !memorialId} aria-busy={opening}>
        {opening ? 'Opening Memorial...' : 'View Memorial'}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-r-danger">{error}</p> : null}
    </div>
  );
}
