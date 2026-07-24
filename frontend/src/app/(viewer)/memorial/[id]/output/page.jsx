'use client';

// frontend/src/app/(viewer)/memorial/[id]/output/page.jsx

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMemorialOutput, getMemorialById, createInviteLink, createShareLink, getAuthToken } from '@/lib/api';
import { copyTextToClipboard, normalizeShareUrl } from '@/lib/copyToClipboard';
import { getMemorialContributors } from '@/services/contributorService';
import ConstellationGraph from "@/components/output/constellation";
import StorySlideshow from '@/components/output/StorySlideshow';
import MemorialCoverImage from '@/components/memorial/MemorialCoverImage.jsx';
import VoicesTab from '@/components/output/VoicesTab';

// ─── Filter Select — matches Figma dropdown style (Boska, rounded-[12.7px], triangle arrow) ──

function FilterSelect({ value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const BASE_NAV_TABS = ['Slideshow', 'Constellations', 'Photo Archive'];

function hasVoiceRecordings(output) {
  return Array.isArray(output?.voices) && output.voices.length > 0;
}

function getOutputTabs(output) {
  return hasVoiceRecordings(output)
    ? ['Slideshow', 'Constellations', 'Voices', 'Photo Archive']
    : BASE_NAV_TABS;
}

function BottomNav({ active, onChange, tabs }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex bg-r-bg border-t border-r-border">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-4 text-sm transition-colors relative ${
            active === tab ? 'text-r-text font-semibold' : 'text-r-muted hover:text-r-text font-normal'
          }`}
        >
          {tab}
          {active === tab && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-r-text" />
          )}
        </button>
      ))}
    </nav>
  );
}

// ─── Slideshow ────────────────────────────────────────────────────────────────

function formatMemorialYear(value) {
  if (!value) return '';

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return String(date.getFullYear());

  const yearMatch = String(value).match(/\b\d{4}\b/);
  return yearMatch?.[0] || '';
}

function getMemorialYears(memorial) {
  const birthYear = formatMemorialYear(memorial?.date_of_birth || memorial?.birth_date);
  const passingYear = formatMemorialYear(memorial?.date_of_passing || memorial?.death_date);

  if (birthYear && passingYear) return `${birthYear} - ${passingYear}`;
  return birthYear || passingYear;
}

function StoryMemorialSummary({ memorial }) {
  const name = memorial?.subject_name || memorial?.deceased_name || '';
  const years = getMemorialYears(memorial);

  if (!name && !years) return null;

  return (
    <header className="w-full text-center">
      {name ? <h1 className="font-display text-[40px] font-bold leading-none text-r-text sm:text-[48px]">{name}</h1> : null}
      {years ? <p className="mt-3 text-body-1 text-r-muted">{years}</p> : null}
    </header>
  );
}

// ─── Intro view (shown before Slideshow on first load) ────────────────────────

function safeYear(dateStr) {
  if (!dateStr) return null;
  const y = new Date(dateStr).getFullYear();
  return Number.isNaN(y) ? null : y;
}

function IntroView({ memorial, onStart }) {
  const birthYear = safeYear(memorial?.date_of_birth);
  const passingYear = safeYear(memorial?.date_of_passing);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
      <div className="flex flex-col items-center gap-6 w-full text-center">

        {/* Portrait — large circle matching Figma */}
        <div
          className="w-[280px] h-[280px] rounded-full overflow-hidden flex-shrink-0"
          style={{
            backgroundImage: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)",
            backgroundSize: "20px 20px",
          }}
        >
          {memorial?.cover_photo_url && (
            <img src={memorial.cover_photo_url} alt={memorial?.subject_name || ''} className="w-full h-full object-cover" />
          )}
        </div>

        {/* Name */}
        <div>
          <h1
            className="text-[42px] font-normal leading-tight"
            style={{ color: "#3A3027", fontFamily: "var(--font-family-display, Georgia, serif)" }}
          >
            {memorial?.subject_name || ''}
          </h1>
          {(birthYear || passingYear) && (
            <p className="text-sm mt-2" style={{ color: "#9B8F80", letterSpacing: "0.04em" }}>
              {birthYear ?? ''}{birthYear && passingYear ? ' - ' : ''}{passingYear ?? ''}
            </p>
          )}
        </div>

        {/* Biography */}
        {(memorial?.bio || memorial?.biography) && (
          <p className="text-base leading-relaxed max-w-[320px]" style={{ color: "#6B6051" }}>
            {memorial.bio || memorial.biography}
          </p>
        )}

        {/* Start button — wide pill, lowercase, matching Figma */}
        <button
          onClick={onStart}
          className="w-full max-w-[380px] py-4 rounded-full text-base transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "#B5A88E", color: "#FAF7F2", fontWeight: 500, border: "none", cursor: "pointer" }}
        >
          Start
        </button>
      </div>
    </div>
  );
}

function SlideshowSection({ output, memorial }) {
  if (!output?.story || output.story.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-h3 text-r-text">Slideshow</p>
        <p className="mt-2 max-w-xs text-body-2 text-r-muted">The memorial slideshow will appear here once generated.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-[1281px] flex-col gap-8">
      <StoryMemorialSummary memorial={memorial} />
      <StorySlideshow output={output} story={output?.story} framed={false} />
    </div>
  );
}

// ─── Constellations ───────────────────────────────────────────────────────────

function ConstellationsSection({ output, memorial, contributor }) {
  if (!output?.constellation) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-h3 text-r-text">Constellations</p>
        <p className="mt-2 max-w-xs text-body-2 text-r-muted">
          Constellation will appear here once the memorial has been generated.
        </p>
      </div>
    );
  }
  return (
    <div className="py-4">
      <ConstellationGraph
        ai_output={output}
        memorial={memorial}
        contributor={contributor}
        relationships={output?.relationships ?? []}
        width={1250}
        height={800}
      />
    </div>
  );
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
      if (wavesurferRef.current) {
        try { wavesurferRef.current.destroy(); } catch { /* AbortError expected on unmount */ }
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
          {current && <WaveformPlayer key={current.id} audioUrl={current.audio_url || null} color="var(--color-r-colleague)" />}
          {(current?.key_quote || current?.transcript_text) && (
            <p className="text-body-2 text-r-muted" style={{ fontStyle: 'italic', lineHeight: 1.6 }}>
              &quot;{current.key_quote || current.transcript_text}&quot;
            </p>
          )}
          {current?.ai_category && (
            <span className="inline-block self-start rounded-full px-4 py-1.5 text-body-2 text-r-muted" style={{ border: '1px solid var(--color-r-border)' }}>
              {current.ai_category}
            </span>
          )}
          {current && (
            <div className="flex flex-col gap-0.5">
              <p className="text-body-2 font-medium text-r-text">
                {current.contributor_name ? `Submitted by ${current.contributor_name}` : 'Voice recording'}
              </p>
              {current.relationship_type && <p className="text-caption text-r-muted">{current.relationship_type}</p>}
              {(current.created_at || current.submitted_date) && (
                <p className="text-caption text-r-muted">
                  {new Date(current.created_at || current.submitted_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
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
        {/* object-contain so no face/head cropping */}
        <div className="relative w-full max-h-[80vh] overflow-hidden rounded-2xl bg-neutral-900 flex items-center justify-center">
          {photo.url
            ? <img src={photo.url} alt={photo.caption || ''} className="max-h-[80vh] w-auto max-w-full object-contain" />
            : <div className="h-64 w-full bg-neutral-700 flex items-center justify-center"><span className="text-neutral-500 text-sm">No image</span></div>}
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

// ─── normalizePhotos ──────────────────────────────────────────────────────────

function normalizePhotos(photos) {
  if (!photos) return [];
  if (photos.albums) {
    return photos.albums.map((a) => ({
      album_name: a.name || a.album_name || 'Album',
      cover_photo_url: a.cover_photo_url || null,
      photos: (a.photos || []).map((p) => ({ id: p.id, url: p.url || null, caption: p.caption || null, taken_at: p.taken_at || null, contributor_name: p.contributor_name || null })),
    }));
  }
  if (Array.isArray(photos)) return photos;
  return [];
}

// ─── Photos grid ──────────────────────────────────────────────────────────────

function PhotosGrid({ photos }) {
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

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <button
            key={photo.id || i}
            onClick={() => openLightbox(photo, i)}
            className="group relative rounded-xl overflow-hidden border border-r-border cursor-pointer hover:opacity-90 transition-opacity"
            style={{ aspectRatio: '4/3' }}
          >
            {photo.url
              ? <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              : <div className="h-full w-full bg-r-card" />}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-end p-2 opacity-0 group-hover:opacity-100">
              <div className="w-full">
                {photo.caption && <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>}
                {photo.contributor_name && <p className="text-white text-xs truncate">{photo.contributor_name}</p>}
              </div>
            </div>
          </button>
        ))}
      </div>
      {lightboxPhoto && <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onPrev={prevPhoto} onNext={nextPhoto} />}
    </>
  );
}

// ─── Albums grid ──────────────────────────────────────────────────────────────

function AlbumsGrid({ albums }) {
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
        <p className="text-body-2 font-medium text-r-text">No albums yet</p>
        <p className="mt-1 max-w-xs text-body-2 text-r-muted">Albums will appear here once the memorial has been generated.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {albums.map((album, i) => (
          <button
            key={i}
            onClick={() => setOpenAlbum(openAlbum?.album_name === album.album_name ? null : album)}
            className="group rounded-2xl border overflow-hidden text-left transition-colors bg-r-card hover:border-r-text"
            style={{ border: `1px solid ${openAlbum?.album_name === album.album_name ? 'var(--color-r-text)' : 'var(--color-r-border)'}` }}
          >
            <div className="aspect-[4/3] overflow-hidden">
              {album.photos?.[0]?.url
                ? <img src={album.photos[0].url} alt={album.album_name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="h-full w-full flex items-center justify-center bg-r-card">
                    <span className="text-caption text-r-muted text-center px-2 [font-family:var(--font-family-display)]">{album.album_name}</span>
                  </div>}
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
            <p className="text-caption font-medium text-r-muted">{openAlbum.album_name}</p>
            <button onClick={() => setOpenAlbum(null)} className="text-caption text-r-muted hover:text-r-text transition-colors">Close</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {openAlbum.photos?.map((photo, index) => (
              <button key={photo.id} onClick={() => openLightbox(photo, index)}
                className="group relative rounded-xl overflow-hidden bg-r-card" style={{ aspectRatio: '4/3' }}>
                {photo.url ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="h-full w-full bg-r-card" />}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end p-2 opacity-0 group-hover:opacity-100">
                  <div className="w-full">
                    {photo.caption && <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>}
                    {photo.contributor_name && <p className="text-white text-xs truncate">{photo.contributor_name}</p>}
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

// ─── Contributor Row ──────────────────────────────────────────────────────────
// 3-column grid: info card | first photo | second photo with green gradient arrow

function ContributorRow({ contributor, photos }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 items-stretch">
        {/* Info card */}
        <div className="rounded-2xl border border-r-border bg-r-card p-5 flex flex-col justify-between">
          <div>
            <h3 className="[font-family:var(--font-family-display)] text-lg text-r-text mb-1">{contributor.name}</h3>
            <p className="text-xs text-r-muted mb-0.5">
              {contributor.submitted_at
                ? `Last submitted ${new Date(contributor.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'In progress'}
            </p>
          </div>
          <button
            className="self-start mt-3 px-4 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-r-shape)', color: '#FBF9F6' }}
          >
            {contributor.relationship_type || 'Other'}
          </button>
        </div>

        {/* First photo */}
        <div className="rounded-2xl border border-r-border overflow-hidden bg-r-card" style={{ minHeight: '160px' }}>
          {photos[0]?.url
            ? <img src={photos[0].url} alt={photos[0].caption || ''} className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-r-card" />}
        </div>

        {/* Second photo with green gradient + arrow — click to expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-2xl overflow-hidden relative"
          style={{ minHeight: '160px' }}
        >
          {photos[1]?.url
            ? <img src={photos[1].url} alt={photos[1].caption || ''} className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-r-card" />}
          {/* Green gradient overlay — shown when more than 2 photos exist */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to left, rgba(138,155,110,0.85) 0%, rgba(138,155,110,0.4) 50%, transparent 100%)' }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={expanded ? 'M18 15l-6-6-6 6' : 'M9 5l7 7-7 7'} />
            </svg>
          </div>
        </button>
      </div>

      {/* Expanded full photo grid */}
      {expanded && photos.length > 0 && (
        <div className="mt-3 rounded-2xl border border-r-border bg-r-card p-4">
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <div key={photo.id || i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {photo.url
                  ? <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-cover" />
                  : <div className="h-full w-full bg-r-card" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contributors view ────────────────────────────────────────────────────────

function ContributorsView({ contributors, output, filter }) {
  // Build photo map by contributor name from output albums
  const photosByContributor = {};
  const albums = normalizePhotos(output?.photos);
  albums.forEach((album) => {
    (album.photos || []).forEach((photo) => {
      const name = photo.contributor_name;
      if (!name) return;
      if (!photosByContributor[name]) photosByContributor[name] = [];
      photosByContributor[name].push(photo);
    });
  });

  const filtered = filter === 'all'
    ? contributors
    : contributors.filter((c) => (c.relationship_type || '').toLowerCase() === filter);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-body-2 font-medium text-r-text">No contributors found</p>
        <p className="mt-1 max-w-xs text-body-2 text-r-muted">No contributors match this filter.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {filtered.map((contributor) => (
        <ContributorRow
          key={contributor.id}
          contributor={contributor}
          photos={photosByContributor[contributor.name] || []}
        />
      ))}
    </div>
  );
}

// ─── Photo Archive ────────────────────────────────────────────────────────────

function PhotoArchiveSection({ output, contributors }) {
  const [view, setView] = useState('all_photos');
  const [sort, setSort] = useState('recently_added');
  const [contributorFilter, setContributorFilter] = useState('all');

  const albums = normalizePhotos(output?.photos);
  const allPhotos = albums.flatMap((album) => (album.photos || []).map((p) => ({ ...p, album_name: album.album_name })));
  const contributorNames = [...new Set(allPhotos.map((photo) => photo.contributor_name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  const contributorFilteredPhotos = contributorFilter === 'all'
    ? allPhotos
    : allPhotos.filter((photo) => photo.contributor_name === contributorFilter);

  const sortedPhotos = [...contributorFilteredPhotos].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.taken_at || 0) - new Date(b.taken_at || 0);
    return new Date(b.taken_at || 0) - new Date(a.taken_at || 0);
  });

  function handleViewChange(nextView) {
    setView(nextView);
    setContributorFilter('all');
  }

  return (
    <div>
      <h2
        className="text-[40px] font-medium italic text-r-text mb-6"
        style={{ fontFamily: 'var(--font-family-display)' }}
      >
        Photo archive
      </h2>

      {/* Controls row */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <FilterSelect
          value={view}
          onChange={handleViewChange}
          className="flex-1 max-w-[320px]"
        >
          <option value="all_photos">All Photos</option>
          <option value="albums">Albums</option>
          <option value="contributors">Contributors</option>
        </FilterSelect>

        <div className="flex items-center gap-3">
          {view === 'all_photos' && contributorNames.length > 0 && (
            <FilterSelect
              value={contributorFilter}
              onChange={setContributorFilter}
              className="w-[220px]"
            >
              <option value="all">All contributors</option>
              {contributorNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </FilterSelect>
          )}
          {view === 'contributors' && (
            <FilterSelect
              value={contributorFilter}
              onChange={setContributorFilter}
              className="w-[180px]"
            >
              <option value="all">Filter</option>
              <option value="family">Family</option>
              <option value="friend">Friend</option>
              <option value="colleague">Colleague</option>
              <option value="other">Other</option>
            </FilterSelect>
          )}
          {view !== 'contributors' && (
            <FilterSelect
              value={sort}
              onChange={setSort}
              className="w-[207px]"
            >
              <option value="sort" disabled>Sort</option>
              <option value="recently_added">Recently added</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </FilterSelect>
          )}
        </div>
      </div>

      {/* Content */}
      {view === 'all_photos' && <PhotosGrid photos={sortedPhotos} />}
      {view === 'albums' && <AlbumsGrid albums={albums} />}
      {view === 'contributors' && (
        <ContributorsView
          contributors={contributors}
          output={output}
          filter={contributorFilter}
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
          if (!cancelled) setViewerUrl(normalizeShareUrl(share?.share_link?.url ?? ''));
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
      <div className="w-full max-w-md rounded-2xl p-8 bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onClose} className="text-r-text">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
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

// ─── Error state ──────────────────────────────────────────────────────────────

function OutputError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4 bg-r-card">
        <svg width="24" height="24" fill="none" stroke="var(--color-r-danger)" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-body-2 font-medium text-r-text">Unable to load memorial</p>
      <p className="mt-1 max-w-xs text-body-2 text-r-muted">Something went wrong. Please try again.</p>
      <button onClick={onRetry}
        className="mt-6 rounded-full px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-85 border-none"
        style={{ backgroundColor: 'var(--color-r-btn)', color: 'var(--color-r-btn-text)' }}>
        Try again
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemorialOutputPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Slideshow');
  const [output, setOutput] = useState(null);
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [contributors, setContributors] = useState([]);

  const [showIntro, setShowIntro] = useState(true);
  const visibleTabs = getOutputTabs(output);
  const activeOutputTab = visibleTabs.includes(activeTab) ? activeTab : 'Slideshow';

  useEffect(() => {
    if (!id) return;
    async function loadContributors() {
      try {
        const token = await getAuthToken();
        const result = await getMemorialContributors(id, token);
        setContributors(result.contributors || []);
      } catch { /* non-critical */ }
    }
    loadContributors();
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, memorialData] = await Promise.all([
        getMemorialOutput(id),
        getMemorialById(id).catch(() => null),
      ]);
      setOutput(data);
      if (memorialData) {
        setMemorial({
          id: memorialData.id || id,
          subject_name: memorialData.subject_name || memorialData.deceased_name || '',
          cover_photo_url: memorialData.cover_photo_url || memorialData.profile_photo_url || null,
          date_of_birth: memorialData.date_of_birth || memorialData.birth_date || null,
          date_of_passing: memorialData.date_of_passing || memorialData.death_date || null,
          bio: memorialData.brief_biography || memorialData.short_description || memorialData.biography || null,
        });
      } else {
        setMemorial({ id, subject_name: '', cover_photo_url: null, date_of_birth: null, date_of_passing: null, bio: null });
      }
    } catch (err) {
      setError(err.message || 'Failed to load memorial');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) load(); });
    return () => { cancelled = true; };
  }, [id, load]);

  return (
    <div className="min-h-screen w-full bg-r-bg flex flex-col pb-20">
      <nav className="w-full flex items-center px-6 sm:px-8 py-5">
        <div className="flex items-center gap-2">
          <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
          <span className="text-r-text text-2xl leading-8 [font-family:var(--font-family-display)]">Remember</span>
        </div>
      </nav>

      <main className="flex-1 px-6 sm:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-r-border)', borderTopColor: 'var(--color-r-text)' }} />
          </div>
        ) : error ? (
          <OutputError onRetry={load} />
        ) : showIntro ? (
          <IntroView memorial={memorial} onStart={() => setShowIntro(false)} />
        ) : (
          <>
            {activeOutputTab === 'Slideshow' && <SlideshowSection output={output} memorial={memorial} />}
            {activeOutputTab === 'Constellations' && <ConstellationsSection output={output} memorial={memorial} contributor={contributors} />}
            {activeOutputTab === 'Voices' && <VoicesTab output={output} voices={output?.voices} variant="viewer" />}
            {activeOutputTab === 'Photo Archive' && <PhotoArchiveSection output={output} contributors={contributors} />}
          </>
        )}
      </main>

      {/* Bottom nav only visible after intro */}
      {!showIntro && <BottomNav active={activeOutputTab} onChange={setActiveTab} tabs={visibleTabs} />}
      {showShare && <ShareModal onClose={() => setShowShare(false)} memorialId={id} />}
    </div>
  );
}

// {/* <MemorialHeader memorial={memorial} onShare={() => setShowShare(true)} /> */}
//             {activeTab === 'Slideshow' && <SlideshowSection output={output} memorial={memorial} />}
//             {activeTab === 'Constellations' && <ConstellationsSection output={output} memorial={memorial} contributor={contributors} />}
//             {activeTab === 'Voices' && <VoicesTab output={output} voices={output?.voices} variant="viewer" />}
//             {activeTab === 'Contributions' && <ContributionsSection contributorslist={contributors} />}
//             {activeTab === 'Photo Archive' && <PhotoArchiveSection output={output} contributors={contributors} />}
