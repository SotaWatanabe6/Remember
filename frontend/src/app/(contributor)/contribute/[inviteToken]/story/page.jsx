'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/story/page.jsx
// Text story submission page
// Contributor writes a titled story about the deceased
// "Need suggestions?" → AI-powered title suggestions (Day 9)

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const FONT = "'Cormorant Garamond', Georgia, serif";

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span style={{ fontFamily: FONT }} className="text-2xl leading-8 text-[#423F39]">Remember</span>
      <Link
        href={backHref}
        style={{ fontFamily: FONT }}
        className="flex items-center gap-1.5 text-base text-[#5F5A52] hover:text-[#423F39] transition-colors"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

// Day 9: replace with real API call
const MOCK_SUGGESTIONS = [
  'Our first time meeting',
  'A day I will never forget',
  'The kindness they always showed',
  'A memory that makes me smile',
  'What they taught me',
];

export default function StoryPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Day 9: replace with real memorial name from session
  const deceasedName = 'John';

  function handleSuggestion(suggestion) {
    setTitle(suggestion);
    setShowSuggestions(false);
  }

  async function handleContinue() {
    if (!title.trim() && !body.trim()) {
      setError('Please add a title or write something before continuing.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Day 9: save story to backend
      // await saveStory(inviteToken, { title: title.trim(), body: body.trim() });
      router.push(`/contribute/${inviteToken}/review`);
    } catch (err) {
      console.error('Story save failed:', err);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <main
      className="min-h-screen px-6 py-10 sm:px-[50px]"
      style={{ backgroundColor: '#F0EAE2', fontFamily: FONT, color: '#423F39' }}
    >
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        {/* Heading */}
        <div className="text-center pt-4">
          <h1 className="text-[48px] font-bold leading-tight" style={{ color: '#423F39', letterSpacing: '-0.01em' }}>
            Upload your memories
          </h1>
          <p className="mt-3 text-[18px]" style={{ color: '#5F5A52' }}>
            Type a story about {deceasedName}.
          </p>
        </div>

        {/* Story form */}
        <div className="flex flex-col gap-3">

          {/* Title label row */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: '#423F39' }}>
              Story title
            </label>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
              style={{ color: '#423F39', fontFamily: FONT }}
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" />
              </svg>
              Need suggestions?
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div
              className="rounded-xl overflow-hidden shadow-sm"
              style={{ border: '1px solid #D4CAC0', backgroundColor: '#FBF9F6' }}
            >
              {MOCK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left text-sm transition-colors"
                  style={{ borderBottom: '1px solid #E8E0D8', color: '#423F39', fontFamily: FONT, backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E8E0D8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            placeholder="Our first time meeting"
            className="w-full rounded-xl px-4 py-4 text-[18px] focus:outline-none"
            style={{
              border: '1px solid #D4CAC0',
              color: '#423F39',
              fontFamily: FONT,
              backgroundColor: 'transparent',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#B8AEA4'; }}
            onBlur={(e) => { e.target.style.borderColor = '#D4CAC0'; }}
          />

          {/* Body textarea */}
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setError(''); }}
            placeholder="Write your memory here..."
            rows={12}
            className="w-full rounded-xl px-4 py-4 text-[18px] focus:outline-none resize-none"
            style={{
              border: '1px solid #D4CAC0',
              color: '#423F39',
              fontFamily: FONT,
              backgroundColor: 'transparent',
              lineHeight: 1.6,
            }}
            onFocus={(e) => { e.target.style.borderColor = '#B8AEA4'; }}
            onBlur={(e) => { e.target.style.borderColor = '#D4CAC0'; }}
          />

          {error && (
            <p className="text-sm" style={{ color: '#C0503A' }}>{error}</p>
          )}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full rounded-full py-4 text-[17px] transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-50"
          style={{
            backgroundColor: '#C4B49A',
            color: '#5F5A52',
            border: 'none',
            fontFamily: FONT,
            letterSpacing: '0.02em',
          }}
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>

      </div>
    </main>
  );
}
