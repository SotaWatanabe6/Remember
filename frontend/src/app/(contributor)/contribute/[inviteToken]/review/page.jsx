'use client';

// frontend/src/app/(contributor)/contribute/[inviteToken]/review/page.jsx

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getContributorSummary, deletePhoto, deleteVoice, submitContribution } from '@/lib/api';

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

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function ReviewSection({ title, children }) {
  return (
    <div className="rounded-2xl p-6" style={{ border: '1px solid #D4CAC0' }}>
      <p className="mb-4 text-[20px] font-semibold" style={{ color: '#423F39', fontFamily: FONT }}>{title}</p>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const { inviteToken } = useParams();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getContributorSummary(inviteToken);
        setSummary(data);
      } catch (err) {
        console.error('Failed to load summary:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [inviteToken]);

  async function handleDeletePhoto(assetId) {
    try {
      await deletePhoto(inviteToken, assetId);
      setSummary((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== assetId) }));
    } catch (err) {
      console.error('Delete photo failed:', err);
    }
  }

  async function handleDeleteVoice(recordingId) {
    try {
      await deleteVoice(inviteToken, recordingId);
      setSummary((prev) => ({ ...prev, voice: prev.voice.filter((v) => v.id !== recordingId) }));
    } catch (err) {
      console.error('Delete voice failed:', err);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitContribution(inviteToken);
      router.push(`/contribute/${inviteToken}/submitted`);
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitting(false);
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

  if (loading) {
    return (
      <main
        className="min-h-screen px-6 py-10 sm:px-[50px]"
        style={{ backgroundColor: '#F0EAE2', fontFamily: FONT }}
      >
        <div className="mx-auto max-w-[680px]">
          <div className="flex h-10 items-center justify-between">
            <span className="text-2xl" style={{ color: '#423F39' }}>Remember</span>
          </div>
          <div className="mt-16 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: '#D4CAC0', borderTopColor: '#423F39' }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen px-6 py-10 sm:px-[50px]"
      style={{ backgroundColor: '#F0EAE2', fontFamily: FONT, color: '#423F39' }}
    >
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-8">

        <ContributorNav backHref={`/contribute/${inviteToken}/voice`} />

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-[44px] font-bold leading-tight" style={{ color: '#423F39', letterSpacing: '-0.01em' }}>
            Review contributions
          </h1>
          <p className="mt-2 text-[17px]" style={{ color: '#4A7FA5' }}>Review all uploaded media.</p>
        </div>

        {/* Photos */}
        {summary?.photos?.length > 0 && (
          <ReviewSection title="Uploaded photos">
            <div className="grid grid-cols-3 gap-3">
              {summary.photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl" style={{ backgroundColor: '#E8E0D8' }}>
                  {photo.previewUrl && (
                    <img src={photo.previewUrl} alt={photo.file_name} className="h-full w-full object-cover" />
                  )}
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <button
                      className="rounded-full p-1.5 shadow-sm transition-colors"
                      style={{ backgroundColor: 'rgba(240,234,226,0.9)' }}
                    >
                      <svg width="11" height="11" fill="none" stroke="#5F5A52" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="rounded-full p-1.5 shadow-sm transition-colors"
                      style={{ backgroundColor: 'rgba(240,234,226,0.9)' }}
                    >
                      <svg width="11" height="11" fill="none" stroke="#C0503A" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ReviewSection>
        )}

        {/* Audio */}
        {summary?.voice?.length > 0 && (
          <ReviewSection title="Uploaded audio">
            <div className="flex flex-col gap-4">
              {summary.voice.map((rec) => (
                <div key={rec.id} className="flex items-center gap-4">
                  <button
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
                    style={{ backgroundColor: '#423F39', color: 'white' }}
                  >
                    <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: '#423F39' }}>
                      {rec.file_name || rec.contributor_title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: '#D4CAC0' }}>
                        <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: '#4A7FA5' }} />
                      </div>
                      <span className="shrink-0 text-xs" style={{ color: '#97877B' }}>
                        {formatDuration(rec.duration_seconds)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="p-1.5 transition-colors" style={{ color: '#97877B' }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDeleteVoice(rec.id)} className="p-1.5 transition-colors" style={{ color: '#C0503A' }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1H5" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ReviewSection>
        )}

        {/* Stories */}
        {summary?.responses?.length > 0 && (
          <ReviewSection title="Stories">
            <div className="flex flex-col gap-4">
              {summary.responses.map((r, i) => (
                <div key={i} style={{ borderTop: i > 0 ? '1px solid #D4CAC0' : 'none', paddingTop: i > 0 ? '16px' : '0' }}>
                  <p className="text-[17px] font-semibold" style={{ color: '#423F39' }}>
                    {r.question_text}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: '#97877B' }}>
                    {r.response_text || "An AI generated summary of the user's story will be featured here."}
                  </p>
                </div>
              ))}
            </div>
          </ReviewSection>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/contribute/${inviteToken}/upload`}
            className="flex-1 rounded-full py-4 text-center text-[16px] transition-colors"
            style={{
              border: '1px solid #D4CAC0',
              color: '#423F39',
              fontFamily: FONT,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E8E0D8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Upload more
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-full py-4 text-[16px] transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-50"
            style={{
              backgroundColor: '#C4B49A',
              color: '#5F5A52',
              border: 'none',
              fontFamily: FONT,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>

      </div>
    </main>
  );
}
