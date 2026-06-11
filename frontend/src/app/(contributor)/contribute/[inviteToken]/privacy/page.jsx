'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/privacy/page.jsx

import { useState } from 'react';
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
          <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z" fill="currentColor"/>
        </svg>
        <span className="text-base font-normal">Back</span>
      </Link>
    </nav>
  );
}

export default function PrivacyPage() {
  const router = useRouter();
  const { inviteToken } = useParams();
  const [step, setStep] = useState('choice');
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

  function handleAnonymous() {
    savePrivacyToSession(true);
    router.push(`/contribute/${inviteToken}/relationship`);
  }

  function handleNameContinue() {
    if (!displayName.trim()) { setNameError('Please enter your name.'); return; }
    savePrivacyToSession(false, displayName.trim());
    router.push(`/contribute/${inviteToken}/relationship`);
  }

  return (
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">
      <ContributorNav backHref={`/contribute/${inviteToken}`} />

      <div className="flex-1 flex flex-col items-center px-6 sm:px-[50px] pt-10 pb-16 gap-10">
        <div className="w-full max-w-[680px] flex flex-col gap-10">
          {step === 'choice' ? (
            <>
              <div className="text-center">
                <h1 className="text-h1 text-r-text">Contribution privacy</h1>
                <p className="mt-3 text-body-2 text-r-secondary sm:whitespace-nowrap">
                  Would you like to include your name in your contributions for viewers of the memorial to see?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Include my name in\ncontributions', action: () => setStep('name') },
                  { label: 'I want to remain\nanonymous', action: handleAnonymous },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action}
                    className="flex min-h-[300px] items-center justify-center rounded-2xl px-6 text-center transition-colors bg-transparent"
                    style={{ border: '1px solid var(--color-r-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-r-card)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <span className="text-body-1 text-r-muted whitespace-pre-line">{label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-h1 text-r-text">Contribution privacy</h1>
                <p className="mt-3 text-body-2 text-r-secondary">
                  Write the name that will be displayed with your contributions.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-h4 text-r-text">Your name</label>
                <input type="text" value={displayName} autoFocus
                  onChange={(e) => { setDisplayName(e.target.value); setNameError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameContinue()}
                  placeholder="Full name"
                  className="w-full rounded-2xl px-4 py-4 text-body-1 text-r-text bg-transparent focus:outline-none"
                  style={{ border: '1px solid var(--color-r-border)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-r-border-focus)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--color-r-border)'; }}
                />
                {nameError && <p className="text-caption text-r-danger">{nameError}</p>}
              </div>
              <button onClick={handleNameContinue}
                className="w-full rounded-full py-4 text-body-2 font-medium tracking-wide transition-opacity hover:opacity-80 bg-r-btn text-r-btn-text border-none">
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
