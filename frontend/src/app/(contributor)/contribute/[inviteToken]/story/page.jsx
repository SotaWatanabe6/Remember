'use client';

// src/app/(contributor)/contribute/[inviteToken]/story/page.jsx

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

const MOCK_SUGGESTIONS = [
  'Our first time meeting',
  'A day I will never forget',
  'The kindness they always showed',
  'A memory that makes me smile',
  'What they taught me',
];

const WAVEFORM_PATH = "M25.0007 5.2085C25.7775 5.20853 26.5265 5.49791 27.1015 6.0202C27.6766 6.54249 28.0365 7.26025 28.1111 8.0335L28.1257 8.3335V41.6668C28.1253 42.4694 27.8161 43.241 27.2623 43.8218C26.7085 44.4026 25.9524 44.7481 25.1508 44.7867C24.3492 44.8252 23.5635 44.5539 22.9565 44.029C22.3495 43.504 21.9677 42.7656 21.8902 41.9668L21.8757 41.6668V8.3335C21.8757 7.50469 22.2049 6.70984 22.7909 6.12379C23.377 5.53774 24.1718 5.2085 25.0007 5.2085ZM16.6673 11.4585C17.4961 11.4585 18.291 11.7877 18.877 12.3738C19.4631 12.9598 19.7923 13.7547 19.7923 14.5835V35.4168C19.7923 36.2456 19.4631 37.0405 18.877 37.6265C18.291 38.2126 17.4961 38.5418 16.6673 38.5418C15.8385 38.5418 15.0437 38.2126 14.4576 37.6265C13.8716 37.0405 13.5423 36.2456 13.5423 35.4168V14.5835C13.5423 13.7547 13.8716 12.9598 14.4576 12.3738C15.0437 11.7877 15.8385 11.4585 16.6673 11.4585ZM33.334 11.4585C34.1628 11.4585 34.9576 11.7877 35.5437 12.3738C36.1297 12.9598 36.459 13.7547 36.459 14.5835V35.4168C36.459 36.2456 36.1297 37.0405 35.5437 37.6265C34.9576 38.2126 34.1628 38.5418 33.334 38.5418C32.5052 38.5418 31.7103 38.2126 31.1243 37.6265C30.5382 37.0405 30.209 36.2456 30.209 35.4168V14.5835C30.209 13.7547 30.5382 12.9598 31.1243 12.3738C31.7103 11.7877 32.5052 11.4585 33.334 11.4585ZM8.33398 17.7085C9.16279 17.7085 9.95764 18.0377 10.5437 18.6238C11.1297 19.2098 11.459 20.0047 11.459 20.8335V29.1668C11.459 29.9956 11.1297 30.7905 10.5437 31.3765C9.95764 31.9626 9.16279 32.2918 8.33398 32.2918C7.50518 32.2918 6.71033 31.9626 6.12428 31.3765C5.53822 30.7905 5.20898 29.9956 5.20898 29.1668V20.8335C5.20898 20.0047 5.53822 19.2098 6.12428 18.6238C6.71033 18.0377 7.50518 17.7085 8.33398 17.7085ZM41.6673 17.7085C42.4442 17.7085 43.1931 17.9979 43.7682 18.5202C44.3432 19.0425 44.7032 19.7602 44.7777 20.5335L44.7923 20.8335V29.1668C44.7919 29.9694 44.4828 30.741 43.929 31.3218C43.3751 31.9026 42.6191 32.2481 41.8175 32.2867C41.0159 32.3252 40.2302 32.0539 39.6231 31.529C39.0161 31.004 38.6343 30.2656 38.5569 29.4668L38.5423 29.1668V20.8335C38.5423 20.0047 38.8716 19.2098 39.4576 18.6238C40.0437 18.0377 40.8385 17.7085 41.6673 17.7085Z";

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
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interimText += event.results[i][0].transcript;
      }
      if (finalText) onFinalTranscript(finalText);
      onInterimTranscript(interimText);
    };
    recognition.onerror = () => { setListening(false); onInterimTranscript(''); };
    recognition.onend = () => { setListening(false); onInterimTranscript(''); };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
    onInterimTranscript('');
  }

  function toggle() { if (listening) stop(); else start(); }

  useEffect(() => { return () => { recognitionRef.current?.stop(); }; }, []);

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

  const [deceasedName, setDeceasedName] = useState('');
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

  const displayedBody = listening && interimText
    ? body + (body && !body.endsWith(' ') ? ' ' : '') + interimText
    : body;

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">

      <ContributorNav backHref={`/contribute/${inviteToken}/upload`} />

      <div className="flex-1 flex flex-col items-center px-6 sm:px-[50px] pb-16 gap-16 sm:gap-24 mt-6 sm:mt-10">

        {/* Header */}
        <div className="flex flex-col items-center gap-5 text-center max-w-lg">
          <h1 className="text-h1 text-r-text">Upload your memories</h1>
          <p className="text-body-2 text-r-secondary">Tell us a story about {deceasedName}.</p>
        </div>

        {/* Form */}
        <div className="w-full max-w-[887px] flex flex-col gap-8">

          {/* Story title */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-body-2 text-r-text">Story title</label>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-2 transition-opacity hover:opacity-70"
              >
                <svg width="23" height="22" viewBox="0 0 23 22" fill="none">
                  <path d="M8.72801 4.99416C9.30109 3.39 11.6183 3.34141 12.2978 4.84841L12.3553 4.99508L13.1287 7.15841C13.3059 7.65454 13.5923 8.10855 13.9686 8.4898C14.3449 8.87105 14.8022 9.17069 15.3098 9.3685L15.5178 9.44275L17.7795 10.1816C19.4566 10.7297 19.5073 12.9462 17.9328 13.5962L17.7795 13.6512L15.5178 14.3909C14.9989 14.5603 14.5241 14.8342 14.1254 15.1941C13.7266 15.5541 13.4132 15.9916 13.2063 16.4772L13.1287 16.6752L12.3563 18.8395C11.7832 20.4437 9.46592 20.4922 8.78742 18.9862L8.72801 18.8395L7.95559 16.6762C7.77847 16.1799 7.49211 15.7257 7.11584 15.3443C6.73957 14.9628 6.28214 14.6631 5.77442 14.4652L5.56742 14.3909L3.30576 13.6521C1.62772 13.1039 1.57692 10.8874 3.15242 10.2384L3.30576 10.1816L5.56742 9.44275C6.08611 9.27322 6.56075 8.99926 6.95933 8.63935C7.35791 8.27945 7.67117 7.84196 7.87797 7.35641L7.95559 7.15841L8.72801 4.99416ZM18.2088 1.8335C18.3881 1.8335 18.5638 1.8816 18.7159 1.97235C18.868 2.06309 18.9905 2.19283 19.0694 2.34683L19.1154 2.45408L19.4508 3.39458L20.435 3.71541C20.6147 3.7738 20.7722 3.88189 20.8876 4.02599C21.0029 4.17009 21.071 4.34371 21.0831 4.52485C21.0952 4.70598 21.0508 4.88648 20.9556 5.04347C20.8603 5.20045 20.7185 5.32686 20.5481 5.40666L20.435 5.45066L19.4518 5.7715L19.1163 6.71291C19.0552 6.88472 18.9421 7.0353 18.7914 7.14557C18.6407 7.25584 18.4592 7.32084 18.2698 7.33232C18.0804 7.34381 17.8918 7.30127 17.7277 7.21009C17.5636 7.11892 17.4316 6.98321 17.3482 6.82016L17.3022 6.71291L16.9668 5.77241L15.9826 5.45158C15.8029 5.39319 15.6454 5.2851 15.53 5.141C15.4147 4.9969 15.3466 4.82328 15.3345 4.64214C15.3224 4.46101 15.3668 4.28051 15.462 4.12352C15.5573 3.96654 15.6991 3.84014 15.8695 3.76033L15.9826 3.71633L16.9658 3.3955L17.3013 2.45408C17.3659 2.27297 17.4881 2.11575 17.6509 2.00445C17.8136 1.89316 18.0087 1.83338 18.2088 1.8335Z"
                    fill="var(--color-r-text)"/>
                </svg>
                <span className="text-body-2 text-r-text">Need suggestions?</span>
              </button>
            </div>

            {showSuggestions && (
              <div className="rounded-2xl overflow-hidden shadow-sm bg-r-modal" style={{ border: '1px solid var(--color-r-border)' }}>
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

            {/* Title input — same rounded shape as textarea */}
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(''); }}
              placeholder="Our first time meeting"
              className="w-full h-[63px] px-5 rounded-2xl text-body-1 text-r-text bg-transparent focus:outline-none transition-colors"
              style={{ border: '1px solid var(--color-r-border)' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-r-border-focus)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--color-r-border)'; }}
            />
          </div>

          {/* Story body */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-body-2 text-r-secondary">
                Type your story below or record your answer.
              </p>
              <div className="flex items-center gap-2.5">

                {/* Mic button */}
                <button
                  type="button"
                  onClick={toggleMic}
                  title={!supported ? 'Speech recognition not supported in this browser' : listening ? 'Stop recording' : 'Record your answer'}
                  aria-label={listening ? 'Stop recording' : 'Record your answer'}
                  className="transition-opacity hover:opacity-70"
                  style={{ color: listening ? 'var(--color-r-danger)' : 'var(--color-r-text)' }}
                >
                  {listening ? (
                    <svg width="50" height="50" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                      <path d="M24.9993 4.1665C26.657 4.1665 28.2467 4.82498 29.4188 5.99709C30.5909 7.16919 31.2493 8.7589 31.2493 10.4165V22.9165C31.2493 24.5741 30.5909 26.1638 29.4188 27.3359C28.2467 28.508 26.657 29.1665 24.9993 29.1665C23.3417 29.1665 21.752 28.508 20.5799 27.3359C19.4078 26.1638 18.7493 24.5741 18.7493 22.9165V10.4165C18.7493 8.7589 19.4078 7.16919 20.5799 5.99709C21.752 4.82498 23.3417 4.1665 24.9993 4.1665ZM39.5827 22.9165C39.5827 30.2707 34.1452 36.3332 27.0827 37.354V43.7498H22.916V37.354C15.8535 36.3332 10.416 30.2707 10.416 22.9165H14.5827C14.5827 25.6792 15.6801 28.3287 17.6337 30.2822C19.5872 32.2357 22.2367 33.3332 24.9993 33.3332C27.762 33.3332 30.4115 32.2357 32.365 30.2822C34.3185 28.3287 35.416 25.6792 35.416 22.9165H39.5827Z"
                        fill="currentColor"/>
                    </svg>
                  )}
                </button>

                {/* Waveform — 4 icons overlapping, no gap */}
                <div className="flex items-center" style={{ gap: 0 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <svg key={i} width="50" height="50" viewBox="0 0 50 50" fill="none"
                      style={{ marginLeft: i > 0 ? '-9px' : 0 }}>
                      <path d={WAVEFORM_PATH} fill="var(--color-r-text)" />
                    </svg>
                  ))}
                </div>

              </div>
            </div>

            {listening && (
              <p className="text-caption" style={{ color: 'var(--color-r-danger)' }}>
                Listening... speak now. Tap the mic button again to stop.
              </p>
            )}

            {/* Textarea — rounded-2xl matches title input */}
            <textarea
              value={displayedBody}
              onChange={(e) => { if (!listening) { setBody(e.target.value); setError(''); } }}
              readOnly={listening}
              placeholder="Write your memory here..."
              className="w-full rounded-2xl px-5 py-5 text-body-1 text-r-text bg-transparent focus:outline-none resize-none transition-colors"
              style={{
                border: '1px solid var(--color-r-border)',
                lineHeight: 1.6,
                height: '320px',
                opacity: listening ? 0.85 : 1,
              }}
              onFocus={(e) => { if (!listening) e.target.style.borderColor = 'var(--color-r-border-focus)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--color-r-border)'; }}
            />

            {error && <p className="text-body-2 text-r-danger">{error}</p>}
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full max-w-[434px] rounded-full py-[18px] px-8 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-50 bg-r-btn text-r-btn-text border-none"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>

      </div>
    </main>
  );
}
