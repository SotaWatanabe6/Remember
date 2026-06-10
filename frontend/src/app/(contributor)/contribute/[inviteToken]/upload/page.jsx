'use client';

// src/app/(contributor)/contribute/[inviteToken]/upload/page.jsx

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// ─── Nav ──────────────────────────────────────────────────────────────────────

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between pt-2 sm:pt-4">
      <span className="text-r-text text-2xl leading-8">Remember</span>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-body-2 text-r-secondary transition-colors"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

// ─── Media types ──────────────────────────────────────────────────────────────

const MEDIA_TYPES = [
  { id: 'photo', label: 'Photo' },
  { id: 'audio', label: 'Audio' },
  { id: 'story', label: 'Story (text)' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadSelectorPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  function handleSelect(type) {
    if (type === 'photo') router.push(`/contribute/${inviteToken}/photos`);
    if (type === 'audio') router.push(`/contribute/${inviteToken}/voice`);
    if (type === 'story') router.push(`/contribute/${inviteToken}/story`);
  }

  // Day 9: replace with real memorial name from session
  const deceasedName = 'John';

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="page-shell-wide">

        <ContributorNav backHref={`/contribute/${inviteToken}/questions-review`} />

        <div className="text-center pt-4">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="mt-3 text-body-2 text-r-secondary">
            Select the media type to begin uploading your fondest memories of {deceasedName}.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {MEDIA_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className="flex min-h-[280px] items-center justify-center rounded-2xl px-6 text-center transition-colors bg-transparent"
              style={{ border: '1px solid var(--color-r-border)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-r-card)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="text-body-1 text-r-muted">{type.label}</span>
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
