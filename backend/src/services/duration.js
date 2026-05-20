import { parseBuffer } from "music-metadata"

export const extractAudioDuration = async (buffer, mimeType) => {
  try {
    const metadata = await parseBuffer(buffer, mimeType)
    const duration = metadata?.format?.duration

    if (!duration || !isFinite(duration)) return null

    return Math.round(duration)
  } catch (err) {
    console.log("Duration extraction failed:", err.message)
    return null
  }
}