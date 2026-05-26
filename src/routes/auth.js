const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (error) return res.status(400).json({ error: error.message })

    const token = jwt.sign(
      { sub: data.user.id, email: data.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.status(201).json({
      user: { id: data.user.id, email: data.user.email },
      token
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) return res.status(401).json({ error: error.message })

    const token = jwt.sign(
      { sub: data.user.id, email: data.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      user: { id: data.user.id, email: data.user.email },
      token
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router