const supabase = require('../supabase')

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const token = authHeader.split(' ')[1]
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = { ...data.user, sub: data.user.id }
    next()
  } catch (err) {
    console.error('Auth error:', err.message)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}
