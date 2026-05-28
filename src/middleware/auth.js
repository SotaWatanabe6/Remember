const jwt = require('jsonwebtoken')
const supabase = require('../supabase')

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const token = authHeader.split(' ')[1]
  // try {
    // const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const {
      data,
      error
    } = supabase.auth.getUser(token)
    if (error) {
      return res.status(401).json({
        error: 'Invalid token'
      })
    }
    req.user = data
    next()
  // } catch (err) {
  //   return res.status(401).json({ error: 'Invalid or expired token' })
  // }
}