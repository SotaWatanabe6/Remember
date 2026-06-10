'use client';

// src/app/(contributor)/contribute/[inviteToken]/story/page.jsx

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

function ContributorNav({ backHref }) {
  return (
    <nav className="flex h-10 items-center justify-between pt-2 sm:pt-4">
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

const MOCK_SUGGESTIONS = [
  'Our first time meeting',
  'A day I will never forget',
  'The kindness they always showed',
  'A memory that makes me smile',
  'What they taught me',
];

// ─── Speech-to-text hook ──────────────────────────────────────────────────────
// Uses the Web Speech API — built into Chrome, Edge, and Safari.
// No backend required. No API key. All processing in the browser.
// Firefox does not support it — the button shows a not-supported message instead.

function useSpeechToText({ onFinalTranscript, onInterimTranscript }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window?.SpeechRecognition || window?.webkitSpeechRecognition;
    if (!SpeechRecognition) setSupported(false);
  }, []);

  function start() {
    const SpeechRecognition = window?.SpeechRecognition || window?.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      if (finalText) onFinalTranscript(finalText);
      onInterimTranscript(interimText);
    };

    recognition.onerror = () => {
      setListening(false);
      onInterimTranscript('');
    };

    recognition.onend = () => {
      setListening(false);
      onInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
    onInterimTranscript('');
  }

  function toggle() {
    if (listening) { stop(); } else { start(); }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  return { listening, supported, toggle };
}

export default function StoryPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [interimText, setInterimText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Read memorial name from contributor session
  const [deceasedName, setDeceasedName] = useState('John');
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem(`remember_contributor_session:${inviteToken}`) || '{}');
      if (session?.memorialSubjectName) setDeceasedName(session.memorialSubjectName);
    } catch {}
  }, [inviteToken]);

  const { listening, supported, toggle: toggleMic } = useSpeechToText({
    onFinalTranscript: (text) => {
      setBody((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text);
    },
    onInterimTranscript: (text) => setInterimText(text),
  });

  function handleSuggestion(suggestion) {
    setTitle(suggestion);
    setShowSuggestions(false);
  }

  async function handleContinue() {
    // Stop mic if still listening
    if (listening) toggleMic();

    if (!title.trim() && !body.trim()) {
      setError('Please add a title or write something before continuing.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const storiesKey = `remember_stories:${inviteToken}`;
      const existing = JSON.parse(localStorage.getItem(storiesKey) || '[]');
      const newStory = {
        id: `story-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(storiesKey, JSON.stringify([...existing, newStory]));
      router.push(`/contribute/${inviteToken}/review`);
    } catch (err) {
      console.error('Story save failed:', err);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  // The displayed body value: if currently listening, show committed text + live interim
  const displayedBody = listening && interimText
    ? body + (body && !body.endsWith(' ') ? ' ' : '') + interimText
    : body;

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="page-shell">

        <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

        <div className="text-center pt-4">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="mt-3 text-body-2 text-r-secondary">Tell us a story about {deceasedName}.</p>
        </div>

        <div className="flex flex-col gap-3">

          {/* Story title row */}
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
            <div className="rounded-xl overflow-hidden shadow-sm bg-r-modal" style={{ border: '1px solid var(--color-r-border)' }}>
              {MOCK_SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} onClick={() => handleSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left text-body-2 text-r-text transition-colors bg-transparent"
                  style={{ borderBottom: '1px solid var(--color-r-card)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-r-card)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

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

          {/* Body label row with mic button */}
          <div className="flex items-center justify-between mt-1">
            <label className="text-body-2 text-r-secondary">
              Type your story below or record your answer.
            </label>
            <div className="flex items-center gap-3">
              {/* Waveform bars — animated when listening */}
              <div className="flex items-end gap-[2px]">
                {[3, 6, 9, 5, 8, 4, 7, 5, 9, 6, 3, 7, 5].map((h, i) => (
                  <div key={i} className="w-[2px] rounded-full transition-all"
                    style={{
                      height: `${listening ? h + 2 : h}px`,
                      backgroundColor: listening ? 'var(--color-r-text)' : 'var(--color-r-muted)',
                      opacity: listening ? (0.5 + (i % 3) * 0.2) : 0.5,
                    }} />
                ))}
              </div>
              {/* Mic toggle button */}
              <button
                type="button"
                onClick={toggleMic}
                title={!supported ? 'Speech recognition not supported in this browser' : listening ? 'Stop recording' : 'Record your answer'}
                aria-label={listening ? 'Stop recording' : 'Record your answer'}
                className="transition-opacity hover:opacity-70"
                style={{ color: listening ? 'var(--color-r-danger)' : 'var(--color-r-muted)' }}
              >
                {listening ? (
                  // Stop square icon when recording
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  // Mic icon
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Listening indicator */}
          {listening && (
            <p className="text-caption" style={{ color: 'var(--color-r-danger)' }}>
              Listening... speak now. Tap the mic button again to stop.
            </p>
          )}

          {/* Body textarea — read-only during listening so interim text shows without conflict */}
          <textarea
            value={displayedBody}
            onChange={(e) => {
              if (!listening) { setBody(e.target.value); setError(''); }
            }}
            readOnly={listening}
            placeholder="Write your memory here..."
            rows={12}
            className="w-full rounded-xl px-4 py-4 text-body-1 text-r-text bg-transparent focus:outline-none resize-none"
            style={{
              border: '1px solid var(--color-r-border)',
              lineHeight: 1.6,
              opacity: listening ? 0.85 : 1,
            }}
            onFocus={(e) => { if (!listening) e.target.style.borderColor = 'var(--color-r-border-focus)'; }}
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
