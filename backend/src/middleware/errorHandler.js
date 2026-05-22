const errorHandler = (err, req, res, next) => {
  console.error("Unhandled error:", err.message)

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" })
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ error: "Too many files" })
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Unexpected file field" })
  }

  res.status(500).json({
    error: "Something went wrong on our end. Please try again."
  })
}

module.exports = { errorHandler }