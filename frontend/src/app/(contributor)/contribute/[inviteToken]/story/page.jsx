'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/story/page.jsx
// Text story submission page
// Contributor writes a titled story about the deceased
// "Need suggestions?" → AI-powered title suggestions (Day 9)

import { useState } from 'react';
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

// AI title suggestions — Day 9: replace with real API call
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
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        {/* Heading */}
        <div className="text-center pt-4">
          <h1 className="text-[40px] font-medium leading-tight text-neutral-950">
            Upload your memories
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Type a story about {deceasedName}.
          </p>
        </div>

        {/* Story form */}
        <div className="flex flex-col gap-3">

          {/* Title row */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-950">
              Story title
            </label>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center gap-1.5 text-sm text-neutral-950 hover:opacity-70 transition-opacity"
            >
              {/* Sparkle icon */}
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" />
              </svg>
              Need suggestions?
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              {MOCK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left text-sm text-neutral-950 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0"
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
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
          />

          {/* Body textarea */}
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setError(''); }}
            placeholder="Write your memory here..."
            rows={12}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full rounded-full bg-neutral-950 py-4 text-base font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>

      </div>
    </main>
  );
}
