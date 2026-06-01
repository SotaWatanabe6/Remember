// frontend/src/app/(organizer)/memorial/[id]/manage/page.jsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMemorialOutput, getContributors, getMemorial,createShareLink,createInviteLink } from '@/lib/api';
import { mockMemorials } from '@/data/mockMemorials.js';
import ConstellationGraph from "@/components/output/constellation";
import MemorialContributionsPage from "@/components/output/contribution-list";
import MemorialContributionApproval from "@/components/output/contribution-awaiting";
import ProcessingTextSequence from "@/components/dashboard/ProcessingTextSequence";
import {  ChevronLeft,
  ChevronRight } from "lucide-react";

// ─── Memorial Header ──────────────────────────────────────────────────────────

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

// ─── Tab bar ──────────────────────────────────────────────────────────────────

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

// ─── Archive Tab ──────────────────────────────────────────────────────────────

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

// ─── Contributions Tab ────────────────────────────────────────────────────────

function ContributionsTab({contributorslist}) {
  const [value, setValue] = useState("contributors");
  console.log(contributorslist);
  const contributors = contributorslist.filter(obj => obj.status == 'submitted');
  const awaitinglist = contributorslist.filter(obj => obj.status == 'in_progress') 
  // const submissions = [
  //   {
  //     id: 1,
  //     user: "Jane Smith",
  //     contribution: "10 contributions",
  //     summary:
  //       "This can be an AI generated summary of the contribution, either mentioning surfaced themes or flagged submissions that may be sensitive or inappropriate.",
  //   },
  //   {
  //     id: 2,
  //     user: "Michael Johnson",
  //     contribution: "7 contributions",
  //     summary:
  //       "AI generated summaries can highlight themes, relationships, and potentially sensitive submissions for moderators to review quickly.",
  //   },
  //   {
  //     id: 3,
  //     user: "Emily Davis",
  //     contribution: "4 contributions",
  //     summary:
  //       "This summary may contain surfaced insights generated automatically from uploaded stories, photos, and audio.",
  //   },
  //   {
  //     id: 4,
  //     user: "Chris Brown",
  //     contribution: "15 contributions",
  //     summary:
  //       "AI can help identify emotional themes and summarize media content for easier moderation workflows.",
  //   },
  //   {
  //     id: 5,
  //     user: "Sarah Wilson",
  //     contribution: "3 contributions",
  //     summary:
  //       "Potentially sensitive content or highlighted themes may appear here after automatic AI analysis.",
  //   },
  // ];

  const handleChange = (e) => {
    setValue(e.target.value);
  };
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = awaitinglist[currentIndex];

  const handlePrev = () => {
      setCurrentIndex((prev) =>
      prev === 0 ? awaitinglist.length - 1 : prev - 1
      );
  };

  const handleNext = () => {
      setCurrentIndex((prev) =>
      prev === awaitinglist.length - 1 ? 0 : prev + 1
      );
  };      
  return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between">      
          <div className="flex items-center gap-3">
            <select onChange={handleChange} value={value} className="border border-gray-300 rounded-md px-4 py-2 text-sm outline-none">
              <option value="contributors">Contributors</option>
              <option value="awaiting">Awaiting Approval</option>
            </select>
          </div>
          {
            value=="awaiting" ? (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <button
                onClick={handlePrev}
                className="rounded p-1 transition hover:bg-gray-200"
              >
                <ChevronLeft size={18} />
              </button>

              <span>
                {currentIndex + 1}/{awaitinglist.length}
              </span>

              <button
                onClick={handleNext}
                className="rounded p-1 transition hover:bg-gray-200"
              >
                <ChevronRight size={18} />
              </button>
            </div>
                      
            ): null
          }
        </div>    
        {
          value === "contributors" ? (
            <MemorialContributionsPage contributors={contributors} />
          ) : value === "awaiting" ? (
            <MemorialContributionApproval contributors={current} gallery={awaitinglist.length}/>
          ) : null
        }
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

// ─── All Photos Section ───────────────────────────────────────────────────────

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
          {albums?.albums?.map((album, i) => (
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

// ─── PRIORITY 3: Pre-generation empty state for Outputs tab ──────────────────


function PreGenerationEmpty({
  canGenerate,
  disabledMessage,
  generationError,
  generationJob,
  generating,
  onGenerate,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-neutral-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <p className="text-neutral-950 text-base font-medium">Generation hasn&apos;t run yet</p>
      <p className="text-slate-500 text-sm mt-1 max-w-xs leading-relaxed">
        Once you have contributions, click Generate to create the Story, Constellation, Voices, and Photos.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || generating}
        className="mt-6 flex h-[50px] w-[207px] items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {generating ? "Generating..." : "Generate"}
      </button>
      {generating && (
        <div className="mt-4 w-full max-w-xs" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-950 transition-all duration-300"
              style={{ width: `${Math.max(10, generationJob?.progress ?? 10)}%` }}
            />
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
        <p className="mt-3 max-w-xs text-sm text-red-600" role="alert">
          {generationError}
        </p>
      )}
    </div>
  );
}

// ─── Outputs Tab ──────────────────────────────────────────────────────────────

function OutputsTab({ 
  canGenerate,
  disabledMessage,
  generationError,
  generationJob,
  generating,
  onGenerate,
  output,
  loading,
  error,
  onRetry  
 }) {
  // PRIORITY 3: Show pre-generation empty state if no output yet


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
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6">
          <p className="text-sm text-slate-400">Story — built by Sungjun</p>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Constellation">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6 aspect-video flex items-center justify-center">
          <ConstellationGraph ai_output={output} width={800} height={800} />
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Voices">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6">
          <p className="text-sm text-slate-400">Voices — built by Sungjun</p>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="All Photos" defaultOpen={true}>
        <AllPhotosSection albums={output?.photos} />
      </CollapsibleSection>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ onClose, memorialId }) {
  const [copiedContributor, setCopiedContributor] = useState(false);
  const [copiedViewer, setCopiedViewer] = useState(false);

  async function copyLink(url, type) {
    if (type === 'contributor') {
      const contributor_link=await createInviteLink(memorialId);
      console.log(contributor_link);
      await navigator.clipboard.writeText(contributor_link.invite_link.url);
      setCopiedContributor(true);
      setTimeout(() => setCopiedContributor(false), 2000);
    } else {
      // const viewer_link=process.env.NEXT_PUBLIC_APP_URL+"/memorial/"+memorialId+"/output";
      const viewer_link=await createShareLink(memorialId);
      console.log(viewer_link);
      await navigator.clipboard.writeText(viewer_link.share_link.url);
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

// ─── PRIORITY 4: Error state ──────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemorialOutputPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Outputs');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const memorialId = id;
  const [contributors, setContributors] = useState([]);
  const [contributorsLoading, setContributorsLoading] = useState(true);
  const [contributorsError, setContributorsError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generationJob, setGenerationJob] = useState(null);

  // Read from mockMemorials.js — single source of truth for mock data
  // Day 9: replace with real fetch from GET /memorials/:id

  const loadContributors = useCallback(async () => {
    if (!memorialId) return;

    setContributorsLoading(true);
    setContributorsError(null);
    try {
      const contributor = await getMemorialContributors(memorialId, await getCurrentAuthToken());
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
      const token = await getCurrentAuthToken();
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

    const token = await getCurrentAuthToken();

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
          throw new Error("Generation is taking longer than expected. Please try refreshing the outputs shortly.");
        }
      }

      await loadOutput({ fallbackToMock: process.env.NODE_ENV !== 'production' });
    } catch (err) {
      if (isLocalDevAuthError(err)) {
        await loadOutput({ fallbackToMock: true });
        setGenerationError(null);
        return;
      }

      setGenerationError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [generating, loadOutput, memorialId]);

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

  useEffect(() => {
    queueMicrotask(loadContributors);
  }, [loadContributors]);

  useEffect(() => {
    queueMicrotask(loadOutput);
  }, [loadOutput]);
  
  useEffect(() => {    
    if (!memorialId) return;
    
    const loadMemorial = async () => {        
      setLoading(true);
      setError(null);
      try {
        // const token = JSON.parse(localStorage.getItem("sb-tbpdhybqbjucoxdizlgw-auth-token"));
        // if (typeof token === "undefined") {
        //   console.log("Token retrieved:", token);
        //   return ;
        // }
        const contributor= await getContributors(memorialId);
        setContributors(contributor.contributors);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }      
    }
    loadMemorial();

  }, [memorialId]);  

  // Read from mockMemorials.js — single source of truth for mock data
  // Day 9: replace with real fetch from GET /memorials/:id
  const [memorial, setMemorial] = useState(null);

  useEffect(() => {
    if (!id) return;
    getMemorial(id).then((data) => {
      const m = data?.memorial ?? data;
      if (!m) return;
      setMemorial({
        id: m.id,
        subject_name: m.subject_name || m.deceased_name,
        cover_photo_url: m.cover_photo_url || m.profile_photo_url || null,
        date_of_birth: m.date_of_birth || m.birth_date || null,
        date_of_passing: m.date_of_passing || m.death_date || null,
        bio: m.brief_biography || m.short_description || null,
      });
    }).catch(() => {
      const mockData = mockMemorials.find((m) => m.id === id) ?? mockMemorials[0];
      setMemorial({
        id: mockData.id,
        subject_name: mockData.subject_name || mockData.deceased_name,
        cover_photo_url: mockData.cover_photo_url || mockData.profile_photo_url || null,
        date_of_birth: mockData.date_of_birth || mockData.birth_date || null,
        date_of_passing: mockData.date_of_passing || mockData.death_date || null,
        bio: mockData.brief_biography || mockData.short_description || null,
      });
    });
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMemorialOutput(id);  // ← no token argument
      setOutput(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, load]);

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
              {activeTab === 'Contributions' && <ContributionsTab contributorslist={contributors} />}
              {activeTab === 'Outputs' && <OutputsTab 
                output={output}
                canGenerate={canGenerate}
                disabledMessage={generationDisabledMessage}
                generationError={generationError}
                generationJob={generationJob}
                generating={generating}
                onGenerate={handleGenerate}
                loading={outputLoading}
                error={outputError}
                onRetry={loadOutput}                
              />}
            </>
          )}
        </div>

      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} memorialId={id} />}
    </main>
  );
}
