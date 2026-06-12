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
  const raw = output?.photos;
  const albums = Array.isArray(raw) ? raw : raw?.albums || [];

  return albums.reduce((lookup, album) => {
    (album.photos || []).forEach((photo) => {
      if (photo?.id) {
        lookup[photo.id] = photo;
      }
    });
    return lookup;
  }, {});
}

function resolveSlideYear(slide, matchedPhoto) {
  const fromSlide = slide.photo_year || slide.year
  if (fromSlide) return String(fromSlide)
  if (matchedPhoto?.year) return String(matchedPhoto.year)
  if (matchedPhoto?.taken_at) {
    const y = new Date(matchedPhoto.taken_at).getFullYear()
    if (Number.isFinite(y)) return String(y)
  }
  return null
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
      const photoDescription =
        slide.photo_description || slide.photoDescription || slide.scene || '';
      const narration = slide.narration || '';
      const fallbackQuote = slide.quote || slide.memory || slide.caption || '';
      const photoYear = resolveSlideYear(slide, matchedPhoto);
      const photoEraLabel =
        slide.photo_era_label ||
        slide.photoEraLabel ||
        slide.subject_life_stage_label ||
        matchedPhoto.era_label ||
        null;
      const chronologicalSortKey = Number(slide.chronological_sort_key);
      const photoYearSort = Number.isFinite(chronologicalSortKey) && chronologicalSortKey < 9999
        ? chronologicalSortKey
        : photoYear
          ? Number(photoYear)
          : 9999;

      const slideType = slide.slide_type || slide.slideType || (photoUrl ? 'photo' : 'narration');

      return {
        id: slide.id || slide.photo_id || `${slideType}-${index}-${slide.order_index ?? index}`,
        slideType,
        orderIndex: Number.isFinite(Number(slide.order_index)) ? Number(slide.order_index) : index,
        photoUrl,
        photoDescription: photoDescription || fallbackQuote,
        narration,
        matchedQuote: slide.matched_quote || slide.matchedQuote || '',
        photoYear,
        photoEraLabel,
        photoYearSort,
        contributorName,
        relationshipLabel: formatRelationship(
          slide.relationship_type || contributor.relationship_type || matchedPhoto.relationship_type,
        ),
        themeLabel: slide.theme_label || slide.theme || slide.ai_theme || '',
        chapterTitle: slide.chapter_title || slide.chapterTitle || '',
        perspectiveLabel: slide.perspective_label || slide.perspectiveLabel || '',
      };
    })
    .filter((slide) => slide.slideType === 'photo' && slide.photoUrl)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function StoryTimeline({ slides, currentIndex }) {
  const years = slides
    .map((s) => s.photoYearSort)
    .filter((y) => y < 9999);
  if (years.length < 2) return null;

  const min = Math.min(...years);
  const max = Math.max(...years);
  const current = slides[currentIndex]?.photoYearSort;
  const currentPct =
    current < 9999 && max > min ? ((current - min) / (max - min)) * 100 : null;

  return (
    <div className="mt-3 w-full max-w-md">
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[#90a1b9]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-[#e2e8f0]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#45556c]/30" style={{ width: '100%' }} />
        {currentPct != null ? (
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#45556c] shadow-sm"
            style={{ left: `${currentPct}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
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
  const isNarrativeSlide = ['intro', 'chapter', 'perspective', 'closing'].includes(slide.slideType);
  const ageLabel = slide.slideType === 'photo' ? slide.photoYear || slide.photoEraLabel : null;
  const altText = slide.photoDescription
    ? `Photo from ${ageLabel || 'an unknown year'}: ${slide.photoDescription}`
    : `${slide.slideType} slide for the memorial story`;
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
              <div
                className={`h-full w-full ${
                  isNarrativeSlide && slide.slideType !== 'intro'
                    ? 'bg-gradient-to-br from-[#2d3a4f] via-[#45556c] to-[#1e293b]'
                    : 'grid grid-cols-10 grid-rows-8'
                }`}
                aria-hidden={!(isNarrativeSlide && slide.slideType !== 'intro')}
              >
                {!(isNarrativeSlide && slide.slideType !== 'intro')
                  ? Array.from({ length: 80 }).map((_, index) => (
                      <div
                        key={index}
                        className={index % 2 === Math.floor(index / 10) % 2 ? 'bg-[#f7f7f7]' : 'bg-[#e6e6e6]'}
                      />
                    ))
                  : null}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" aria-hidden="true" />

            <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-7 pt-24 sm:px-8 sm:pb-9">
              {slide.chapterTitle ? (
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                  {slide.chapterTitle}
                </p>
              ) : null}
              {slide.perspectiveLabel ? (
                <p className="mb-2 text-sm font-medium italic text-white/75 sm:text-base">
                  {slide.perspectiveLabel}
                </p>
              ) : null}
              {slide.slideType === 'intro' ? (
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                  Introduction
                </p>
              ) : null}
              {slide.slideType === 'closing' ? (
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                  In remembrance
                </p>
              ) : null}
              {slide.photoDescription ? (
                <p
                  className={`max-w-3xl leading-relaxed text-white/95 ${
                    isNarrativeSlide ? 'text-xl font-medium sm:text-2xl' : 'text-lg font-normal sm:text-xl'
                  }`}
                >
                  {slide.photoDescription}
                </p>
              ) : null}
              {slide.narration ? (
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">
                  {slide.narration}
                </p>
              ) : null}
              {slide.matchedQuote ? (
                <p className="mt-3 max-w-2xl text-sm italic text-white/60 sm:text-base">
                  &ldquo;{slide.matchedQuote}&rdquo;
                </p>
              ) : null}
              {slide.slideType === 'photo' ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#cad5e2] sm:text-base">
                  <span>{slide.contributorName}</span>
                  {slide.relationshipLabel ? (
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:text-sm">
                      {slide.relationshipLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 text-[#45556c]">
            <span className="grid size-10 place-items-center rounded-full bg-[#45556c] text-white" aria-hidden="true">
              <ChevronRightIcon />
            </span>
            <span className="text-sm">
              {currentIndex + 1} / {slides.length}
            </span>
          </div>
          <StoryTimeline slides={slides} currentIndex={currentIndex} />
        </div>

        <div className="flex items-center gap-1.5" aria-label="Story slide position">
          {slides.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
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

