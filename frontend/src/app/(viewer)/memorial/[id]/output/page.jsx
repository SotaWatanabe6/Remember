// frontend/src/app/(viewer)/memorial/[id]/output/page.jsx

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMemorialOutput } from '@/lib/api';

// ─── Memorial Header ─────────

function MemorialHeader({ memorial, onShare }) {
  return (
    <div className="flex items-start gap-8">
      <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full bg-[#4a5568]">
        {memorial?.cover_photo_url ? (
          <img src={memorial.cover_photo_url} alt={memorial.subject_name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[#4a5568]" />
        )}
      </div>
      <div className="flex-1 min-w-0 pt-2">
        <h1 className="text-[32px] font-medium text-neutral-950 leading-tight">
          {memorial?.subject_name || 'John Smith'}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {memorial?.date_of_birth && new Date(memorial.date_of_birth).getFullYear()}
          {memorial?.date_of_birth && memorial?.date_of_passing && ' - '}
          {memorial?.date_of_passing && new Date(memorial.date_of_passing).getFullYear()}
        </p>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-md">
          {memorial?.bio || "This paragraph can be an example of explaining who John is. It's intended to be a part of John's profile."}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        <Link href={`/memorial/${memorial?.id}/output`} className="rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white text-center hover:opacity-80 transition-opacity">
          View page
        </Link>
        <button onClick={onShare} className="rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">
          Share
        </button>
        <button className="rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">
          Settings
        </button>
      </div>
    </div>
  );
}

// ─── Tab bar ─────────

const MAIN_TABS = ['Archive', 'Contributions', 'Outputs'];

function TabBar({ active, onChange }) {
  return (
    <div className="flex border-b border-neutral-200">
      {MAIN_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-8 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab
              ? 'border-neutral-950 text-neutral-950 font-semibold'
              : 'border-transparent text-slate-500 hover:text-neutral-950'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Collapsible section ─────────

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

// ─── Archive Tab ─────────

function ArchiveTab() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center gap-3">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="text-neutral-950 shrink-0">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
        <input type="text" placeholder="Show me happy memories"
          className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neutral-200" />
        <button className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">Filter</button>
        <button className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity">Sort</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="aspect-[4/3] rounded-xl bg-neutral-200" />)}
      </div>
    </div>
  );
}

// ─── Contributions Tab ─────────

function ContributionsTab() {
  return (
    <div className="pt-6">
      <div className="rounded-2xl border border-neutral-200 p-6 flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">Contributions tab — built by Mendrika</p>
      </div>
    </div>
  );
}

// ─── Lightbox ─────────

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
            : <div className="h-full w-full bg-neutral-700 flex items-center justify-center">
                <span className="text-neutral-500 text-sm">No image</span>
              </div>
          }
        </div>
        {/* Caption + contributor + year */}
        <div className="mt-3 px-1">
          {photo.caption && <p className="text-white text-sm font-medium">{photo.caption}</p>}
          <p className="text-neutral-400 text-xs mt-0.5">
            {photo.contributor_name}
            {photo.taken_at && ` · ${new Date(photo.taken_at).getFullYear()}`}
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

// ─── All Photos Section ─────────

function AllPhotosSection({ albums }) {
  const [openAlbum, setOpenAlbum] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const currentAlbumPhotos = openAlbum?.photos || [];

  function openLightbox(photo, index) { setLightboxPhoto(photo); setLightboxIndex(index); }
  function prevPhoto() {
    const i = (lightboxIndex - 1 + currentAlbumPhotos.length) % currentAlbumPhotos.length;
    setLightboxIndex(i); setLightboxPhoto(currentAlbumPhotos[i]);
  }
  function nextPhoto() {
    const i = (lightboxIndex + 1) % currentAlbumPhotos.length;
    setLightboxIndex(i); setLightboxPhoto(currentAlbumPhotos[i]);
  }

  // ── PRIORITY 3: Empty state — no photos submitted yet ──
  if (!albums || albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-neutral-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-neutral-950 text-base font-medium">No photos yet</p>
        <p className="text-slate-500 text-sm mt-1 max-w-xs">
          Photos will appear here once contributors have submitted and the memorial has been generated.
        </p>
      </div>
    );
  }

  // Album grid
  if (!openAlbum) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Albums</p>
          <div className="flex items-center gap-2 text-slate-400">
            <button className="p-1 hover:text-neutral-950">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs">1/{albums.length}</span>
            <button className="p-1 hover:text-neutral-950">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {albums.map((album, i) => (
            <button
              key={i}
              onClick={() => setOpenAlbum(openAlbum?.album_name === album.album_name ? null : album)}
              className={`group rounded-2xl border p-4 text-left transition-colors ${
                openAlbum?.album_name === album.album_name
                  ? 'border-neutral-950 bg-neutral-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100 mb-3">
                {album.photos?.[0]?.url ? (
                  <img src={album.photos[0].url} alt={album.album_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-neutral-200 flex items-center justify-center">
                    <span className="text-neutral-400 text-xs text-center px-2">{album.album_name}</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-neutral-950 leading-snug">{album.album_name}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Individual album photos
  return (
    <div>
      <button
        onClick={() => setOpenAlbum(null)}
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-neutral-950 transition-colors"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All albums
      </button>
      <h2 className="text-xl font-medium text-neutral-950 mb-1">{openAlbum.album_name}</h2>
      <p className="text-sm text-slate-500 mb-6">{openAlbum.photos?.length || 0} photos</p>
      <div className="grid grid-cols-3 gap-3">
        {openAlbum.photos?.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(photo, index)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-100"
          >
            {photo.url
              ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              : <div className="h-full w-full bg-neutral-200" />
            }
            {/* STEP 1: Updated hover — caption + contributor name + year */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end p-2 opacity-0 group-hover:opacity-100">
              <div className="w-full">
                {photo.caption && (
                  <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>
                )}
                {photo.contributor_name && (
                  <p className="text-white text-xs font-medium truncate">{photo.contributor_name}</p>
                )}
                {photo.taken_at && (
                  <p className="text-white/70 text-xs">{new Date(photo.taken_at).getFullYear()}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
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

// ─── PRIORITY 3: Pre-generation empty state for Outputs tab ─────────

function PreGenerationEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-neutral-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <p className="text-neutral-950 text-base font-medium">Generation hasn't run yet</p>
      <p className="text-slate-500 text-sm mt-1 max-w-xs leading-relaxed">
        Once you have contributions, click Generate to create the Story, Constellation, Voices, and Photos.
      </p>
    </div>
  );
}

// ─── Outputs Tab ─────────

function OutputsTab({ output }) {
  // PRIORITY 3: Show pre-generation empty state if no output yet
  if (!output) {
    return (
      <div className="pt-6">
        <PreGenerationEmpty />
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-neutral-100 pt-4">
      <CollapsibleSection title="Story">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6">
          {!output?.story || output.story.length === 0 ? (
            <p className="text-sm text-neutral-950 font-medium">No story generated yet</p>
          ) : (
            <p className="text-sm text-slate-400">Story — built by Sungjun</p>
          )}
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Constellation">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6 aspect-video flex items-center justify-center">
          <p className="text-sm text-slate-400">Constellation — built by Mendrika</p>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Voices">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6">
          {!output?.voices || output.voices.length === 0 ? (
            <p className="text-sm text-neutral-950 font-medium">No voice recordings were submitted for this memorial</p>
          ) : (
            <p className="text-sm text-slate-400">Voices — built by Sungjun</p>
          )}
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="All Photos" defaultOpen={true}>
        <AllPhotosSection albums={output?.photos} />
      </CollapsibleSection>
    </div>
  );
}

// ─── Share Modal ─────────

function ShareModal({ onClose, memorialId }) {
  const [copiedContributor, setCopiedContributor] = useState(false);
  const [copiedViewer, setCopiedViewer] = useState(false);

  async function copyLink(url, type) {
    await navigator.clipboard.writeText(url);
    if (type === 'contributor') {
      setCopiedContributor(true);
      setTimeout(() => setCopiedContributor(false), 2000);
    } else {
      setCopiedViewer(true);
      setTimeout(() => setCopiedViewer(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#dce4f0] p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onClose} className="text-[#4a5568] hover:text-neutral-950">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-medium text-[#2d3748]">Share</h2>
        </div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-[#2d3748]">Invite Contributors</p>
            <p className="text-xs text-[#4a5568] mt-0.5">For friends and family to share their memories:</p>
          </div>
          <button
            onClick={() => copyLink('mock-contributor-url', 'contributor')}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
              copiedContributor ? 'bg-[#4a6fa5] text-white' : 'bg-white/70 text-[#2d3748] hover:bg-white'
            }`}
          >
            {copiedContributor ? 'Copied!' : 'Copy Link 🔗'}
          </button>
        </div>
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-[#2d3748]">Invite Viewers</p>
            <p className="text-xs text-[#4a5568] mt-0.5">For anyone to view this memorial:</p>
          </div>
          <button
            onClick={() => copyLink('mock-viewer-url', 'viewer')}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
              copiedViewer ? 'bg-[#4a6fa5] text-white' : 'bg-white/70 text-[#2d3748] hover:bg-white'
            }`}
          >
            {copiedViewer ? 'Copied!' : 'Copy Link 🔗'}
          </button>
        </div>
        <div className="flex justify-center gap-6">
          {[['Message', 'M'], ['Email', 'E'], ['Instagram', 'I']].map(([label]) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center hover:bg-white/70 transition-colors cursor-pointer">
                <span className="text-xs text-[#2d3748]">{label[0]}</span>
              </div>
              <span className="text-xs text-[#2d3748] font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PRIORITY 4: Error state ─────────

function OutputError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-red-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-neutral-950 text-base font-medium">Unable to load memorial</p>
      <p className="text-slate-500 text-sm mt-1 max-w-xs">Something went wrong loading this memorial. Please try again.</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Page ─────────

export default function MemorialOutputPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Outputs');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);

  const memorial = {
    id,
    subject_name: 'John Smith',
    cover_photo_url: null,
    date_of_birth: '1943-03-15',
    date_of_passing: '2024-01-10',
    bio: "This paragraph can be an example of explaining who John is. It's intended to be a part of John's profile.",
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMemorialOutput(id);
      setOutput(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
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
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-950" />
            </div>
          ) : error ? (
            // PRIORITY 4: Error state with retry button
            <OutputError onRetry={load} />
          ) : (
            <>
              {activeTab === 'Archive' && <ArchiveTab />}
              {activeTab === 'Contributions' && <ContributionsTab />}
              {activeTab === 'Outputs' && <OutputsTab output={output} />}
            </>
          )}
        </div>

      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} memorialId={id} />}
    </main>
  );
}
