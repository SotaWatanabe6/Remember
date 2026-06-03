const jwt = require('jsonwebtoken')
const supabase = require('../supabase')

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'No authorization header',
      });
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }
    req.user = { ...data.user, sub: data.user.id }

    next();
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};
