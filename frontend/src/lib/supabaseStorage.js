import { uploadMemorialCoverPhoto } from "@/lib/api.js";

/**
 * Uploads a memorial cover portrait via the Remember API.
 * @returns {Promise<string>} storage path or URL for cover_photo_url
 */
export async function uploadPhotoToSupabase(file) {
  const data = await uploadMemorialCoverPhoto(file);
  return data.cover_photo_url || data.storage_path || data.url;
}
