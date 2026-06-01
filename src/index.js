const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const rateLimit = require('express-rate-limit')

dotenv.config()

const authRoutes = require('./routes/auth')
const memorialRoutes = require('./routes/memorials')
const contributeRoutes = require('./routes/contribute')
const aiRoutes = require('./routes/ai')
const shareRoutes = require('./routes/share')

const app = express()

const contributeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
})

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/auth', authRoutes)
app.use('/memorials', memorialRoutes)
app.use('/contribute', contributeLimiter, contributeRoutes)
app.use('/ai', aiRoutes)
app.use('/share', shareRoutes)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Remember API running on port ${PORT}`)
})
