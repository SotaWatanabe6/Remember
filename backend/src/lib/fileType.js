// Identify an uploaded image from its leading bytes. The browser-supplied MIME
// type and file name are attacker-controlled, so storing with them would let
// e.g. an SVG (which can run script) be saved and served as an image.
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'])
const HEIF_BRANDS = new Set(['mif1', 'msf1'])

function ascii(buffer, start, end) {
  return buffer.subarray(start, end).toString('latin1')
}

function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' }
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', extension: 'png' }
  }
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') {
    return { mime: 'image/webp', extension: 'webp' }
  }
  if (ascii(buffer, 4, 8) === 'ftyp') {
    const brand = ascii(buffer, 8, 12)
    if (HEIC_BRANDS.has(brand)) return { mime: 'image/heic', extension: 'heic' }
    if (HEIF_BRANDS.has(brand)) return { mime: 'image/heif', extension: 'heif' }
  }
  return null
}

module.exports = { detectImageType }
