const assert = require('node:assert/strict')
const { test } = require('node:test')
const { isOwnCoverPhoto, isSameCoverPhoto } = require('../src/services/coverPhoto')

// A memorial cover must be the organizer's own upload, because the API signs
// whatever the cover points at and shows it to viewers and contributors.
const supabase = { supabaseUrl: 'https://project.supabase.co' }
const signed = (bucket, objectPath, token = 'abc') =>
  `https://project.supabase.co/storage/v1/object/sign/${bucket}/${objectPath}?token=${token}`

for (const [name, value] of [
  ['their uploaded path', 'covers/organizer/1700000000000.png'],
  ['their uploaded path with a leading slash', '/covers/organizer/1700000000000.png'],
  ['a signed URL for their upload', signed('memorial-assets', 'covers/organizer/1700000000000.jpg')],
]) {
  test(`accepts ${name}`, () => {
    assert.equal(isOwnCoverPhoto(supabase, value, 'organizer'), true)
  })
}

for (const [name, value] of [
  ["another organizer's cover", 'covers/someone-else/1700000000000.png'],
  ["a contributor's photo", 'memorials/m/contributions/c/photos/a-photo.jpg'],
  ['a voice recording', signed('memorial-assets', 'memorials/m/contributions/c/voice/a.mp3')],
  ['an object in another bucket', signed('private-bucket', 'covers/organizer/1.png')],
  ["another project's signed URL", 'https://other.supabase.co/storage/v1/object/sign/memorial-assets/covers/organizer/1.png?token=x'],
  ['an external URL', 'https://example.com/covers/organizer/1.png'],
  ['a path escaping the folder', 'covers/organizer/../someone-else/1.png'],
  ['an encoded slash escaping the folder', signed('memorial-assets', 'covers/organizer/..%2Fsomeone-else%2F1.png')],
  ['the folder itself', 'covers/organizer/'],
  ['a non-string value', { path: 'covers/organizer/1.png' }],
]) {
  test(`rejects ${name}`, () => {
    assert.equal(isOwnCoverPhoto(supabase, value, 'organizer'), false)
  })
}

test('a re-signed URL for the saved cover counts as unchanged', () => {
  const saved = signed('memorial-assets', 'covers/organizer/1.png', 'old-token')
  assert.equal(isSameCoverPhoto(supabase, saved, signed('memorial-assets', 'covers/organizer/1.png', 'new-token')), true)
})

test('a legacy bare path matches its signed URL in any bucket', () => {
  assert.equal(isSameCoverPhoto(supabase, 'legacy/portrait.jpg', signed('memorial_cover_photo', 'legacy/portrait.jpg')), true)
})

test('a legacy external URL is unchanged only when re-sent exactly', () => {
  assert.equal(isSameCoverPhoto(supabase, 'https://example.com/a.jpg', 'https://example.com/a.jpg'), true)
  assert.equal(isSameCoverPhoto(supabase, 'https://example.com/a.jpg', 'https://example.com/b.jpg'), false)
})

test('pointing at a different object is not unchanged', () => {
  const saved = signed('memorial-assets', 'covers/organizer/1.png')
  assert.equal(isSameCoverPhoto(supabase, saved, 'memorials/m/contributions/c/photos/a.jpg'), false)
  assert.equal(isSameCoverPhoto(supabase, saved, signed('other-bucket', 'covers/organizer/1.png')), false)
})
