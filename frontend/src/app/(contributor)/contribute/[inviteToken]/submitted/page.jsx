'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/submitted/page.jsx
// Updated per design call:
// - Remove "Continue" button
// - Add "Start Again" + "Share" buttons
// - Warmer thank you message

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const FONT = "'Cormorant Garamond', Georgia, serif";

const COLORS = {
  bg: '#F0EAE2',
  family: '#AF5F42',
  friend: '#45556C',
  colleague: '#59763C',
  text: '#1a1a1a',
  textMuted: '#6b6b6b',
  cardBg: '#E8E0D8',
  border: '#D4CAC0',
};

export default function SubmittedPage() {
  const { inviteToken } = useParams();
  const router = useRouter();

  function handleStartAgain() {
    router.push(`/contribute/${inviteToken}/upload`);
  }

  function handleShare() {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  }

  // Fix full-page cream background — no white showing around edges
  useEffect(() => {
    const prevBody = document.body.style.backgroundColor;
    const prevHtml = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = COLORS.bg;
    document.documentElement.style.backgroundColor = COLORS.bg;
    return () => {
      document.body.style.backgroundColor = prevBody;
      document.documentElement.style.backgroundColor = prevHtml;
    };
  }, []);

  return (
    <main
      className="min-h-screen px-6 py-10 sm:px-[50px]"
      style={{ backgroundColor: '#F0EAE2', fontFamily: FONT, color: '#423F39' }}
    >
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10">

        {/* Nav — no back button on submitted */}
        <nav className="flex h-10 items-center justify-between">
          <span className="text-2xl leading-8" style={{ color: '#423F39' }}>Remember</span>
        </nav>

        {/* Content */}
        <div className="flex flex-col items-center gap-10 py-10 text-center">

          {/* Heading + subtitle above the circle — matches finalized design */}
          <div>
            <h1
              className="text-[52px] font-bold leading-tight"
              style={{ color: '#423F39', letterSpacing: '-0.01em' }}
            >
              Submission completed
            </h1>
            <p
              className="mt-4 max-w-md text-[17px] leading-relaxed"
              style={{ color: '#5F5A52' }}
            >
              Thank you for sharing these precious moments. Your memories will be treasured
              and help keep their spirit alive.
            </p>
          </div>

          {/* Decorative olive circle — matches finalized design */}
          <div
            className="h-48 w-48 rounded-full"
            style={{ backgroundColor: '#5F6848' }}
          />

          {/* CTA buttons */}
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button
              onClick={handleStartAgain}
              className="w-full rounded-full py-4 text-[17px] transition-opacity hover:opacity-80 active:opacity-70"
              style={{
                backgroundColor: '#C4B49A',
                color: '#5F5A52',
                fontFamily: FONT,
                border: 'none',
              }}
            >
              Start again
            </button>

            <button
              onClick={handleShare}
              className="w-full rounded-full py-4 text-[17px] transition-colors"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #D4CAC0',
                color: '#423F39',
                fontFamily: FONT,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E8E0D8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              Share this memorial
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
