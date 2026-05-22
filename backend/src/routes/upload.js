const express = require("express")
const multer = require("multer")
const supabase = require("../supabase.js")
const { validateFiles } = require("../middleware/validate.js")
const { extractImageMetadata } = require("../services/exif.js")
const { extractAudioDuration } = require("../services/duration.js")

const router = express.Router()
const STORAGE_BUCKET = "memorial-assets"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10
  }
})

router.post(
  "/media/upload",
  upload.array("files", 10),
  validateFiles,
  async (req, res) => {
    const {
      memorial_id,
      contributor_id,
      file_category,
      contributor_title,
      caption
    } = req.body

    const files = req.files
    const results = []

    for (const file of files) {
      let dbRecord = null

      try {
        const folder = file_category === "photo" ? "photos" : "voice"
        const ext = file.originalname.split(".").pop().toLowerCase()

        if (file_category === "photo") {
          const exif = await extractImageMetadata(file.buffer)

          const { data, error } = await supabase
            .from("media_assets")
            .insert({
              memorial_id:        memorial_id,
              contributor_id:     contributor_id || null,
              storage_path:       "pending",
              storage_bucket:     STORAGE_BUCKET,
              file_name:          file.originalname,
              file_type:          file.mimetype,
              file_size_bytes:    file.size,
              ai_analysis_status: "pending",
              caption:            caption || null,
              width:              exif?.width        || null,
              height:             exif?.height       || null,
              taken_at:           exif?.takenAt      || null,
              location_lat:       exif?.locationLat  || null,
              location_lng:       exif?.locationLng  || null,
              upload_device:      exif?.uploadDevice || null,
            })
            .select()
            .single()

          if (error) throw new Error(error.message)
          dbRecord = data

        } else {
          if (!contributor_title || !contributor_title.trim()) {
            results.push({
              filename: file.originalname,
              status:   "failed",
              error:    "contributor_title is required for voice recordings"
            })
            continue
          }

          const durationSeconds = await extractAudioDuration(file.buffer, file.mimetype)

          const { data, error } = await supabase
            .from("voice_recordings")
            .insert({
              memorial_id:          memorial_id,
              contributor_id:       contributor_id || null,
              storage_path:         "pending",
              storage_bucket:       STORAGE_BUCKET,
              file_name:            file.originalname,
              file_type:            file.mimetype,
              file_size_bytes:      file.size,
              contributor_title:    contributor_title.trim(),
              transcription_status: "pending",
              duration_seconds:     durationSeconds,
            })
            .select()
            .single()

          if (error) throw new Error(error.message)
          dbRecord = data
        }

        const storagePath = `memorials/${memorial_id}/contributions/${contributor_id}/${folder}/${dbRecord.id}.${ext}`

        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert:      false
          })

        if (storageError) {
          console.error("Storage upload failed:", storageError.message)

          if (file_category === "photo") {
            await supabase.from("media_assets").delete().eq("id", dbRecord.id)
          } else {
            await supabase.from("voice_recordings").delete().eq("id", dbRecord.id)
          }

          results.push({
            filename: file.originalname,
            status:   "failed",
            error:    "Storage upload failed"
          })
          continue
        }

        if (file_category === "photo") {
          await supabase
            .from("media_assets")
            .update({ storage_path: storagePath })
            .eq("id", dbRecord.id)
        } else {
          await supabase
            .from("voice_recordings")
            .update({ storage_path: storagePath })
            .eq("id", dbRecord.id)
        }

        results.push({
          filename:      file.originalname,
          status:        "success",
          recordId:      dbRecord.id,
          storagePath,
          storageBucket: STORAGE_BUCKET
        })

      } catch (err) {
        console.error(`Error processing ${file.originalname}:`, err.message)

        if (dbRecord) {
          try {
            if (file_category === "photo") {
              await supabase.from("media_assets").delete().eq("id", dbRecord.id)
            } else {
              await supabase.from("voice_recordings").delete().eq("id", dbRecord.id)
            }
          } catch (cleanupErr) {
            console.error("Cleanup failed:", cleanupErr.message)
          }
        }

        results.push({
          filename: file.originalname,
          status:   "failed",
          error:    "Processing failed"
        })
      }
    }

    res.status(200).json({ uploads: results })
  }
)

module.exports = router