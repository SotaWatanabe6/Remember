'use client';

// src/app/(contributor)/contribute/[inviteToken]/story/page.jsx

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// ─── Nav ──────────────────────────────────────────────────────────────────────

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between">
      <span className="text-r-text text-2xl leading-8">Remember</span>
      <Link href={backHref} className="flex items-center gap-1.5 text-body-2 text-r-secondary transition-colors">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>
    </nav>
  );
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const MOCK_SUGGESTIONS = [
  'Our first time meeting',
  'A day I will never forget',
  'The kindness they always showed',
  'A memory that makes me smile',
  'What they taught me',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

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
      // Day 9: await saveStory(inviteToken, { title: title.trim(), body: body.trim() });
      router.push(`/contribute/${inviteToken}/review`);
    } catch (err) {
      console.error('Story save failed:', err);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="page-shell">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        <div className="text-center pt-4">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="mt-3 text-body-2 text-r-secondary">Type a story about {deceasedName}.</p>
        </div>

        <div className="flex flex-col gap-3">

          <div className="flex items-center justify-between">
            <label className="text-h4 text-r-text">Story title</label>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center gap-1.5 text-body-2 text-r-text transition-opacity hover:opacity-70"
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" />
              </svg>
              Need suggestions?
            </button>
          </div>

          {showSuggestions && (
            <div
              className="rounded-xl overflow-hidden shadow-sm bg-r-modal"
              style={{ border: '1px solid var(--color-r-border)' }}
            >
              {MOCK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left text-body-2 text-r-text transition-colors bg-transparent"
                  style={{ borderBottom: '1px solid var(--color-r-card)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-r-card)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Title input — border stays inline for focus state swap */}
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            placeholder="Our first time meeting"
            className="w-full rounded-xl px-4 py-4 text-body-1 text-r-text bg-transparent focus:outline-none"
            style={{ border: '1px solid var(--color-r-border)' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-r-border-focus)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-r-border)'; }}
          />

          {/* Body textarea */}
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setError(''); }}
            placeholder="Write your memory here..."
            rows={12}
            className="w-full rounded-xl px-4 py-4 text-body-1 text-r-text bg-transparent focus:outline-none resize-none"
            style={{ border: '1px solid var(--color-r-border)', lineHeight: 1.6 }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-r-border-focus)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-r-border)'; }}
          />

          {error && <p className="text-body-2 text-r-danger">{error}</p>}
        </div>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-50 bg-r-btn text-r-btn-text border-none"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>

      </div>
    </main>
  );
}
