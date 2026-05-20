import express from "express"
import multer from "multer"
import { PrismaClient } from "@prisma/client"
import supabase from "../services/storage.js"
import { validateFiles } from "../middleware/validate.js"
import { extractImageMetadata } from "../services/exif.js"
import { extractAudioDuration } from "../services/duration.js"

const router = express.Router()
const prisma = new PrismaClient()

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

        // ── STEP 1: Create DB row first to get the ID ──────────────────────
        if (file_category === "photo") {

          const exif = await extractImageMetadata(file.buffer)

          dbRecord = await prisma.mediaAsset.create({
            data: {
              memorialId:       memorial_id,
              contributorId:    contributor_id || null,
              storagePath:      "pending",
              storageBucket:    STORAGE_BUCKET,
              fileName:         file.originalname,
              fileType:         file.mimetype,
              fileSizeBytes:    BigInt(file.size),
              aiAnalysisStatus: "pending",
              caption: caption || null,
              width:        exif?.width        || null,
              height:       exif?.height       || null,
              takenAt:      exif?.takenAt      || null,
              locationLat:  exif?.locationLat  || null,
              locationLng:  exif?.locationLng  || null,
              uploadDevice: exif?.uploadDevice || null,
            }
          })

        } else {
          if (!contributor_title || !contributor_title.trim()) {
            results.push({
              filename: file.originalname,
              status:   "failed",
              error:    "contributor_title is required for voice recordings"
            })
            continue
          }

          // Extract duration before saving)
          const durationSeconds = await extractAudioDuration(file.buffer, file.mimetype)
          
          dbRecord = await prisma.voiceRecording.create({
            data: {
              memorialId:          memorial_id,
              contributorId:       contributor_id || null,
              storagePath:         "pending",
              storageBucket:       STORAGE_BUCKET,
              fileName:            file.originalname,
              fileType:            file.mimetype,
              fileSizeBytes:       BigInt(file.size),
              contributorTitle:    contributor_title.trim(),
              transcriptionStatus: "pending",
              durationSeconds:     durationSeconds, 
            }
          })
        }

        // ── STEP 2: Build storage path using DB record ID ──────────────────
        const storagePath = `memorials/${memorial_id}/contributions/${contributor_id}/${folder}/${dbRecord.id}.${ext}`

        // ── STEP 3: Upload to Supabase Storage ─────────────────────────────
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert:      false
          })

        if (storageError) {
          console.error("Storage upload failed:", storageError.message)

          // Clean up DB row — keep DB and storage in sync
          if (file_category === "photo") {
            await prisma.mediaAsset.delete({ where: { id: dbRecord.id } })
          } else {
            await prisma.voiceRecording.delete({ where: { id: dbRecord.id } })
          }

          results.push({
            filename: file.originalname,
            status:   "failed",
            error:    "Storage upload failed"
          })
          continue
        }

        // ── STEP 4: Update DB row with real storage path ───────────────────
        if (file_category === "photo") {
          await prisma.mediaAsset.update({
            where: { id: dbRecord.id },
            data:  { storagePath, updatedAt: new Date() }
          })
        } else {
          await prisma.voiceRecording.update({
            where: { id: dbRecord.id },
            data:  { storagePath, updatedAt: new Date() }
          })
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

        // Clean up DB row if something failed mid-way
        if (dbRecord) {
          try {
            if (file_category === "photo") {
              await prisma.mediaAsset.delete({ where: { id: dbRecord.id } })
            } else {
              await prisma.voiceRecording.delete({ where: { id: dbRecord.id } })
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

export default router
