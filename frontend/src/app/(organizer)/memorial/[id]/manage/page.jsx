// frontend/src/app/(organizer)/memorial/[id]/manage/page.jsx

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { generateMemorialOutput, getGenerationJobStatus, getMemorialOutput } from '@/services/memorialService';
import { getMemorialApprovedArchive, getMemorialContributors } from '@/services/contributorService';
import { getMemorial, createInviteLink, createShareLink } from '@/lib/api';
import { copyTextToClipboard, normalizeShareUrl } from '@/lib/copyToClipboard';
import ProcessingTextSequence from "@/components/dashboard/ProcessingTextSequence";
import { getAuthToken } from "@/lib/api.js";
import MemorialCoverImage from "@/components/memorial/MemorialCoverImage.jsx";
import ContributionsPanel from "@/components/organizer/ContributionsPanel.jsx";
import ArchiveQaPanel from "@/components/organizer/ArchiveQaPanel.jsx";
import ViewMemorialButton from "@/components/organizer/ViewMemorialButton.jsx";
import { APPROVE_TAB, ARCHIVE_TAB, getManageTabs, isAwaitingReview, resolveManageTab } from "@/lib/organizer/contributionReview";

// ─── Generation constants ─────────────────────────────────────────────────────

const GENERATION_POLL_INTERVAL_MS = 1500;
const GENERATION_MAX_POLL_ATTEMPTS = 60;
const OUTPUT_PENDING_POLL_INTERVAL_MS = 5000;
const GENERATION_SUCCESS_STATUSES = new Set(["complete", "completed", "succeeded", "success"]);
const GENERATION_FAILURE_STATUSES = new Set(["failed", "error"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeMemorialForView(memorial) {
  if (!memorial) return null;
  const biography =
    memorial.biography ||
    memorial.bio ||
    memorial.description ||
    memorial.profile ||
    memorial.brief_biography ||
    memorial.short_description ||
    "";

  return {
    id: memorial.id,
    subject_name: memorial.subject_name || memorial.deceased_name,
    cover_photo_url: memorial.cover_photo_url || memorial.profile_photo_url || null,
    date_of_birth: memorial.date_of_birth || memorial.birth_date || null,
    date_of_passing: memorial.date_of_passing || memorial.death_date || null,
    bio: biography,
    biography,
    description: memorial.description || biography,
    brief_biography: memorial.brief_biography || biography,
    short_description: memorial.short_description || biography,
    status: memorial.status || null,
    generated_at: memorial.generated_at || null,
  };
}

function isGeneratingMemorial(memorial) {
  return String(memorial?.status || "").toLowerCase() === "generating";
}

// ─── Status badge helper (from Blessing) ─────────────────────────────────────

function getManageStatus(status) {
  const key = String(status || "").toLowerCase();
  if (key === "complete") return { label: "Memorial published", className: "bg-[#DCE3C6] text-[#5C6549]" };
  if (key === "collecting" || key === "generating") return { label: "Collecting memories", className: "bg-[#CFE1EE] text-[#526776]" };
  return { label: "Not started", className: "bg-[#EFCFC2] text-[#755A55]" };
}

// ─── Pagination arrows (shared) ───────────────────────────────────────────────

function formatMemorialDate(value) {
  if (!value) return '';
  const parts = String(value).split('T')[0].split('-');
  if (parts.length < 3) return '';
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ─── Memorial Header (Blessing's layout + my inviteToken + MemorialCoverImage) ──

function MemorialHeader({ memorial, generated, inviteToken, onShare, contributorCount, submittedCount, canGenerate, disabledMessage, generating, onGenerateClick }) {
  const status = getManageStatus(memorial?.status);
  const birthDate = formatMemorialDate(memorial?.date_of_birth)
  const passingDate = formatMemorialDate(memorial?.date_of_passing)
  const biography = memorial?.bio || memorial?.biography || ""

  return (
    <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:items-center xl:min-h-[314px] xl:grid-cols-3 xl:gap-5">

      {/* Avatar */}
      <div className="flex justify-center md:justify-start">
        <div className="relative size-[220px] shrink-0 overflow-hidden rounded-full bg-r-card border border-r-border xl:size-[314px]">
          <MemorialCoverImage
            src={memorial?.cover_photo_url}
            name={memorial?.subject_name}
            fill
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-col items-start gap-[14px]">
        <h1
          className="break-words text-[36px] font-medium italic leading-[44px] text-r-text"
          style={{ fontFamily: 'var(--font-family-display)' }}
        >
          {memorial?.subject_name || ''}
        </h1>
        <p className="text-[16px] leading-[24px] text-r-secondary">
          {birthDate}{birthDate && passingDate ? " - " : ""}{passingDate}
        </p>
        {biography ? (
          <p className="w-full break-words text-[20px] leading-[26px] text-r-secondary">
            {biography}
          </p>
        ) : null}
        {typeof contributorCount === 'number' && (
          <p className="text-[15px] leading-[20px] text-r-secondary">
            {contributorCount} contributor{contributorCount === 1 ? '' : 's'} invited
            {typeof submittedCount === 'number' && (
              <> · {submittedCount} submitted</>
            )}
          </p>
        )}
        {memorial?.status && (
          <span className={`inline-flex min-h-[50px] min-w-[207px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium ${status.className}`}>
            {status.label}
          </span>
        )}
        {memorial?.status === 'complete' && memorial?.generated_at && (
          <p className="text-sm leading-5 text-r-secondary">
            Generated on{' '}
            {new Date(memorial.generated_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-6 md:col-start-2 md:w-[208px] md:justify-self-end xl:col-start-auto xl:min-h-[314px] xl:justify-between xl:py-[30px]">
        <div className="flex flex-col gap-5">
          <Link
            href={inviteToken ? `/contribute/${inviteToken}` : '#'}
            className="rounded-full bg-r-btn px-4 py-[18px] text-center text-[20px] leading-[26px] text-r-btn-text transition hover:opacity-85"
          >
            Upload Memories
          </Link>
          {generated ? (
          <ViewMemorialButton
            memorialId={memorial?.id}
            className="w-full rounded-full bg-r-btn px-4 py-[18px] text-center text-[20px] leading-[26px] text-r-btn-text transition hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
          />
        ) : (
          <button
            type="button"
            onClick={onGenerateClick}
            disabled={!canGenerate || generating}
            title={!canGenerate && !generating ? disabledMessage || undefined : undefined}
            className="rounded-full bg-r-btn px-4 py-[18px] text-center text-[20px] leading-[26px] text-r-btn-text transition hover:opacity-85 disabled:opacity-45 disabled:cursor-not-allowed border-none"
          >
            {generating ? 'Generating…' : 'Create Memorial'}
          </button>
        )}
        </div>
        <div className="flex items-center justify-end gap-[30px] text-r-text">
          <button type="button" onClick={onShare} className="flex size-[50px] items-center justify-center transition hover:opacity-70" aria-label="Share memorial">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77l-7.13-4.16a3.27 3.27 0 000-1.38l7.12-4.15A2.99 2.99 0 0018 7.91a3 3 0 10-2.83-4 3 3 0 00.12 1.49L8.17 9.56a3 3 0 100 4.88l7.12 4.16c-.08.23-.12.47-.12.72a3 3 0 103-3.24z"/>
            </svg>
          </button>
          <button type="button" className="flex size-[50px] items-center justify-center transition hover:opacity-70" aria-label="Memorial settings">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.03 7.03 0 00-1.63-.94l-.36-2.54a.49.49 0 00-.49-.42h-3.84a.49.49 0 00-.49.42l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.5.5 0 00-.6.22L2.54 8.84a.5.5 0 00.12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h3.84c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar (Figma "menu tab": equal-width, bold + 2px underline when active) ─

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-5">
      {tabs.map((tab) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex min-h-10 min-w-0 flex-1 items-center justify-center text-center text-[20px] leading-tight text-r-text transition-colors sm:text-[24px] ${
              isActive ? 'border-b-2 border-r-text font-bold' : 'border-b border-r-text/60 font-medium hover:border-r-text'
            }`}
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

// ─── Tab state helpers ────────────────────────────────────────────────────────

function TabLoading() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-r-border border-t-r-text" />
    </div>
  );
}

function TabEmpty({ title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-r-card flex items-center justify-center mb-4" />
      <p className="text-r-text text-base font-medium">{title}</p>
      <p className="text-r-secondary text-sm mt-1 max-w-xs">{message}</p>
    </div>
  );
}

function TabError({ title, message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-red-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-r-text text-base font-medium">{title}</p>
      <p className="text-r-secondary text-sm mt-1 max-w-xs">{message}</p>
      <button onClick={onRetry}
        className="mt-4 rounded-full bg-r-btn px-6 py-2.5 text-sm font-medium text-r-btn-text hover:opacity-85 transition-opacity">
        Try again
      </button>
    </div>
  );
}

// ─── Archive Tab (approved contributions — independent of generation) ─────────

const EMPTY_ARCHIVE = { contributors: [], photos: [], voices: [], stories: [], responses: [] };

function formatArchiveDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function ArchiveSection({ title, count, children }) {
  return (
    <section className="flex flex-col gap-[30px] lg:gap-[50px]">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[28px] font-medium text-r-text" style={{ fontFamily: 'var(--font-family-display)' }}>
          {title}
        </h3>
        <span className="text-sm text-r-secondary">{count}</span>
      </div>
      {children}
    </section>
  );
}

function ArchiveTab({ memorialId, contributors, contributorsLoading }) {
  const [archive, setArchive] = useState(EMPTY_ARCHIVE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('photos');

  // Per-type approvals can enter the archive while the contributor is still
  // submitted. Let the archive API decide which items have been approved.
  const reviewKey = (contributors || [])
    .map((contributor) => `${contributor.id}:${contributor.status}:${contributor.updated_at || ''}`)
    .sort()
    .join(',');

  const loadArchive = useCallback(async () => {
    if (!memorialId) return;

    setLoading(true); setError(null);
    try {
      const token = await getAuthToken();
      const data = await getMemorialApprovedArchive(memorialId, token);
      setArchive({ ...EMPTY_ARCHIVE, ...(data || {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the archive');
      setArchive(EMPTY_ARCHIVE);
    } finally { setLoading(false); }
  }, [reviewKey, memorialId]);

  useEffect(() => { queueMicrotask(loadArchive); }, [loadArchive]);

  if (loading || contributorsLoading) return <TabLoading />;
  if (error) {
    return <TabError title="Unable to load the archive" message={error} onRetry={loadArchive} />;
  }

  const photos = archive.photos || [];
  const voices = archive.voices || [];
  const stories = archive.stories || [];
  const responses = (archive.responses || []).filter((response) => String(response.answer_text || '').trim() || response.response_audio_url);
  const approvedContributorCount = (archive.contributors || []).length;
  const totalItems = photos.length + voices.length + stories.length + responses.length;

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-r-text text-base font-medium">
          {approvedContributorCount === 0 ? 'No approved contributions yet' : 'No memories in the approved contributions'}
        </p>
        <p className="text-r-secondary text-sm mt-1 max-w-sm">
          {approvedContributorCount === 0
            ? 'Approve a submission in the Approve Contributions tab and it will appear here.'
            : 'The approved contributors have not shared any photos, recordings, or written memories yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[30px] lg:gap-[50px]">
      <div className="flex flex-wrap gap-5" aria-label="Archive content">
        {[['photos', 'Photos'], ['voices', 'Voice'], ['stories', 'Stories'], ['responses', 'Q&A']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={activeSubTab === key}
            onClick={() => setActiveSubTab(key)}
            className={`flex h-[50px] min-w-[140px] items-center justify-center rounded-full border border-r-muted px-7 text-[24px] font-medium leading-none transition [font-family:var(--font-family-display)] sm:min-w-[206px] focus-visible:outline-2 focus-visible:outline-r-muted ${activeSubTab === key ? 'bg-[#9E9384] text-r-modal' : 'text-r-muted hover:text-r-text'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-r-secondary">
        {totalItems} approved memor{totalItems === 1 ? 'y' : 'ies'} from {approvedContributorCount} contributor
        {approvedContributorCount === 1 ? '' : 's'}
      </p>

      {activeSubTab !== 'responses' && archive[activeSubTab].length === 0 && (
        <p className="py-14 text-center text-r-secondary">No approved {activeSubTab === 'voices' ? 'voice recordings' : activeSubTab} yet.</p>
      )}

      {activeSubTab === 'photos' && photos.length > 0 && (
        <ArchiveSection title="Photos" count={`${photos.length} photo${photos.length === 1 ? '' : 's'}`}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group rounded-xl overflow-hidden border border-r-border bg-r-card">
                {photo.url || photo.photo_url ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={photo.url || photo.photo_url}
                      alt={photo.caption || ''}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 px-8 text-center opacity-0 transition-all duration-300 group-hover:bg-black/38 group-hover:opacity-100">
                      <p className="text-[30px] leading-[34px] text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                        {photo.caption || photo.file_name || 'Photo'}
                      </p>
                      <p className="mt-4 text-[16px] leading-[16px] text-white">
                        {photo.contributor_name ? `Submitted by ${photo.contributor_name}` : 'Submitted by contributor'}
                      </p>
                      <p className="mt-4 text-[16px] leading-[16px] text-white">
                        {formatArchiveDate(photo.taken_at || photo.created_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] w-full bg-r-card flex items-center justify-center">
                    <span className="text-xs text-r-muted">{photo.contributor_name || 'Photo'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ArchiveSection>
      )}

      {activeSubTab === 'voices' && voices.length > 0 && (
        <ArchiveSection title="Voices" count={`${voices.length} recording${voices.length === 1 ? '' : 's'}`}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {voices.map((voice) => (
              <article key={voice.id} className="flex flex-col gap-3 rounded-xl border border-r-border bg-r-card p-6">
                <h4 className="text-[22px] leading-[26px] text-r-text" style={{ fontFamily: 'var(--font-family-display)' }}>
                  {voice.contributor_title || voice.file_name || 'Voice recording'}
                </h4>
                {voice.url || voice.audio_url ? (
                  <audio controls src={voice.url || voice.audio_url} className="w-full" />
                ) : (
                  <p className="text-sm text-r-secondary">Audio preview unavailable</p>
                )}
                {(voice.key_quote || voice.transcript_text) && (
                  <p className="text-[16px] italic leading-6 text-r-secondary">
                    &quot;{voice.key_quote || voice.transcript_text}&quot;
                  </p>
                )}
                {voice.contributor_name && (
                  <p className="text-xs text-r-secondary">Submitted by {voice.contributor_name}</p>
                )}
              </article>
            ))}
          </div>
        </ArchiveSection>
      )}

      {activeSubTab === 'stories' && stories.length > 0 && (
        <ArchiveSection title="Stories" count={`${stories.length} stor${stories.length === 1 ? 'y' : 'ies'}`}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {stories.map((story) => (
              <article key={story.id} className="flex flex-col gap-2 rounded-xl border border-r-border bg-r-card p-6">
                {story.title && (
                  <h4 className="text-[22px] leading-[26px] text-r-text" style={{ fontFamily: 'var(--font-family-display)' }}>
                    {story.title}
                  </h4>
                )}
                {story.body && <p className="text-[16px] leading-6 text-r-secondary">{story.body}</p>}
                {story.contributor_name && (
                  <p className="mt-1 text-xs text-r-secondary">Submitted by {story.contributor_name}</p>
                )}
              </article>
            ))}
          </div>
        </ArchiveSection>
      )}

      {activeSubTab === 'responses' && <ArchiveQaPanel contributors={archive.contributors || []} responses={responses} />}
    </div>
  );
}

// ─── Approve Contributions Tab (only mounted while something is pending) ─────

function ApproveContributionsTab({ memorialId, contributorslist, loading, error, onRetry, onContributorsChange }) {
  return (
    <ContributionsPanel
      memorialId={memorialId}
      contributorslist={contributorslist}
      loading={loading}
      error={error}
      onRetry={onRetry}
      onContributorsChange={onContributorsChange}
    />
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ onClose, memorialId }) {
  const [contributorUrl, setContributorUrl] = useState('');
  const [viewerUrl, setViewerUrl] = useState('');
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const [copiedContributor, setCopiedContributor] = useState(false);
  const [copiedViewer, setCopiedViewer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadShareLinks() {
      setLinksLoading(true); setLinksError(null); setContributorUrl(''); setViewerUrl('');
      try {
        const invite = await createInviteLink(memorialId);
        if (cancelled) return;
        setContributorUrl(normalizeShareUrl(invite?.invite_link?.url ?? ''));
        try {
          const share = await createShareLink(memorialId);
          if (!cancelled) setViewerUrl(normalizeShareUrl(share?.share_link?.url ?? ''));
        } catch (shareErr) { console.warn('Viewer share link unavailable:', shareErr); }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Could not load share links.';
          if (message.toLowerCase().includes('not authorized') || message.toLowerCase().includes('do not own')) {
            setLinksError('This memorial is not linked to your account. Go to Dashboard, open a memorial you created, then try Share again.');
          } else if (message.toLowerCase().includes('logged in')) {
            setLinksError(`${message} Sign in and try again.`);
          } else {
            setLinksError(`${message} Close and try again.`);
          }
        }
      } finally { if (!cancelled) setLinksLoading(false); }
    }
    loadShareLinks();
    return () => { cancelled = true; };
  }, [memorialId]);

  async function copyLink(type) {
    setCopyError(null);
    const url = type === 'contributor' ? contributorUrl : viewerUrl;
    if (!url) { setCopyError('Link is not ready yet.'); return; }
    try {
      await copyTextToClipboard(url);
      if (type === 'contributor') { setCopiedContributor(true); setTimeout(() => setCopiedContributor(false), 2000); }
      else { setCopiedViewer(true); setTimeout(() => setCopiedViewer(false), 2000); }
    } catch { setCopyError('Copy failed. Select the link below and copy manually.'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-8 bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onClose} className="text-r-text">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-h2 text-r-text">Share</h2>
        </div>
        {linksError && <p className="text-body-2 text-r-danger mb-4">{linksError}</p>}
        {copyError && <p className="text-body-2 text-r-danger mb-4">{copyError}</p>}
        {[
          { label: 'Invite Contributors', sub: 'For friends and family to share their memories:', type: 'contributor', copied: copiedContributor, url: contributorUrl },
          { label: 'Invite Viewers', sub: 'For anyone to view this memorial:', type: 'viewer', copied: copiedViewer, url: viewerUrl },
        ].map(({ label, sub, type, copied, url }) => (
          <div key={type} className="flex items-start justify-between mb-6">
            <div className="min-w-0 pr-4">
              <p className="text-h3 text-r-text">{label}</p>
              <p className="text-body-2 text-r-secondary mt-0.5">{sub}</p>
              {url && <p className="text-caption text-r-secondary mt-2 break-all">{url}</p>}
            </div>
            <button type="button" onClick={() => copyLink(type)} disabled={linksLoading || !url}
              className="shrink-0 rounded-full px-4 py-2 text-h4 transition-all ml-5 border-none disabled:opacity-50"
              style={{ backgroundColor: copied ? '#7D8C6A' : 'var(--color-r-btn)', color: copied ? '#FBF9F6' : 'var(--color-r-btn-text)' }}>
              {copied ? 'Copied!' : linksLoading ? 'Loading…' : 'Copy Link'}
            </button>
          </div>
        ))}
        <div className="flex justify-center gap-6 mt-8">
          {[
            { label: 'Message', icon: <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
            { label: 'Email', icon: <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
            { label: 'Instagram', icon: <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="17.5" cy="6.5" r="0.5" fill="white"/></svg> },
          ].map(({ label, icon }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-14 h-12 rounded-xl flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity bg-r-shape">
                {icon}
              </div>
              <span className="text-caption text-r-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function GenerateConfirmModal({ onConfirm, onCancel, subjectName }) {
  const [readyToGenerate, setReadyToGenerate] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3">
          <h2
            className="text-[28px] font-medium leading-[34px] text-r-text"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            Generate a sharable and interactive memorial
          </h2>
          <p className="text-base leading-6 text-r-secondary">
            Please note that this feature is the paid portion of the final product. As a participant of testing, this memorial generation will be free.
          </p>
          <p className="text-base leading-6 text-r-secondary">
            The Story farewell will use a contributor&apos;s own closing words when available,
            or the phrase &ldquo;In loving memory&rdquo;.
          </p>
          <p className="text-base font-medium leading-6 text-[#C96E43]">
            Clicking on the &ldquo;Generate Memorial&rdquo; button below will finalize and create a curated memorial. Please ensure you have collected all memories before proceeding.
          </p>
        </div>

        <label className="flex items-center gap-3 text-base text-r-text cursor-pointer">
          <input
            type="checkbox"
            checked={readyToGenerate}
            onChange={(e) => setReadyToGenerate(e.target.checked)}
            className="h-5 w-5 rounded border-r-border accent-r-text cursor-pointer"
          />
          I approve this farewell approach and am ready to generate the final memorial.
        </label>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!readyToGenerate}
            className="w-full rounded-full py-4 text-base font-medium text-r-btn-text transition hover:opacity-85 border-none disabled:opacity-45 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-r-btn)' }}
          >
            Generate Memorial
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-full py-4 text-base font-medium text-r-text transition hover:opacity-70 border border-r-border bg-transparent"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page (Figma organizer shell: 50px margins, 100px section spacing) ─────────

export default function MemorialManagePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState(ARCHIVE_TAB);
  const [output, setOutput] = useState(null);
  const [contributorsLoading, setContributorsLoading] = useState(true);
  const [contributorsError, setContributorsError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
  const [contributors, setContributors] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generationJob, setGenerationJob] = useState(null);
  const [memorial, setMemorial] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const memorialId = id;

  useEffect(() => {
    if (!id) return;
    getMemorial(id)
      .then((data) => {
        const m = data?.memorial ?? data;
        const normalized = normalizeMemorialForView(m);
        if (!normalized) return;
        setMemorial(normalized);
        setGenerating(isGeneratingMemorial(normalized));
      })
      .catch(() => { setMemorial(null); });

    createInviteLink(id)
      .then((res) => {
        const token = res?.invite_link?.token ?? res?.token ?? null;
        setInviteToken(token);
      })
      .catch(() => { /* non-critical */ });
  }, [id]);

  const loadContributors = useCallback(async () => {
    if (!memorialId) return;
    setContributorsLoading(true); setContributorsError(null);
    try {
      const token = await getAuthToken();
      const contributor = await getMemorialContributors(memorialId, token);
      const memorialApi = await getMemorial(memorialId);
      const m = memorialApi?.memorial ?? memorialApi;
      const normalized = normalizeMemorialForView(m);
      if (normalized) { setMemorial(normalized); setGenerating((current) => current || isGeneratingMemorial(normalized)); }
      setContributors(contributor.contributors ?? []);
    } catch (err) {
      setContributorsError(err instanceof Error ? err.message : "Failed to fetch contributors");
      setContributors([]);
    } finally { setContributorsLoading(false); }
  }, [memorialId]);

  const loadOutput = useCallback(async (options = {}) => {
    if (!id) return;
    try {
      const token = await getAuthToken();
      const data = await getMemorialOutput(id, token, options);
      setOutput(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch memorial output", err);
      setOutput(null);
      return null;
    }
  }, [id]);

  const refreshMemorial = useCallback(async () => {
    if (!id) return null;
    try {
      const data = await getMemorial(id);
      const normalized = normalizeMemorialForView(data?.memorial ?? data);
      if (normalized) setMemorial(normalized);
      return normalized;
    } catch {
      return null;
    }
  }, [id]);

  const handleGenerate = useCallback(async () => {
    if (!memorialId || generating) return;
    setGenerating(true); setGenerationError(null); setGenerationJob(null);
    const token = await getAuthToken();
    let keepGenerating = false;
    try {
      const generation = await generateMemorialOutput(memorialId, token);
      const initialJob = generation?.job ?? null;
      setGenerationJob(initialJob);
      if (initialJob?.id) {
        let latestJob = initialJob;
        for (let attempt = 0; attempt < GENERATION_MAX_POLL_ATTEMPTS; attempt += 1) {
          const status = String(latestJob?.status || "").toLowerCase();
          if (GENERATION_SUCCESS_STATUSES.has(status)) break;
          if (status === "awaiting_review") {
            setGenerationError("Generation is paused. Resolve flagged content in Approve Contributions, then create the memorial again to resume.");
            setActiveTab("Approve Contributions");
            await loadContributors();
            await refreshMemorial();
            return;
          }
          if (GENERATION_FAILURE_STATUSES.has(status)) throw new Error(latestJob?.error_message || "Generation failed. Please try again.");
          await sleep(GENERATION_POLL_INTERVAL_MS);
          const jobStatus = await getGenerationJobStatus(initialJob.id, token);
          latestJob = jobStatus?.job ?? latestJob;
          setGenerationJob(latestJob);
        }
        const finalStatus = String(latestJob?.status || "").toLowerCase();
        if (!GENERATION_SUCCESS_STATUSES.has(finalStatus)) {
          keepGenerating = true;
          await loadOutput({ fallbackToMock: process.env.NODE_ENV !== 'production' });
          return;
        }
      }
      await loadOutput({ fallbackToMock: process.env.NODE_ENV !== 'production' });
      await refreshMemorial();
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally { if (!keepGenerating) setGenerating(false); }
  }, [generating, loadOutput, memorialId, refreshMemorial, loadContributors]);

  const handleGenerateClick = useCallback(() => {
    setShowGenerateConfirm(true)
  }, [])

  const handleGenerateConfirm = useCallback(() => {
    setShowGenerateConfirm(false)
    handleGenerate()
  }, [handleGenerate])

  useEffect(() => {
    if (!id || output || !generating) return undefined;
    let cancelled = false;
    async function pollPendingOutput() {
      const token = await getAuthToken();
      const data = await getMemorialOutput(id, token);
      if (cancelled) return;
      if (data) {
        setOutput(data); setGenerating(false);
        setGenerationJob((job) => job ? { ...job, status: 'complete', progress: 100, current_step: 'Complete' } : job);
        try {
          const memorialApi = await getMemorial(id);
          if (!cancelled) { const normalized = normalizeMemorialForView(memorialApi?.memorial ?? memorialApi); if (normalized) setMemorial(normalized); }
        } catch { /* output loaded; header refresh waits */ }
      }
    }
    pollPendingOutput();
    const intervalId = window.setInterval(pollPendingOutput, OUTPUT_PENDING_POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, [generating, id, output]);

  const submittedContributionCount = contributors.filter((contributor) => {
    const status = String(contributor?.status || "").toLowerCase();
    return status === "submitted" || status === "approved" || Boolean(contributor?.submitted_at);
  }).length;

  // Generation runs on the approved archive only, so it stays locked until the
  // organizer has cleared the Awaiting approval list and kept at least one
  // contributor.
  const awaitingApprovalCount = contributors.filter(
    (contributor) => isAwaitingReview(contributor),
  ).length;
  const approvedContributionCount = contributors.filter(
    (contributor) => String(contributor?.status || "").toLowerCase() === "approved" && contributor?.moderation_resolution !== "excluded",
  ).length;

  // The header flips to View Memorial as soon as an output exists, without
  // waiting for a page refresh to pick up the memorial's `complete` status.
  const memorialGenerated = memorial?.status === 'complete' || Boolean(output);

  const canGenerate =
    !contributorsLoading &&
    !contributorsError &&
    awaitingApprovalCount === 0 &&
    approvedContributionCount > 0;
  const generationDisabledMessage = contributorsLoading
    ? "Checking submitted contributions..."
    : contributorsError
      ? "Contributor data could not be loaded, so generation is unavailable right now."
      : awaitingApprovalCount > 0
        ? `Review the ${awaitingApprovalCount} contribution${awaitingApprovalCount === 1 ? "" : "s"} awaiting approval in the Approve Contributions tab before generating.`
        : approvedContributionCount === 0
          ? "Generation is available after you approve at least one contribution."
          : "";

  const manageTabs = getManageTabs();
  const currentTab = resolveManageTab(activeTab, manageTabs);

  useEffect(() => { queueMicrotask(loadContributors); }, [loadContributors]);
  useEffect(() => { queueMicrotask(loadOutput); }, [loadOutput]);

  return (
    <main className="min-h-screen bg-r-bg p-6 text-r-text flex flex-col sm:p-[50px]">

      {/* Full-width nav */}
      <nav className="min-h-10 w-full flex items-center justify-between">
        <div className="flex items-center gap-5">
          <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
          <span className="text-r-text text-2xl leading-8 [font-family:var(--font-family-display)]">Remember</span>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 text-r-text transition-opacity hover:opacity-70">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z" fill="currentColor"/>
          </svg>
          <span className="text-base font-normal">Back</span>
        </Link>
      </nav>

      {/* The profile and both tabs share the navigation's outer margins. */}
      <div className="mt-12 flex-1 lg:mt-[100px]">
        <div className="flex w-full flex-col gap-12 lg:gap-[100px]">
          <MemorialHeader
            memorial={memorial}
            generated={memorialGenerated}
            inviteToken={inviteToken}
            onShare={() => setShowShare(true)}
            contributorCount={contributors.length}
            submittedCount={submittedContributionCount}
            canGenerate={canGenerate}
            disabledMessage={generationDisabledMessage}
            generating={generating}
            onGenerateClick={handleGenerateClick} />
          {generating && !generationError && (
            <div className="rounded-2xl border border-r-border p-6 text-center" role="status">
              <p className="text-base font-medium text-r-text">Generation is in progress</p>
              <div className="mx-auto mt-4 w-full max-w-xs">
                <div className="h-1.5 overflow-hidden rounded-full bg-r-card">
                  <div className="h-full rounded-full bg-r-text transition-all duration-300"
                    style={{ width: `${Math.max(10, generationJob?.progress ?? 10)}%` }} />
                </div>
                <p className="mt-2 text-xs font-medium text-r-secondary">{generationJob?.current_step || "Preparing generation..."}</p>
                <ProcessingTextSequence />
              </div>
            </div>
          )}
          {generationError && <p className="text-sm text-r-danger" role="alert">{generationError}</p>}
          <div className={`flex min-w-0 flex-col ${currentTab === ARCHIVE_TAB ? 'gap-[30px] lg:gap-[50px]' : 'gap-[30px]'}`}>
            <TabBar tabs={manageTabs} active={currentTab} onChange={setActiveTab} />
            <div>
              {currentTab === ARCHIVE_TAB && <ArchiveTab memorialId={memorialId} contributors={contributors} contributorsLoading={contributorsLoading} />}
              {currentTab === APPROVE_TAB && (
                <ApproveContributionsTab
                  memorialId={memorialId}
                  contributorslist={contributors}
                  loading={contributorsLoading}
                  error={contributorsError}
                  onRetry={loadContributors}
                  onContributorsChange={setContributors}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} memorialId={id} />}

      {showGenerateConfirm && (
        <GenerateConfirmModal
          subjectName={memorial?.subject_name || 'this memorial'}
          onConfirm={handleGenerateConfirm}
          onCancel={() => setShowGenerateConfirm(false)}
        />
      )}
    </main>
  );
}
