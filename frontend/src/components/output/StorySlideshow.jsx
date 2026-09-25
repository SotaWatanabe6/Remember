'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { normalizeStorySlides, formatStoryDate } from '@/lib/storySlides.mjs';

function ChevronLeftIcon() {
  return (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getSlideQuote(slide) {
  let quote = String(
    slide.narration ||
    slide.photoDescription ||
    slide.matchedQuote ||
    'This story will appear here once the memorial output is ready.'
  ).trim();

  quote = quote.replace(/^[\s"'`]+|[\s"'`]+$/g, '');
  if (quote.startsWith('\u201c') || quote.startsWith('\u201d')) quote = quote.slice(1).trimStart();
  if (quote.endsWith('\u201c') || quote.endsWith('\u201d')) quote = quote.slice(0, -1).trimEnd();

  return quote;
}

function EmptyStoryState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[10px] border border-r-muted bg-r-modal px-6 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-[#e3e0dd] text-r-secondary">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 19h16M7 5v14M17 5v14" />
        </svg>
      </div>
      <p className="text-body-2 font-medium text-r-text">No story slides are available yet.</p>
    </div>
  );
}

function StoryLoadingState() {
  return (
    <div className="aspect-[4/3] min-h-[420px] overflow-hidden rounded-[10px] border border-r-muted bg-r-modal p-5 sm:p-[50px]">
      <div className="h-full animate-pulse">
        <div className="h-full rounded-sm bg-[#d0bfaa]" />
      </div>
    </div>
  );
}

function StoryErrorState({ message }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[10px] border border-r-muted bg-r-modal px-6 text-center">
      <p className="text-body-2 font-medium text-r-text">Story is unavailable right now.</p>
      {message ? <p className="mt-2 max-w-sm text-sm leading-6 text-r-muted">{message}</p> : null}
    </div>
  );
}

export default function StorySlideshow({
  output,
  story,
  loading = false,
  error = null,
  framed = true,
}) {
  const slides = useMemo(() => normalizeStorySlides(output, story), [output, story]);
  const [requestedIndex, setRequestedIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const currentIndex = slides.length > 0 ? Math.min(requestedIndex, slides.length - 1) : 0;

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        setRequestedIndex(currentIndex - 1);
      }

      if (event.key === 'ArrowRight' && currentIndex < slides.length - 1) {
        event.preventDefault();
        setRequestedIndex(currentIndex + 1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, slides.length]);

  if (loading) return <StoryLoadingState />;
  if (error) return <StoryErrorState message={error} />;
  if (slides.length === 0) return <EmptyStoryState />;

  const slide = slides[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === slides.length - 1;
  const altText = slide.photoDescription
    ? `Story photo: ${slide.photoDescription}`
    : `Story photo contributed by ${slide.contributorName}`;
  const slideTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeInOut' };
  const quote = getSlideQuote(slide);
  // const aiTag = slide.themeLabel || 'AI tag';
  const containerClassName = framed
    ? 'rounded-[10px] border border-r-muted bg-transparent p-5 sm:p-[50px]'
    : 'bg-transparent';
  const slideClassName = framed
    ? 'relative aspect-[4/3] min-h-[420px] overflow-hidden bg-[#d0bfaa] sm:min-h-0'
    : 'relative aspect-[4/3] min-h-[420px] overflow-hidden bg-[#d0bfaa] sm:min-h-0';

  return (
    <section
      className={containerClassName}
      aria-label="Story slideshow"
    >
      <div className={slideClassName}>
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id ?? currentIndex}
            className="absolute inset-0"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={slideTransition}
          >
            {slide.slideType === 'opening' ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto bg-r-bg px-16 py-8 text-center text-r-text sm:gap-7 sm:px-24">
                {slide.photoUrl ? (
                  <img src={slide.photoUrl} alt={slide.subjectName} className="min-h-0 max-h-[60%] w-auto max-w-full object-contain" />
                ) : null}
                <div className="shrink-0">
                  <h2 className="font-display text-3xl font-medium leading-tight sm:text-[40px]">{slide.subjectName}</h2>
                  {(slide.dateOfBirth || slide.dateOfPassing) ? (
                    <p className="mt-3 text-sm text-r-secondary sm:text-base">
                      {[formatStoryDate(slide.dateOfBirth), formatStoryDate(slide.dateOfPassing)].filter(Boolean).join(' – ')}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : slide.slideType === 'farewell' ? (
              <div className="flex h-full flex-col items-center justify-center gap-7 overflow-y-auto bg-r-bg px-16 py-10 text-center text-r-text sm:px-24">
                {slide.dateOfPassing ? <p className="text-sm text-r-secondary sm:text-base">{formatStoryDate(slide.dateOfPassing)}</p> : null}
                <p className="max-w-xl font-display text-3xl font-medium leading-snug sm:text-[40px]">{slide.farewellMessage}</p>
                {slide.contributorId ? (
                  <p className="text-sm text-r-secondary">{[slide.contributorName, slide.relationshipLabel].filter(Boolean).join(' · ')}</p>
                ) : null}
              </div>
            ) : <>
            {slide.photoUrl ? (
              <img src={slide.photoUrl} alt={altText} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full grid-cols-10 grid-rows-8" aria-hidden="true">
                {Array.from({ length: 80 }).map((_, index) => (
                  <div
                    key={index}
                    className={index % 2 === Math.floor(index / 10) % 2 ? 'bg-[#f7f7f7]' : 'bg-[#e6e6e6]'}
                  />
                ))}
              </div>
            )}

            <div
              className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/75 via-black/40 to-transparent"
              aria-hidden="true"
            />

            <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-7 pt-20 sm:px-[37px] sm:pb-[37px]">
              <div className="flex max-w-[433px] flex-col items-start">
                <p className="font-display text-[22px] font-medium italic leading-[1.08] text-white sm:text-[24px]" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8), 0 2px 12px rgba(0,0,0,0.6)' }}>
                  &ldquo;{quote}&rdquo;
                </p>
                
              </div>
            </div>
            </>}
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setRequestedIndex(Math.max(currentIndex - 1, 0))}
          disabled={isFirst}
          aria-label="Previous story slide"
          className="absolute left-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-r-text transition hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-text disabled:cursor-not-allowed disabled:opacity-35 sm:left-5 sm:size-14"
        >
          <ChevronLeftIcon />
        </button>

        <button
          type="button"
          onClick={() => setRequestedIndex(Math.min(currentIndex + 1, slides.length - 1))}
          disabled={isLast}
          aria-label="Next story slide"
          className="absolute right-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-r-text transition hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-text disabled:cursor-not-allowed disabled:opacity-35 sm:right-5 sm:size-14"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}
