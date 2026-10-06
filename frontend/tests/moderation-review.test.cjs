const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('next/dist/build/swc');

const filename = path.resolve(__dirname, '../src/components/organizer/ModerationReview.jsx');
const moduleFixture = { exports: {} };
const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' },
});
vm.runInNewContext(code, { module: moduleFixture, exports: moduleFixture.exports, require: createRequire(filename) }, { filename });
const Review = moduleFixture.exports.default;
const render = (detail, disabled = false) => renderToStaticMarkup(React.createElement(Review, { detail, disabled, onResolve() {} }));

test('organizer review renders original answers, reasons and all resolution choices', () => {
  const html = render({ contributor: { id: 'c1' }, responses: [{ id: 'r1', is_flagged: true, question_text: 'What did she love?', response_text: 'Our lake trip.', flagged_reason: 'Answers a different question.' }] });
  for (const text of ['What did she love?', 'Our lake trip.', 'Answers a different question.', 'Approve as-is', 'Edit or move answer', 'Leave out of memorial', 'Generation is paused']) assert.ok(html.includes(text));
  assert.ok(!html.includes('disabled=""'));
});

test('held uploads have previews; pending requests disable resolution actions', () => {
  const html = render({ photos: [{ id: 'p1', is_flagged: true, photo_url: 'https://fixture.invalid/photo.jpg', flagged_reason: 'Needs review' }], voices: [{ id: 'v1', is_flagged: true, audio_url: 'https://fixture.invalid/voice.wav' }] }, true);
  assert.ok(html.includes('<img'));
  assert.ok(html.includes('<audio'));
  assert.equal((html.match(/disabled=""/g) || []).length, 4);
});

test('resolved items and whole excluded contributions leave the moderation queue', () => {
  assert.equal(render({ photos: [{ id: 'p1', is_flagged: true, moderation_resolution: 'excluded' }], responses: [{ id: 'r1', is_flagged: false, moderation_resolution: 'approved' }] }), '');
  assert.equal(render({ contributor: { moderation_resolution: 'excluded' }, photos: [{ id: 'p1', is_flagged: true }] }), '');
});
