// Run against a local Next.js server. All API/media requests use isolated fixtures.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const base = process.env.VIEWER_TEST_BASE_URL || 'http://127.0.0.1:3036';
const artifacts = process.env.VIEWER_TEST_ARTIFACT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'viewer-motion-'));
fs.mkdirSync(artifacts, { recursive: true });

function silence(seconds = 24) {
  const rate = 8000;
  const bytes = seconds * rate * 2;
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF'); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
  return wav;
}

const contributors = [
  { id: 'alex', name: 'Alex Morgan', relationship_type: 'Family', relationship_label: 'Child', status: 'approved' },
  ...Array.from({ length: 14 }, (_, i) => ({ id: `friend-${i}`, name: i === 13 ? 'A Very Long Contributor Name That Wraps Across Multiple Lines' : `Friend ${i + 1}`, relationship_type: 'Friend', status: 'approved' })),
];
const photos = [
  { id: 'garden', contributor_id: 'alex', contributor_name: 'Alex Morgan', url: `${base}/images/slideshow-4.png`, caption: 'Sundays in the garden', taken_at: '1995-05-01' },
  { id: 'home', contributor_id: 'alex', contributor_name: 'Alex Morgan', url: `${base}/images/constellation-4.png`, caption: 'At home together', taken_at: '2002-06-01' },
  { id: 'missing', contributor_id: 'alex', contributor_name: 'Alex Morgan', url: `${base}/fixture-missing.png`, caption: 'Unavailable memory' },
];
const output = {
  story: [
    { slide_type: 'opening', subject_name: 'Robin Morgan', order_index: 0 },
    { photo_url: photos[0].url, chapter: 'who_they_were', narration: 'Sunday mornings together in the garden.', order_index: 1 },
    { chapter: 'what_they_loved', narration: 'An afternoon at home, surrounded by family. '.repeat(35), order_index: 2 },
    { slide_type: 'farewell', farewell_message: 'Always remembered.', order_index: 3 },
  ],
  photos: { albums: [{ id: 'family', name: 'Family memories', photos }] },
  voices: [
    { id: 'voice-1', contributor_title: 'Garden Sundays', audio_url: `${base}/fixture.wav`, duration_seconds: 24,
      transcript_segments: [{ start: 0, end: 1, text: 'Sunday in the garden.' }, { start: 1, end: 24, text: 'A lifetime of memories shared together.' }] },
    { id: 'voice-2', contributor_title: 'The Long Road Home', audio_url: `${base}/fixture.wav?track=2`, duration_seconds: 24, transcript_text: 'Every road brought us home.' },
    { id: 'voice-missing', contributor_title: 'Without Audio', transcript_text: 'These words remain available.' },
  ],
};
const payload = { memorial: { id: 'motion', subject_name: 'Robin Morgan', date_of_birth: '1950-01-01', date_of_passing: '2026-01-01', biography: 'Remembering a life shared with family and friends.' }, output_json: output, contributors };

async function fixtures(context) {
  await context.addInitScript(() => localStorage.setItem('remember.mock.auth', JSON.stringify({ token: 'viewer-fixture' })));
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/fixture.wav') {
      const wav = silence();
      const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
      const start = range ? Number(range[1]) : 0;
      const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
      return route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav', body: wav.subarray(start, end + 1),
        headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1), ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) } });
    }
    if (url.pathname === '/fixture-missing.png') return route.fulfill({ status: 404, body: '' });
    if (url.origin === new URL(base).origin) return route.continue();
    if (!url.pathname.startsWith('/share/') && !url.pathname.startsWith('/memorials/')) return route.abort();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith('/expired')) return route.fulfill({ status: 410, headers, body: '{}' });
    if (url.pathname.endsWith('/failed')) return route.fulfill({ status: 503, headers, body: '{}' });
    const data = url.pathname.endsWith('/share') ? { share_link: { token: 'motion' } }
      : url.pathname.endsWith('/highlights') ? { photos: photos.map((photo) => ({ ...photo, photo_url: photo.url })), quote: 'We always had time for one another.' }
        : url.pathname.endsWith('/empty') ? { ...payload, contributors: [], output_json: { story: [], photos: [], voices: [] } }
          : payload;
    return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(data) });
  });
}

async function settled(page, name = 'screen') {
  await page.locator(`[data-viewer-transition="${name}"][data-viewer-active="true"][data-motion-state="settled"]`).first().waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-viewer-transition]')].every((element) => {
    const style = getComputedStyle(element);
    return element.dataset.viewerActive === 'true' && Number(style.opacity) === 1 && style.transform === 'none';
  }));
}

async function goto(page, hash, token = 'motion') {
  await page.goto(`${base}/share/${token}${hash ? `#${hash}` : ''}`);
  await page.waitForFunction((route) => {
    const screen = document.querySelector('[data-viewer-transition="screen"][data-viewer-active="true"]');
    return screen?.dataset.viewerPath === route && screen.dataset.viewerKey !== 'loading';
  }, hash || 'intro');
  await settled(page);
}

async function focusInside(page, label) {
  assert.equal(await page.getByRole('dialog', { name: label, exact: true }).evaluate((dialog) => dialog.contains(document.activeElement)), true, 'dialog receives focus');
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('dialog', { name: label, exact: true }).evaluate((dialog) => dialog.contains(document.activeElement)), true, 'focus remains in the dialog');
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1012 }, reducedMotion: 'no-preference', recordVideo: { dir: artifacts, size: { width: 960, height: 675 } } });
    await fixtures(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await goto(page, '');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await settled(page);
    await page.getByRole('button', { name: 'Relationships', exact: true }).click();
    await settled(page);
    await page.getByRole('button', { name: 'Family', exact: true }).click();
    await page.getByRole('button', { name: 'Alex Morgan', exact: true }).click();
    await settled(page, 'relationships');
    assert.match(page.url(), /#relationships\/family\/alex$/);
    await page.getByRole('button', { name: 'Enlarge Sundays in the garden' }).click();
    await focusInside(page, 'Photos shared by Alex Morgan');
    await page.keyboard.press('ArrowRight');
    await page.getByRole('dialog').getByText('2 / 3').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Enlarge Sundays in the garden' }).evaluate((button) => button === document.activeElement), true, 'photo opener regains focus');
    await page.goBack();
    await page.getByRole('button', { name: 'Alex Morgan', exact: true }).waitFor();
    await page.goForward();
    await page.getByRole('heading', { name: 'Alex Morgan', exact: true }).waitFor();
    await page.reload();
    await settled(page);
    await page.getByRole('heading', { name: 'Alex Morgan', exact: true }).waitFor();
    await page.screenshot({ path: path.join(artifacts, 'relationships-desktop.png'), fullPage: true });

    await goto(page, 'relationships/friends');
    await page.getByRole('button', { name: 'Friend 1', exact: true }).focus();
    await page.keyboard.press('End');
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Very Long Contributor/);
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'A Very Long Contributor Name That Wraps Across Multiple Lines' }).waitFor();

    await goto(page, 'story');
    await page.getByRole('button', { name: 'Who They Were', exact: true }).click();
    await settled(page, 'story');
    await page.getByRole('button', { name: 'Pause story' }).click();
    const historyLength = await page.evaluate(() => history.length);
    await page.keyboard.press('ArrowRight');
    await settled(page, 'slide');
    assert.match(page.url(), /#story\/slide\/2$/);
    assert.equal(await page.evaluate(() => history.length), historyLength, 'slides replace history entries');
    await page.screenshot({ path: path.join(artifacts, 'story-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Play story' }).click();
    await page.keyboard.press('Escape');
    await settled(page, 'story');
    await page.waitForTimeout(6500);
    assert.match(page.url(), /#story$/, 'exiting story clears its autoplay timer');
    await page.goBack();
    await settled(page, 'screen');

    await goto(page, 'voices');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('audio').currentTime > 0.2);
    const audio = await page.locator('audio').elementHandle();
    await page.getByRole('button', { name: 'Show all voices' }).click();
    await focusInside(page, 'Voices');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Show all voices' }).evaluate((button) => button === document.activeElement), true);
    assert.equal(await audio.evaluate((element) => element.paused), false, 'opening the list preserves playback');
    await page.screenshot({ path: path.join(artifacts, 'voices-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Show all voices' }).click();
    await page.getByRole('button', { name: 'Without Audio', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Play', exact: true }).isDisabled(), true);
    assert.equal(await audio.evaluate((element) => element.paused), true, 'replaced audio stops');
    await page.getByRole('button', { name: 'Previous recording' }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const currentAudio = await page.locator('audio').elementHandle();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await currentAudio.evaluate((element) => element.paused), true, 'audio stops before screen exit finishes');
    await settled(page);

    await goto(page, 'photos');
    await page.getByRole('button', { name: 'Sundays in the garden', exact: true }).click();
    await focusInside(page, 'Photo');
    await page.keyboard.press('ArrowRight');
    await page.getByRole('dialog').getByText('This photo is unavailable').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'dialog restores page scrolling');
    await page.getByRole('tab', { name: 'All Photos' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Family memories 3 photos' }).click();
    await settled(page, 'archive');
    await page.getByRole('heading', { name: 'Family memories' }).waitFor();
    await page.getByRole('button', { name: 'Back to albums' }).click();
    await page.screenshot({ path: path.join(artifacts, 'photos-desktop.png'), fullPage: true });

    for (const [width, height] of [[768, 1024], [390, 844], [320, 568], [844, 390]]) {
      await page.setViewportSize({ width, height });
      for (const route of ['navigation', 'relationships/friends', 'relationships/family/alex', 'story/slide/2', 'voices', 'photos']) {
        await goto(page, route);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: no horizontal overflow at ${width}x${height}`);
        if (route === 'voices') {
          assert.ok(await page.locator('blockquote').evaluate((element) => element.getBoundingClientRect().bottom <= document.querySelector('input[type="range"]').getBoundingClientRect().top), 'transcript does not overlap playback controls');
          assert.ok(await page.locator('blockquote').evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            return element.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
          }), 'the playback panel does not cover the transcript');
        }
        if (width === 390 || width === 844) await page.screenshot({ path: path.join(artifacts, `${route.replaceAll('/', '-')}-${width}.png`), fullPage: true });
      }
    }

    // History changes during an exit must resolve to the latest route.
    await page.setViewportSize({ width: 1440, height: 1012 });
    await goto(page, 'navigation');
    await page.getByRole('button', { name: 'Relationships', exact: true }).click();
    await page.evaluate(() => history.back());
    await page.getByRole('main', { name: 'Choose a memorial section' }).waitFor();
    await settled(page);
    assert.equal(await page.locator('[data-viewer-transition="screen"]').count(), 1);

    await goto(page, 'navigation', 'empty');
    assert.equal(await page.getByRole('button', { name: 'Voices', exact: true }).count(), 0);
    for (const route of ['relationships', 'story', 'photos']) {
      await goto(page, route, 'empty');
      await page.getByText(route === 'relationships' ? 'No relationships have been shared yet.' : route === 'story' ? 'No story moments are available yet.' : 'No photos yet', { exact: true }).waitFor();
    }
    for (const token of ['expired', 'failed']) {
      await goto(page, '', token);
      await page.getByRole('heading', { name: 'This memorial is unavailable' }).waitFor();
    }

    for (const entry of ['intro', 'output']) {
      await page.goto(`${base}/memorial/motion/${entry}`);
      await page.waitForURL(`${base}/share/motion`);
      await settled(page);
      await page.getByRole('button', { name: 'Start', exact: true }).waitFor();
    }

    const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await fixtures(reducedContext);
    const reducedPage = await reducedContext.newPage();
    reducedPage.on('pageerror', (error) => errors.push(error.message));
    await goto(reducedPage, 'story/slide/1');
    assert.equal(await reducedPage.getByRole('button', { name: 'Play story' }).count(), 1, 'reduced motion starts paused');
    await reducedPage.keyboard.press('ArrowRight');
    await settled(reducedPage, 'slide');
    assert.equal(await reducedPage.locator('[data-viewer-transition="slide"]').evaluate((element) => getComputedStyle(element).transform), 'none');
    await reducedPage.screenshot({ path: path.join(artifacts, 'reduced-motion-mobile.png'), fullPage: true });
    assert.deepEqual(errors, [], 'no browser runtime errors');
    await reducedContext.close();
    await context.close();
    console.log(`Viewer navigation, dialogs, media cleanup, responsive layout, legacy redirects and reduced motion passed. Artifacts: ${artifacts}`);
  } catch (error) {
    for (const context of browser.contexts()) {
      for (const [index, page] of context.pages().entries()) {
        console.error('Failure URL:', page.url());
        console.error((await page.locator('body').innerText()).slice(0, 1800));
        await page.screenshot({ path: path.join(artifacts, `failure-${index}.png`), fullPage: true }).catch(() => {});
      }
    }
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
