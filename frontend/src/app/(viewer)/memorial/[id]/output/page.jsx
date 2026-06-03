'use client';

// frontend/src/app/(viewer)/memorial/[id]/output/page.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMemorialOutput, getMemorialById, getContributors, createInviteLink, createShareLink } from '@/lib/api';
import ConstellationGraph from "@/components/output/constellation";
import MemorialContributionsPage from "@/components/output/contribution-list";
import MemorialContributionApproval from "@/components/output/contribution-awaiting";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mockMemorials } from '@/data/mockMemorials.js';
import StorySlideshow from '@/components/output/StorySlideshow';

// ─── Relationship color ───────────────────────────────────────────────────────

function relationshipColor(type) {
  const t = (type || '').toLowerCase();
  if (t === 'family') return 'var(--color-r-family)';
  if (t === 'friend') return 'var(--color-r-friend)';
  if (t === 'colleague') return 'var(--color-r-colleague)';
  return 'var(--color-r-muted)';
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const NAV_TABS = ['Slideshow', 'Constellations', 'Voices', 'Photo Archive'];

function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex bg-r-bg" style={{ borderTop: '1px solid var(--color-r-border)' }}>
      {NAV_TABS.map((tab) => (
        <button key={tab} onClick={() => onChange(tab)} className="flex-1 py-4 text-h4 transition-colors"
          style={{
            fontWeight: active === tab ? 500 : 400,
            color: active === tab ? 'var(--color-r-text)' : 'var(--color-r-muted)',
            borderTop: `2px solid ${active === tab ? 'var(--color-r-text)' : 'transparent'}`,
            borderRight: 'none', borderBottom: 'none', borderLeft: 'none',
            marginTop: '-1px', backgroundColor: 'transparent', cursor: 'pointer',
          }}>
          {tab}
        </button>
      ))}
    </nav>
  );
}

// ─── Slideshow — Sungjun's StorySlideshow component ──────────────────────────

function SlideshowSection({ output }) {
  if (!output?.story || output.story.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-h3 text-r-text">Slideshow</p>
        <p className="mt-2 max-w-xs text-body-2 text-r-muted">The memorial slideshow will appear here once generated.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[960px]">
      <StorySlideshow output={output} story={output?.story} />
    </div>
  );
}

// ─── Constellations — Mendrika's component ────────────────────────────────────

function ConstellationsSection({ output, memorial,contributor }) {
  if (!output?.constellation) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-h3 text-r-text">Constellations</p>
        <p className="mt-2 max-w-xs text-body-2 text-r-muted">Constellation will appear here once the memorial has been generated.</p>
      </div>
    );
  } 
  return <div className="py-4"><ConstellationGraph ai_output={output} memorial={memorial} contributor={contributor} width={1250} height={800}/></div>;
}

// ─── Waveform Player ──────────────────────────────────────────────────────────

function WaveformPlayer({ audioUrl, color }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
  if (!containerRef.current) return;
  let mounted = true;

  import('wavesurfer.js').then((WaveSurfer) => {
    if (!mounted) return;
    if (wavesurferRef.current) wavesurferRef.current.destroy();
    const ws = WaveSurfer.default.create({
      container: containerRef.current,
      waveColor: color || 'var(--color-r-colleague)',
      progressColor: 'var(--color-r-text)',
      cursorColor: 'transparent',
      barWidth: 3, barGap: 2, barRadius: 3, height: 48,
      normalize: true, interact: true, backend: 'WebAudio',
    });
    if (audioUrl) {
      ws.load(audioUrl);
      ws.on('ready', () => { setReady(true); setDuration(ws.getDuration()); });
      ws.on('timeupdate', (time) => setCurrentTime(time));
      ws.on('finish', () => setPlaying(false));
    } else { setReady(false); }
    wavesurferRef.current = ws;
  }).catch(() => { if (mounted) setReady(false); });

  return () => {
    mounted = false;
    if (wavesurferRef.current) { wavesurferRef.current.destroy(); wavesurferRef.current = null; }
  };
}, [audioUrl, color]);

  function togglePlay() {
    if (!wavesurferRef.current || !ready) return;
    wavesurferRef.current.playPause();
    setPlaying(!playing);
  }

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    return `${Math.floor(secs / 60)}:${Math.floor(secs % 60).toString().padStart(2, '0')}`;
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={togglePlay}
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-r-colleague)' }} aria-label={playing ? 'Pause' : 'Play'}>
        {playing
          ? <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          : <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        {audioUrl ? (
          <div ref={containerRef} className="w-full" />
        ) : (
          <div className="flex items-center gap-0.5 h-12">
            {[...Array(50)].map((_, i) => (
              <div key={i} className="flex-1 rounded-full transition-all"
                style={{ backgroundColor: 'var(--color-r-colleague)', opacity: playing ? 0.8 : 0.4, height: `${16 + Math.sin(i * 0.6) * 12 + Math.cos(i * 1.2) * 8}px` }} />
            ))}
          </div>
        )}
        {(ready || audioUrl) && (
          <div className="flex justify-between text-caption text-r-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Contributions section ────────────────────────────────────────────────────

function ContributionsSection({ contributorslist }) {
  const [value, setValue] = useState("contributors");
  // const submissions = [
  //   { id: 1, user: "Jane Smith", contribution: "10 contributions", summary: "This can be an AI generated summary of the contribution, either mentioning surfaced themes or flagged submissions that may be sensitive or inappropriate." },
  //   { id: 2, user: "Michael Johnson", contribution: "7 contributions", summary: "AI generated summaries can highlight themes, relationships, and potentially sensitive submissions for moderators to review quickly." },
  //   { id: 3, user: "Emily Davis", contribution: "4 contributions", summary: "This summary may contain surfaced insights generated automatically from uploaded stories, photos, and audio." },
  //   { id: 4, user: "Chris Brown", contribution: "15 contributions", summary: "AI can help identify emotional themes and summarize media content for easier moderation workflows." },
  //   { id: 5, user: "Sarah Wilson", contribution: "3 contributions", summary: "Potentially sensitive content or highlighted themes may appear here after automatic AI analysis." },
  // ];
  const submissions = contributorslist.filter(c => c.status === "submitted");
  const nonSubmissions = contributorslist.filter(c => c.status !== "submitted");
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = submissions[currentIndex];
  const handlePrev = () => setCurrentIndex((prev) => prev === 0 ? submissions.length - 1 : prev - 1);
  const handleNext = () => setCurrentIndex((prev) => prev === submissions.length - 1 ? 0 : prev + 1);
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <select onChange={(e) => setValue(e.target.value)} value={value} className="border border-gray-300 rounded-md px-4 py-2 text-sm outline-none">
          <option value="contributors">Contributors</option>
          <option value="awaiting">Awaiting Approval</option>
        </select>
        {value === "awaiting" && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <button onClick={handlePrev} className="rounded p-1 transition hover:bg-gray-200"><ChevronLeft size={18} /></button>
            <span>{currentIndex + 1}/{submissions.length}</span>
            <button onClick={handleNext} className="rounded p-1 transition hover:bg-gray-200"><ChevronRight size={18} /></button>
          </div>
        )}
      </div>
      {value === "contributors" ? <MemorialContributionsPage contributors={nonSubmissions} /> : value === "awaiting" ? <MemorialContributionApproval contributors={current} /> : null}
    </div>
  );
}

// ─── Voices section ───────────────────────────────────────────────────────────

function VoicesSection({ voices }) {
  const [selected, setSelected] = useState(0);
  const current = voices?.[selected];

  if (!voices || voices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-body-2 font-medium text-r-text">No voice recordings were submitted for this memorial</p>
        <p className="mt-1 text-body-2 text-r-muted">Voice recordings will appear here once contributors have submitted.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <h2 className="text-h1 text-r-text mb-6">Voices</h2>
      <div className="flex gap-8">
        <div className="w-48 shrink-0 flex flex-col gap-0">
          <div className="flex items-center gap-2 mb-4">
            <select className="text-caption bg-transparent appearance-none rounded-lg px-3 py-1.5 pr-8 cursor-pointer focus:outline-none text-r-text"
              style={{ border: '1px solid var(--color-r-border)' }}>
              <option>Sort</option>
              <option>By date</option>
              <option>By name</option>
            </select>
          </div>
          {voices.map((v, i) => (
            <button key={v.id} onClick={() => setSelected(i)} className="text-left py-3 transition-colors text-h4"
              style={{
                fontWeight: i === selected ? 500 : 400,
                color: i === selected ? 'var(--color-r-text)' : 'var(--color-r-muted)',
                borderBottom: `1px solid ${i === selected ? 'var(--color-r-text)' : 'var(--color-r-border)'}`,
              }}>
              {v.contributor_title}
            </button>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-4">
          {current?.photo_url ? (
            <img src={current.photo_url} alt="" className="w-full aspect-video rounded-2xl object-cover" />
          ) : (
            <div className="w-full aspect-video rounded-2xl flex items-center justify-center bg-r-card">
              <span className="text-body-2 text-r-muted">No photo linked</span>
            </div>
          )}
          {current && <WaveformPlayer key={current.id} audioUrl={current.audio_url || null} color="var(--color-r-colleague)" />}
          {current?.transcript_text && (
            <p className="text-body-2 text-r-muted" style={{ fontStyle: 'italic', lineHeight: 1.6 }}>&quot;{current.transcript_text}&quot;</p>
          )}
          {current?.ai_category && (
            <span className="inline-block self-start rounded-full px-4 py-1.5 text-body-2 text-r-muted" style={{ border: '1px solid var(--color-r-border)' }}>
              {current.ai_category}
            </span>
          )}
          {current && <p className="text-body-2 font-medium text-r-text">Submitted by {current.contributor_name || 'Contributor'}</p>}
        </div>
      </div>
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
          {photo.url ? <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-neutral-700 flex items-center justify-center"><span className="text-neutral-500 text-sm">No image</span></div>}
        </div>
        <div className="mt-3 px-1">
          {photo.caption && <p className="text-white text-sm font-medium">{photo.caption}</p>}
          <p className="text-neutral-400 text-xs mt-0.5">{photo.contributor_name}{photo.taken_at && ` · ${new Date(photo.taken_at).getFullYear()}`}</p>
        </div>
        <button onClick={onPrev} className="absolute left-[-48px] top-1/2 -translate-y-1/2 p-2 text-white hover:text-neutral-300">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button onClick={onNext} className="absolute right-[-48px] top-1/2 -translate-y-1/2 p-2 text-white hover:text-neutral-300">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
        <button onClick={onClose} className="absolute -top-10 right-0 p-2 text-white hover:text-neutral-300">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Album view ───────────────────────────────────────────────────────────────

function AlbumView({ albums }) {
  const [openAlbum, setOpenAlbum] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const currentPhotos = openAlbum?.photos || [];

  function openLightbox(photo, i) { setLightboxPhoto(photo); setLightboxIndex(i); }
  function prevPhoto() { const i = (lightboxIndex - 1 + currentPhotos.length) % currentPhotos.length; setLightboxIndex(i); setLightboxPhoto(currentPhotos[i]); }
  function nextPhoto() { const i = (lightboxIndex + 1) % currentPhotos.length; setLightboxIndex(i); setLightboxPhoto(currentPhotos[i]); }

  if (!albums || albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4 bg-r-card">
          <svg width="24" height="24" fill="none" stroke="var(--color-r-muted)" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-body-2 font-medium text-r-text">No photos yet</p>
        <p className="mt-1 max-w-xs text-body-2 text-r-muted">Photos will appear here once contributors have submitted and the memorial has been generated.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-caption font-medium text-r-muted">Albums</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {albums.map((album, i) => (
          <button key={i}
            onClick={() => setOpenAlbum(openAlbum?.album_name === album.album_name ? null : album)}
            className="group text-left rounded-2xl overflow-hidden transition-all bg-r-card"
            style={{ border: `1px solid ${openAlbum?.album_name === album.album_name ? 'var(--color-r-text)' : 'var(--color-r-border)'}` }}>
            <div className="aspect-[4/3] overflow-hidden">
              {album.photos?.[0]?.url
                ? <img src={album.photos[0].url} alt={album.album_name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="h-full w-full flex items-center justify-center bg-r-card"><span className="text-caption text-r-muted text-center px-2">{album.album_name}</span></div>}
            </div>
            <div className="p-3">
              <p className="text-body-2 font-medium text-r-text">{album.album_name}</p>
              <p className="text-caption text-r-muted mt-0.5">{album.photos?.length || 0} photos</p>
            </div>
          </button>
        ))}
      </div>
      {openAlbum && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-caption font-medium text-r-muted">Photos</p>
            <button onClick={() => setOpenAlbum(null)} className="text-caption text-r-muted hover:opacity-70">Close</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {openAlbum.photos?.map((photo, index) => (
              <button key={photo.id} onClick={() => openLightbox(photo, index)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-r-card">
                {photo.url ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="h-full w-full bg-r-card" />}
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
        </div>
      )}
      {lightboxPhoto && <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onPrev={prevPhoto} onNext={nextPhoto} />}
    </div>
  );
}

// ─── Contributors view ────────────────────────────────────────────────────────

const MOCK_CONTRIBUTOR_PHOTOS = [
  { id: 'c1', name: 'Sarah', relationship: 'Friend', contributions: 4, lastSubmitted: 'May 20, 2026', photos: [{ id: 'p1', url: null, caption: null, taken_at: '2019-12-25' }, { id: 'p2', url: null, caption: 'Summer BBQ', taken_at: '2018-07-04' }] },
  { id: 'c2', name: 'Michael', relationship: 'Family', contributions: 3, lastSubmitted: 'May 18, 2026', photos: [{ id: 'p3', url: null, caption: null, taken_at: '2022-06-15' }, { id: 'p4', url: null, caption: null, taken_at: '2021-09-03' }] },
  { id: 'c3', name: 'Tom Harris', relationship: 'Colleague', contributions: 2, lastSubmitted: 'May 15, 2026', photos: [{ id: 'p5', url: null, caption: null, taken_at: null }] },
];

function ContributorsView() {
  const [expanded, setExpanded] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const currentPhotos = expanded ? (MOCK_CONTRIBUTOR_PHOTOS.find(c => c.id === expanded)?.photos || []) : [];

  function openLightbox(photo, i) { setLightboxPhoto(photo); setLightboxIndex(i); }
  function prevPhoto() { const i = (lightboxIndex - 1 + currentPhotos.length) % currentPhotos.length; setLightboxIndex(i); setLightboxPhoto(currentPhotos[i]); }
  function nextPhoto() { const i = (lightboxIndex + 1) % currentPhotos.length; setLightboxIndex(i); setLightboxPhoto(currentPhotos[i]); }

  return (
    <div className="flex flex-col gap-4">
      {MOCK_CONTRIBUTOR_PHOTOS.map((contributor) => (
        <div key={contributor.id} className="rounded-2xl overflow-hidden border border-r-border">
          <div className="flex items-stretch">
            <div className="w-[220px] shrink-0 p-4 flex flex-col justify-between bg-r-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full shrink-0 bg-r-border" />
                <div className="min-w-0">
                  <p className="text-body-2 font-medium text-r-text">{contributor.name}</p>
                  <p className="text-caption text-r-muted mt-0.5">{contributor.contributions} contributions</p>
                  <p className="text-caption text-r-muted">Last submitted {contributor.lastSubmitted}</p>
                </div>
              </div>
              <span className="mt-3 self-start inline-block rounded-full px-3 py-1 text-caption bg-r-bg"
                style={{ border: '1px solid var(--color-r-border)', color: relationshipColor(contributor.relationship) }}>
                {contributor.relationship || "No Relationship Provided"}
              </span>
            </div>
            <div className="flex flex-1">
              {contributor.photos.slice(0, 2).map((photo, i) => (
                <button key={photo.id} onClick={() => openLightbox(photo, i)} className="flex-1 relative overflow-hidden group bg-r-card">
                  {photo.url ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="h-full w-full" style={{ backgroundColor: '#D0C8C0' }} />}
                </button>
              ))}
            </div>
            <button onClick={() => setExpanded(expanded === contributor.id ? null : contributor.id)}
              className="w-10 flex items-center justify-center shrink-0 hover:opacity-70 transition-opacity text-r-text">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={expanded === contributor.id ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
              </svg>
            </button>
          </div>
          {expanded === contributor.id && (
            <div className="p-4 grid grid-cols-3 gap-3 bg-r-bg" style={{ borderTop: '1px solid var(--color-r-border)' }}>
              {contributor.photos.map((photo, index) => (
                <button key={photo.id} onClick={() => openLightbox(photo, index)}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-r-card">
                  {photo.url ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="h-full w-full" style={{ backgroundColor: '#D0C8C0' }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {lightboxPhoto && <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onPrev={prevPhoto} onNext={nextPhoto} />}
    </div>
  );
}

// ─── Masonry view ─────────────────────────────────────────────────────────────

function MasonryView({ photos }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function openLightbox(photo, i) { setLightboxPhoto(photo); setLightboxIndex(i); }
  function prevPhoto() { const i = (lightboxIndex - 1 + photos.length) % photos.length; setLightboxIndex(i); setLightboxPhoto(photos[i]); }
  function nextPhoto() { const i = (lightboxIndex + 1) % photos.length; setLightboxIndex(i); setLightboxPhoto(photos[i]); }

  if (!photos || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-body-2 font-medium text-r-text">No photos yet</p>
        <p className="mt-1 max-w-xs text-body-2 text-r-muted">Photos will appear here once the memorial has been generated.</p>
      </div>
    );
  }

  const heights = [200, 280, 180, 260, 220, 300, 190, 240, 210, 270];
  return (
    <div>
      <div style={{ columnCount: 3, columnGap: '12px' }}>
        {photos.map((photo, i) => (
          <button key={photo.id} onClick={() => openLightbox(photo, i)}
            className="group relative w-full overflow-hidden rounded-xl mb-3 block bg-r-card"
            style={{ breakInside: 'avoid', height: `${heights[i % heights.length]}px` }}>
            {photo.url ? <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full bg-r-card" />}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-end p-2 opacity-0 group-hover:opacity-100">
              <div className="w-full">
                {photo.caption && <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>}
                {photo.contributor_name && <p className="text-white text-xs truncate">{photo.contributor_name}</p>}
                {photo.taken_at && <p className="text-white/70 text-xs">{new Date(photo.taken_at).getFullYear()}</p>}
              </div>
            </div>
          </button>
        ))}
      </div>
      {lightboxPhoto && <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onPrev={prevPhoto} onNext={nextPhoto} />}
    </div>
  );
}

// ─── normalizePhotos ──────────────────────────────────────────────────────────

function normalizePhotos(photos) {
  if (!photos) return [];
  if (photos.albums) {
    return photos.albums.map((a) => ({
      album_name: a.name, cover_photo_url: a.cover_photo_url || null,
      photos: (a.photos || []).map((p) => ({ id: p.id, url: p.url || null, caption: p.caption || null, taken_at: p.taken_at || null, contributor_name: p.contributor_name || null })),
    }));
  }
  return photos;
}

// ─── Photo Archive section ────────────────────────────────────────────────────

function PhotoArchiveSection({ output }) {
  const [view, setView] = useState('Album');
  const albums = normalizePhotos(output?.photos);
  const allPhotos = albums.flatMap((album) => (album.photos || []).map((p) => ({ ...p, album_name: album.album_name })));

  return (
    <div>
      <h2 className="text-h1 text-r-text mb-6">Photo archive</h2>
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <select value={view} onChange={(e) => setView(e.target.value)}
            className="appearance-none rounded-xl px-4 py-2 pr-10 cursor-pointer focus:outline-none text-h4 text-r-text bg-r-bg"
            style={{ border: '1px solid var(--color-r-border)' }}>
            <option value="Album">Album</option>
            <option value="Contributors">Contributors</option>
            <option value="All Photos">All Photos</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption text-r-text">▼</span>
        </div>
        {view === 'Contributors' && (
          <div className="relative">
            <select className="appearance-none rounded-xl px-4 py-2 pr-10 cursor-pointer focus:outline-none text-h4 text-r-text bg-r-bg"
              style={{ border: '1px solid var(--color-r-border)' }}>
              <option>Tags</option><option>Family</option><option>Friend</option><option>Colleague</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption text-r-text">▼</span>
          </div>
        )}
      </div>
      {view === 'Album' && <AlbumView albums={albums} />}
      {view === 'Contributors' && <ContributorsView />}
      {view === 'All Photos' && <MasonryView photos={allPhotos} />}
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ onClose, memorialId }) {
  const [copiedContributor, setCopiedContributor] = useState(false);
  const [copiedViewer, setCopiedViewer] = useState(false);

  async function copyLink(type) {
    if (type === 'contributor') {
      const data = await createInviteLink(memorialId);
      await navigator.clipboard.writeText(data.invite_link.url);
      setCopiedContributor(true);
      setTimeout(() => setCopiedContributor(false), 2000);
    } else {
      const data = await createShareLink(memorialId);
      await navigator.clipboard.writeText(data.share_link.url);
      setCopiedViewer(true);
      setTimeout(() => setCopiedViewer(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-8 bg-r-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onClose} className="text-r-text">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-h2 text-r-text">Share</h2>
        </div>
        {[
          { label: 'Invite Contributors', sub: 'For friends and family to share their memories:', type: 'contributor', copied: copiedContributor },
          { label: 'Invite Viewers', sub: 'For anyone to view this memorial:', type: 'viewer', copied: copiedViewer },
        ].map(({ label, sub, type, copied }) => (
          <div key={type} className="flex items-start justify-between mb-6">
            <div>
              <p className="text-h3 text-r-text">{label}</p>
              <p className="text-body-2 text-r-secondary mt-0.5">{sub}</p>
            </div>
            <button onClick={() => copyLink(type)}
              className="shrink-0 rounded-full px-4 py-2 text-h4 transition-all ml-5 border-none"
              style={{ backgroundColor: copied ? '#7D8C6A' : 'var(--color-r-btn)', color: copied ? '#FBF9F6' : 'var(--color-r-btn-text)' }}>
              {copied ? 'Copied!' : 'Copy Link'}
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

// ─── Memorial Header ──────────────────────────────────────────────────────────

function MemorialHeader({ memorial, onShare }) {
  return (
    <div className="flex items-start gap-8">
      <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full bg-r-shape">
        {memorial?.cover_photo_url ? <img src={memorial.cover_photo_url} alt={memorial.subject_name} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-r-shape" />}
      </div>
      <div className="flex-1 min-w-0 pt-2">
        <h1 className="text-h1 text-r-text">{memorial?.subject_name || 'Loading...'}</h1>
        <p className="mt-1 text-body-2 text-r-muted">
          {memorial?.date_of_birth && new Date(memorial.date_of_birth).getFullYear()}
          {memorial?.date_of_birth && memorial?.date_of_passing && ' – '}
          {memorial?.date_of_passing && new Date(memorial.date_of_passing).getFullYear()}
        </p>
        <p className="mt-2 max-w-md text-body-2 text-r-secondary" style={{ lineHeight: 1.6 }}>{memorial?.bio || ''}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        {[
          { label: 'View page', href: `/memorial/${memorial?.id}/output`, onClick: null },
          { label: 'Share', href: null, onClick: onShare },
          { label: 'Settings', href: null, onClick: null },
        ].map(({ label, href, onClick }) =>
          href ? (
            <Link key={label} href={href} className="rounded-full px-6 py-2.5 text-center text-h4 font-medium transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--color-r-text)', color: '#FBF9F6' }}>
              {label}
            </Link>
          ) : (
            <button key={label} onClick={onClick} className="rounded-full px-6 py-2.5 text-h4 font-medium transition-opacity hover:opacity-80 border-none" style={{ backgroundColor: 'var(--color-r-text)', color: '#FBF9F6' }}>
              {label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function OutputError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#fef2f2' }}>
        <svg width="24" height="24" fill="none" stroke="var(--color-r-danger)" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-body-2 font-medium text-r-text">Unable to load memorial</p>
      <p className="mt-1 max-w-xs text-body-2 text-r-muted">Something went wrong. Please try again.</p>
      <button onClick={onRetry} className="mt-6 rounded-full px-6 py-2.5 text-h4 font-medium transition-opacity hover:opacity-80 border-none" style={{ backgroundColor: 'var(--color-r-text)', color: '#FBF9F6' }}>
        Try again
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemorialOutputPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Photo Archive');
  const [output, setOutput] = useState(null);
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [contributors, setContributors] = useState([]);

  useEffect(() => {
    if (!id) return;
    async function loadContributors() {
      try { const result = await getContributors(id); setContributors(result.contributors || []); } catch {}
    }
    loadContributors();
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getMemorialOutput(id);
      setOutput(data);
      try {
        const memorialData = await getMemorialById(id);
        setMemorial({
          id: memorialData.id || id,
          subject_name: memorialData.subject_name || memorialData.deceased_name,
          cover_photo_url: memorialData.cover_photo_url || memorialData.profile_photo_url || null,
          date_of_birth: memorialData.date_of_birth || memorialData.birth_date || null,
          date_of_passing: memorialData.date_of_passing || memorialData.death_date || null,
          bio: memorialData.brief_biography || memorialData.short_description || null,
        });
      } catch {
        const mockData = mockMemorials.find((m) => m.id === id) ?? mockMemorials[0];
        setMemorial({
          id: mockData.id,
          subject_name: mockData.subject_name || mockData.deceased_name,
          cover_photo_url: mockData.cover_photo_url || mockData.profile_photo_url || null,
          date_of_birth: mockData.date_of_birth || mockData.birth_date || null,
          date_of_passing: mockData.date_of_passing || mockData.death_date || null,
          bio: mockData.brief_biography || mockData.short_description || null,
        });
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (!id) return; load(); }, [id, load]);

  return (
    <div className="min-h-screen w-full pb-20 bg-r-bg">
      <header className="flex items-center justify-between px-8 py-5">
        <span className="text-h4 text-r-text">Remember</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowShare(true)} className="text-body-2 text-r-text transition-opacity hover:opacity-70 bg-none border-none cursor-pointer">Share</button>
          <Link href="/dashboard" className="text-body-2 text-r-text transition-opacity hover:opacity-70">← Back</Link>
        </div>
      </header>

      <main className="px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-r-border)', borderTopColor: 'var(--color-r-text)' }} />
          </div>
        ) : error ? (
          <OutputError onRetry={load} />
        ) : (
          <>
            {activeTab === 'Slideshow' && <SlideshowSection output={output} />}
            {activeTab === 'Constellations' && <ConstellationsSection output={output} memorial={memorial} contributor={contributors} />}
            {activeTab === 'Voices' && <VoicesSection voices={output?.voices} />}
            {activeTab === 'Contributions' && <ContributionsSection contributorslist={contributors} />}
            {activeTab === 'Photo Archive' && <PhotoArchiveSection output={output} />}
          </>
        )}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
      {showShare && <ShareModal onClose={() => setShowShare(false)} memorialId={id} />}
    </div>
  );
}
