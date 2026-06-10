// frontend/src/app/(contributor)/contribute/[inviteToken]/privacy/page.jsx

'use client';

import { useState } from 'react';
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

export default function PrivacyPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [step, setStep] = useState('choice'); // 'choice' | 'name'
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState('');

  function savePrivacyToSession(isAnonymous, name = '') {
    if (typeof window === 'undefined') return;
    try {
      const key = `remember_contributor_session:${inviteToken}`;
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({
        ...existing,
        is_anonymous: isAnonymous,
        display_name: name || existing.contributorName || '',
      }));
    } catch {}
  }

  function handleIncludeName() {
    setStep('name');
  }

  function handleAnonymous() {
    savePrivacyToSession(true);
    router.push(`/contribute/${inviteToken}/relationship`);
  }

  function handleNameContinue() {
    if (!displayName.trim()) {
      setNameError('Please enter your name.');
      return;
    }
    savePrivacyToSession(false, displayName.trim());
    router.push(`/contribute/${inviteToken}/relationship`);
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10">

        <ContributorNav backHref={`/contribute/${inviteToken}`} />

        {step === 'choice' ? (
          <>
            <div className="text-center pt-4">
              <h1 className="text-h1 text-r-text">Contribution privacy</h1>
              <p className="mt-3 text-body-2 text-r-secondary max-w-[480px] mx-auto">
                Would you like to include your name in your contributions for viewers of the memorial to see?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Include my name in\ncontributions', action: handleIncludeName },
                { label: 'I want to remain\nanonymous', action: handleAnonymous },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex min-h-[300px] items-center justify-center rounded-2xl px-6 text-center transition-colors bg-transparent"
                  style={{ border: '1px solid var(--color-r-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-r-card)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span className="text-body-1 text-r-muted whitespace-pre-line">{label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-center pt-4">
              <h1 className="text-h1 text-r-text">Contribution privacy</h1>
              <p className="mt-3 text-body-2 text-r-secondary">
                Write the name that will be displayed with your contributions.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-h4 text-r-text">Your name</label>
              <input
                type="text"
                value={displayName}
                autoFocus
                onChange={(e) => { setDisplayName(e.target.value); setNameError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleNameContinue()}
                placeholder="Full name"
                className="w-full rounded-xl px-4 py-4 text-body-1 text-r-text bg-transparent focus:outline-none"
                style={{ border: '1px solid var(--color-r-border)' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-r-border-focus)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-r-border)'; }}
              />
              {nameError && <p className="text-caption text-r-danger">{nameError}</p>}
            </div>

            <button
              onClick={handleNameContinue}
              className="w-full rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none"
            >
              Continue
            </button>
          </>
        )}

      </div>
    </main>
  );
}