// Validation middleware 

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg", 
  "image/png",
  "image/webp"
]

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  "audio/ogg"
]

const MAX_PHOTO_SIZE = 15 * 1024 * 1024  // 15MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024  // 50MB
const MIN_FILE_SIZE  = 1 * 1024          // 1KB minimum

// Dangerous file extensions that should never be uploaded
const DANGEROUS_EXTENSIONS = [
  ".exe", ".sh", ".bat", ".php",
  ".py", ".js", ".rb", ".pl"
]

export const validateFiles = (req, res, next) => {
  const { file_category } = req.body
  const files = req.files

  // Check file_category is valid
  if (!["photo", "voice"].includes(file_category)) {
    return res.status(400).json({
      error: "file_category must be photo or voice"
    })
  }

  // Check at least one file was sent
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files provided" })
  }

  const errors = []

  for (const file of files) {
    const filename = file.originalname.toLowerCase()
    const ext = "." + filename.split(".").pop()

    // Block dangerous file extensions
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      errors.push(`${file.originalname}: file type not allowed`)
      continue
    }

    // Check minimum size (catches empty/corrupt files)
    if (file.size < MIN_FILE_SIZE) {
      errors.push(`${file.originalname}: file is too small or empty`)
      continue
    }

    // Check photo rules
    if (file_category === "photo") {
      if (!ALLOWED_PHOTO_TYPES.includes(file.mimetype)) {
        errors.push(`${file.originalname}: invalid photo type (${file.mimetype})`)
        continue
      }
      if (file.size > MAX_PHOTO_SIZE) {
        errors.push(`${file.originalname}: photo exceeds 15MB limit`)
        continue
      }
    }

    // Check voice rules
    if (file_category === "voice") {
      if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
        errors.push(`${file.originalname}: invalid audio type (${file.mimetype})`)
        continue
      }
      if (file.size > MAX_AUDIO_SIZE) {
        errors.push(`${file.originalname}: audio exceeds 50MB limit`)
        continue
      }
    }
  }

  // If any file failed validation, reject the whole request
  if (errors.length > 0) {
    return res.status(400).json({ errors })
  }

  next()
}