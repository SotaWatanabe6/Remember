// frontend/src/app/(viewer)/share/[shareToken]/page.jsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import MemorialContributionsPage from "@/components/output/contribution-list";
import MemorialContributionApproval from "@/components/output/contribution-awaiting";
import {  ChevronLeft, ChevronRight } from "lucide-react";
import ConstellationGraph from "@/components/output/constellation";
// ─── Tab bar (same as output page) ────────
import { getShareToken, getMemorialById } from '@/lib/api';
import { mockMemorials } from '@/data/mockMemorials.js';

// Cream background matching output page
const CREAM_BG = '#F0EAE2';

const TABS = ['Story', 'Constellation', 'Voices', 'All Photos'];

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
            active === tab
              ? 'bg-white text-neutral-950 shadow-auth'
              : 'text-slate-500 hover:text-neutral-950'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Memorial header ──────────────────────────────────────────────────────────
// Viewer only — no organizer buttons
// UPDATED: now accepts memorial prop directly (not output?.memorial)
// Ashwini confirmed: GET /share/:token does NOT return memorial data
// Memorial header data comes from separate GET /memorials/:id call

function MemorialHeader({ memorial }) {
  const birthYear = memorial?.date_of_birth
    ? new Date(memorial.date_of_birth).getFullYear()
    : null;
  const passingYear = memorial?.date_of_passing
    ? new Date(memorial.date_of_passing).getFullYear()
    : null;

  return (
    <div className="flex items-start gap-8">
      <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full bg-[#4a5568]">
        {memorial?.cover_photo_url ? (
          <img
            src={memorial.cover_photo_url}
            alt={memorial.subject_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[#4a5568]" />
        )}
      </div>
      <div className="flex-1 min-w-0 pt-2">
        <h1 className="text-[32px] font-medium text-neutral-950 leading-tight">
          {memorial?.subject_name || memorial?.deceased_name || 'Memorial'}
        </h1>
        {(birthYear || passingYear) && (
          <p className="mt-1 text-sm text-slate-400">
            {birthYear && passingYear
              ? `${birthYear} – ${passingYear}`
              : birthYear || passingYear}
          </p>
        )}
        {(memorial?.brief_biography || memorial?.short_description) && (
          <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-md">
            {memorial.brief_biography || memorial.short_description}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Placeholder tabs ─────────────────────────────────────────────────────────

function StoryTab({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-neutral-950 text-base font-medium">No story generated yet</p>
        <p className="text-slate-500 text-sm mt-1">
          The story will appear here once the memorial has been generated.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <p className="text-slate-400 text-sm">Story tab — built by Sungjun</p>
    </div>
  );
}

function ConstellationTab({ data }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-neutral-950 text-base font-medium">No constellation yet</p>
        <p className="text-slate-500 text-sm mt-1">
          The constellation will appear here once the memorial has been generated.
        </p>
      </div>
    );
  }
  return (
    <div className="py-4">
      <ConstellationGraph ai_output={{ constellation: data }} />
    </div>
  );
}


function VoicesTab({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-neutral-950 text-base font-medium">
          No voice recordings were submitted for this memorial
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Voice recordings will appear here once contributors have submitted.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <p className="text-slate-400 text-sm">Voices tab — built by Sungjun</p>
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
          {photo.url ? (
            <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-neutral-700 flex items-center justify-center">
              <span className="text-neutral-500 text-sm">No image</span>
            </div>
          )}
        </div>
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

// ─── All Photos tab ───────────────────────────────────────────────────────────

function AllPhotosTab({ albums }) {
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

  if (!albums || albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-neutral-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-neutral-950 text-base font-medium">No photos submitted</p>
        <p className="text-slate-500 text-sm mt-1">
          Photos will appear here once the memorial is generated.
        </p>
      </div>
    );
  }

  if (!openAlbum) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {albums.map((album, i) => (
          <button key={i} onClick={() => setOpenAlbum(album)} className="group text-left">
            <div className="aspect-square overflow-hidden rounded-2xl bg-neutral-100 relative">
              {album.cover_photo_url || album.photos?.[0]?.url ? (
                <img src={album.cover_photo_url || album.photos[0].url} alt={album.album_name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="h-full w-full bg-neutral-200 flex items-center justify-center">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-neutral-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                {album.photos?.length || 0}
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-neutral-950 leading-snug">{album.album_name}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setOpenAlbum(null)}
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-neutral-950 transition-colors">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All albums
      </button>
      <h2 className="text-xl font-medium text-neutral-950 mb-1">{openAlbum.album_name}</h2>
      <p className="text-sm text-slate-500 mb-6">{openAlbum.photos?.length || 0} photos</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {openAlbum.photos?.map((photo, index) => (
          <button key={photo.id} onClick={() => openLightbox(photo, index)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
            {photo.url
              ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              : <div className="h-full w-full bg-neutral-200" />
            }
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end p-2 opacity-0 group-hover:opacity-100">
              <div className="w-full">
                {photo.caption && <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>}
                {photo.contributor_name && <p className="text-white text-xs font-medium truncate">{photo.contributor_name}</p>}
                {photo.taken_at && <p className="text-white/70 text-xs">{new Date(photo.taken_at).getFullYear()}</p>}
              </div>
            </div>
          </button>
        ))}
      </div>
      {lightboxPhoto && (
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)}
          onPrev={prevPhoto} onNext={nextPhoto} />
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-start gap-8">
        <div className="h-36 w-36 shrink-0 rounded-full bg-neutral-100" />
        <div className="flex-1 pt-2 space-y-3">
          <div className="h-8 w-48 rounded bg-neutral-100" />
          <div className="h-4 w-24 rounded bg-neutral-100" />
          <div className="h-4 w-64 rounded bg-neutral-100" />
        </div>
      </div>
      <div className="h-10 rounded-xl bg-neutral-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <div className="aspect-square rounded-2xl bg-neutral-100" />
            <div className="mt-2 h-3 w-3/4 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── normalizePhotos ──────────────────────────────────────────────────────────
// Handles both real backend shape and mock shape:
// Real: { albums: [{ name, photos, photo_count, cover_photo_url }] }
// Mock: [{ album_name, photos, cover_photo_url }]

function normalizePhotos(photos) {
  if (!photos) return [];
  // Real backend returns { albums: [...] }
  if (photos.albums) {
    return photos.albums.map((a) => ({
      album_name: a.name,
      cover_photo_url: a.cover_photo_url || null,
      photos: (a.photos || []).map((p) => ({
        id: p.id,
        url: p.url || null,
        caption: p.caption || null,
        taken_at: p.taken_at || null,
        contributor_name: p.contributor_name || null,
      })),
    }));
  }
  // Mock returns flat array — already correct shape
  return photos;
}

// ─── Invalid token screen ─────────────────────────────────────────────────────

function InvalidToken({ message }) {
  return (
    <main className="min-h-screen bg-white px-6 py-10 sm:px-[50px]">
      <div className="mx-auto max-w-[680px]">
        <nav className="flex h-10 items-center">
          <span className="text-2xl leading-8 text-neutral-950">Remember</span>
        </nav>
        <div className="mt-24 flex flex-col items-center text-center">
          <div className="relative w-20 h-14 mx-auto mb-8">
            <div className="absolute left-0 top-0 w-14 h-14 rounded-full bg-neutral-200" />
            <div className="absolute right-0 top-2 w-10 h-10 rounded-full bg-neutral-100" />
          </div>
          <h2 className="text-xl font-medium text-neutral-950 mb-2">
            This link is no longer available
          </h2>
          <p className="text-slate-500 text-sm max-w-xs leading-relaxed">{message}</p>
        </div>
      </div>
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SharePage() {
  const { shareToken } = useParams();
  const [activeTab, setActiveTab] = useState('Story');
  const [output, setOutput] = useState(null);
  const [memorial, setMemorial] = useState(null); // ← separate state for memorial header
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // Step 1 — fetch the four output tabs
        const data = await getShareToken(shareToken);
        setOutput(data);

        // Step 2 — fetch memorial header separately
        // CONFIRMED by Ashwini: GET /share/:token does NOT return memorial data
        // GET /memorials/:id returns subject_name, dates, cover_photo_url
        // Day 9: get memorial ID from the share token lookup
        // Step 2 — fetch memorial header using getMemorialById (real fetch with fallback)
        // Real memorial ID confirmed from Supabase invite_links table
        try {
          const memorialData = await getMemorialById('7638e909-d995-437c-b01e-b913854009a7');
          setMemorial(memorialData || mockMemorials[0]);
        } catch {
          setMemorial(mockMemorials[0]);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shareToken]);

  // Match output page cream background
  useEffect(() => {
    const prevBody = document.body.style.backgroundColor;
    const prevHtml = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = CREAM_BG;
    document.documentElement.style.backgroundColor = CREAM_BG;
    return () => {
      document.body.style.backgroundColor = prevBody;
      document.documentElement.style.backgroundColor = prevHtml;
    };
  }, []);

  if (error) return <InvalidToken message={error} />;

  return (
    <main className="min-h-screen w-full px-6 py-10 text-neutral-950 sm:px-[50px]"
      style={{ backgroundColor: CREAM_BG }}>
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8">

        {/* Nav — viewer only */}
        <nav className="flex h-10 items-center">
          <span className="text-2xl leading-8 text-neutral-950">Remember</span>
        </nav>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Memorial header — fetched separately from GET /memorials/:id */}
            <MemorialHeader memorial={memorial} />

            {/* Tab bar */}
            <TabBar active={activeTab} onChange={setActiveTab} />

            {/* Tab content */}
            <div>
              {activeTab === 'Story' && <StoryTab data={output?.story} />}
              {activeTab === 'Constellation' && <ConstellationTab data={output?.constellation} />}
              {activeTab === 'Voices' && <VoicesTab data={output?.voices} />}
              {activeTab === 'All Photos' && <AllPhotosTab albums={normalizePhotos(output?.photos)} />}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
