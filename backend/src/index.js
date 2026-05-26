const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const dotenv = require('dotenv')

dotenv.config()

const authRoutes = require('./routes/auth')
const memorialRoutes = require('./routes/memorials')
const contributeRoutes = require('./routes/contribute')
const aiRoutes = require('./routes/ai')
const uploadRouter = require('./routes/upload')
const { errorHandler } = require('./middleware/errorHandler')

const app = express()

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet())

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

// Rate limiter — max 20 upload requests per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many uploads. Please wait and try again." }
})

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json())

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, message: "Remember API is running" })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes)
app.use('/memorials', memorialRoutes)
app.use('/contribute', contributeRoutes)
app.use('/ai', aiRoutes)

// Upload route with rate limiting
app.use('/api', uploadLimiter, uploadRouter)

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler)

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Remember API running on port ${PORT}`)
})