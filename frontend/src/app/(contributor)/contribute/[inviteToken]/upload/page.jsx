'use client';

// src/app/(contributor)/contribute/[inviteToken]/upload/page.jsx

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

function ContributorNav({ backHref }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 sm:px-[50px] py-6">
      <div className="flex items-center gap-2">
        <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
        <span className="text-r-text text-2xl leading-8 font-display">Remember</span>
      </div>
      <Link href={backHref} className="flex items-center gap-2 text-r-text transition-opacity hover:opacity-70">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z"
            fill="currentColor"/>
        </svg>
        <span className="text-base font-normal">Back</span>
      </Link>
    </nav>
  );
}

const MEDIA_TYPES = [
  { id: 'photo', label: 'Photos' },
  { id: 'audio', label: 'Voices' },
];

function getStoredMemorialSubjectName(inviteToken) {
  if (typeof window === 'undefined') return '';

  try {
    const session = JSON.parse(
      localStorage.getItem(`remember_contributor_session:${inviteToken}`) || '{}'
    );
    return session?.memorialSubjectName || '';
  } catch {
    return '';
  }
}

export default function UploadSelectorPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  function handleSelect(type) {
    if (type === 'photo') router.push(`/contribute/${inviteToken}/photos`);
    if (type === 'audio') router.push(`/contribute/${inviteToken}/voice`);
  }

  const [deceasedName] = useState(() => getStoredMemorialSubjectName(inviteToken));

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">

      <ContributorNav backHref={`/contribute/${inviteToken}/questions-review`} />

      <div className="flex-1 flex flex-col items-center px-6 sm:px-[50px] pt-10 pb-16 gap-12 sm:gap-16">

        {/* Header */}
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="text-body-2 text-r-secondary">
            Select the media type to begin uploading your fondest memories of {deceasedName}.
          </p>
        </div>

        {/* Cards — full width, no max-width constraint */}
        <div className="grid w-full max-w-[760px] grid-cols-1 gap-4 sm:grid-cols-2">
          {MEDIA_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className="flex min-h-[280px] items-center justify-center rounded-2xl px-6 text-center transition-colors bg-transparent"
              style={{ border: '1px solid var(--color-r-border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-r-card)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span className="text-body-1 text-r-muted">{type.label}</span>
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
