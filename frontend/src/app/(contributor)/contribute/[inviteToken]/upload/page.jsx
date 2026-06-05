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
  {
    id: 'photo',
    label: 'Photo',
    icon: (
      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: (
      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
  },
  {
    id: 'story',
    label: 'Story (text)',
    icon: (
      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
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

        <ContributorNav backHref={`/contribute/${inviteToken}/questions`} />

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
              className="flex flex-col items-center justify-center gap-4 rounded-2xl py-16 px-6 text-center transition-colors border border-r-border bg-transparent"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-r-card)';
                e.currentTarget.style.borderColor = 'var(--color-r-border-focus)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--color-r-border)';
              }}
            >
              <span className="text-r-muted">{type.icon}</span>
              <span className="text-body-1 text-r-muted">{type.label}</span>
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
