const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require("dotenv").config()
const uploadRouter = require("./routes/upload.js")
const { errorHandler } = require("./middleware/errorHandler.js")

const app = express()
const PORT = process.env.PORT || 8000

app.use(helmet())

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many uploads. Please wait and try again." }
})

app.use(uploadLimiter)
app.use("/api", uploadRouter)
app.use(express.json())

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Remember API is running" })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Remember API running on http://localhost:${PORT}`)
})