'use client';

import { useParams } from 'next/navigation';

export default function SubmittedPage() {
  const { inviteToken } = useParams();

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10">

        {/* Nav */}
        <nav className="flex h-10 items-center justify-between">
          <span className="text-2xl leading-8 text-neutral-950">Remember</span>
          <span className="flex items-center gap-1.5 text-base text-slate-400 cursor-default select-none">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </span>
        </nav>

        {/* Content */}
        <div className="flex flex-col items-center gap-10 py-10 text-center">
          <div>
            <h1 className="text-[40px] font-medium leading-tight text-neutral-950">
              Submission completed
            </h1>
            <p className="mt-4 max-w-md text-base text-slate-500 leading-relaxed">
              Thank you for sharing these precious moments. Your memories will be treasured and help keep their spirit alive.
            </p>
          </div>

          {/* Avatar placeholder — matches design's grey circle */}
          <div className="h-48 w-48 rounded-full bg-neutral-200" />

          {/* Continue button — navigates back to start or closes */}
          <button
            onClick={() => window.close()}
            className="w-full max-w-xs rounded-full bg-neutral-950 py-4 text-base font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70"
          >
            Continue
          </button>
        </div>

      </div>
    </main>
  );
}
