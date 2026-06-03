'use client';

// frontend/src/app/(viewer)/share/[shareToken]/page.jsx

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getShareToken, getMemorialById } from '@/lib/api';
import { mockMemorials } from '@/data/mockMemorials.js';
import ConstellationGraph from "@/components/output/constellation";
import StorySlideshow from '@/components/output/StorySlideshow';
import VoicesTab from '@/components/output/VoicesTab';

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = ['Story', 'Constellation', 'Voices', 'All Photos'];

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl p-1 bg-r-card" style={{ border: '1px solid var(--color-r-border)' }}>
      {TABS.map((tab) => (
        <button key={tab} onClick={() => onChange(tab)} className="flex-1 rounded-lg py-2 transition-all duration-150 text-h4 border-none"
          style={{
            fontWeight: active === tab ? 500 : 400,
            color: active === tab ? 'var(--color-r-text)' : 'var(--color-r-muted)',
            backgroundColor: active === tab ? 'var(--color-r-modal)' : 'transparent',
            boxShadow: active === tab ? '0 1px 4px rgba(66,63,57,0.08)' : 'none',
          }}>
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Memorial header — viewer only ────────────────────────────────────────────

function MemorialHeader({ memorial }) {
  const birthYear = memorial?.date_of_birth ? new Date(memorial.date_of_birth).getFullYear() : null;
  const passingYear = memorial?.date_of_passing ? new Date(memorial.date_of_passing).getFullYear() : null;

  return (
    <div className="flex items-start gap-8">
      <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full bg-r-shape">
        {memorial?.cover_photo_url
          ? <img src={memorial.cover_photo_url} alt={memorial.subject_name} className="h-full w-full object-cover" />
          : <div className="h-full w-full bg-r-shape" />}
      </div>
      <div className="flex-1 min-w-0 pt-2">
        <h1 className="text-h1 text-r-text">{memorial?.subject_name || memorial?.deceased_name || 'Memorial'}</h1>
        {(birthYear || passingYear) && (
          <p className="mt-1 text-body-2 text-r-muted">
            {birthYear && passingYear ? `${birthYear} – ${passingYear}` : birthYear || passingYear}
          </p>
        )}
        {(memorial?.brief_biography || memorial?.short_description) && (
          <p className="mt-2 max-w-md text-body-2 text-r-secondary" style={{ lineHeight: 1.6 }}>
            {memorial.brief_biography || memorial.short_description}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Constellation tab ────────────────────────────────────────────────────────

function ConstellationTab({ data ,memorial, contributor}) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-body-2 font-medium text-r-text">No constellation yet</p>
        <p className="mt-1 text-body-2 text-r-muted">The constellation will appear here once the memorial has been generated.</p>
      </div>
    );
  }
  return <div className="py-4"><ConstellationGraph ai_output={data} memorial={memorial} contributor={contributor} width={800} height={800}/></div>;
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
        <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4 bg-r-card">
          <svg width="24" height="24" fill="none" stroke="var(--color-r-muted)" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-body-2 font-medium text-r-text">No photos submitted</p>
        <p className="mt-1 text-body-2 text-r-muted">Photos will appear here once the memorial is generated.</p>
      </div>
    );
  }

  if (!openAlbum) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {albums.map((album, i) => (
          <button key={i} onClick={() => setOpenAlbum(album)} className="group text-left">
            <div className="aspect-square overflow-hidden rounded-2xl relative bg-r-card">
              {album.cover_photo_url || album.photos?.[0]?.url
                ? <img src={album.cover_photo_url || album.photos[0].url} alt={album.album_name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                : <div className="h-full w-full flex items-center justify-center bg-r-card">
                    <svg width="28" height="28" fill="none" stroke="var(--color-r-muted)" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>}
              <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                {album.photos?.length || 0}
              </div>
            </div>
            <p className="mt-2 leading-snug text-body-2 font-medium text-r-text">{album.album_name}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setOpenAlbum(null)}
        className="mb-6 flex items-center gap-1.5 transition-colors text-body-2 text-r-muted bg-none border-none cursor-pointer"
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-r-text)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-r-muted)'; }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        All albums
      </button>
      <h2 className="text-h3 text-r-text mb-1">{openAlbum.album_name}</h2>
      <p className="mb-6 text-body-2 text-r-muted">{openAlbum.photos?.length || 0} photos</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {openAlbum.photos?.map((photo, index) => (
          <button key={photo.id} onClick={() => openLightbox(photo, index)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-r-card">
            {photo.url
              ? <img src={photo.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              : <div className="h-full w-full bg-r-card" />}
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
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onPrev={prevPhoto} onNext={nextPhoto} />
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-start gap-8">
        <div className="h-36 w-36 shrink-0 rounded-full bg-r-card" />
        <div className="flex-1 pt-2 space-y-3">
          <div className="h-8 w-48 rounded bg-r-card" />
          <div className="h-4 w-24 rounded bg-r-card" />
          <div className="h-4 w-64 rounded bg-r-card" />
        </div>
      </div>
      <div className="h-10 rounded-xl bg-r-card" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <div className="aspect-square rounded-2xl bg-r-card" />
            <div className="mt-2 h-3 w-3/4 rounded bg-r-card" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── normalizePhotos ──────────────────────────────────────────────────────────

function normalizePhotos(photos) {
  if (!photos) return [];
  if (photos.albums) {
    return photos.albums.map((a) => ({
      album_name: a.name, cover_photo_url: a.cover_photo_url || null,
      photos: (a.photos || []).map((p) => ({
        id: p.id, url: p.url || null, caption: p.caption || null,
        taken_at: p.taken_at || null, contributor_name: p.contributor_name || null,
      })),
    }));
  }
  return photos;
}

// ─── Invalid token screen ─────────────────────────────────────────────────────

function InvalidToken({ message }) {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-[50px] bg-r-bg">
      <div className="mx-auto max-w-[680px]">
        <nav className="flex h-10 items-center">
          <span className="text-h4 text-r-text">Remember</span>
        </nav>
        <div className="mt-24 flex flex-col items-center text-center">
          <div className="relative w-20 h-14 mx-auto mb-8">
            <div className="absolute left-0 top-0 w-14 h-14 rounded-full bg-r-card" />
            <div className="absolute right-0 top-2 w-10 h-10 rounded-full bg-r-border" />
          </div>
          <h2 className="text-h3 text-r-text mb-2">This link is no longer available</h2>
          <p className="max-w-xs leading-relaxed text-body-2 text-r-muted">{message}</p>
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
  const [memorial, setMemorial] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getShareToken(shareToken);
        console.log("Share token data:", data);
        setOutput(data);
        setContributors(data.contributor || []);
        setMemorial(data.memorial || mockMemorials[0]);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }
    load();
  }, [shareToken]);

  if (error) return <InvalidToken message={error} />;

  return (
    <main className="min-h-screen w-full px-6 py-10 sm:px-[50px] bg-r-bg text-r-text">
      <div className="page-shell-wide">

        <nav className="flex h-10 items-center">
          <span className="text-h4 text-r-text">Remember</span>
        </nav>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <MemorialHeader memorial={memorial} />
            <TabBar active={activeTab} onChange={setActiveTab} />
            <div>
              {activeTab === 'Story' && <StorySlideshow output={output} story={output?.story} />}
              {activeTab === 'Constellation' && <ConstellationTab data={output} memorial={memorial} contributor={contributors} />}
              {activeTab === 'Voices' && <VoicesTab output={output} voices={output?.voices} />}
              {activeTab === 'All Photos' && <AllPhotosTab albums={normalizePhotos(output?.photos)} />}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
