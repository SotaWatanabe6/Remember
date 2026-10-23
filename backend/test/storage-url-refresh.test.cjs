const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveStorageUrl, resolveOutputMediaUrls } = require('../src/services/storageUrls')

const projectUrl = 'https://storage-fixture.supabase.co'
const oldPhotoUrl = `${projectUrl}/storage/v1/object/sign/family-photos/folder/old%20photo.jpg?token=expired`

function storageFixture() {
  const requests = []
  const supabase = {
    supabaseUrl: projectUrl,
    storage: { from: (bucket) => ({ createSignedUrl: async (path, expiresIn) => {
      requests.push({ bucket, path, expiresIn })
      return { data: { signedUrl: `${projectUrl}/storage/v1/object/sign/${bucket}/${encodeURI(path)}?token=fresh-${requests.length}` } }
    } }) },
  }
  return { supabase, requests }
}

test('saved signed URLs are renewed from their original bucket and decoded object path', async () => {
  const { supabase, requests } = storageFixture()
  const url = await resolveStorageUrl(supabase, oldPhotoUrl)
  assert.notEqual(url, oldPhotoUrl)
  assert.match(url, /token=fresh-/)
  assert.deepEqual(requests, [{ bucket: 'family-photos', path: 'folder/old photo.jpg', expiresIn: 86400 }])
});

test('external and public URLs are preserved without minting storage access', async () => {
  const { supabase, requests } = storageFixture()
  for (const url of [
    'https://example.com/photo.jpg',
    'https://another-project.supabase.co/storage/v1/object/sign/private/secret.jpg?token=old',
    `${projectUrl}/storage/v1/object/public/portraits/photo.jpg`,
    'https://storage-fixture.supabase.co.example.com/storage/v1/object/sign/private/secret.jpg',
  ]) assert.equal(await resolveStorageUrl(supabase, url), url)
  assert.deepEqual(requests, [])
});

test('album photos prefer permanent paths, retain their bucket, and update existing URL aliases', async () => {
  const { supabase, requests } = storageFixture()
  const saved = { photos: { albums: [{ name: 'Family', cover_photo_url: oldPhotoUrl, photos: [{
    id: 'photo-1', storage_path: 'folder/current.jpg', storage_bucket: 'family-photos',
    url: oldPhotoUrl, photo_url: oldPhotoUrl, contributor_id: 'person-1',
  }] }] } }
  const before = structuredClone(saved)
  const refreshed = await resolveOutputMediaUrls(supabase, saved)
  const photo = refreshed.photos.albums[0].photos[0]
  assert.match(photo.url, /family-photos\/folder\/current\.jpg\?token=fresh-/)
  assert.equal(photo.photo_url, photo.url)
  assert.equal(photo.contributor_id, 'person-1')
  assert.equal(requests.find((request) => request.path === 'folder/current.jpg').bucket, 'family-photos')
  assert.deepEqual(saved, before)
});

test('legacy media URLs refresh across output sections without changing source content', async () => {
  const { supabase } = storageFixture()
  const saved = {
    story: [{ photo_url: oldPhotoUrl, narration: 'An original memory.' }],
    voices: [{ audio_url: `${projectUrl}/storage/v1/object/sign/voices/memory.wav?token=expired` }],
    constellation: { nodes: [{ photo_urls: [oldPhotoUrl] }] },
    photos: [{ album_name: 'Family', photos: [{ id: 'legacy', url: oldPhotoUrl }] }],
  }
  const result = await resolveOutputMediaUrls(supabase, saved)
  assert.match(result.story[0].photo_url, /token=fresh-/)
  assert.equal(result.story[0].narration, saved.story[0].narration)
  assert.match(result.voices[0].audio_url, /\/voices\/memory\.wav\?token=fresh-/)
  assert.match(result.constellation.nodes[0].photo_urls[0], /token=fresh-/)
  assert.match(result.photos[0].photos[0].url, /token=fresh-/)
});
