'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

function formatRelationship(relationshipType) {
  if (!relationshipType) return '';
  return relationshipType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStorySource(output, story) {
  if (Array.isArray(story)) return story;
  if (Array.isArray(story?.slides)) return story.slides;
  if (Array.isArray(output?.story)) return output.story;
  if (Array.isArray(output?.story?.slides)) return output.story.slides;
  if (Array.isArray(output?.tabs?.story)) return output.tabs.story;
  if (Array.isArray(output?.tabs?.story?.slides)) return output.tabs.story.slides;
  if (Array.isArray(output?.memorialOutput?.story)) return output.memorialOutput.story;
  if (Array.isArray(output?.memorialOutput?.story?.slides)) return output.memorialOutput.story.slides;
  return [];
}

function buildContributorLookup(output) {
  const contributors = [
    ...(Array.isArray(output?.contributors) ? output.contributors : []),
    ...(Array.isArray(output?.contributions) ? output.contributions : []),
  ];

  return contributors.reduce((lookup, item) => {
    const contributor = item.contributor || item;
    if (contributor?.id) {
      lookup[contributor.id] = contributor;
    }
    return lookup;
  }, {});
}

function buildPhotoLookup(output) {
  const albums = Array.isArray(output?.photos) ? output.photos : [];

  return albums.reduce((lookup, album) => {
    (album.photos || []).forEach((photo) => {
      if (photo?.id) {
        lookup[photo.id] = photo;
      }
    });
    return lookup;
  }, {});
}

function normalizeStorySlides(output, story) {
  const contributorLookup = buildContributorLookup(output);
  const photoLookup = buildPhotoLookup(output);

  return getStorySource(output, story)
    .map((slide, index) => {
      const contributor = contributorLookup[slide.contributor_id] || {};
      const matchedPhoto = photoLookup[slide.photo_id] || {};
      const contributorName =
        slide.contributor_name ||
        contributor.name ||
        contributor.contributor_name ||
        matchedPhoto.contributor_name ||
        'Contributor';
      const photoUrl =
        slide.photo_url ||
        slide.url ||
        slide.photo?.url ||
        matchedPhoto.url ||
        matchedPhoto.photo_url ||
        null;

      return {
        id: slide.id || slide.photo_id || `${index}-${contributorName}`,
        orderIndex: Number.isFinite(Number(slide.order_index)) ? Number(slide.order_index) : index,
        photoUrl,
        quote: slide.matched_quote || slide.quote || slide.memory || slide.caption || '',
        contributorName,
        relationshipLabel: formatRelationship(
          slide.relationship_type || contributor.relationship_type || matchedPhoto.relationship_type,
        ),
        themeLabel: slide.theme_label || slide.theme || slide.ai_theme || '',
      };
    })
    .filter((slide) => slide.photoUrl || slide.quote)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

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

function EmptyStoryState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[18px] border border-[#e2e8f0] bg-white px-6 text-center shadow-auth">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-[#eff6ff] text-[#45556c]">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 19h16M7 5v14M17 5v14" />
        </svg>
      </div>
      <p className="text-base font-medium text-neutral-950">No story slides are available yet.</p>
    </div>
  );
}

function StoryLoadingState() {
  return (
    <div className="h-[calc(100vh-220px)] min-h-[520px] max-h-[760px] overflow-hidden rounded-[18px] border border-[#e2e8f0] bg-white shadow-auth">
      <div className="h-full animate-pulse">
        <div className="h-[calc(100%-88px)] bg-[#cad5e2]" />
        <div className="flex h-[88px] items-center justify-between px-5 sm:px-7">
          <div className="h-5 w-24 rounded-full bg-neutral-100" />
          <div className="h-2 w-20 rounded-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

function StoryErrorState({ message }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[18px] border border-[#e2e8f0] bg-white px-6 text-center shadow-auth">
      <p className="text-base font-medium text-neutral-950">Story is unavailable right now.</p>
      {message ? <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{message}</p> : null}
    </div>
  );
}

export default function StorySlideshow({ output, story, loading = false, error = null }) {
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
  const progress = ((currentIndex + 1) / slides.length) * 100;
  const altText = slide.quote
    ? `Memory contributed by ${slide.contributorName}: ${slide.quote}`
    : `Story photo contributed by ${slide.contributorName}`;
  const slideTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeInOut' };

  return (
    <section
      className="overflow-hidden rounded-[18px] border border-[#e2e8f0] bg-white shadow-auth"
      aria-label="Story slideshow"
    >
      <div className="relative h-[calc(100vh-220px)] min-h-[520px] max-h-[760px] bg-[#cad5e2]">
        <div className="absolute left-0 top-0 z-20 h-1 w-full bg-white/25" aria-hidden="true">
          <div className="h-full rounded-r-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id ?? currentIndex}
            className="absolute inset-0"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={slideTransition}
          >
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

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" aria-hidden="true" />

            {slide.themeLabel ? (
              <div className="absolute right-4 top-5 z-20 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[#1c398e] shadow-auth backdrop-blur-sm sm:right-7 sm:top-7 sm:text-sm">
                {slide.themeLabel}
              </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-7 pt-24 sm:px-8 sm:pb-9">
              <blockquote className="max-w-3xl text-[26px] font-normal leading-tight text-white sm:text-[34px] sm:leading-[1.15]">
                {slide.quote}
              </blockquote>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#cad5e2] sm:text-base">
                <span>{slide.contributorName}</span>
                {slide.relationshipLabel ? (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:text-sm">
                    {slide.relationshipLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setRequestedIndex(Math.max(currentIndex - 1, 0))}
          disabled={isFirst}
          aria-label="Previous story slide"
          className="absolute left-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35 sm:left-5 sm:size-14"
        >
          <ChevronLeftIcon />
        </button>

        <button
          type="button"
          onClick={() => setRequestedIndex(Math.min(currentIndex + 1, slides.length - 1))}
          disabled={isLast}
          aria-label="Next story slide"
          className="absolute right-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35 sm:right-5 sm:size-14"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="flex min-h-[88px] items-center justify-between gap-4 border-t border-[#e2e8f0] px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3 text-[#45556c]">
          <span className="grid size-10 place-items-center rounded-full bg-[#45556c] text-white" aria-hidden="true">
            <ChevronRightIcon />
          </span>
          <span className="text-sm">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5" aria-label="Story slide position">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRequestedIndex(index)}
              aria-label={`Go to story slide ${index + 1}`}
              aria-current={index === currentIndex}
              className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400 ${
                index === currentIndex ? 'w-7 bg-[#45556c]' : 'w-2 bg-[#cad5e2] hover:bg-[#90a1b9]'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
