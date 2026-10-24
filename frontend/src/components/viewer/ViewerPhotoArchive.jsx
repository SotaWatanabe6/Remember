'use client';

// frontend/src/components/viewer/ViewerPhotoArchive.jsx
// Viewer-facing Photos tab (Figma: Photo Archive with All Photos / Albums /
// Contributors, album detail, and the white photo lightbox).

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import ViewerDialog from './ViewerDialog';
import ViewerTransition, { useViewerActive } from './ViewerTransition';

// ─── Data ─────────────────────────────────────────────────────────────────────

function normalizePhoto(photo, albumName, key) {
  return {
    id: photo?.id ?? key,
    url: photo?.url || photo?.photo_url || null,
    caption: photo?.caption || null,
    takenAt: photo?.taken_at || null,
    contributorName: photo?.contributor_name || null,
    albumName,
  };
}

// output.photos is either { albums: [...] }, an array of albums, or a flat array.
function normalizeAlbums(photos) {
  if (!photos) return [];
  const list = Array.isArray(photos?.albums) ? photos.albums : Array.isArray(photos) ? photos : [];
  if (!list.length) return [];

  const looksLikeAlbums = list.some((item) => Array.isArray(item?.photos));
  if (!looksLikeAlbums) {
    return [{ id: 'all', name: 'All photos', photos: list.map((photo, i) => normalizePhoto(photo, 'All photos', `photo-${i}`)) }];
  }

  return list.map((album, albumIndex) => {
    const name = album?.name || album?.album_name || `Album ${albumIndex + 1}`;
    return {
      id: album?.id ?? `album-${albumIndex}`,
      name,
      photos: (album?.photos || []).map((photo, i) => normalizePhoto(photo, name, `${albumIndex}-${i}`)),
    };
  });
}

// The same photo can sit in more than one album; the archive lists it once.
function uniquePhotos(photos) {
  const seen = new Set();
  return photos.filter((photo) => {
    if (seen.has(photo.id)) return false;
    seen.add(photo.id);
    return true;
  });
}

function sortPhotos(photos, sort) {
  const time = (photo) => (photo.takenAt ? new Date(photo.takenAt).getTime() || 0 : 0);
  return [...photos].sort((a, b) => (sort === 'oldest' ? time(a) - time(b) : time(b) - time(a)));
}

function photoCount(count) {
  return `${count} photo${count === 1 ? '' : 's'}`;
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function SortSelect({ value, onChange }) {
  return (
    <label className="relative block w-[206px] max-sm:w-[150px]">
      <span className="sr-only">Sort photos</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[63px] w-full cursor-pointer appearance-none rounded-[13px] border border-r-muted bg-transparent pl-[18px] pr-14 font-display text-[24px] font-medium text-r-text outline-none focus:ring-2 focus:ring-r-border-focus"
      >
        <option value="" disabled hidden>Sort</option>
        <option value="recent">Recently added</option>
        <option value="oldest">Oldest</option>
      </select>
      <span className="pointer-events-none absolute right-[18px] top-1/2 size-0 -translate-y-1/2 border-x-[10px] border-t-[18px] border-x-transparent border-t-r-text" aria-hidden="true" />
    </label>
  );
}

function PhotoTile({ photo, onOpen }) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={photo.caption || 'Open photo'}
      className="group relative block aspect-[433/297] w-full overflow-hidden bg-r-card"
    >
      {photo.url && !failed ? (
        <img
          src={photo.url}
          alt={photo.caption || ''}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
        />
      ) : null}
    </button>
  );
}

function PhotoGrid({ photos, columns = 3, onOpen }) {
  return (
    <div className={`grid gap-5 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
      {photos.map((photo, index) => (
        <PhotoTile key={photo.id} photo={photo} onOpen={() => onOpen(photos, index)} />
      ))}
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-body-2 font-medium text-r-text">{title}</p>
      <p className="mt-1 max-w-xs text-body-2 text-r-muted">{body}</p>
    </div>
  );
}

function ArcHeader() {
  const reduced = useReducedMotion();
  const anchorRef = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    function measure() {
      const el = anchorRef.current;
      if (el) {
        let top = 0;
        // Layout offsets exclude the screen's temporary entrance transform.
        for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
        setOffset(Math.max(0, top));
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div ref={anchorRef} className="relative left-1/2 -ml-[50vw] w-screen" style={{ height: Math.max(0, 320 - offset) }}>
      <div className="pointer-events-none absolute inset-x-0 overflow-hidden" style={{ top: -offset, height: 320 }}>
        <motion.div className="absolute left-1/2 top-[-1200px] h-[1520px] w-[1520px] rounded-full bg-r-panel" style={{ x: '-50%' }} initial={{ y: reduced ? 0 : -32 }} animate={{ y: 0 }} transition={{ duration: reduced ? 0 : 0.4 }} aria-hidden="true" />
        <h1 className="absolute inset-x-0 top-[104px] text-center font-display text-[40px] font-bold leading-[48px] text-r-modal">Photo Archive</h1>
      </div>
    </div>
  );
}

function Lightbox({ photos, index, onClose, onChange }) {
  const photo = photos[index];
  const hasMany = photos.length > 1;

  if (!photo) return null;

  return (
    <ViewerDialog label="Photo" background="modal" className="flex flex-col items-center justify-center px-6" onClose={onClose} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft' && hasMany) { event.preventDefault(); onChange((index - 1 + photos.length) % photos.length); }
      if (event.key === 'ArrowRight' && hasMany) { event.preventDefault(); onChange((index + 1) % photos.length); }
    }}>
      <button
        type="button"
        onClick={onClose}
        autoFocus
        aria-label="Close photo"
        className="absolute left-[60px] top-[96px] text-r-muted transition-opacity hover:opacity-70 max-sm:left-5 max-sm:top-6"
      >
        <X size={32} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {hasMany ? (
        <>
          <button
            type="button"
            onClick={() => onChange((index - 1 + photos.length) % photos.length)}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-r-muted transition-opacity hover:opacity-70 sm:left-[60px]"
          >
            <ChevronLeft size={36} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onChange((index + 1) % photos.length)}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-r-muted transition-opacity hover:opacity-70 sm:right-[60px]"
          >
            <ChevronRight size={36} aria-hidden="true" />
          </button>
        </>
      ) : null}

      <ViewerTransition motionKey={photo.id} path={`photo/${index}`} className="w-full max-w-[886px] px-8 sm:px-16" focusOnEnter={false} name="photo">
        <EnlargedPhoto key={photo.id} photo={photo} />
        <div className="mt-5 flex flex-col gap-1">
          {photo.caption ? <p className="text-body-2 text-r-text">{photo.caption}</p> : null}
          {photo.contributorName ? <p className="text-body-2 text-r-muted">Submitted by {photo.contributorName}</p> : null}
        </div>
      </ViewerTransition>
    </ViewerDialog>
  );
}

function EnlargedPhoto({ photo }) {
  const [failed, setFailed] = useState(false);
  return photo.url && !failed ? (
    <img src={photo.url} alt={photo.caption || ''} onError={() => setFailed(true)} className="mx-auto max-h-[62svh] w-auto max-w-full object-contain" />
  ) : (
    <div className="flex min-h-48 flex-col items-center justify-center gap-4 bg-r-card p-6 text-center">
      <ImageOff size={32} aria-hidden="true" /><p>This photo is unavailable</p>
    </div>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function AlbumsView({ albums, openAlbumId, onOpenAlbum, onCloseAlbum, sort, onSortChange, onOpenPhoto }) {
  const openAlbum = albums.find((album) => album.id === openAlbumId) ?? null;

  if (!albums.length) {
    return <EmptyState title="No albums yet" body="Albums will appear here once the memorial has been generated." />;
  }

  if (openAlbum) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-5">
          <button type="button" onClick={onCloseAlbum} aria-label="Back to albums" className="text-r-text transition-opacity hover:opacity-70">
            <ArrowLeft size={36} aria-hidden="true" />
          </button>
          <h2 tabIndex={-1} data-viewer-focus className="min-w-0 flex-1 break-words font-display text-[28px] font-medium italic leading-[36px] text-r-secondary sm:text-[36px] sm:leading-[44px]">{openAlbum.name}</h2>
          <SortSelect value={sort} onChange={onSortChange} />
        </div>
        <PhotoGrid photos={sortPhotos(openAlbum.photos, sort)} onOpen={onOpenPhoto} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((album) => (
        <button
          key={album.id}
          type="button"
          onClick={() => onOpenAlbum(album.id)}
          className="flex h-[335px] flex-col items-center justify-center gap-2 rounded-[20px] border border-r-muted px-6 text-center transition hover:bg-r-card/50 max-sm:h-[200px]"
        >
          <span className="font-display text-[24px] font-medium text-r-muted">{album.name}</span>
          <span className="text-caption text-r-muted">{photoCount(album.photos.length)}</span>
        </button>
      ))}
    </div>
  );
}

function ContributorsView({ contributors, photosByName, onOpenPhoto }) {
  const rows = contributors
    .map((contributor) => ({ contributor, photos: photosByName.get(contributor.name) ?? [] }))
    .filter((row) => row.photos.length > 0);
  const [selectedId, setSelectedId] = useState(null);
  const selected = rows.find((row) => row.contributor.id === selectedId) ?? rows[0];

  if (!rows.length) {
    return <EmptyState title="No contributor photos yet" body="Photos grouped by contributor will appear here." />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[433px_minmax(0,1fr)]">
      <ul className="flex flex-col gap-5">
        {rows.map(({ contributor, photos }) => {
          const isSelected = contributor.id === selected.contributor.id;
          return (
            <li key={contributor.id}>
              <button
                type="button"
                onClick={() => setSelectedId(contributor.id)}
                aria-pressed={isSelected}
                className={`flex w-full flex-col justify-center rounded-[20px] px-5 text-left transition ${
                  isSelected
                    ? 'min-h-[200px] gap-2 bg-r-panel text-r-modal'
                    : 'h-[100px] border border-r-muted text-r-muted hover:bg-r-card/50'
                }`}
              >
                <span className="font-display text-[24px] font-medium leading-tight">{contributor.name}</span>
                {isSelected ? (
                  <>
                    <span className="text-body-2 text-r-modal">{photoCount(photos.length)}</span>
                    {contributor.relationship_type ? (
                      <span className="mt-1 flex h-[50px] w-[207px] max-w-full items-center justify-center rounded-[10px] bg-[#D9D9D9] text-caption text-r-text">
                        {contributor.relationship_type}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <ViewerTransition motionKey={selected.contributor.id} path={`photos/contributor/${selected.contributor.id}`} focusOnEnter={false} name="contributor-photos">
        <PhotoGrid photos={selected.photos} columns={2} onOpen={onOpenPhoto} />
      </ViewerTransition>
    </div>
  );
}

// ─── Photo Archive ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all', label: 'All Photos' },
  { id: 'albums', label: 'Albums' },
  { id: 'contributors', label: 'Contributors' },
];

export default function ViewerPhotoArchive({ output, contributors = [] }) {
  const active = useViewerActive();
  const tabId = useId();
  const [view, setView] = useState('all');
  const [sort, setSort] = useState('');
  const [openAlbumId, setOpenAlbumId] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const albums = useMemo(() => normalizeAlbums(output?.photos), [output]);
  const allPhotos = useMemo(() => uniquePhotos(albums.flatMap((album) => album.photos)), [albums]);
  const photosByName = useMemo(() => {
    const map = new Map();
    allPhotos.forEach((photo) => {
      if (!photo.contributorName) return;
      map.set(photo.contributorName, [...(map.get(photo.contributorName) ?? []), photo]);
    });
    return map;
  }, [allPhotos]);

  function changeView(next) {
    setView(next);
    setOpenAlbumId(null);
  }

  function openPhoto(photos, index) {
    setLightbox({ photos, index });
  }

  const showSort = view === 'all';

  return (
    <div className="w-full">
      <ArcHeader />

      <div className="mt-[60px] flex flex-wrap items-center justify-between gap-4">
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:gap-5" role="tablist" aria-label="Photo archive views" onKeyDown={(event) => {
          const index = TABS.findIndex((tab) => tab.id === view);
          const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length
            : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null;
          if (next !== null) {
            event.preventDefault();
            changeView(TABS[next].id);
            document.getElementById(`${tabId}-${TABS[next].id}`)?.focus();
          }
        }}>
          {TABS.map((tab) => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${tabId}-${tab.id}`}
                aria-controls={`${tabId}-panel`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => changeView(tab.id)}
                className={`h-[50px] min-w-[207px] rounded-full px-8 font-display text-[24px] font-medium transition max-sm:min-w-0 max-sm:px-4 max-sm:text-[18px] max-sm:last:col-span-2 ${
                  isActive ? 'bg-r-panel text-r-modal' : 'border border-r-muted text-r-muted hover:bg-r-card/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {showSort ? <SortSelect value={sort} onChange={setSort} /> : null}
      </div>

      <ViewerTransition motionKey={`${view}/${openAlbumId || ''}`} path={`photos/${view}${openAlbumId ? `/${openAlbumId}` : ''}`} className="mt-8 pb-16" focusOnEnter={Boolean(openAlbumId)} name="archive">
      <section role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${view}`} tabIndex={0}>
        {view === 'all' ? (
          allPhotos.length ? (
            <PhotoGrid photos={sortPhotos(allPhotos, sort)} onOpen={openPhoto} />
          ) : (
            <EmptyState title="No photos yet" body="Photos will appear here once the memorial has been generated." />
          )
        ) : null}

        {view === 'albums' ? (
          <AlbumsView
            albums={albums}
            openAlbumId={openAlbumId}
            onOpenAlbum={setOpenAlbumId}
            onCloseAlbum={() => setOpenAlbumId(null)}
            sort={sort}
            onSortChange={setSort}
            onOpenPhoto={openPhoto}
          />
        ) : null}

        {view === 'contributors' ? (
          <ContributorsView contributors={contributors} photosByName={photosByName} onOpenPhoto={openPhoto} />
        ) : null}
      </section>
      </ViewerTransition>

      <AnimatePresence>{lightbox && active ? (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(index) => setLightbox((current) => ({ ...current, index }))}
        />
      ) : null}</AnimatePresence>
    </div>
  );
}
