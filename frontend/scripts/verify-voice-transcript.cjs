// Optional browser regression: run against a local Next.js server with Playwright.
// All API and audio requests are fixtures; this never contacts a live backend.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const base = process.env.VOICE_TEST_BASE_URL || 'http://127.0.0.1:3045';
const artifacts = process.env.VOICE_TEST_ARTIFACT_DIR || os.tmpdir();

function silence(seconds = 25) {
  const sampleRate = 8000;
  const dataSize = seconds * sampleRate * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF'); wav.writeUInt32LE(36 + dataSize, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(dataSize, 40);
  return wav;
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('remember.mock.auth', JSON.stringify({ token: 'us25-fixture' })));
    const page = await context.newPage();
    page.on('console', msg => { if (msg.type() === 'error') console.error('Browser:', msg.text()); });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const segments = Array.from({ length: 24 }, (_, i) => ({ start: i, end: i + 0.8, text: `Memory line ${i + 1}: Sundays in the garden together.` }));
    const output = { story: [], constellation: { nodes: [], edges: [] }, photos: [], voices: [
      { id: 'timed', contributor_title: 'Garden Sundays', audio_url: `${base}/fixture-audio.wav?id=timed`, duration_seconds: 25, transcript_text: segments.map(s => s.text).join(' '), transcript_segments: segments, ai_category: 'Family gardens' },
      { id: 'plain', contributor_title: 'Without timestamps', audio_url: `${base}/fixture-audio.wav?id=plain`, duration_seconds: 25, transcript_text: 'A transcript without timestamps.' },
      { id: 'missing', contributor_title: 'Without audio', transcript_text: 'The text remains available.' },
    ] };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/fixture-audio.wav') {
        const wav = silence();
        const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
        const start = range ? Number(range[1]) : 0;
        const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
        return route.fulfill({ status: range ? 206 : 200, contentType: 'audio/wav',
          headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1), ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) },
          body: wav.subarray(start, end + 1) });
      }
      if (url.origin === new URL(base).origin) return route.continue();
      if (!url.pathname.startsWith('/memorials/') && !url.pathname.startsWith('/share/')) return route.abort();
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const memorial = { id: 'us25', subject_name: 'Robin', status: 'complete', biography: 'Remembering Robin' };
      const data = url.pathname.endsWith('/output') ? output : url.pathname.startsWith('/share/') ? { memorial, output_json: output }
        : url.pathname.endsWith('/contributors') ? { contributors: [] }
        : url.pathname.endsWith('/archive') ? { contributors: [], photos: [], voices: [], stories: [], responses: [] }
        : url.pathname.endsWith('/invite-link') ? { invite_link: { token: 'fixture' } } : { memorial };
      return route.fulfill({ contentType: 'application/json', headers, body: JSON.stringify(data) });
    });

    await page.goto(`${base}/memorial/us25/output`);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Voices', exact: true }).click();
    const transcript = page.getByRole('region', { name: 'Transcript for Garden Sundays' });
    assert.equal(await transcript.locator('p').count(), 24, 'one transcript, no duplicated full text');
    await page.getByRole('button', { name: 'Play recording', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-current="true"]')?.textContent.includes('line 2:'), undefined, { polling: 100 });
    await page.getByRole('button', { name: 'Pause recording', exact: true }).click();
    const pausedTime = await page.locator('audio').evaluate(audio => audio.currentTime);
    assert.ok(pausedTime > 1 && pausedTime < 2, 'pause preserves playback position');
    await page.getByRole('button', { name: 'Play recording', exact: true }).click();
    assert.ok(await page.locator('audio').evaluate(audio => audio.currentTime) >= pausedTime, 'resume does not restart');
    await page.getByRole('button', { name: 'Pause recording', exact: true }).click();

    const slider = page.getByRole('slider', { name: 'Audio progress' });
    await slider.focus();
    await slider.press('Home');
    await slider.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('[aria-current="true"]')?.textContent.includes('line 2:'), undefined, { polling: 100 });
    assert.match(await transcript.locator('[aria-current="true"]').innerText(), /line 2:/);
    await slider.press('End');
    await page.waitForFunction(() => document.querySelector('audio').currentTime >= 24.9, undefined, { polling: 100 });
    assert.equal(await transcript.locator('[aria-current="true"]').count(), 0, 'nothing highlighted after speech');
    await page.locator('audio').evaluate(async audio => { await new Promise(resolve => { audio.addEventListener('seeked', resolve, { once: true }); audio.currentTime = 18.2; }); });
    await page.waitForFunction(() => document.querySelector('[aria-current="true"]')?.textContent.includes('line 19:'), undefined, { polling: 100 });
    console.log('Viewer playback and seeking verified.');
    assert.ok(await transcript.evaluate(el => el.scrollTop) > 300, 'active line auto-scrolls into transcript viewport');
    const bodyScroll = await page.evaluate(() => window.scrollY);
    await page.locator('audio').evaluate(async audio => { await new Promise(resolve => { audio.addEventListener('seeked', resolve, { once: true }); audio.currentTime = 2.2; }); });
    await page.waitForFunction(() => document.querySelector('[aria-current="true"]')?.textContent.includes('line 3:'), undefined, { polling: 100 });
    assert.equal(await page.evaluate(() => window.scrollY), bodyScroll, 'automatic transcript scrolling does not move the page');
    await page.locator('audio').evaluate(async audio => { await new Promise(resolve => { audio.addEventListener('seeked', resolve, { once: true }); audio.currentTime = 2.9; }); });
    await page.waitForFunction(() => !document.querySelector('[aria-current="true"]'), undefined, { polling: 100 });
    await page.screenshot({ path: path.join(artifacts, 'us25-voices-desktop.png'), fullPage: true });

    await page.getByRole('button', { name: 'Without timestamps', exact: true }).click();
    assert.equal(await page.getByText('A transcript without timestamps.', { exact: true }).count(), 1);
    assert.equal(await page.locator('[aria-current="true"]').count(), 0);
    await page.getByRole('button', { name: 'Without audio', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Play recording' }).isDisabled(), true);
    await page.getByText('The text remains available.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Garden Sundays', exact: true }).click();
    assert.equal(await page.locator('audio').evaluate(audio => audio.currentTime), 0, 'recording selection resets its clock');
    await page.getByRole('button', { name: 'Play recording' }).click();
    const oldAudio = await page.locator('audio').elementHandle();
    await page.getByRole('button', { name: 'Without timestamps', exact: true }).click();
    assert.equal(await oldAudio.evaluate(audio => audio.paused), true, 'removed recording stops playing');

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole('button', { name: 'Garden Sundays', exact: true }).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal overflow at ${width}px`);
      await page.screenshot({ path: path.join(artifacts, `us25-voices-${width}.png`), fullPage: true });
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/share/us25-fixture`);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Voices', exact: true }).click();
    await page.locator('audio').evaluate(async audio => { await new Promise(resolve => { audio.addEventListener('seeked', resolve, { once: true }); audio.currentTime = 10.2; }); });
    await page.waitForFunction(() => document.querySelector('[aria-current="true"]')?.textContent.includes('line 11:'), undefined, { polling: 100 });

    await page.goto(`${base}/memorial/us25/manage`);
    await page.getByRole('button', { name: 'Outputs', exact: true }).click();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next page', exact: true }).click();
    const card = page.locator('article').first();
    await card.locator('audio').evaluate(async audio => { await new Promise(resolve => { audio.addEventListener('seeked', resolve, { once: true }); audio.currentTime = 10.2; }); });
    await page.waitForFunction(() => document.querySelector('[aria-current="true"]')?.textContent.includes('line 11:'), undefined, { polling: 100 });
    await card.getByRole('button', { name: 'Play recording' }).click();
    await page.locator('article').nth(1).getByRole('button', { name: 'Play recording' }).click();
    assert.equal(await card.locator('audio').evaluate(audio => audio.paused), true, 'organizer playback stops the previous recording');
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('US-25 browser checks passed: playback, pause/resume, seek, silence, scrolling, fallback, recording switching, shared viewer, organizer and mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
