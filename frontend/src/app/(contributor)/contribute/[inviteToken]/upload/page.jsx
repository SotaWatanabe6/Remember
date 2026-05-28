'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/upload/page.jsx
// Media type selector — contributor picks Photo, Audio, or Story (text)
// Navigates to the appropriate upload page based on selection

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span className="text-2xl leading-8 text-neutral-950">Remember</span>
      <Link
        href={backHref}
        className="flex items-center gap-1.5 text-base text-neutral-950 hover:text-slate-600 transition-colors"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

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

export default function UploadSelectorPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  function handleSelect(type) {
    if (type === 'photo') router.push(`/contribute/${inviteToken}/photos`);
    if (type === 'audio') router.push(`/contribute/${inviteToken}/voice`);
    if (type === 'story') router.push(`/contribute/${inviteToken}/story`);
  }

  // Try to read deceased name from memorial context
  // Day 9: replace with real memorial data
  const deceasedName = 'John';

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-10">

        <ContributorNav backHref={`/contribute/${inviteToken}/questions`} />

        {/* Heading */}
        <div className="text-center pt-4">
          <h1 className="text-[40px] font-medium leading-tight text-neutral-950">
            Upload your memories
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Select the media type to begin uploading your fondest memories of {deceasedName}.
          </p>
        </div>

        {/* Three media type cards */}
        <div className="grid grid-cols-3 gap-4">
          {MEDIA_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-200 bg-white py-16 px-6 text-center hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100 transition-colors"
            >
              <span className="text-slate-500">{type.icon}</span>
              <span className="text-lg text-slate-600 font-normal">{type.label}</span>
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
