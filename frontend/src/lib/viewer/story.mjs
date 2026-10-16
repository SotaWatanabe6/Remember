import { normalizeStorySlides } from '../storySlides.mjs';

const CHAPTER_TITLES = {
  who_they_were: 'Who They Were',
  where_they_came_from: 'Where They Came From',
  what_they_loved: 'What They Loved',
  how_they_treated_people: 'How They Treated People',
  how_they_are_remembered: 'How People Remember Them Now',
};
const BOOKENDS = new Set(['opening', 'farewell', 'credits']);

export function getStoryChapterTitle(slide) {
  return slide.chapterTitle || CHAPTER_TITLES[slide.chapter] || slide.themeLabel
    || (slide.chapter ? slide.chapter.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Story');
}

export function buildViewerStory(output) {
  const slides = normalizeStorySlides(output);
  const chapters = [];
  let previousKey = null;
  slides.forEach((slide, index) => {
    if (BOOKENDS.has(slide.slideType)) return;
    const key = slide.chapter || slide.chapterTitle || slide.themeLabel || 'story';
    if (key !== previousKey) {
      // Menu entries jump into the existing sequence; never regroup or reorder slides.
      chapters.push({ id: `chapter-${index}`, label: getStoryChapterTitle(slide), startIndex: index });
      previousKey = key;
    }
  });
  if (!chapters.length && slides.length) chapters.push({ id: 'story', label: 'Story', startIndex: 0 });
  return { slides, chapters };
}

export function getStorySlideText(slide) {
  if (slide.slideType === 'farewell') return slide.farewellMessage;
  return slide.photoDescription || slide.narration || slide.matchedQuote || '';
}

export function getStorySlideDuration(slide) {
  const text = [getStorySlideText(slide), ...(slide.credits || []).map((person) => `${person.name} ${person.relationshipLabel} ${person.quote}`)].join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(6000, Math.ceil(words / 3 * 1000) + 2000);
}

export function getStoryPath(index) {
  return `story/slide/${index}`;
}

export function parseStoryPath(path, slideCount) {
  const match = /^story\/slide\/(0|[1-9]\d*)$/.exec(path);
  const index = match ? Number(match[1]) : -1;
  return index >= 0 && index < slideCount ? index : null;
}
