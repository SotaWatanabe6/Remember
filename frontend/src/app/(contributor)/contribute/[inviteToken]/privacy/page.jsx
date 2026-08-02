'use client';

// Anonymous contributions were removed from the active flow.
// Keep this route as a forward-compatible redirect for older links.

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  useEffect(() => {
    if (inviteToken) {
      router.replace(`/contribute/${inviteToken}/public-contributor`);
    }
  }, [inviteToken, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-r-bg px-6 text-center text-r-text">
      <p className="text-body-2 text-r-secondary">Opening name entry...</p>
    </main>
  );
}
