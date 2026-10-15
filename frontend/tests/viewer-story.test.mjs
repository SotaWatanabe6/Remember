import test from 'node:test';
import assert from 'node:assert/strict';
import { buildViewerStory, getStoryChapterTitle, getStoryPath, getStorySlideDuration, getStorySlideText, parseStoryPath } from '../src/lib/viewer/story.mjs';

test('chapter menu follows pipeline order and retains every slide and bookend', () => {
  const story = [
    { slide_type: 'opening', subject_name: 'Robin', order_index: 0 },
    { photo_id: 'a', photo_url: '/a.jpg', chapter: 'who_they_were', order_index: 1 },
    { photo_id: 'b', photo_url: '/b.jpg', chapter: 'who_they_were', order_index: 2 },
    { photo_id: 'c', photo_url: '/c.jpg', chapter: 'what_they_loved', chapter_title: 'Their Garden', order_index: 3 },
    { slide_type: 'farewell', farewell_message: 'Always remembered', order_index: 4 },
    { slide_type: 'credits', contributors: [{ contributor_name: 'Family member' }], order_index: 5 },
  ];
  const result = buildViewerStory({ story });
  assert.equal(result.slides.length, 6);
  assert.deepEqual(result.chapters.map(({ label, startIndex }) => [label, startIndex]), [['Who They Were', 0], ['Their Garden', 3]]);
  assert.deepEqual(result.slides.map((slide) => slide.orderIndex), [0, 1, 2, 3, 4, 5]);
  assert.equal(result.slides[5].credits[0].name, 'Family member');
});

test('legacy themes, unlabelled stories, bookends-only and empty outputs remain usable', () => {
  assert.deepEqual(buildViewerStory({}).chapters, []);
  assert.equal(buildViewerStory({ story: { slides: [{ caption: 'A memory' }] } }).chapters[0].label, 'Story');
  assert.equal(buildViewerStory({ story: [{ theme: 'Kindness', narration: 'A memory' }] }).chapters[0].label, 'Kindness');
  assert.equal(buildViewerStory({ story: [{ slide_type: 'farewell', farewell_message: 'Goodbye' }] }).chapters[0].startIndex, 0);
  assert.equal(getStoryChapterTitle({ chapter: 'a_new_chapter' }), 'A New Chapter');
});

test('a repeated chapter later in a legacy sequence is not regrouped', () => {
  const { slides, chapters } = buildViewerStory({ story: ['a', 'b', 'a'].map((chapter, index) => ({ chapter, narration: String(index) })) });
  assert.deepEqual(chapters.map((chapter) => chapter.startIndex), [0, 1, 2]);
  assert.deepEqual(slides.map((slide) => slide.narration), ['0', '1', '2']);
});

test('story paths reject malformed and out-of-bounds slide indexes', () => {
  assert.equal(parseStoryPath(getStoryPath(2), 3), 2);
  for (const path of ['story', 'story/slide/-1', 'story/slide/3', 'story/slide/1.5', 'story/slide/01', 'story/slide/nope', 'story/slide/0/extra']) {
    assert.equal(parseStoryPath(path, 3), null);
  }
  assert.equal(parseStoryPath('story/slide/0', 0), null);
});

test('auto timing allows reading the actual narrative, farewell and all credits', () => {
  assert.equal(getStorySlideText({ photoDescription: 'Story', narration: 'Old narration' }), 'Story');
  assert.equal(getStorySlideText({ slideType: 'farewell', farewellMessage: 'Goodbye' }), 'Goodbye');
  assert.equal(getStorySlideDuration({ photoDescription: '' }), 6000);
  assert.equal(getStorySlideDuration({ photoDescription: 'word '.repeat(60) }), 22000);
  assert.ok(getStorySlideDuration({ credits: Array.from({ length: 30 }, () => ({ name: 'Family member', relationshipLabel: 'Family', quote: 'A very special memory' })) }) > 60000);
});
