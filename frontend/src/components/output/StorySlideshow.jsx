'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { fetchStoryNarrationAudio } from '@/lib/api';

const MEMORIAL_MUSIC_URL = '/audio/memorial-ambient.mp3';
const FALLBACK_MUSIC_URL =
  'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3';

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
      const slideType =
        slide.slide_type ||
        slide.slideType ||
        (slide.audio_url || slide.audioUrl ? 'voice_clip' : 'photo');
      const narration =
        slide.narration ||
        slide.quote ||
        slide.memory ||
        slide.caption ||
        '';

      return {
        id: slide.id || slide.photo_id || `slide-${index}`,
        orderIndex: Number.isFinite(Number(slide.order_index)) ? Number(slide.order_index) : index,
        slideType,
        photoUrl,
        quote: narration,
        matchedQuote: slide.matched_quote || slide.matchedQuote || '',
        audioUrl: slide.audio_url || slide.audioUrl || null,
        clipStart: Number(slide.clip_start_seconds ?? slide.clipStart ?? 0) || 0,
        clipEnd: slide.clip_end_seconds ?? slide.clipEnd ?? null,
        contributorName,
        contributorTitle: slide.contributor_title || slide.contributorTitle || '',
        relationshipLabel: formatRelationship(
          slide.relationship_type || contributor.relationship_type || matchedPhoto.relationship_type,
        ),
        themeLabel: slide.theme_label || slide.theme || slide.ai_theme || '',
        narrationAudioUrl:
          slide.narration_audio_url || slide.narrationAudioUrl || null,
      };
    })
    .filter((slide) => slide.photoUrl || slide.quote || slide.audioUrl)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function estimateSpeechMs(text = '') {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3500, words * 420 + 1200);
}

function isHttpAudioUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function narrationTextFromSlide(slide) {
  if (!slide) return '';
  if (slide.slideType === 'voice_clip') {
    return (slide.quote || '').trim();
  }
  return [slide.quote, slide.matchedQuote ? `"${slide.matchedQuote}"` : '']
    .filter(Boolean)
    .join('. ')
    .trim();
}

function stopNarration(activeNarrationRef) {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  const audio = activeNarrationRef?.current;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    activeNarrationRef.current = null;
  }
}

function playNarrationUrl(url, activeNarrationRef) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }

    const audio = new Audio(url);
    if (activeNarrationRef) activeNarrationRef.current = audio;

    let settled = false;
    const finish = (played) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      if (activeNarrationRef?.current === audio) {
        activeNarrationRef.current = null;
      }
      resolve(played);
    };

    const onEnded = () => finish(true);
    const onError = () => finish(false);

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.play().catch(() => finish(false));
  });
}

function speakWithBrowser(text, activeNarrationRef) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text?.trim()) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.rate = 0.92;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /samantha|karen|moira|victoria|female/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en') && !/novelty|bells/i.test(v.name));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function playVoiceClip({ audioUrl, clipStart, clipEnd, activeNarrationRef }) {
  return new Promise((resolve) => {
    if (!audioUrl) {
      resolve();
      return;
    }

    stopNarration(activeNarrationRef);

    const audio = new Audio(audioUrl);
    if (activeNarrationRef) activeNarrationRef.current = audio;
    const start = Math.max(0, clipStart || 0);
    const end =
      clipEnd != null && Number.isFinite(Number(clipEnd)) && Number(clipEnd) > start
        ? Number(clipEnd)
        : start + 12;

    const finish = () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', finish);
      audio.removeEventListener('error', finish);
      if (activeNarrationRef?.current === audio) {
        activeNarrationRef.current = null;
      }
      resolve();
    };

    const onTime = () => {
      if (audio.currentTime >= end) finish();
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', finish);

    audio.currentTime = start;
    audio.play().catch(finish);
  });
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
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Run Generate on the manage page after contributors finish photos and voice memos.
      </p>
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

function StartStoryOverlay({ onStart, slideCount }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#1e293b]/90 to-[#0f172a]/95 px-6 text-center">
      <p className="text-sm uppercase tracking-[0.25em] text-white/60">Memorial story</p>
      <h2 className="mt-3 max-w-lg font-serif text-3xl italic text-white sm:text-4xl">
        A documentary of their life
      </h2>
      <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
        {slideCount} moments with ElevenLabs narration, voice memos, and gentle music — like a film about
        someone you love.
      </p>
      <p className="mt-2 max-w-md text-sm text-white/50">
        Keep the Remember API running on port 3001 while you watch.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 rounded-full bg-white px-10 py-3.5 text-base font-semibold text-[#1c398e] shadow-lg transition hover:bg-white/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        Start story
      </button>
    </div>
  );
}

export default function StorySlideshow({ output, story, loading = false, error = null }) {
  const slides = useMemo(() => normalizeStorySlides(output, story), [output, story]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const musicRef = useRef(null);
  const playTokenRef = useRef(0);
  const activeNarrationRef = useRef(null);
  const ttsBlobCacheRef = useRef(new Map());

  const duckMusic = useCallback(() => {
    const music = musicRef.current;
    if (music && !music.paused) music.volume = 0.05;
  }, []);

  const restoreMusicVolume = useCallback(() => {
    const music = musicRef.current;
    if (music) music.volume = 0.14;
  }, []);

  const speakNarration = useCallback(
    async (slide) => {
      const text = narrationTextFromSlide(slide);
      const prebuiltUrl = isHttpAudioUrl(slide?.narrationAudioUrl)
        ? slide.narrationAudioUrl
        : null;

      if (!prebuiltUrl && !text) return;

      duckMusic();
      stopNarration(activeNarrationRef);

      if (prebuiltUrl) {
        const played = await playNarrationUrl(prebuiltUrl, activeNarrationRef);
        if (played) {
          restoreMusicVolume();
          return;
        }
        console.warn('[Story] Cached narration failed — requesting live ElevenLabs audio');
      }

      if (!text) {
        restoreMusicVolume();
        return;
      }

      try {
        let blobUrl = ttsBlobCacheRef.current.get(text);
        if (!blobUrl) {
          const blob = await fetchStoryNarrationAudio(text);
          blobUrl = URL.createObjectURL(blob);
          ttsBlobCacheRef.current.set(text, blobUrl);
        }
        const played = await playNarrationUrl(blobUrl, activeNarrationRef);
        if (played) {
          restoreMusicVolume();
          return;
        }
        throw new Error('ElevenLabs audio could not play in the browser');
      } catch (err) {
        console.warn('[Story] ElevenLabs failed:', err?.message || err);
        if (process.env.NEXT_PUBLIC_STORY_BROWSER_TTS_FALLBACK === 'true') {
          await speakWithBrowser(text, activeNarrationRef);
        }
      } finally {
        restoreMusicVolume();
      }
    },
    [duckMusic, restoreMusicVolume],
  );

  const currentSlide = slides[currentIndex] || null;
  const progress = slides.length ? ((currentIndex + 1) / slides.length) * 100 : 0;

  const startBackgroundMusic = useCallback(() => {
    if (shouldReduceMotion) return;
    const audio = musicRef.current;
    if (!audio) return;
    audio.volume = 0.14;
    audio.loop = true;
    const tryPlay = (src) => {
      audio.src = src;
      audio.play().catch(() => {
        if (src !== FALLBACK_MUSIC_URL) tryPlay(FALLBACK_MUSIC_URL);
      });
    };
    tryPlay(MEMORIAL_MUSIC_URL);
  }, [shouldReduceMotion]);

  const stopBackgroundMusic = useCallback(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const playSlideAt = useCallback(
    async (index, token) => {
      const slide = slides[index];
      if (!slide || token !== playTokenRef.current) return;

      if (slide.slideType === 'voice_clip' && slide.audioUrl) {
        await speakNarration(slide);
        if (token !== playTokenRef.current) return;
        await playVoiceClip({
          audioUrl: slide.audioUrl,
          clipStart: slide.clipStart,
          clipEnd: slide.clipEnd,
          activeNarrationRef,
        });
        if (token !== playTokenRef.current) return;
        await new Promise((r) => setTimeout(r, 800));
      } else {
        if (narrationTextFromSlide(slide) || slide.narrationAudioUrl) {
          await speakNarration(slide);
        } else {
          await new Promise((r) => setTimeout(r, estimateSpeechMs('')));
        }
        if (token !== playTokenRef.current) return;
        await new Promise((r) => setTimeout(r, 1200));
      }

      if (token !== playTokenRef.current) return;

      if (index < slides.length - 1) {
        setCurrentIndex(index + 1);
      } else {
        setIsPlaying(false);
        stopBackgroundMusic();
      }
    },
    [slides, stopBackgroundMusic, speakNarration],
  );

  useEffect(() => {
    if (!hasStarted || !isPlaying || slides.length === 0) return undefined;

    const token = ++playTokenRef.current;
    playSlideAt(currentIndex, token);

    return () => {
      playTokenRef.current += 1;
      stopNarration(activeNarrationRef);
    };
  }, [hasStarted, isPlaying, currentIndex, slides.length, playSlideAt]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  function handleStart() {
    setHasStarted(true);
    setIsPlaying(true);
    setCurrentIndex(0);
    startBackgroundMusic();
  }

  function handlePause() {
    playTokenRef.current += 1;
    setIsPlaying(false);
    stopNarration(activeNarrationRef);
    stopBackgroundMusic();
  }

  function handleResume() {
    setIsPlaying(true);
    startBackgroundMusic();
  }

  function handleRestart() {
    playTokenRef.current += 1;
    stopNarration(activeNarrationRef);
    stopBackgroundMusic();
    setCurrentIndex(0);
    setIsPlaying(true);
    startBackgroundMusic();
  }

  function handleBackToStartScreen() {
    playTokenRef.current += 1;
    stopNarration(activeNarrationRef);
    stopBackgroundMusic();
    setHasStarted(false);
    setIsPlaying(false);
    setCurrentIndex(0);
  }

  if (loading) return <StoryLoadingState />;
  if (error) return <StoryErrorState message={error} />;
  if (slides.length === 0) return <EmptyStoryState />;

  const slide = currentSlide;
  const slideTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.85, ease: [0.4, 0, 0.2, 1] };
  const kenBurns = shouldReduceMotion
    ? {}
    : {
        initial: { scale: 1.05 },
        animate: { scale: 1 },
        transition: { duration: 8, ease: 'linear' },
      };
  const altText = slide.quote
    ? `Memory: ${slide.quote}`
    : slide.contributorTitle || 'Story moment';
  const isVoiceSlide = slide.slideType === 'voice_clip';

  return (
    <section
      className="overflow-hidden rounded-[18px] border border-[#e2e8f0] bg-white shadow-auth"
      aria-label="Memorial story documentary"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={musicRef} preload="none" aria-hidden="true" />

      <div className="relative h-[calc(100vh-220px)] min-h-[520px] max-h-[760px] bg-[#0f172a]">
        {!hasStarted ? <StartStoryOverlay onStart={handleStart} slideCount={slides.length} /> : null}

        <div className="absolute left-0 top-0 z-20 h-1 w-full bg-white/20" aria-hidden="true">
          <div
            className="h-full rounded-r-full bg-white/90 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {hasStarted ? (
          <div className="absolute left-4 top-5 z-20 flex flex-wrap items-center gap-2 sm:left-7">
            {isPlaying ? (
              <button
                type="button"
                onClick={handlePause}
                aria-label="Pause story"
                className="rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/60"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                aria-label="Resume story"
                className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#1c398e] backdrop-blur-sm hover:bg-white"
              >
                Play
              </button>
            )}
            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart story from the beginning"
              className="rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/60"
            >
              Restart
            </button>
          </div>
        ) : null}

        {hasStarted && !isPlaying && currentIndex === slides.length - 1 ? (
          <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-4 pointer-events-none">
            <p className="rounded-full bg-black/50 px-5 py-2 text-sm text-white/90 backdrop-blur-sm">
              Story complete — press Play or Restart
            </p>
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id ?? currentIndex}
            className="absolute inset-0"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={slideTransition}
          >
            {isVoiceSlide ? (
              <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#0f172a] to-[#1c1917] px-8 text-center">
                <div className="mb-6 grid size-20 place-items-center rounded-full bg-white/10 text-white">
                  <svg width="36" height="36" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </div>
                <p className="text-sm uppercase tracking-widest text-white/50">Voice memory</p>
                {slide.contributorTitle ? (
                  <p className="mt-2 text-lg text-white/70">{slide.contributorTitle}</p>
                ) : null}
              </div>
            ) : slide.photoUrl ? (
              <motion.div className="absolute inset-0 overflow-hidden" {...kenBurns}>
                <img src={slide.photoUrl} alt={altText} className="h-full w-full object-cover" />
              </motion.div>
            ) : (
              <div className="h-full bg-[#334155]" />
            )}

            <div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"
              aria-hidden="true"
            />

            {slide.themeLabel ? (
              <div className="absolute right-4 top-14 z-20 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[#1c398e] shadow-auth backdrop-blur-sm sm:right-7 sm:text-sm">
                {slide.themeLabel}
              </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-7 pt-24 sm:px-8 sm:pb-9">
              {slide.quote ? (
                <blockquote className="max-w-3xl text-[22px] font-normal leading-snug text-white sm:text-[30px] sm:leading-[1.2]">
                  {slide.quote}
                </blockquote>
              ) : null}
              {slide.matchedQuote && !isVoiceSlide ? (
                <p className="mt-3 max-w-2xl text-base italic leading-relaxed text-white/75 sm:text-lg">
                  &ldquo;{slide.matchedQuote}&rdquo;
                </p>
              ) : null}
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
      </div>

      <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-t border-[#e2e8f0] px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[#45556c]">
            {hasStarted ? (
              <>
                {currentIndex + 1} / {slides.length}
                {isPlaying ? ' · Playing' : currentIndex >= slides.length - 1 ? ' · Complete' : ' · Paused'}
              </>
            ) : (
              'Press Start story to begin'
            )}
          </span>
          {hasStarted ? (
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <button
                  type="button"
                  onClick={handlePause}
                  className="rounded-full border border-[#cad5e2] px-3 py-1.5 text-xs font-medium text-[#45556c] hover:bg-neutral-50"
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  className="rounded-full bg-[#45556c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#334155]"
                >
                  Play
                </button>
              )}
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-full border border-[#cad5e2] px-3 py-1.5 text-xs font-medium text-[#45556c] hover:bg-neutral-50"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={handleBackToStartScreen}
                className="rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-[#90a1b9] hover:text-[#45556c]"
              >
                Exit
              </button>
            </div>
          ) : null}
        </div>
        {hasStarted ? (
          <div className="flex items-center gap-1.5" aria-label="Story slide position">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playTokenRef.current += 1;
                  stopNarration(activeNarrationRef);
                  setCurrentIndex(index);
                  if (!isPlaying) setIsPlaying(true);
                  if (!musicRef.current?.paused && musicRef.current?.src) return;
                  startBackgroundMusic();
                }}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentIndex}
                className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400 ${
                  index === currentIndex ? 'w-7 bg-[#45556c]' : 'w-2 bg-[#cad5e2] hover:bg-[#90a1b9]'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
