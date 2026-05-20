import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
import uploadRouter from "./routes/upload.js"
import { errorHandler } from "./middleware/errorHandler.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8000

// ── Security middleware ───────────────────────────────────────────────────────

// Helmet adds security headers to every response automatically
// Protects against XSS, clickjacking, and other common attacks
app.use(helmet())

// CORS — only allow requests from your React frontend
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

// Rate limiter — max 20 upload requests per 15 minutes per IP
// Stops someone from flooding your storage with spam uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many uploads. Please wait and try again." }
})

// ── Routes ───────────────────────────────────────────────────────────────
app.use(uploadLimiter)
app.use("/api", uploadRouter)

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json())

// Health check — useful for Render to confirm server is alive
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Remember API is running" })
})

// ── Global error handler — must be last ───────────────────────────────────────
app.use(errorHandler)

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Remember API running on http://localhost:${PORT}`)
})