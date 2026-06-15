'use client';

// frontend/src/app/(viewer)/share/[shareToken]/page.jsx
//
// Matches /memorial/[id]/output/page.jsx exactly.
// Only differences: data from getShareToken(), no auth, InvalidToken error state.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getShareToken } from '@/lib/api';
import ConstellationGraph from "@/components/output/constellation";
import StorySlideshow from '@/components/output/StorySlideshow';
import VoicesTab from '@/components/output/VoicesTab';

// ─── Filter Select ────────────────────────────────────────────────────────────

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

const NAV_TABS = ['Slideshow', 'Constellations', 'Voices', 'Photo Archive'];

function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex bg-r-bg border-t border-r-border">
      {NAV_TABS.map((tab) => (
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

// ─── Slideshow (matches output page exactly) ──────────────────────────────────

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

// ─── Constellations (matches output page exactly) ────────────────────────────

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
          <button key={photo.id || i} onClick={() => openLightbox(photo, i)}
            className="group relative rounded-xl overflow-hidden border border-r-border cursor-pointer hover:opacity-90 transition-opacity"
            style={{ aspectRatio: '4/3' }}>
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
          <button key={i}
            onClick={() => setOpenAlbum(openAlbum?.album_name === album.album_name ? null : album)}
            className="group rounded-2xl border overflow-hidden text-left transition-colors bg-r-card hover:border-r-text"
            style={{ border: `1px solid ${openAlbum?.album_name === album.album_name ? 'var(--color-r-text)' : 'var(--color-r-border)'}` }}>
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

function ContributorRow({ contributor, photos }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 items-stretch">
        <div className="rounded-2xl border border-r-border bg-r-card p-5 flex flex-col justify-between">
          <div>
            <h3 className="[font-family:var(--font-family-display)] text-lg text-r-text mb-1">{contributor.name}</h3>
            <p className="text-xs text-r-muted mb-0.5">
              {contributor.submitted_at
                ? `Last submitted ${new Date(contributor.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'In progress'}
            </p>
          </div>
          <button className="self-start mt-3 px-4 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-r-shape)', color: '#FBF9F6' }}>
            {contributor.relationship_type || 'Other'}
          </button>
        </div>
        <div className="rounded-2xl border border-r-border overflow-hidden bg-r-card" style={{ minHeight: '160px' }}>
          {photos[0]?.url ? <img src={photos[0].url} alt={photos[0].caption || ''} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-r-card" />}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="rounded-2xl overflow-hidden relative" style={{ minHeight: '160px' }}>
          {photos[1]?.url ? <img src={photos[1].url} alt={photos[1].caption || ''} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-r-card" />}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, rgba(138,155,110,0.85) 0%, rgba(138,155,110,0.4) 50%, transparent 100%)' }} />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={expanded ? 'M18 15l-6-6-6 6' : 'M9 5l7 7-7 7'} />
            </svg>
          </div>
        </button>
      </div>
      {expanded && photos.length > 0 && (
        <div className="mt-3 rounded-2xl border border-r-border bg-r-card p-4">
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <div key={photo.id || i} className="rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {photo.url ? <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-r-card" />}
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
  const filtered = filter === 'all' ? contributors : contributors.filter((c) => (c.relationship_type || '').toLowerCase() === filter);
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
        <ContributorRow key={contributor.id} contributor={contributor} photos={photosByContributor[contributor.name] || []} />
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
  const sortedPhotos = [...allPhotos].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.taken_at || 0) - new Date(b.taken_at || 0);
    return new Date(b.taken_at || 0) - new Date(a.taken_at || 0);
  });
  return (
    <div>
      <h2 className="text-[40px] font-medium italic text-r-text mb-6" style={{ fontFamily: 'var(--font-family-display)' }}>
        Photo archive
      </h2>
      <div className="flex items-center justify-between mb-6 gap-4">
        <FilterSelect value={view} onChange={(val) => setView(val)} className="flex-1 max-w-[320px]">
          <option value="all_photos">All Photos</option>
          <option value="albums">Albums</option>
          <option value="contributors">Contributors</option>
        </FilterSelect>
        <div className="flex items-center gap-3">
          {view === 'contributors' && (
            <FilterSelect value={contributorFilter} onChange={setContributorFilter} className="w-[180px]">
              <option value="all">Filter</option>
              <option value="family">Family</option>
              <option value="friend">Friend</option>
              <option value="colleague">Colleague</option>
              <option value="other">Other</option>
            </FilterSelect>
          )}
          {view !== 'contributors' && (
            <FilterSelect value={sort} onChange={setSort} className="w-[207px]">
              <option value="sort" disabled>Sort</option>
              <option value="recently_added">Recently added</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </FilterSelect>
          )}
        </div>
      </div>
      {view === 'all_photos' && <PhotosGrid photos={sortedPhotos} />}
      {view === 'albums' && <AlbumsGrid albums={albums} />}
      {view === 'contributors' && <ContributorsView contributors={contributors} output={output} filter={contributorFilter} />}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function InvalidToken({ message }) {
  return (
    <div className="min-h-screen w-full bg-r-bg flex flex-col">
      <nav className="w-full flex items-center px-6 sm:px-8 py-5">
        <div className="flex items-center gap-2">
          <img src="/Logo.svg" alt="" width={36} height={36} aria-hidden="true" />
          <span className="text-r-text text-2xl leading-8 [font-family:var(--font-family-display)]">Remember</span>
        </div>
      </nav>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4 bg-r-card">
          <svg width="24" height="24" fill="none" stroke="var(--color-r-danger)" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-h3 text-r-text mb-2">This link is no longer available</h2>
        <p className="max-w-xs leading-relaxed text-body-2 text-r-muted">{message || 'The share link may have expired or been removed.'}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SharePage() {
  const { shareToken } = useParams();
  const [activeTab, setActiveTab] = useState('Slideshow');
  const [output, setOutput] = useState(null);
  const [memorial, setMemorial] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getShareToken(shareToken);

        // getShareToken may nest output under data.output_json or data.output.
        // getMemorialOutput returns output_json directly.
        // Unwrap so ConstellationGraph and other components receive the same shape.
        const outputData = data.output_json ?? data.output ?? data;

        setOutput(outputData);
        setContributors(
          data.contributors || data.contributor ||
          outputData.contributors || outputData.contributor || []
        );

        const m = data.memorial || data;
        setMemorial({
          id: m.id,
          subject_name: m.subject_name || m.deceased_name || '',
          cover_photo_url: m.cover_photo_url || m.profile_photo_url || null,
          date_of_birth: m.date_of_birth || m.birth_date || null,
          date_of_passing: m.date_of_passing || m.death_date || null,
          bio: m.brief_biography || m.short_description || m.biography || null,
        });
      } catch (err) {
        setError(err.message || 'This link is no longer available.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shareToken]);

  if (error) return <InvalidToken message={error} />;

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
        ) : showIntro ? (
          <IntroView memorial={memorial} onStart={() => setShowIntro(false)} />
        ) : (
          <>
            {activeTab === 'Slideshow' && <SlideshowSection output={output} memorial={memorial} />}
            {activeTab === 'Constellations' && <ConstellationsSection output={output} memorial={memorial} contributor={contributors} />}
            {activeTab === 'Voices' && <VoicesTab output={output} voices={output?.voices} variant="viewer" />}
            {activeTab === 'Photo Archive' && <PhotoArchiveSection output={output} contributors={contributors} />}
          </>
        )}
      </main>

      {!showIntro && <BottomNav active={activeTab} onChange={setActiveTab} />}
    </div>
  );
}
