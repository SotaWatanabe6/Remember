const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const dotenv = require('dotenv')

dotenv.config()

const memorialRoutes = require('./routes/memorials')
const contributeRoutes = require('./routes/contribute')
const aiRoutes = require('./routes/ai')
const { errorHandler } = require('./middleware/errorHandler')
const shareRoutes = require('./routes/share')
const waitlistRoutes = require('./routes/waitlist')

const app = express()

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]
const configuredAllowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || "").split(","),
]
  .map((origin) => origin && origin.trim())
  .map((origin) => origin && origin.replace(/\/$/, ""))
  .filter(Boolean)
const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredAllowedOrigins])]

// ── Security ──────────────────────────────────────────────────────────────────
// Behind a reverse proxy (e.g. Render's load balancer) every request arrives
// from the proxy, so rate limits would lump all clients together. TRUST_PROXY
// is the number of proxy hops to trust in X-Forwarded-For. Leave it unset when
// clients connect directly: trusting the header then lets them spoof their IP.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY)
  app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY)
}

app.use(helmet())

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

// Rate limiter — max 20 upload requests per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: (req) => req.method !== 'POST',
  message: { error: "Too many uploads. Please wait and try again." }
})

// Each start creates a contributor row, so cap how fast one IP can create them.
const contributorStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many attempts. Please wait and try again." }
})

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json())

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, message: "Remember API is running" })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/memorials', memorialRoutes)
app.post('/contribute/:token/start', contributorStartLimiter)
app.use('/contribute/:token/photos', uploadLimiter)
app.use('/contribute/:token/voice', uploadLimiter)
app.use('/contribute', contributeRoutes)
app.use('/ai', aiRoutes)
app.use('/share', shareRoutes)
app.use('/waitlist', waitlistRoutes)

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler)

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Remember API running on port ${PORT}`)
})
