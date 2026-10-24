'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import { getContributorHighlights } from '@/lib/api';
import {
  buildRelationshipGroups, getRelationshipPath, getRelationshipPhotos,
  getRelationshipSummary, parseRelationshipPath,
} from '@/lib/viewer/relationships.mjs';
import { navigateViewerScreen } from '@/lib/viewer/viewerNavigation.mjs';
import ViewerTransition, { useViewerActive, useViewerPath } from './ViewerTransition';
import ViewerDialog from './ViewerDialog';
import styles from './ViewerRelationshipsSection.module.css';

function RelationshipList({ items, label, onSelect, circleRef }) {
  const viewportRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [geometry, setGeometry] = useState({ rowHeight: 182, viewportHeight: 546, radius: 760.5 });

  useEffect(() => {
    const viewport = viewportRef.current;
    const circle = circleRef.current;
    const observer = new ResizeObserver(() => {
      setGeometry({
        rowHeight: Number.parseFloat(getComputedStyle(viewport).getPropertyValue('--row-height')),
        viewportHeight: viewport.clientHeight,
        radius: circle.clientWidth / 2,
      });
    });
    observer.observe(viewport);
    observer.observe(circle);
    return () => observer.disconnect();
  }, [circleRef]);

  function handleKeyDown(event) {
    const buttons = [...viewportRef.current.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    const next = event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1)
      : event.key === 'ArrowUp' ? Math.max(index - 1, 0)
        : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : null;
    if (next !== null) {
      event.preventDefault();
      buttons[next]?.focus();
    }
  }

  return (
    <nav className={styles.list} aria-label={label}>
      <div ref={viewportRef} className={styles.listViewport} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)} onKeyDown={handleKeyDown}>
        {items.map((item, index) => {
          // Align each marker with the actual circle edge as the native list scrolls.
          const distance = (index + 0.5) * geometry.rowHeight - scrollTop - geometry.viewportHeight / 2 + 25;
          const inset = geometry.radius - Math.sqrt(Math.max(0, geometry.radius ** 2 - distance ** 2));
          return (
            <div className={styles.listRow} key={item.id}>
              <button type="button" className={styles.selection} style={{ '--curve-inset': `${inset}px` }} onClick={() => onSelect(item.id)}>
                <span className={styles.marker} aria-hidden="true">
                  <Image src="/images/viewer/navigation-dot.svg" width={24} height={24} alt="" />
                </span>
                <span className={styles.selectionLabel} title={item.label || item.name}>{item.label || item.name}</span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function RelationshipPhoto({ photo, name, className }) {
  const [failedUrl, setFailedUrl] = useState(null);
  return failedUrl === photo.url ? (
    <span className={`${className} ${styles.unavailable}`}>
      <ImageOff size={28} aria-hidden="true" />
      <span>This photo is unavailable</span>
    </span>
  ) : <Image src={photo.url} alt={photo.caption || `Photo shared by ${name}`} width={634} height={353} unoptimized className={className} onError={() => setFailedUrl(photo.url)} />;
}

function RelationshipPhotoDialog({ photos, initialIndex, name, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  function move(direction) {
    setIndex((current) => (current + direction + photos.length) % photos.length);
  }

  return (
    <ViewerDialog className={styles.photoDialog} label={`Photos shared by ${name}`} onClose={onClose} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    }}>
      <button type="button" className={styles.closePhoto} title="Close photo" aria-label="Close photo" onClick={onClose}><X size={28} aria-hidden="true" /></button>
      <ViewerTransition motionKey={photo.id} path={`photo/${index}`} className={styles.fullPhoto} focusOnEnter={false} name="photo">
        <RelationshipPhoto key={photo.id} photo={photo} name={name} className={styles.fullPhoto} />
      </ViewerTransition>
      <div className={styles.photoCaption} aria-live="polite">
        {photo.caption ? <p>{photo.caption}</p> : null}
        <p>{name}</p>
        <span>{index + 1} / {photos.length}</span>
      </div>
      {photos.length > 1 ? (
        <>
          <button type="button" className={styles.previousPhoto} title="Previous photo" aria-label="Previous photo" onClick={() => move(-1)}><ChevronLeft size={28} aria-hidden="true" /></button>
          <button type="button" className={styles.nextPhoto} title="Next photo" aria-label="Next photo" onClick={() => move(1)}><ChevronRight size={28} aria-hidden="true" /></button>
        </>
      ) : null}
    </ViewerDialog>
  );
}

function PersonDetails({ person, output, memorialId, shareToken, subjectName }) {
  const active = useViewerActive();
  const [result, setResult] = useState({ data: null, loading: true, error: false });
  const [requestVersion, setRequestVersion] = useState(0);
  const [photoSelection, setPhotoSelection] = useState(null);
  const photos = getRelationshipPhotos(output, person.id, result.data);
  const summary = getRelationshipSummary(output, person.id) || result.data?.quote || '';

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    getContributorHighlights({ contributorId: person.id, memorialId, shareToken, signal: controller.signal, throwOnError: true })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ data, loading: false, error: false });
      }).catch(() => {
        if (!controller.signal.aborted) setResult({ data: null, loading: false, error: true });
      });
    return () => controller.abort();
  }, [active, person.id, memorialId, shareToken, requestVersion]);

  return (
    <>
      <header className={styles.personSummary}>
        <div className={styles.personIdentity}>
          <h1 tabIndex={-1}>{person.name}</h1>
          <p>{person.relationship} to {subjectName}.</p>
        </div>
        {summary ? <blockquote>{summary}</blockquote> : null}
      </header>
      <section className={styles.gallery} aria-label={`Photos shared by ${person.name}`} aria-busy={result.loading}>
        {photos.map((photo, index) => (
          <button type="button" key={photo.id} className={styles.photoButton} aria-label={`Enlarge ${photo.caption || `photo ${index + 1} shared by ${person.name}`}`} onClick={() => setPhotoSelection({ photos, index })}>
            <RelationshipPhoto photo={photo} name={person.name} className={styles.galleryPhoto} />
          </button>
        ))}
        {result.loading && !photos.length ? (
          <div className={styles.photoStatus} role="status">
            <span className={styles.loadingPhoto} />
            <span>Loading photos...</span>
          </div>
        ) : result.error ? (
          <div className={styles.photoStatus} role="alert">
            <p>These memories could not be loaded.</p>
            <button type="button" className={styles.retry} onClick={() => {
              setResult({ data: null, loading: true, error: false });
              setRequestVersion((value) => value + 1);
            }}>Try again</button>
          </div>
        ) : !photos.length ? <p className={styles.photoStatus}>No photos were shared by this person.</p> : null}
      </section>
      <AnimatePresence>{photoSelection && active ? <RelationshipPhotoDialog photos={photoSelection.photos} initialIndex={photoSelection.index} name={person.name} onClose={() => setPhotoSelection(null)} /> : null}</AnimatePresence>
    </>
  );
}

export default function ViewerRelationshipsSection({ output, memorial, contributors = [], onBack }) {
  const params = useParams();
  const requestedPath = useViewerPath();
  const reduced = useReducedMotion();
  const { groupId, personId } = parseRelationshipPath(requestedPath);
  const groups = useMemo(() => buildRelationshipGroups(contributors), [contributors]);
  const group = groups.find((item) => item.id === groupId) || (groups.length === 1 ? groups[0] : undefined);
  const person = group?.people.find((item) => item.id === personId);
  const circleRef = useRef(null);
  const subjectName = memorial?.subject_name || memorial?.deceased_name || 'your loved one';
  const hasPeople = groups.some((item) => item.people.length > 0);

  function back() {
    if (person) navigateViewerScreen(getRelationshipPath(group.id));
    else if (group && groups.length > 1) navigateViewerScreen('relationships');
    else if (onBack) onBack();
    else navigateViewerScreen('navigation');
  }

  return (
    <section className={styles.stage} data-relationship-step={person ? 'person' : group ? 'people' : 'categories'} style={{ '--relationship-color': group?.color || '#9E9384' }} aria-label="Relationships">
      <motion.div ref={circleRef} className={styles.circle} aria-hidden="true" initial={{ x: reduced ? 0 : -32 }} animate={{ x: 0 }} transition={{ duration: reduced ? 0 : 0.4 }} />
      <button type="button" className={styles.back} onClick={back} aria-label={person ? `Back to ${group.label}` : group && groups.length > 1 ? 'Back to relationship categories' : 'Back to memorial sections'}>
        <ArrowLeft size={25} aria-hidden="true" />Back
      </button>
      <ViewerTransition motionKey={person ? `person/${person.id}` : group?.id || 'categories'} path={requestedPath} className={styles.content} name="relationships">
      {person ? (
        <PersonDetails key={person.id} person={person} output={output} memorialId={memorial?.id} shareToken={params?.shareToken} subjectName={subjectName} />
      ) : (
        <>
          <header className={styles.summary}>
            <h1 tabIndex={-1}>{group ? `${subjectName}'s ${group.label}` : 'Relationships'}</h1>
            {!group ? <p>Those who were a part of {subjectName}&apos;s life.</p> : null}
          </header>
          {group?.people.length || (!group && hasPeople) ? (
            <RelationshipList key={group?.id || 'categories'} circleRef={circleRef} items={group ? group.people : groups} label={group ? `${group.label} of ${subjectName}` : 'Relationship categories'} onSelect={(id) => navigateViewerScreen(group ? getRelationshipPath(group.id, id) : getRelationshipPath(id))} />
          ) : <p className={styles.empty}>{group ? `No ${group.label.toLowerCase()} have contributed to this memorial yet.` : 'No relationships have been shared yet.'}</p>}
        </>
      )}
      </ViewerTransition>
    </section>
  );
}
