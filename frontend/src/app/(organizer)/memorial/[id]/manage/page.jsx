// frontend/src/app/(organizer)/memorial/[id]/manage/page.jsx

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { generateMemorialOutput, getGenerationJobStatus, getMemorialOutput } from '@/services/memorialService';
import { getMemorialContributors } from '@/services/contributorService';
import { getMemorial, createInviteLink, createShareLink } from '@/lib/api';
import { copyTextToClipboard, normalizeShareUrl } from '@/lib/copyToClipboard';
import ConstellationGraph from "@/components/output/constellation";
import MemorialContributionsPage from "@/components/output/contribution-list";
import MemorialContributionApproval from "@/components/output/contribution-awaiting";
import StorySlideshow from "@/components/output/StorySlideshow";
import VoicesTab from "@/components/output/VoicesTab";
import ProcessingTextSequence from "@/components/dashboard/ProcessingTextSequence";
import { getAuthToken } from "@/lib/api.js";
import MemorialCoverImage from "@/components/memorial/MemorialCoverImage.jsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Generation constants ─────────────────────────────────────────────────────

const GENERATION_POLL_INTERVAL_MS = 1500;
const GENERATION_MAX_POLL_ATTEMPTS = 60;
const OUTPUT_PENDING_POLL_INTERVAL_MS = 5000;
const GENERATION_SUCCESS_STATUSES = new Set(["complete", "completed", "succeeded", "success"]);
const GENERATION_FAILURE_STATUSES = new Set(["failed", "error"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeMemorialForView(memorial) {
  if (!memorial) return null;
  return {
    id: memorial.id,
    subject_name: memorial.subject_name || memorial.deceased_name,
    cover_photo_url: memorial.cover_photo_url || memorial.profile_photo_url || null,
    date_of_birth: memorial.date_of_birth || memorial.birth_date || null,
    date_of_passing: memorial.date_of_passing || memorial.death_date || null,
    bio: memorial.brief_biography || memorial.short_description || memorial.biography || null,
    status: memorial.status || null,
  };
}

function isGeneratingMemorial(memorial) {
  return String(memorial?.status || "").toLowerCase() === "generating";
}

// ─── Memorial Header ──────────────────────────────────────────────────────────

function MemorialHeader({ memorial, onShare }) {
  return (
    <div className="flex items-start gap-8">
      <div className="relative h-36 w-36 shrink-0 overflow-hidden">
        <MemorialCoverImage
          src={memorial?.cover_photo_url}
          name={memorial?.subject_name}
          fill
          className="h-full w-full"
        />
      </div>
      <div className="flex-1 min-w-0 pt-2">
        <h1 className="text-[32px] font-medium text-neutral-950 leading-tight">
          {memorial?.subject_name || ''}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {memorial?.date_of_birth && new Date(memorial.date_of_birth).getFullYear()}
          {memorial?.date_of_birth && memorial?.date_of_passing && ' - '}
          {memorial?.date_of_passing && new Date(memorial.date_of_passing).getFullYear()}
        </p>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-md">
          {memorial?.bio || ''}
        </p>
        {memorial?.status && (
          <span className="mt-3 inline-block rounded-full px-4 py-1.5 text-caption bg-r-shape"
            style={{ color: '#FBF9F6' }}>
            {memorial.status === 'collecting' ? 'Collecting'
              : memorial.status === 'generating' ? 'Generating'
              : memorial.status === 'complete' ? 'Complete'
              : memorial.status}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        <Link href={memorial?.id ? `/memorial/${memorial.id}/output` : '#'}
          className="rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white text-center hover:opacity-80 transition-opacity">
          View page
        </Link>
        <button onClick={onShare}
          className="rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">
          Share
        </button>
        <button className="rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">
          Settings
        </button>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const MAIN_TABS = ['Archive', 'Contributions', 'Outputs'];

function TabBar({ active, onChange }) {
  return (
    <div className="flex border-b border-neutral-200">
      {MAIN_TABS.map((tab) => (
        <button key={tab} onClick={() => onChange(tab)}
          className={`px-8 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab
              ? 'border-neutral-950 text-neutral-950 font-semibold'
              : 'border-transparent text-slate-500 hover:text-neutral-950'
          }`}>
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 py-3 text-left">
        <span className="text-base font-medium text-neutral-950">{title}</span>
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"
          className={`text-neutral-950 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  );
}

// ─── Tab state helpers ────────────────────────────────────────────────────────

function TabLoading() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-950" />
    </div>
  );
}

function TabEmpty({ title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4" />
      <p className="text-neutral-950 text-base font-medium">{title}</p>
      <p className="text-slate-500 text-sm mt-1 max-w-xs">{message}</p>
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
      <p className="text-neutral-950 text-base font-medium">{title}</p>
      <p className="text-slate-500 text-sm mt-1 max-w-xs">{message}</p>
      <button onClick={onRetry}
        className="mt-4 rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">
        Try again
      </button>
    </div>
  );
}

// ─── Archive Tab ──────────────────────────────────────────────────────────────

function ArchiveTab({ contributors, output }) {
  const [query, setQuery] = useState('');

  // Gather all content from output albums and voices
  const allPhotos = [];
  const albums = Array.isArray(output?.photos)
    ? output.photos
    : output?.photos?.albums ?? [];
  albums.forEach((album) => {
    (album.photos || []).forEach((p) => allPhotos.push({ type: 'photo', ...p }));
  });

  const allVoices = (output?.voices || []).map((v) => ({ type: 'voice', ...v }));
  const allItems = [...allPhotos, ...allVoices];

  const filtered = query.trim()
    ? allItems.filter((item) => {
        const text = [
          item.caption,
          item.contributor_name,
          item.contributor_title,
          item.key_quote,
          item.transcript_text,
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(query.toLowerCase());
      })
    : allItems;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center gap-3">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-neutral-950 shrink-0">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Show me happy memories"
          className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        />
        <button className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">Filter</button>
        <button className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">Sort</button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-neutral-950 text-base font-medium">
            {allItems.length === 0 ? 'No contributions yet' : 'No results found'}
          </p>
          <p className="text-slate-500 text-sm mt-1 max-w-xs">
            {allItems.length === 0
              ? 'Submitted contributions will appear here once generated.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <div key={item.id || i} className="rounded-xl overflow-hidden border border-neutral-200 bg-white">
              {item.type === 'photo' && (
                item.url
                  ? <img src={item.url} alt={item.caption || ''} className="aspect-[4/3] w-full object-cover" />
                  : <div className="aspect-[4/3] w-full bg-neutral-200 flex items-center justify-center">
                      <span className="text-xs text-neutral-400">{item.contributor_name || 'Photo'}</span>
                    </div>
              )}
              {item.type === 'voice' && (
                <div className="aspect-[4/3] w-full bg-neutral-100 flex flex-col items-center justify-center gap-2 p-4">
                  <p className="text-sm font-medium text-neutral-950 text-center">{item.contributor_title}</p>
                  <div className="flex items-center gap-[2px]">
                    {Array.from({ length: 20 }).map((_, j) => (
                      <div key={j} className="w-[2px] rounded-full bg-neutral-400"
                        style={{ height: `${8 + ((j * 5) % 16)}px` }} />
                    ))}
                  </div>
                  {item.contributor_name && (
                    <p className="text-xs text-neutral-500">Submitted by {item.contributor_name}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Contributions Tab ────────────────────────────────────────────────────────

function ContributionsTab({ contributorslist, loading, error, onRetry }) {
  const [value, setValue] = useState("contributors");

  const submissions = contributorslist.filter((c) => {
    const status = String(c.status || "").toLowerCase();
    return status === "submitted" || Boolean(c.submitted_at);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const current = submissions[currentIndex];
  const handlePrev = () => setCurrentIndex((prev) => prev === 0 ? submissions.length - 1 : prev - 1);
  const handleNext = () => setCurrentIndex((prev) => prev === submissions.length - 1 ? 0 : prev + 1);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <select onChange={(e) => setValue(e.target.value)} value={value}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm outline-none">
          <option value="contributors">Contributors</option>
          <option value="awaiting">Awaiting Approval</option>
        </select>
        {(value === "awaiting" && submissions.length > 0) && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <button onClick={handlePrev} className="rounded p-1 transition hover:bg-gray-200">
              <ChevronLeft size={18} />
            </button>
            <span>{currentIndex + 1}/{submissions.length}</span>
            <button onClick={handleNext} className="rounded p-1 transition hover:bg-gray-200">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {value === "contributors" && loading && <TabLoading />}
      {value === "contributors" && !loading && error && (
        <TabError
          title="Unable to load contributors"
          message="Contributor details could not be loaded. You can still use the other tabs."
          onRetry={onRetry}
        />
      )}
      {value === "contributors" && !loading && !error && contributorslist.length === 0 && (
        <TabEmpty
          title="No contributors yet"
          message="Contributors will appear here once people begin sharing memories."
        />
      )}
      {value === "contributors" && !loading && !error && contributorslist.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {contributorslist.map((contributor) => (
            <div key={contributor.id} className="rounded-2xl p-5 flex flex-col gap-3 bg-r-modal border border-r-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full shrink-0 bg-r-card" />
                <div className="min-w-0">
                  <p className="text-body-2 font-semibold text-r-text">{contributor.name}</p>
                  <p className="text-caption text-r-muted mt-0.5">
                    {String(contributor.status || '').toLowerCase() === 'submitted' ||
                    contributor.submitted_at
                      ? 'Submitted'
                      : 'In progress'}
                  </p>
                  <p className="text-caption text-r-muted">
                    Last submitted {contributor.submitted_at
                      ? new Date(contributor.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'No date provided'}
                  </p>
                </div>
              </div>
              <span className="self-start rounded-full px-4 py-1.5 text-caption bg-r-shape"
                style={{ color: '#FBF9F6' }}>
                {contributor.relationship_type || 'No Relationship'}
              </span>
            </div>
          ))}
        </div>
      )}
      {value === "awaiting" && (
        <MemorialContributionApproval contributors={current} gallery={submissions.length} />
      )}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ photo, onClose, onPrev, onNext }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-800">
          {photo.url
            ? <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-neutral-700 flex items-center justify-center"><span className="text-neutral-500 text-sm">No image</span></div>}
        </div>
        <div className="mt-3 px-1">
          {photo.caption && <p className="text-white text-sm font-medium">{photo.caption}</p>}
          <p className="text-neutral-400 text-xs mt-0.5">
            {photo.contributor_name}{photo.taken_at && ` · ${new Date(photo.taken_at).getFullYear()}`}
          </p>
        </div>
        <button onClick={onPrev} className="absolute left-[-48px] top-1/2 -translate-y-1/2 p-2 text-white hover:text-neutral-300">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={onNext} className="absolute right-[-48px] top-1/2 -translate-y-1/2 p-2 text-white hover:text-neutral-300">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={onClose} className="absolute -top-10 right-0 p-2 text-white hover:text-neutral-300">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─── All Photos Section ───────────────────────────────────────────────────────

function AllPhotosSection({ albums, onGenerate, generating, canGenerate }) {
  const PHOTOS_PER_PAGE = 6;
  const [filterContributor, setFilterContributor] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Flatten all photos from all albums into one list
  const albumList = Array.isArray(albums) ? albums : albums?.albums ?? [];
  const allPhotos = albumList.flatMap((album) =>
    (album.photos || []).map((p) => ({ ...p, album_name: album.album_name || album.name || 'Album' }))
  );

  // Unique contributors for filter dropdown
  const contributors = ['all', ...Array.from(new Set(allPhotos.map((p) => p.contributor_name).filter(Boolean)))];

  // Filter
  const filtered = filterContributor === 'all'
    ? allPhotos
    : allPhotos.filter((p) => p.contributor_name === filterContributor);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'newest') return new Date(b.taken_at || 0) - new Date(a.taken_at || 0);
    if (sortOrder === 'oldest') return new Date(a.taken_at || 0) - new Date(b.taken_at || 0);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PHOTOS_PER_PAGE));
  const paginated = sorted.slice((page - 1) * PHOTOS_PER_PAGE, page * PHOTOS_PER_PAGE);

  function openLightbox(photo, index) { setLightboxPhoto(photo); setLightboxIndex(index); }
  function prevPhoto() {
    const i = (lightboxIndex - 1 + paginated.length) % paginated.length;
    setLightboxIndex(i); setLightboxPhoto(paginated[i]);
  }
  function nextPhoto() {
    const i = (lightboxIndex + 1) % paginated.length;
    setLightboxIndex(i); setLightboxPhoto(paginated[i]);
  }

  return (
    <div className="flex flex-col gap-5 pt-4">

      {/* Top bar — title + generate + pagination */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[36px] font-medium italic text-neutral-950" style={{ fontFamily: 'var(--font-boska, serif)' }}>
          All photos
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || generating}
            className="rounded-full px-6 py-[14px] text-base text-neutral-950 transition-opacity hover:opacity-80 disabled:opacity-45 disabled:cursor-not-allowed border-none"
            style={{ backgroundColor: 'var(--color-r-btn)' }}
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="transition-opacity hover:opacity-70 disabled:opacity-30"
              aria-label="Previous page"
            >
              <svg width="25" height="50" viewBox="0 0 25 50" fill="none">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M3.83906 26.4813L15.6245 38.2667L18.5703 35.3208L8.25781 25.0083L18.5703 14.6958L15.6245 11.75L3.83906 23.5354C3.4485 23.9261 3.22909 24.4559 3.22909 25.0083C3.22909 25.5608 3.4485 26.0906 3.83906 26.4813Z"
                  fill="#423F39"/>
              </svg>
            </button>
            <span className="text-2xl font-medium text-neutral-950 min-w-[48px] text-center"
              style={{ fontFamily: 'var(--font-boska, serif)' }}>
              {page} {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="transition-opacity hover:opacity-70 disabled:opacity-30"
              aria-label="Next page"
            >
              <svg width="25" height="50" viewBox="0 0 25 50" fill="none">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M21.1609 26.4813L9.37552 38.2667L6.42969 35.3208L16.7422 25.0083L6.42969 14.6958L9.37552 11.75L21.1609 23.5354C21.5515 23.9261 21.7709 24.4559 21.7709 25.0083C21.7709 25.5608 21.5515 26.0906 21.1609 26.4813Z"
                  fill="#423F39"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-[434px]">
          <select
            value={filterContributor}
            onChange={(e) => { setFilterContributor(e.target.value); setPage(1); }}
            className="w-full appearance-none rounded-[12.7px] border border-neutral-200 px-5 py-4 pr-12 text-xl font-medium text-neutral-950 bg-transparent focus:outline-none cursor-pointer"
            style={{ fontFamily: 'var(--font-boska, serif)' }}
          >
            <option value="all">All photos</option>
            {contributors.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path d="M15 30L2.00962 7.5L27.9904 7.5L15 30Z" fill="#423F39" />
            </svg>
          </span>
        </div>
        <div className="relative w-[207px]">
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            className="w-full appearance-none rounded-[12.7px] border border-neutral-200 px-5 py-4 pr-12 text-xl font-medium text-neutral-950 bg-transparent focus:outline-none cursor-pointer"
            style={{ fontFamily: 'var(--font-boska, serif)' }}
          >
            <option value="newest">Sort</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path d="M15 30L2.00962 7.5L27.9904 7.5L15 30Z" fill="#423F39" />
            </svg>
          </span>
        </div>
      </div>

      {/* Photo grid */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-base font-medium text-neutral-950">No photos yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Photos will appear here once contributors have submitted and the memorial has been generated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {paginated.map((photo, index) => (
            <button
              key={photo.id || index}
              onClick={() => openLightbox(photo, index)}
              className="group relative w-full overflow-hidden rounded-none bg-neutral-100"
              style={{ aspectRatio: '4/3' }}
            >
              {photo.url ? (
                <img src={photo.url} alt={photo.caption || ''}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="h-full w-full bg-neutral-200" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-end p-3 opacity-0 group-hover:opacity-100">
                <div className="w-full">
                  {photo.caption && <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>}
                  {photo.contributor_name && <p className="text-white text-xs truncate">{photo.contributor_name}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {lightboxPhoto && (
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onPrev={prevPhoto} onNext={nextPhoto} />
      )}
    </div>
  );
}

// ─── Pre-generation empty state ───────────────────────────────────────────────

function PreGenerationEmpty({ canGenerate, disabledMessage, generationError, generationJob, generating, onGenerate }) {
  const isPending = generating && !generationError;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-neutral-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <p className="text-neutral-950 text-base font-medium">
        {isPending ? "Generation is in progress" : "Generation hasn&apos;t run yet"}
      </p>
      <p className="text-slate-500 text-sm mt-1 max-w-xs leading-relaxed">
        {isPending
          ? "Outputs will appear here automatically once the memorial is ready."
          : "Once you have contributions, click Generate to create the Story, Constellation, Voices, and Photos."}
      </p>
      <button type="button" onClick={onGenerate} disabled={!canGenerate || generating}
        className="mt-6 flex h-[50px] w-[207px] items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45">
        {generating ? "Generating..." : "Generate"}
      </button>
      {isPending && (
        <div className="mt-4 w-full max-w-xs" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-neutral-950 transition-all duration-300"
              style={{ width: `${Math.max(10, generationJob?.progress ?? 10)}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">
            {generationJob?.current_step || "Preparing generation..."}
          </p>
          <ProcessingTextSequence />
        </div>
      )}
      {!generating && disabledMessage && (
        <p className="mt-3 max-w-xs text-xs text-slate-500">{disabledMessage}</p>
      )}
      {generationError && (
        <p className="mt-3 max-w-xs text-sm text-red-600" role="alert">{generationError}</p>
      )}
    </div>
  );
}

// ─── Outputs Tab ──────────────────────────────────────────────────────────────

function OutputsTab({memorial, contributors, canGenerate, disabledMessage, generationError, generationJob, generating, onGenerate, output, loading, error, onRetry }) {
  if (loading) return <TabLoading />;

  if (error) {
    return (
      <TabError
        title="Unable to load outputs"
        message="The generated memorial output could not be loaded. Archive and Contributions are still available."
        onRetry={onRetry}
      />
    );
  }

  if (!output) {
    return (
      <div className="pt-6">
        <PreGenerationEmpty
          canGenerate={canGenerate}
          disabledMessage={disabledMessage}
          generationError={generationError}
          generationJob={generationJob}
          generating={generating}
          onGenerate={onGenerate}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-neutral-100 pt-4">
      <CollapsibleSection title="Story">
        <StorySlideshow output={output} story={output?.story} />
      </CollapsibleSection>
      <CollapsibleSection title="Constellation">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6 aspect-video flex items-center justify-center">
          <ConstellationGraph
            ai_output={output}
            memorial={memorial}
            contributor={contributors}
            width={800}
            height={800}
          />
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Voices">
        <VoicesTab output={output} voices={output?.voices} />
      </CollapsibleSection>
      <div className="pt-2 border-t border-neutral-100">
        <AllPhotosSection
          albums={output?.photos}
          onGenerate={onGenerate}
          generating={generating}
          canGenerate={canGenerate}
        />
      </div>
    </div>
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
      setLinksLoading(true);
      setLinksError(null);
      setContributorUrl('');
      setViewerUrl('');
      try {
        const invite = await createInviteLink(memorialId);
        if (cancelled) return;
        setContributorUrl(normalizeShareUrl(invite?.invite_link?.url ?? ''));

        try {
          const share = await createShareLink(memorialId);
          if (!cancelled) {
            setViewerUrl(normalizeShareUrl(share?.share_link?.url ?? ''));
          }
        } catch (shareErr) {
          console.warn('Viewer share link unavailable:', shareErr);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Could not load share links.';
          if (message.toLowerCase().includes('not authorized') || message.toLowerCase().includes('do not own')) {
            setLinksError(
              'This memorial is not linked to your account. Go to Dashboard, open a memorial you created, then try Share again.',
            );
          } else if (message.toLowerCase().includes('logged in')) {
            setLinksError(`${message} Sign in and try again.`);
          } else {
            setLinksError(`${message} Close and try again.`);
          }
        }
      } finally {
        if (!cancelled) setLinksLoading(false);
      }
    }

    loadShareLinks();
    return () => { cancelled = true; };
  }, [memorialId]);

  async function copyLink(type) {
    setCopyError(null);
    const url = type === 'contributor' ? contributorUrl : viewerUrl;
    if (!url) {
      setCopyError('Link is not ready yet.');
      return;
    }
    try {
      await copyTextToClipboard(url);
      if (type === 'contributor') {
        setCopiedContributor(true);
        setTimeout(() => setCopiedContributor(false), 2000);
      } else {
        setCopiedViewer(true);
        setTimeout(() => setCopiedViewer(false), 2000);
      }
    } catch {
      setCopyError('Copy failed. Select the link below and copy manually.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-r-modal p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onClose} className="text-r-text">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-h2 text-r-text">Share</h2>
        </div>
        {linksError ? (
          <p className="text-body-2 text-red-600 mb-4">{linksError}</p>
        ) : null}
        {copyError ? (
          <p className="text-body-2 text-red-600 mb-4">{copyError}</p>
        ) : null}
        {[
          { label: 'Invite Contributors', sub: 'For friends and family to share their memories:', type: 'contributor', copied: copiedContributor, url: contributorUrl },
          { label: 'Invite Viewers', sub: 'For anyone to view this memorial:', type: 'viewer', copied: copiedViewer, url: viewerUrl },
        ].map(({ label, sub, type, copied, url }) => (
          <div key={type} className="flex items-start justify-between mb-6">
            <div className="min-w-0 pr-4">
              <p className="text-h3 text-r-text">{label}</p>
              <p className="text-body-2 text-r-secondary mt-0.5">{sub}</p>
              {url ? (
                <p className="text-caption text-r-secondary mt-2 break-all">{url}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => copyLink(type)}
              disabled={linksLoading || !url}
              className="shrink-0 rounded-full px-4 py-2 text-h4 transition-all ml-5 border-none disabled:opacity-50"
              style={{ backgroundColor: copied ? '#7D8C6A' : 'var(--color-r-btn)', color: copied ? '#FBF9F6' : 'var(--color-r-btn-text)' }}>
              {copied ? 'Copied!' : linksLoading ? 'Loading…' : 'Copy Link'}
            </button>
          </div>
        ))}
        <div className="flex justify-center gap-6 mt-8">
          {['Message', 'Email', 'Instagram'].map((label) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-14 h-12 rounded-xl flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity bg-r-shape">
                <span className="text-caption font-medium" style={{ color: 'white' }}>{label[0]}</span>
              </div>
              <span className="text-caption text-r-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemorialOutputPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Outputs');
  const [output, setOutput] = useState(null);
  const [outputLoading, setOutputLoading] = useState(true);
  const [outputError, setOutputError] = useState(null);
  const [contributorsLoading, setContributorsLoading] = useState(true);
  const [contributorsError, setContributorsError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [contributors, setContributors] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generationJob, setGenerationJob] = useState(null);
  const [memorial, setMemorial] = useState(null);
  const memorialId = id;

  // Load memorial header
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
      .catch(() => {
        setMemorial(null);
      });
  }, [id]);

  const loadContributors = useCallback(async () => {
    if (!memorialId) return;
    setContributorsLoading(true);
    setContributorsError(null);
    try {
      const token = await getAuthToken();
      const contributor = await getMemorialContributors(memorialId, token);
      const memorialApi = await getMemorial(memorialId);
      const m = memorialApi?.memorial ?? memorialApi;
      const normalized = normalizeMemorialForView(m);
      if (normalized) {
        setMemorial(normalized);
        setGenerating((current) => current || isGeneratingMemorial(normalized));
      }
      setContributors(contributor.contributors ?? []);
    } catch (err) {
      setContributorsError(err instanceof Error ? err.message : "Failed to fetch contributors");
      setContributors([]);
    } finally {
      setContributorsLoading(false);
    }
  }, [memorialId]);

  const loadOutput = useCallback(async (options = {}) => {
    if (!id) return;
    setOutputLoading(true);
    setOutputError(null);
    try {
      const token = await getAuthToken();
      const data = await getMemorialOutput(id, token, options);
      setOutput(data);
      return data;
    } catch (err) {
      setOutputError(err instanceof Error ? err.message : "Failed to fetch memorial output");
      setOutput(null);
      return null;
    } finally {
      setOutputLoading(false);
    }
  }, [id]);

  const handleGenerate = useCallback(async () => {
    if (!memorialId || generating) return;
    setGenerating(true);
    setGenerationError(null);
    setGenerationJob(null);
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
          if (GENERATION_FAILURE_STATUSES.has(status)) {
            throw new Error(latestJob?.error_message || "Generation failed. Please try again.");
          }
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
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      if (!keepGenerating) setGenerating(false);
    }
  }, [generating, loadOutput, memorialId]);

  useEffect(() => {
    if (!id || output || !generating) return undefined;

    let cancelled = false;

    async function pollPendingOutput() {
      const token = await getAuthToken();
      const data = await getMemorialOutput(id, token);
      if (cancelled) return;

      if (data) {
        setOutput(data);
        setOutputError(null);
        setGenerating(false);
        setGenerationJob((job) => job ? { ...job, status: 'complete', progress: 100, current_step: 'Complete' } : job);
        try {
          const memorialApi = await getMemorial(id);
          if (!cancelled) {
            const normalized = normalizeMemorialForView(memorialApi?.memorial ?? memorialApi);
            if (normalized) setMemorial(normalized);
          }
        } catch {
          // Output is loaded; header refresh can wait for the next page visit.
        }
      }
    }

    pollPendingOutput();
    const intervalId = window.setInterval(pollPendingOutput, OUTPUT_PENDING_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [generating, id, output]);

  const submittedContributionCount = contributors.filter((contributor) => {
    const status = String(contributor?.status || "").toLowerCase();
    return status === "submitted" || Boolean(contributor?.submitted_at);
  }).length;

  const canGenerate = !contributorsLoading && !contributorsError && submittedContributionCount > 0;
  const generationDisabledMessage = contributorsLoading
    ? "Checking submitted contributions..."
    : contributorsError
      ? "Contributor data could not be loaded, so generation is unavailable right now."
      : submittedContributionCount === 0
        ? "Generation is available after at least one contributor submits a memory."
        : "";

  useEffect(() => { queueMicrotask(loadContributors); }, [loadContributors]);
  useEffect(() => { queueMicrotask(loadOutput); }, [loadOutput]);

  return (
    <main className="min-h-screen bg-r-bg px-6 py-10 text-neutral-950 sm:px-[50px]">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8">

        <nav className="flex h-10 items-center justify-between">
          <span className="text-2xl leading-8 text-neutral-950">Remember</span>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-base text-neutral-950 hover:text-slate-600 transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </Link>
        </nav>

        <MemorialHeader memorial={memorial} onShare={() => setShowShare(true)} />
        <TabBar active={activeTab} onChange={setActiveTab} />

        <div>
          {activeTab === 'Archive' && <ArchiveTab contributors={contributors} output={output} />}
          {activeTab === 'Contributions' && (
            <ContributionsTab
              contributorslist={contributors}
              loading={contributorsLoading}
              error={contributorsError}
              onRetry={loadContributors}
            />
          )}
          {activeTab === 'Outputs' && (
            <OutputsTab
              memorial={memorial}
              contributors={contributors}
              canGenerate={canGenerate}
              disabledMessage={generationDisabledMessage}
              generationError={generationError}
              generationJob={generationJob}
              generating={generating}
              onGenerate={handleGenerate}
              output={output}
              loading={outputLoading}
              error={outputError}
              onRetry={loadOutput}
            />
          )}
        </div>

      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} memorialId={id} />}
    </main>
  );
}
