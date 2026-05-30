import { getSupabaseClient } from "@/lib/supabaseClient.js";

const BUCKET_NAME = "memorial_cover_photo";

/**
 * Uploads a photo file to Supabase Storage
 * Returns the public URL of the uploaded file
 *
 * @param {File} file - The photo file to upload
 * @returns {Promise<string>} - Public URL of the uploaded photo
 */
export async function uploadPhotoToSupabase(file) {
  if (!file) {
    throw new Error("No file provided");
  }

  // Validate file is an image
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Generate unique filename to prevent overwrites
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const fileExtension = file.name.split(".").pop();
  const filename = `${timestamp}-${randomId}.${fileExtension}`;

  try {
    const supabase = getSupabaseClient();

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message || "Failed to upload photo");
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    if (!publicUrlData?.publicUrl) {
      throw new Error("Failed to get public URL");
    }

    return publicUrlData.publicUrl;
  } catch (err) {
    throw new Error(`Photo upload error: ${err.message}`);
  }
}
