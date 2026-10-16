'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { ArrowLeft, ChevronDown, ImageOff, Menu, Pause, Play } from 'lucide-react';
import { formatStoryDate } from '@/lib/storySlides.mjs';
import { buildViewerStory, getStoryChapterTitle, getStoryPath, getStorySlideDuration, getStorySlideText, parseStoryPath } from '@/lib/viewer/story.mjs';
import { getViewerScreenSnapshot, navigateViewerScreen, subscribeToViewerNavigation } from '@/lib/viewer/viewerNavigation.mjs';
import styles from './ViewerStorySection.module.css';

function StoryChapters({ chapters, onSelect, circleRef }) {
  const viewportRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [geometry, setGeometry] = useState({ rowHeight: 182, height: 546, radius: 760.5 });

  useEffect(() => {
    const viewport = viewportRef.current;
    const circle = circleRef.current;
    const observer = new ResizeObserver(() => setGeometry({
      rowHeight: Number.parseFloat(getComputedStyle(viewport).getPropertyValue('--row-height')),
      height: viewport.clientHeight,
      radius: circle.clientWidth / 2,
    }));
    observer.observe(viewport);
    observer.observe(circle);
    return () => observer.disconnect();
  }, [circleRef]);

  function handleKey(event) {
    const buttons = [...viewportRef.current.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    const next = event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1)
      : event.key === 'ArrowUp' ? Math.max(0, index - 1)
        : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : null;
    if (next !== null) { event.preventDefault(); buttons[next]?.focus(); }
  }

  return (
    <nav className={styles.chapters} aria-label="Story chapters">
      <div ref={viewportRef} className={styles.chapterViewport} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)} onKeyDown={handleKey}>
        {chapters.map((chapter, index) => {
          const distance = (index + 0.5) * geometry.rowHeight - scrollTop - geometry.height / 2 + 25;
          const inset = geometry.radius - Math.sqrt(Math.max(0, geometry.radius ** 2 - distance ** 2));
          return (
            <div className={styles.chapterRow} key={chapter.id}>
              <button type="button" className={styles.chapter} style={{ '--curve-inset': `${inset}px` }} onClick={() => onSelect(chapter.startIndex)}>
                <span className={styles.chapterLabel} title={chapter.label}>{chapter.label}</span>
                <span className={styles.marker} aria-hidden="true"><Image src="/images/viewer/navigation-dot.svg" width={24} height={24} alt="" /></span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function StoryPhoto({ url, title }) {
  const [failedUrl, setFailedUrl] = useState(null);
  return (
    <div className={styles.photo}>
      {failedUrl === url ? <div className={styles.unavailable}><ImageOff size={32} aria-hidden="true" /><p>This photo is unavailable</p></div>
        : <Image src={url} alt={`Photo from ${title}`} fill sizes="(max-width: 700px) calc(100vw - 48px), 46vw" unoptimized className={styles.photoImage} onError={() => setFailedUrl(url)} />}
    </div>
  );
}

function StoryPlayer({ slides, index, memorial, onChange, onChapters }) {
  const [playing, setPlaying] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const headingRef = useRef(null);
  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const photoUrl = slide.photoUrl || (slide.slideType === 'opening' ? memorial.cover_photo_url : null);
  const title = slide.slideType === 'opening' ? slide.subjectName || memorial.subject_name || 'In Loving Memory'
    : slide.slideType === 'farewell' ? 'In Loving Memory'
      : slide.slideType === 'credits' ? 'Shared by Loved Ones' : getStoryChapterTitle(slide);

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    if (!playing) return;
    let timer;
    function schedule() {
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      timer = window.setTimeout(() => {
        if (isLast) setPlaying(false);
        else onChange(index + 1);
      }, getStorySlideDuration(slide));
    }
    schedule();
    document.addEventListener('visibilitychange', schedule);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); };
  }, [playing, index, slide, isLast, onChange]);

  function move(direction) {
    setPlaying(false);
    onChange(Math.max(0, Math.min(slides.length - 1, index + direction)));
  }

  function togglePlaying() {
    if (!playing && isLast) onChange(0);
    setPlaying((current) => !current);
  }

  function handleScreenClick(event) {
    if (playing || isLast) return;
    if (event.target.closest('header, footer, button, a, input, textarea, select, audio, [contenteditable="true"]')) return;
    if (!window.getSelection()?.isCollapsed) return;
    move(1);
  }

  useEffect(() => {
    function handleKey(event) {
      if (event.target.closest?.('input, textarea, select, audio, [contenteditable="true"]')) return;
      if (['ArrowUp', 'ArrowDown'].includes(event.key) && event.target.closest?.('article')) return;
      if (event.key === 'Escape') { event.preventDefault(); onChapters(); }
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); setPlaying(false); onChange(Math.min(slides.length - 1, index + 1));
      }
      if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); setPlaying(false); onChange(Math.max(0, index - 1));
      }
      if (event.code === 'Space' && !event.target.closest?.('button, a')) {
        event.preventDefault();
        if (!playing && isLast) onChange(0);
        setPlaying((current) => !current);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, isLast, playing, slides.length, onChange, onChapters]);

  return (
    <section className={styles.player} aria-label="Story slideshow" aria-roledescription="carousel" data-story-slide={index} data-story-playing={playing} onClick={handleScreenClick}>
      <header className={styles.playerHeader}>
        <button type="button" className={styles.iconButton} onClick={onChapters} title="Story chapters" aria-label="Story chapters"><Menu size={32} strokeWidth={1.5} aria-hidden="true" /></button>
        <button type="button" className={styles.playback} onClick={togglePlaying} title={playing ? 'Pause story' : isLast ? 'Replay story' : 'Play story'} aria-label={playing ? 'Pause story' : isLast ? 'Replay story' : 'Play story'}>
          <span className={styles.playbackIcon}>{playing ? <Pause size={24} fill="currentColor" aria-hidden="true" /> : <Play size={24} fill="currentColor" aria-hidden="true" />}</span>
          <span>{playing ? 'Auto' : 'Play'}</span>
        </button>
      </header>
      <div className={`${styles.slide} ${!photoUrl ? styles.textOnly : ''}`} key={index} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`} aria-live={playing ? 'off' : 'polite'}>
        {photoUrl ? <StoryPhoto url={photoUrl} title={title} /> : null}
        <article className={styles.narrative} tabIndex={0} aria-label={title} onWheel={() => setPlaying(false)} onTouchMove={() => setPlaying(false)} onFocus={(event) => { if (event.target !== headingRef.current && event.target.matches(':focus-visible')) setPlaying(false); }}>
          <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
          {slide.slideType === 'opening' ? <p>{[formatStoryDate(slide.dateOfBirth || memorial.date_of_birth), formatStoryDate(slide.dateOfPassing || memorial.date_of_passing)].filter(Boolean).join(' - ')}</p>
            : slide.slideType === 'credits' ? <ul className={styles.credits}>{slide.credits.map((person, creditIndex) => <li key={`${person.contributorId || creditIndex}`}>
              <h2>{person.name}</h2>
              {person.relationshipLabel ? <p className={styles.relationship}>{person.relationshipLabel}</p> : null}
              {person.quote ? <blockquote>{person.quote}</blockquote> : null}
            </li>)}</ul>
              : <>
                {getStorySlideText(slide) ? <p>{getStorySlideText(slide)}</p> : null}
                {slide.slideType === 'farewell' && slide.dateOfPassing ? <p>{formatStoryDate(slide.dateOfPassing)}</p> : null}
                {slide.slideType === 'farewell' && slide.contributorId ? <p className={styles.attribution}>{[slide.contributorName, slide.relationshipLabel].filter(Boolean).join(', ')}</p> : null}
              </>}
        </article>
      </div>
      {!playing ? <footer className={styles.slideControls}>
        <button type="button" className={styles.iconButton} disabled={isLast} onClick={() => move(1)} title="Next slide" aria-label="Next slide"><ChevronDown size={30} aria-hidden="true" /></button>
      </footer> : null}
    </section>
  );
}

function changeSlide(index) { navigateViewerScreen(getStoryPath(index), { replace: true }); }
function openChapters() { navigateViewerScreen('story'); }

export default function ViewerStorySection({ output, memorial, onBack }) {
  const { slides, chapters } = useMemo(() => buildViewerStory(output), [output]);
  const path = useSyncExternalStore(subscribeToViewerNavigation, getViewerScreenSnapshot, () => 'story');
  const index = parseStoryPath(path, slides.length);
  const circleRef = useRef(null);
  const headingRef = useRef(null);

  useEffect(() => { if (index === null) headingRef.current?.focus({ preventScroll: true }); }, [index]);

  if (index !== null) return <StoryPlayer slides={slides} index={index} memorial={memorial} onChange={changeSlide} onChapters={openChapters} />;

  return (
    <section className={styles.stage} aria-label="Story">
      <div ref={circleRef} className={styles.circle} aria-hidden="true" />
      <button type="button" className={styles.back} onClick={onBack}><ArrowLeft size={25} aria-hidden="true" />Back</button>
      <div className={styles.summary}>
        <h1 ref={headingRef} tabIndex={-1}>Story</h1>
        <p>Moments of {memorial.subject_name ? `${memorial.subject_name}'s` : 'a'} life, shared by loved ones.</p>
      </div>
      {chapters.length ? <StoryChapters chapters={chapters} circleRef={circleRef} onSelect={(start) => navigateViewerScreen(getStoryPath(start))} />
        : <p className={styles.empty}>No story moments are available yet.</p>}
    </section>
  );
}
