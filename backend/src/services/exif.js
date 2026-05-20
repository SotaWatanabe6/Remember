import exifr from "exifr"

// Extracts EXIF metadata from image buffer
// Returns null safely if no EXIF data exists
export const extractImageMetadata = async (buffer) => {
  try {
    const exif = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps:  true,
    })

    if (!exif) return null

    return {
      width:        exif.ImageWidth     || exif.ExifImageWidth  || null,
      height:       exif.ImageHeight    || exif.ExifImageHeight || null,
      takenAt:      exif.DateTimeOriginal
                    ? new Date(exif.DateTimeOriginal)
                    : exif.DateTime
                    ? new Date(exif.DateTime)
                    : null,
      locationLat:  exif.latitude  || null,
      locationLng:  exif.longitude || null,
      uploadDevice: exif.Make && exif.Model
                    ? `${exif.Make} ${exif.Model}`.trim()
                    : exif.Make || exif.Model || null,
    }
  } catch (err) {
    console.log("EXIF extraction failed:", err.message)
    return null
  }
}