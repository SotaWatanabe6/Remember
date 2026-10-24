const assert = require('node:assert/strict')
const { test } = require('node:test')
const { detectImageType } = require('../src/lib/fileType')

const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)])
const ftyp = (brand) => pad([0, 0, 0, 0x18, ...Buffer.from('ftyp'), ...Buffer.from(brand)])

for (const [name, buffer, mime] of [
  ['JPEG', pad([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
  ['PNG', pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
  ['WebP', pad([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')]), 'image/webp'],
  ['HEIC', ftyp('heic'), 'image/heic'],
  ['HEIF', ftyp('mif1'), 'image/heif'],
]) {
  test(`detects ${name} from its signature`, () => {
    assert.equal(detectImageType(buffer)?.mime, mime)
  })
}

for (const [name, buffer] of [
  ['SVG markup', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>')],
  ['HTML', Buffer.from('<!doctype html><script>alert(1)</script>')],
  ['MP4 video', ftyp('isom')],
  ['empty file', Buffer.alloc(0)],
  ['truncated JPEG', Buffer.from([0xff, 0xd8])],
  ['non-buffer input', 'not a buffer'],
]) {
  test(`rejects ${name}`, () => {
    assert.equal(detectImageType(buffer), null)
  })
}
