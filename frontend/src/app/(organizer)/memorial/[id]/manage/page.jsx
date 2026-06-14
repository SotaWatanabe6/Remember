// frontend/src/app/(organizer)/memorial/[id]/manage/page.jsx

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Share2, Settings } from 'lucide-react';
import { generateMemorialOutput, getGenerationJobStatus, getMemorialOutput } from '@/services/memorialService';
import { getMemorialContributors } from '@/services/contributorService';
import { getMemorial, createInviteLink, createShareLink } from '@/lib/api';
import { copyTextToClipboard, normalizeShareUrl } from '@/lib/copyToClipboard';
import ConstellationGraph from "@/components/output/constellation";
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

// ─── Pagination arrows (shared) ───────────────────────────────────────────────

function PrevArrow({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="transition-opacity hover:opacity-70 disabled:opacity-30"
      aria-label="Previous page"
    >
      <svg width="25" height="50" viewBox="0 0 25 50" fill="none">
        <path fillRule="evenodd" clipRule="evenodd"
          d="M3.83906 26.4813L15.6245 38.2667L18.5703 35.3208L8.25781 25.0083L18.5703 14.6958L15.6245 11.75L3.83906 23.5354C3.4485 23.9261 3.22909 24.4559 3.22909 25.0083C3.22909 25.5608 3.4485 26.0906 3.83906 26.4813Z"
          fill="#423F39"/>
      </svg>
    </button>
  );
}

function NextArrow({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="transition-opacity hover:opacity-70 disabled:opacity-30"
      aria-label="Next page"
    >
      <svg width="25" height="50" viewBox="0 0 25 50" fill="none">
        <path fillRule="evenodd" clipRule="evenodd"
          d="M21.1609 26.4813L9.37552 38.2667L6.42969 35.3208L16.7422 25.0083L6.42969 14.6958L9.37552 11.75L21.1609 23.5354C21.5515 23.9261 21.7709 24.4559 21.7709 25.0083C21.7709 25.5608 21.5515 26.0906 21.1609 26.4813Z"
          fill="#423F39"/>
      </svg>
    </button>
  );
}

function FilterSelect({ value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none rounded-[12.7px] border border-r-border px-5 py-4 pr-12 text-xl font-medium text-r-text bg-transparent focus:outline-none cursor-pointer"
        style={{ fontFamily: 'var(--font-family-display)' }}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 30L2.00962 7.5L27.9904 7.5L15 30Z" fill="#423F39" />
        </svg>
      </span>
    </div>
  );
}

// ─── Memorial Header ──────────────────────────────────────────────────────────

function MemorialHeader({ memorial, inviteToken, onShare }) {
  return (
    <div className="flex items-start gap-8">
      {/* Circular avatar — matches Figma design */}
      <div className="relative h-[145px] w-[145px] shrink-0 overflow-hidden rounded-full border border-r-border">
        <MemorialCoverImage
          src={memorial?.cover_photo_url}
          name={memorial?.subject_name}
          fill
          className="h-full w-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pt-2">
        <h1
          className="text-[32px] font-medium text-r-text leading-tight"
          style={{ fontFamily: 'var(--font-family-display)', fontStyle: 'italic' }}
        >
          {memorial?.subject_name || ''}
        </h1>
        <p className="mt-1 text-sm text-r-muted">
          {memorial?.date_of_birth && new Date(memorial.date_of_birth).getFullYear()}
          {memorial?.date_of_birth && memorial?.date_of_passing && ' - '}
          {memorial?.date_of_passing && new Date(memorial.date_of_passing).getFullYear()}
        </p>
        <p className="mt-2 text-sm text-r-secondary leading-relaxed max-w-md">
          {memorial?.bio || ''}
        </p>
        {memorial?.status && (
          <span className="mt-3 inline-block rounded-full px-4 py-1.5 text-caption bg-r-shape"
            style={{ color: '#FBF9F6' }}>
            {memorial.status === 'collecting' ? 'Collecting memories'
              : memorial.status === 'generating' ? 'Generating'
              : memorial.status === 'complete' ? 'Complete'
              : memorial.status}
          </span>
        )}
      </div>

      {/* Actions — matches Figma: two pill buttons + icon row */}
      <div className="flex shrink-0 flex-col items-end gap-3 pt-2">
        {/* Upload Memories: organizer goes through the same contributor flow as everyone else.
            Links to /contribute/[inviteToken] once the token is loaded. */}
        <Link
          href={inviteToken ? `/contribute/${inviteToken}` : '#'}
          className="w-44 py-2.5 rounded-full border border-r-border bg-r-btn text-r-btn-text text-sm text-center font-medium hover:opacity-85 transition-opacity"
        >
          Upload Memories
        </Link>
        <Link
          href={memorial?.id ? `/memorial/${memorial.id}/output` : '#'}
          className="w-44 py-2.5 rounded-full border border-r-border bg-r-btn text-r-btn-text text-sm text-center font-medium hover:opacity-85 transition-opacity"
        >
          View Memorial
        </Link>
        <div className="flex items-center gap-5 mt-1 pr-1">
          <button
            onClick={onShare}
            aria-label="Share"
            className="text-r-text hover:opacity-60 transition-opacity"
          >
            <Share2 size={20} />
          </button>
          <button
            aria-label="Settings"
            className="text-r-text hover:opacity-60 transition-opacity"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const MAIN_TABS = ['Archive', 'Contributions', 'Outputs'];

function TabBar({ active, onChange }) {
  return (
    <div className="flex border-b border-r-border">
      {MAIN_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-3 text-sm transition-colors relative ${
            active === tab
              ? 'text-r-text font-semibold'
              : 'text-r-muted hover:text-r-text font-normal'
          }`}
        >
          {tab}
          {active === tab && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-r-text" />
          )}
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
        <span className="text-base font-medium text-r-text">{title}</span>
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"
          className={`text-r-text transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
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

// ─── Archive Tab ──────────────────────────────────────────────────────────────

function ArchiveTab({ contributors, output }) {
  const [query, setQuery] = useState('');

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
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-r-text shrink-0">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Show me happy memories"
          className="flex-1 rounded-xl border border-r-border px-4 py-2.5 text-sm placeholder-r-muted bg-transparent focus:outline-none focus:border-r-border-focus text-r-text"
        />
        <button className="rounded-full bg-r-btn px-5 py-2.5 text-sm font-medium text-r-btn-text hover:opacity-85 transition-opacity">Filter</button>
        <button className="rounded-full bg-r-btn px-5 py-2.5 text-sm font-medium text-r-btn-text hover:opacity-85 transition-opacity">Sort</button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-r-text text-base font-medium">
            {allItems.length === 0 ? 'No contributions yet' : 'No results found'}
          </p>
          <p className="text-r-secondary text-sm mt-1 max-w-xs">
            {allItems.length === 0
              ? 'Submitted contributions will appear here once generated.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <div key={item.id || i} className="rounded-2xl overflow-hidden border border-r-border bg-r-card">
              {item.type === 'photo' && (
                item.url
                  ? <img src={item.url} alt={item.caption || ''} className="aspect-[4/3] w-full object-cover" />
                  : <div className="aspect-[4/3] w-full bg-r-card flex items-center justify-center">
                      <span className="text-xs text-r-muted">{item.contributor_name || 'Photo'}</span>
                    </div>
              )}
              {item.type === 'voice' && (
                <div className="aspect-[4/3] w-full bg-r-card flex flex-col items-center justify-center gap-2 p-4">
                  <p className="text-sm font-medium text-r-text text-center">{item.contributor_title}</p>
                  <div className="flex items-center gap-[2px]">
                    {Array.from({ length: 20 }).map((_, j) => (
                      <div key={j} className="w-[2px] rounded-full bg-r-muted"
                        style={{ height: `${8 + ((j * 5) % 16)}px` }} />
                    ))}
                  </div>
                  {item.contributor_name && (
                    <p className="text-xs text-r-secondary">Submitted by {item.contributor_name}</p>
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
          className="border border-r-border rounded-md px-4 py-2 text-sm outline-none bg-transparent text-r-text">
          <option value="contributors">Contributors</option>
          <option value="awaiting">Awaiting Approval</option>
        </select>
        {(value === "awaiting" && submissions.length > 0) && (
          <div className="flex items-center gap-4 text-sm text-r-secondary">
            <button onClick={handlePrev} className="rounded p-1 transition hover:bg-r-card">
              <ChevronLeft size={18} />
            </button>
            <span>{currentIndex + 1}/{submissions.length}</span>
            <button onClick={handleNext} className="rounded p-1 transition hover:bg-r-card">
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
        <div className="relative w-full max-h-[80vh] overflow-hidden rounded-2xl bg-neutral-900 flex items-center justify-center">
          {photo.url
            ? <img src={photo.url} alt={photo.caption || ''} className="max-h-[80vh] w-auto max-w-full object-contain" />
            : <div className="h-64 w-full bg-neutral-700 flex items-center justify-center"><span className="text-neutral-500 text-sm">No image</span></div>}
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
  const [filterView, setFilterView] = useState('all'); // 'all' | 'albums'
  const [sortOrder, setSortOrder] = useState('recently_added');
  const [page, setPage] = useState(1);
  const [openAlbum, setOpenAlbum] = useState(null); // album object when drilling into an album
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Normalize both backend shapes:
  // Real: { albums: [{ name, photos, cover_photo_url, photo_count }] }
  // Mock: [{ album_name, photos, cover_photo_url }]
  const albumList = (() => {
    if (!albums) return [];
    if (albums.albums && Array.isArray(albums.albums)) {
      return albums.albums.map((a) => ({
        album_name: a.name || a.album_name || 'Album',
        cover_photo_url: a.cover_photo_url || a.photos?.[0]?.url || null,
        photo_count: a.photo_count ?? a.photos?.length ?? 0,
        photos: (a.photos || []).map((p) => ({
          id: p.id,
          url: p.url || null,
          caption: p.caption || null,
          taken_at: p.taken_at || null,
          contributor_name: p.contributor_name || null,
        })),
      }));
    }
    if (Array.isArray(albums)) {
      return albums.map((a) => ({
        album_name: a.album_name || a.name || 'Album',
        cover_photo_url: a.cover_photo_url || a.photos?.[0]?.url || null,
        photo_count: a.photo_count ?? a.photos?.length ?? 0,
        photos: a.photos || [],
      }));
    }
    return [];
  })();

  const allPhotos = albumList.flatMap((album) =>
    (album.photos || []).map((p) => ({ ...p, album_name: album.album_name }))
  );

  const isAlbumView = filterView === 'albums';

  // When a filter view changes, reset album drill-in and page
  function handleFilterChange(val) {
    setFilterView(val);
    setOpenAlbum(null);
    setPage(1);
    // Reset sort to a valid option for the new view
    setSortOrder('recently_added');
  }

  function handleAlbumClick(album) {
    setOpenAlbum(album);
    setPage(1);
  }

  function handleBackToAlbums() {
    setOpenAlbum(null);
    setPage(1);
  }

  // Sort the photos being displayed
  function sortPhotos(photos) {
    return [...photos].sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.taken_at || a.created_at || 0) - new Date(b.taken_at || b.created_at || 0);
      }
      if (sortOrder === 'name') {
        return (a.caption || '').localeCompare(b.caption || '');
      }
      // recently_added (default)
      return new Date(b.taken_at || b.created_at || 0) - new Date(a.taken_at || a.created_at || 0);
    });
  }

  function sortAlbums(list) {
    return [...list].sort((a, b) => {
      if (sortOrder === 'name') {
        return (a.album_name || '').localeCompare(b.album_name || '');
      }
      // recently_added — albums don't have dates so keep original order
      return 0;
    });
  }

  // Determine what to paginate
  let itemsForPagination = [];
  if (openAlbum) {
    itemsForPagination = sortPhotos(openAlbum.photos || []);
  } else if (isAlbumView) {
    itemsForPagination = sortAlbums(albumList);
  } else {
    itemsForPagination = sortPhotos(allPhotos);
  }

  const totalPages = Math.max(1, Math.ceil(itemsForPagination.length / PHOTOS_PER_PAGE));
  const paginatedItems = itemsForPagination.slice((page - 1) * PHOTOS_PER_PAGE, page * PHOTOS_PER_PAGE);

  function openLightbox(photo, index) { setLightboxPhoto(photo); setLightboxIndex(index); }
  function prevPhoto() {
    const i = (lightboxIndex - 1 + paginatedItems.length) % paginatedItems.length;
    setLightboxIndex(i); setLightboxPhoto(paginatedItems[i]);
  }
  function nextPhoto() {
    const i = (lightboxIndex + 1) % paginatedItems.length;
    setLightboxIndex(i); setLightboxPhoto(paginatedItems[i]);
  }

  // Sort options differ by view
  const sortOptions = (isAlbumView && !openAlbum)
    ? [
        { value: 'recently_added', label: 'Recently added' },
        { value: 'name', label: 'Name' },
      ]
    : [
        { value: 'recently_added', label: 'Recently added' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'name', label: 'Name' },
      ];

  return (
    <div className="flex flex-col gap-5">

      {/* Top bar — back to albums (when inside an album) + photo pagination */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {openAlbum && (
            <button
              onClick={handleBackToAlbums}
              className="flex items-center gap-1.5 text-r-secondary text-sm hover:text-r-text transition-colors"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Albums
            </button>
          )}
          {openAlbum && (
            <span
              className="text-[24px] font-medium italic text-r-text"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              {openAlbum.album_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PrevArrow onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} />
          <span
            className="text-2xl font-medium text-r-text min-w-[64px] text-center"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            {page} / {totalPages}
          </span>
          <NextArrow onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
        </div>
      </div>

      {/* Filter + Sort — hide filter when inside an album */}
      {!openAlbum && (
        <div className="flex items-center justify-between gap-4">
          <FilterSelect
            value={filterView}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="flex-1 max-w-[434px]"
          >
            <option value="all">All photos</option>
            <option value="albums">Albums</option>
          </FilterSelect>

          <FilterSelect
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            className="w-[207px]"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </FilterSelect>
        </div>
      )}

      {/* Inside an open album: sort only */}
      {openAlbum && (
        <div className="flex justify-end">
          <FilterSelect
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            className="w-[207px]"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </FilterSelect>
        </div>
      )}

      {/* Albums grid */}
      {isAlbumView && !openAlbum && (
        albumList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base font-medium text-r-text">No albums yet</p>
            <p className="text-sm text-r-secondary mt-1 max-w-xs">
              AI-named albums are created after Generate runs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {paginatedItems.map((album, index) => (
              <button
                key={album.album_name || index}
                onClick={() => handleAlbumClick(album)}
                className="group relative rounded-2xl overflow-hidden border border-r-border bg-r-card text-left cursor-pointer hover:opacity-90 transition-opacity"
                style={{ aspectRatio: '4/3' }}
              >
                {album.cover_photo_url ? (
                  <img
                    src={album.cover_photo_url}
                    alt={album.album_name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full bg-r-card" />
                )}
                <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-4">
                  <p
                    className="text-white text-sm font-medium truncate"
                    style={{ fontFamily: 'var(--font-family-display)' }}
                  >
                    {album.album_name}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">
                    {album.photo_count || album.photos?.length || 0} photos
                  </p>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {/* Photo grid — shown for "All photos" view OR when inside an album */}
      {(!isAlbumView || openAlbum) && (
        paginatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base font-medium text-r-text">
              {openAlbum ? 'No photos in this album' : 'No photos yet'}
            </p>
            <p className="text-sm text-r-secondary mt-1 max-w-xs">
              {openAlbum
                ? 'This album has no photos assigned yet.'
                : 'Photos will appear here once contributors have submitted and the memorial has been generated.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {paginatedItems.map((photo, index) => (
              <button
                key={photo.id || index}
                onClick={() => openLightbox(photo, index)}
                className="group relative w-full overflow-hidden rounded-2xl bg-r-card"
                style={{ aspectRatio: '4/3' }}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption || ''}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full bg-r-card" />
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
        )
      )}

      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </div>
  );
}


// ─── Pre-generation empty state ───────────────────────────────────────────────


function PreGenerationEmpty({ canGenerate, disabledMessage, generationError, generationJob, generating, onGenerate }) {
  const isPending = generating && !generationError;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-r-card flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-r-muted">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <p className="text-r-text text-base font-medium">
        {isPending ? "Generation is in progress" : "Generation hasn't run yet"}
      </p>
      <p className="text-r-secondary text-sm mt-1 max-w-xs leading-relaxed">
        {isPending
          ? "Outputs will appear here automatically once the memorial is ready."
          : "Once you have contributions, click Generate to create the Story, Constellation, Voices, and Photos."}
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || generating}
        className="mt-6 flex h-[50px] w-[207px] items-center justify-center rounded-full px-6 text-sm font-medium text-r-btn-text transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45 border-none"
        style={{ backgroundColor: 'var(--color-r-btn)' }}
      >
        {generating ? "Generating..." : "Generate"}
      </button>
      {isPending && (
        <div className="mt-4 w-full max-w-xs" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-r-card">
            <div className="h-full rounded-full bg-r-text transition-all duration-300"
              style={{ width: `${Math.max(10, generationJob?.progress ?? 10)}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-r-secondary">
            {generationJob?.current_step || "Preparing generation..."}
          </p>
          <ProcessingTextSequence />
        </div>
      )}
      {!generating && disabledMessage && (
        <p className="mt-3 max-w-xs text-xs text-r-secondary">{disabledMessage}</p>
      )}
      {generationError && (
        <p className="mt-3 max-w-xs text-sm text-r-danger" role="alert">{generationError}</p>
      )}
    </div>
  );
}

// ─── Outputs Tab ──────────────────────────────────────────────────────────────

const OUTPUT_SECTIONS = [
  { key: 'story',                       label: 'Story' },
  { key: 'constellation-themes',        label: 'Constellation | Themes' },
  { key: 'constellation-relationships', label: 'Constellation | Relationships' },
  { key: 'voices',                      label: 'Voices' },
  { key: 'photos',                      label: 'All photos' },
];

function OutputsTab({ memorial, contributors, canGenerate, disabledMessage, generationError, generationJob, generating, onGenerate, output, loading, error, onRetry }) {
  const [sectionIndex, setSectionIndex] = useState(0);

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

  const currentSection = OUTPUT_SECTIONS[sectionIndex];
  const total = OUTPUT_SECTIONS.length;

  // Constellation page: 1 = Themes, 2 = Relationships
  const constellationPage = currentSection.key === 'constellation-relationships' ? 2 : 1;

  return (
    <div className="flex flex-col pt-4 gap-6">

      {/* Top row: section title + Generate + arrows */}
      <div className="flex items-center justify-between gap-4">
        <h2
          className="text-[36px] font-medium italic text-r-text"
          style={{ fontFamily: 'var(--font-family-display)' }}
        >
          {currentSection.label}
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || generating}
            className="rounded-full px-6 py-[14px] text-base text-r-btn-text transition-opacity hover:opacity-80 disabled:opacity-45 disabled:cursor-not-allowed border-none"
            style={{ backgroundColor: 'var(--color-r-btn)' }}
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
          <div className="flex items-center gap-3">
            <PrevArrow
              onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
              disabled={sectionIndex === 0}
            />
            <span
              className="text-2xl font-medium text-r-text min-w-[64px] text-center"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              {sectionIndex + 1} / {total}
            </span>
            <NextArrow
              onClick={() => setSectionIndex((i) => Math.min(total - 1, i + 1))}
              disabled={sectionIndex === total - 1}
            />
          </div>
        </div>
      </div>

      {/* Section content */}
      {currentSection.key === 'story' && (
        <StorySlideshow output={output} story={output?.story} />
      )}

      {(currentSection.key === 'constellation-themes' || currentSection.key === 'constellation-relationships') && (
        <ConstellationGraph
          ai_output={output}
          memorial={memorial}
          contributor={contributors}
          page={constellationPage}
          width={800}
          height={800}
        />
      )}

      {currentSection.key === 'voices' && (
        <VoicesTab output={output} voices={output?.voices} />
      )}

      {currentSection.key === 'photos' && (
        <AllPhotosSection
          albums={output?.photos}
          onGenerate={onGenerate}
          generating={generating}
          canGenerate={canGenerate}
        />
      )}

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
            setLinksError('This memorial is not linked to your account. Go to Dashboard, open a memorial you created, then try Share again.');
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
    if (!url) { setCopyError('Link is not ready yet.'); return; }
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
            <button
              type="button"
              onClick={() => copyLink(type)}
              disabled={linksLoading || !url}
              className="shrink-0 rounded-full px-4 py-2 text-h4 transition-all ml-5 border-none disabled:opacity-50"
              style={{ backgroundColor: copied ? '#7D8C6A' : 'var(--color-r-btn)', color: copied ? '#FBF9F6' : 'var(--color-r-btn-text)' }}
            >
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

    // Load the invite token so "Upload Memories" can link the organizer
    // straight into the contributor flow as themselves.
    createInviteLink(id)
      .then((res) => {
        const token = res?.invite_link?.token ?? res?.token ?? null;
        setInviteToken(token);
      })
      .catch(() => { /* non-critical — button falls back to manage page */ });
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
          // Output is loaded; header refresh can wait for next page visit.
        }
      }
    }

    pollPendingOutput();
    const intervalId = window.setInterval(pollPendingOutput, OUTPUT_PENDING_POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(intervalId); };
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
    <main className="min-h-screen bg-r-bg text-r-text flex flex-col">

      {/* Nav spans full viewport width — matches design reference Header and ContributorNav */}
      <nav className="w-full flex items-center justify-between px-6 sm:px-[50px] py-6">
        <div className="flex items-center gap-2">
          <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
          <span className="text-r-text text-2xl leading-8 [font-family:var(--font-family-display)]">Remember</span>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-r-text transition-opacity hover:opacity-70"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z" fill="currentColor"/>
          </svg>
          <span className="text-base font-normal">Back</span>
        </Link>
      </nav>

      {/* Page content constrained to 960px */}
      <div className="flex-1 px-6 sm:px-[50px] pb-16">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8">

          <MemorialHeader memorial={memorial} inviteToken={inviteToken} onShare={() => setShowShare(true)} />
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
      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} memorialId={id} />}
    </main>
  );
}
