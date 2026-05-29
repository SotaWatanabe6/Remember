// frontend/src/app/(viewer)/memorial/[id]/output/page.jsx
// Rebuilt to match new designs:
// - Cream background (#F0EAE2)
// - Bottom navigation bar (Slideshow | Constellations | Voices | Photo Archive)
// - Photo Archive with Album/Contributors dropdown views
// - Voices two-column layout placeholder
// - Relationship colors: Family #AF5F42, Friend #45556C, Colleague #59763C

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMemorialOutput, getMemorialById } from '@/lib/api';
import { mockMemorials } from '@/data/mockMemorials.js';

// ─── Design tokens ────────────────────────────────────────────────────────────

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

function relationshipColor(type) {
  const t = (type || '').toLowerCase();
  if (t === 'family') return COLORS.family;
  if (t === 'friend') return COLORS.friend;
  if (t === 'colleague') return COLORS.colleague;
  return COLORS.textMuted;
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const NAV_TABS = ['Slideshow', 'Constellations', 'Voices', 'Photo Archive'];

function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[#D4CAC0] bg-[#F0EAE2]">
      {NAV_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-4 text-sm transition-colors border-t-2 -mt-px ${
            active === tab
              ? 'border-[#1a1a1a] text-[#1a1a1a] font-semibold'
              : 'border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]'
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}

// ─── Slideshow placeholder ────────────────────────────────────────────────────

function SlideshowSection() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-[#1a1a1a] text-lg font-medium">Slideshow</p>
      <p className="text-[#6b6b6b] text-sm mt-2 max-w-xs">
        The memorial slideshow will appear here once generated.
      </p>
    </div>
  );
}

// ─── Constellations placeholder (Mendrika) ────────────────────────────────────

function ConstellationsSection() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-[#1a1a1a] text-lg font-medium">Constellations</p>
      <p className="text-[#6b6b6b] text-sm mt-2 max-w-xs">
        Constellation — built by Mendrika
      </p>
    </div>
  );
}

// ─── Waveform Player (wavesurfer.js) ─────────────────────────────────────────
// Renders a real audio waveform with play/pause + scrub bar
// Falls back to static placeholder bars if no audio_url available
// Day 9: audio_url comes from Supabase storage via backend

function WaveformPlayer({ audioUrl, color }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import wavesurfer to avoid SSR issues
    import('wavesurfer.js').then((WaveSurfer) => {
      // Destroy previous instance if exists
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      const ws = WaveSurfer.default.create({
        container: containerRef.current,
        waveColor: color || COLORS.colleague,
        progressColor: COLORS.text,
        cursorColor: 'transparent',
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        height: 48,
        normalize: true,
        interact: true,
        backend: 'WebAudio',
      });

      // Load audio if URL exists
      if (audioUrl) {
        ws.load(audioUrl);
        ws.on('ready', () => {
          setReady(true);
          setDuration(ws.getDuration());
        });
        ws.on('timeupdate', (time) => setCurrentTime(time));
        ws.on('finish', () => setPlaying(false));
      } else {
        // No audio URL — show static placeholder waveform
        setReady(false);
      }

      wavesurferRef.current = ws;
    }).catch(() => {
      // wavesurfer not installed yet — falls back to placeholder
      setReady(false);
    });

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, color]);

  function togglePlay() {
    if (!wavesurferRef.current || !ready) return;
    wavesurferRef.current.playPause();
    setPlaying(!playing);
  }

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="flex items-center gap-3">
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-80"
        style={{ backgroundColor: COLORS.colleague }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform container or placeholder */}
      <div className="flex-1 flex flex-col gap-1">
        {audioUrl ? (
          // Real wavesurfer waveform
          <div ref={containerRef} className="w-full" />
        ) : (
          // Static placeholder — no audio URL yet
          <div className="flex items-center gap-0.5 h-12">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all"
                style={{
                  backgroundColor: COLORS.colleague,
                  opacity: playing ? 0.8 : 0.4,
                  height: `${16 + Math.sin(i * 0.6) * 12 + Math.cos(i * 1.2) * 8}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Time display */}
        {(ready || audioUrl) && (
          <div className="flex justify-between text-xs"
            style={{ color: COLORS.textMuted }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        )}
      </div>
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
        <p className="text-[#1a1a1a] text-base font-medium">
          No voice recordings were submitted for this memorial
        </p>
        <p className="text-[#6b6b6b] text-sm mt-1">
          Voice recordings will appear here once contributors have submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <h2 className="text-3xl font-serif text-[#1a1a1a] mb-6">Voices</h2>

      <div className="flex gap-8">
        {/* Left — audio list */}
        <div className="w-48 shrink-0 flex flex-col gap-0">
          <div className="flex items-center gap-2 mb-4">
            <select className="text-sm text-[#1a1a1a] bg-transparent border border-[#D4CAC0] rounded-lg px-3 py-1.5 pr-8 appearance-none cursor-pointer focus:outline-none">
              <option>Sort</option>
              <option>By date</option>
              <option>By name</option>
            </select>
          </div>
          {voices.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setSelected(i)}
              className={`text-left py-3 border-b text-sm transition-colors ${
                i === selected
                  ? 'text-[#1a1a1a] font-medium border-[#1a1a1a]'
                  : 'text-[#6b6b6b] border-[#D4CAC0] hover:text-[#1a1a1a]'
              }`}
            >
              {v.contributor_title}
            </button>
          ))}
        </div>

        {/* Right — player area */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Photo placeholder — shows if photo linked to voice */}
          {current?.photo_url ? (
            <img
              src={current.photo_url}
              alt=""
              className="w-full aspect-video rounded-2xl object-cover"
            />
          ) : (
            <div className="w-full aspect-video rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: COLORS.cardBg }}>
              <span className="text-sm" style={{ color: COLORS.textMuted }}>
                No photo linked
              </span>
            </div>
          )}

          {/* Waveform player — real wavesurfer or placeholder */}
          {current && (
            <WaveformPlayer
              key={current.id}
              audioUrl={current.audio_url || null}
              color={COLORS.colleague}
            />
          )}

          {/* Transcript */}
          {current?.transcript_text && (
            <p className="text-sm italic leading-relaxed"
              style={{ color: COLORS.textMuted }}>
              &quot;{current.transcript_text}&quot;
            </p>
          )}

          {/* Tag */}
          {current?.ai_category && (
            <span className="inline-block self-start rounded-full border px-4 py-1.5 text-sm"
              style={{ borderColor: COLORS.border, color: COLORS.textMuted }}>
              {current.ai_category}
            </span>
          )}

          {/* Submitter */}
          {current && (
            <div className="text-sm font-medium" style={{ color: COLORS.text }}>
              Submitted by {current.contributor_name || 'Contributor'}
            </div>
          )}
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
          {photo.url
            ? <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-neutral-700 flex items-center justify-center">
                <span className="text-neutral-500 text-sm">No image</span>
              </div>
          }
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

// ─── Photo Archive — Album view ───────────────────────────────────────────────

function AlbumView({ albums }) {
  const [openAlbum, setOpenAlbum] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const currentPhotos = openAlbum?.photos || [];

  function openLightbox(photo, i) { setLightboxPhoto(photo); setLightboxIndex(i); }
  function prevPhoto() {
    const i = (lightboxIndex - 1 + currentPhotos.length) % currentPhotos.length;
    setLightboxIndex(i); setLightboxPhoto(currentPhotos[i]);
  }
  function nextPhoto() {
    const i = (lightboxIndex + 1) % currentPhotos.length;
    setLightboxIndex(i); setLightboxPhoto(currentPhotos[i]);
  }

  if (!albums || albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: COLORS.cardBg }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
            style={{ color: COLORS.textMuted }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-base font-medium" style={{ color: COLORS.text }}>No photos yet</p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: COLORS.textMuted }}>
          Photos will appear here once contributors have submitted and the memorial has been generated.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Albums section */}
      <p className="text-sm font-medium mb-3" style={{ color: COLORS.textMuted }}>Albums</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {albums.map((album, i) => (
          <button
            key={i}
            onClick={() => setOpenAlbum(openAlbum?.album_name === album.album_name ? null : album)}
            className="group text-left rounded-2xl overflow-hidden transition-all"
            style={{
              border: `1px solid ${openAlbum?.album_name === album.album_name ? COLORS.text : COLORS.border}`,
              backgroundColor: COLORS.cardBg,
            }}
          >
            <div className="aspect-[4/3] overflow-hidden">
              {album.photos?.[0]?.url ? (
                <img src={album.photos[0].url} alt={album.album_name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="h-full w-full flex items-center justify-center"
                  style={{ backgroundColor: COLORS.cardBg }}>
                  <span className="text-xs text-center px-2" style={{ color: COLORS.textMuted }}>
                    {album.album_name}
                  </span>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium leading-snug" style={{ color: COLORS.text }}>
                {album.album_name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                {album.photos?.length || 0} photos
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Photos section */}
      {openAlbum && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Photos</p>
            <button onClick={() => setOpenAlbum(null)}
              className="text-xs hover:opacity-70" style={{ color: COLORS.textMuted }}>
              Close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {openAlbum.photos?.map((photo, index) => (
              <button key={photo.id} onClick={() => openLightbox(photo, index)}
                className="group relative aspect-square overflow-hidden rounded-xl"
                style={{ backgroundColor: COLORS.cardBg }}>
                {photo.url
                  ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="h-full w-full" style={{ backgroundColor: COLORS.cardBg }} />
                }
                {/* Hover overlay — caption + contributor + year */}
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

      {lightboxPhoto && (
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)}
          onPrev={prevPhoto} onNext={nextPhoto} />
      )}
    </div>
  );
}

// ─── Photo Archive — Contributors view ───────────────────────────────────────

// Mock contributors for now — Day 9: comes from real API
const MOCK_CONTRIBUTOR_PHOTOS = [
  {
    id: 'c1', name: 'Sarah', relationship: 'Friend',
    contributions: 4, lastSubmitted: 'May 20, 2026',
    photos: [
      { id: 'p1', url: null, caption: null, taken_at: '2019-12-25' },
      { id: 'p2', url: null, caption: 'Summer BBQ', taken_at: '2018-07-04' },
    ],
  },
  {
    id: 'c2', name: 'Michael', relationship: 'Family',
    contributions: 3, lastSubmitted: 'May 18, 2026',
    photos: [
      { id: 'p3', url: null, caption: null, taken_at: '2022-06-15' },
      { id: 'p4', url: null, caption: null, taken_at: '2021-09-03' },
    ],
  },
  {
    id: 'c3', name: 'Tom Harris', relationship: 'Colleague',
    contributions: 2, lastSubmitted: 'May 15, 2026',
    photos: [
      { id: 'p5', url: null, caption: null, taken_at: null },
    ],
  },
];

function ContributorsView() {
  const [expanded, setExpanded] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const currentPhotos = expanded ? (MOCK_CONTRIBUTOR_PHOTOS.find(c => c.id === expanded)?.photos || []) : [];

  function openLightbox(photo, i) { setLightboxPhoto(photo); setLightboxIndex(i); }
  function prevPhoto() {
    const i = (lightboxIndex - 1 + currentPhotos.length) % currentPhotos.length;
    setLightboxIndex(i); setLightboxPhoto(currentPhotos[i]);
  }
  function nextPhoto() {
    const i = (lightboxIndex + 1) % currentPhotos.length;
    setLightboxIndex(i); setLightboxPhoto(currentPhotos[i]);
  }

  return (
    <div className="flex flex-col gap-4">
      {MOCK_CONTRIBUTOR_PHOTOS.map((contributor) => (
        <div key={contributor.id} className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${COLORS.border}` }}>
          <div className="flex items-stretch">
            {/* Contributor card */}
            <div className="w-[220px] shrink-0 p-4 flex flex-col justify-between"
              style={{ backgroundColor: COLORS.cardBg }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS.border }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                    {contributor.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                    {contributor.contributions} contributions
                  </p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>
                    Last submitted {contributor.lastSubmitted}
                  </p>
                </div>
              </div>
              <span className="mt-3 self-start inline-block rounded-full px-3 py-1 text-xs border"
                style={{
                  borderColor: COLORS.border,
                  color: relationshipColor(contributor.relationship),
                  backgroundColor: COLORS.bg,
                }}>
                {contributor.relationship}
              </span>
            </div>

            {/* Photos beside contributor */}
            <div className="flex flex-1">
              {contributor.photos.slice(0, 2).map((photo, i) => (
                <button key={photo.id}
                  onClick={() => openLightbox(photo, i)}
                  className="flex-1 relative overflow-hidden group"
                  style={{ backgroundColor: COLORS.cardBg }}>
                  {photo.url
                    ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="h-full w-full" style={{ backgroundColor: '#D0C8C0' }} />
                  }
                </button>
              ))}
            </div>

            {/* Expand arrow */}
            <button
              onClick={() => setExpanded(expanded === contributor.id ? null : contributor.id)}
              className="w-10 flex items-center justify-center shrink-0 hover:opacity-70 transition-opacity"
              style={{ color: COLORS.text }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d={expanded === contributor.id ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
              </svg>
            </button>
          </div>

          {/* Expanded photos grid */}
          {expanded === contributor.id && (
            <div className="p-4 border-t grid grid-cols-3 gap-3"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.bg }}>
              {contributor.photos.map((photo, index) => (
                <button key={photo.id}
                  onClick={() => openLightbox(photo, index)}
                  className="group relative aspect-square overflow-hidden rounded-xl"
                  style={{ backgroundColor: COLORS.cardBg }}>
                  {photo.url
                    ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="h-full w-full" style={{ backgroundColor: '#D0C8C0' }} />
                  }
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                    <div>
                      {photo.caption && <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>}
                      {photo.taken_at && <p className="text-white/70 text-xs">{new Date(photo.taken_at).getFullYear()}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {lightboxPhoto && (
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)}
          onPrev={prevPhoto} onNext={nextPhoto} />
      )}
    </div>
  );
}

// ─── Photo Archive — Masonry / All Photos view ───────────────────────────────
// Pinterest-style grid preserving original photo aspect ratios
// Uses CSS columns — no extra library needed
// Day 9: real photos will fill actual heights; placeholders use fixed heights

function MasonryView({ photos }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function openLightbox(photo, i) { setLightboxPhoto(photo); setLightboxIndex(i); }
  function prevPhoto() {
    const i = (lightboxIndex - 1 + photos.length) % photos.length;
    setLightboxIndex(i); setLightboxPhoto(photos[i]);
  }
  function nextPhoto() {
    const i = (lightboxIndex + 1) % photos.length;
    setLightboxIndex(i); setLightboxPhoto(photos[i]);
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-base font-medium" style={{ color: COLORS.text }}>No photos yet</p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: COLORS.textMuted }}>
          Photos will appear here once the memorial has been generated.
        </p>
      </div>
    );
  }

  // Varied heights to simulate different photo aspect ratios
  // Day 9: use real image intrinsic dimensions
  const heights = [200, 280, 180, 260, 220, 300, 190, 240, 210, 270];

  return (
    <div>
      {/* CSS columns masonry — preserves aspect ratios, Pinterest-style */}
      <div style={{ columnCount: 3, columnGap: '12px' }}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(photo, i)}
            className="group relative w-full overflow-hidden rounded-xl mb-3 block"
            style={{
              breakInside: 'avoid',
              backgroundColor: COLORS.cardBg,
              height: `${heights[i % heights.length]}px`,
            }}
          >
            {photo.url ? (
              <img
                src={photo.url}
                alt={photo.caption || ''}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: COLORS.cardBg }} />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-end p-2 opacity-0 group-hover:opacity-100">
              <div className="w-full">
                {photo.caption && (
                  <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>
                )}
                {photo.contributor_name && (
                  <p className="text-white text-xs truncate">{photo.contributor_name}</p>
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

// ─── Photo Archive section ────────────────────────────────────────────────────

// Handles both real backend shape and mock shape:
// Real: { albums: [{ name, photos, photo_count, cover_photo_url }] }
// Mock: [{ album_name, photos, cover_photo_url }]
function normalizePhotos(photos) {
  if (!photos) return [];
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
  return photos;
}

function PhotoArchiveSection({ output }) {
  const [view, setView] = useState('Album');

  // Normalize photos to handle both real backend and mock shapes
  const albums = normalizePhotos(output?.photos);

  // Flatten all photos across all albums for masonry view
  const allPhotos = albums.flatMap((album) =>
    (album.photos || []).map((p) => ({ ...p, album_name: album.album_name }))
  );

  return (
    <div>
      <h2 className="text-3xl font-serif mb-6" style={{ color: COLORS.text }}>Photo archive</h2>

      {/* View dropdown + Tags filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="appearance-none rounded-xl border px-4 py-2 pr-10 text-sm cursor-pointer focus:outline-none"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.bg, color: COLORS.text }}
          >
            <option value="Album">Album</option>
            <option value="Contributors">Contributors</option>
            <option value="All Photos">All Photos</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: COLORS.text }}>▼</span>
        </div>

        {view === 'Contributors' && (
          <div className="relative">
            <select
              className="appearance-none rounded-xl border px-4 py-2 pr-10 text-sm cursor-pointer focus:outline-none"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.bg, color: COLORS.text }}
            >
              <option>Tags</option>
              <option>Family</option>
              <option>Friend</option>
              <option>Colleague</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: COLORS.text }}>▼</span>
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

function ShareModal({ onClose }) {
  const [copiedContributor, setCopiedContributor] = useState(false);
  const [copiedViewer, setCopiedViewer] = useState(false);

  async function copyLink(url, type) {
    await navigator.clipboard.writeText(url);
    if (type === 'contributor') { setCopiedContributor(true); setTimeout(() => setCopiedContributor(false), 2000); }
    else { setCopiedViewer(true); setTimeout(() => setCopiedViewer(false), 2000); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: '#dce4f0' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onClose} className="text-[#4a5568] hover:text-neutral-950">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-medium text-[#2d3748]">Share</h2>
        </div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-[#2d3748]">Invite Contributors</p>
            <p className="text-xs text-[#4a5568] mt-0.5">For friends and family to share their memories:</p>
          </div>
          <button onClick={() => copyLink('mock-contributor-url', 'contributor')}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
              copiedContributor ? 'bg-[#4a6fa5] text-white' : 'bg-white/70 text-[#2d3748] hover:bg-white'
            }`}>
            {copiedContributor ? 'Copied!' : 'Copy Link 🔗'}
          </button>
        </div>
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-[#2d3748]">Invite Viewers</p>
            <p className="text-xs text-[#4a5568] mt-0.5">For anyone to view this memorial:</p>
          </div>
          <button onClick={() => copyLink('mock-viewer-url', 'viewer')}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
              copiedViewer ? 'bg-[#4a6fa5] text-white' : 'bg-white/70 text-[#2d3748] hover:bg-white'
            }`}>
            {copiedViewer ? 'Copied!' : 'Copy Link 🔗'}
          </button>
        </div>
        <div className="flex justify-center gap-6">
          {['Message', 'Email', 'Instagram'].map((label) => (
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

// ─── Error state ──────────────────────────────────────────────────────────────

function OutputError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: '#fef2f2' }}>
        <svg width="24" height="24" fill="none" stroke="#ef4444" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-base font-medium" style={{ color: COLORS.text }}>Unable to load memorial</p>
      <p className="text-sm mt-1 max-w-xs" style={{ color: COLORS.textMuted }}>
        Something went wrong. Please try again.
      </p>
      <button onClick={onRetry}
        className="mt-6 rounded-full px-6 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity"
        style={{ backgroundColor: COLORS.text }}>
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
  const [memorial, setMemorial] = useState(null); // ← separate state, fetched from real backend
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Step 1 — fetch four output tabs from real backend
      // Falls back to mock if backend fails
      const data = await getMemorialOutput(id);
      setOutput(data);

      // Step 2 — fetch memorial header from real backend
      // Falls back to mockMemorials if backend fails or not in DB
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
        // Fallback to mockMemorials
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(load);
  }, [id]);

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

  return (
    <div className="min-h-screen w-full pb-20" style={{ backgroundColor: COLORS.bg }}>

      {/* Top nav */}
      <header className="flex items-center justify-between px-8 py-5">
        <span className="text-xl font-medium" style={{ color: COLORS.text }}>Remember</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowShare(true)}
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: COLORS.text }}>
            Share
          </button>
          <Link href="/dashboard"
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: COLORS.text }}>
            ← Back
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4CAC0]"
              style={{ borderTopColor: COLORS.text }} />
          </div>
        ) : error ? (
          <OutputError onRetry={load} />
        ) : (
          <>
            {activeTab === 'Slideshow' && <SlideshowSection />}
            {activeTab === 'Constellations' && <ConstellationsSection />}
            {activeTab === 'Voices' && <VoicesSection voices={output?.voices} />}
            {activeTab === 'Photo Archive' && <PhotoArchiveSection output={output} />}
          </>
        )}
      </main>

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {/* Share modal */}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}
