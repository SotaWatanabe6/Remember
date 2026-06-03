const jwt = require('jsonwebtoken')
const jwksClient = require('jwks-rsa')

const client = jwksClient({
  jwksUri: 'https://tbpdhybqbjucoxdizlgw.supabase.co/auth/v1/.well-known/jwks.json'
})

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err)
    callback(null, key.getPublicKey())
  })
}

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const token = authHeader.split(' ')[1]
  jwt.verify(token, getKey, { algorithms: ['ES256'] }, (err, decoded) => {
    if (err) {
      console.error('JWT error:', err.message)
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    req.user = decoded
    next()
  })
}