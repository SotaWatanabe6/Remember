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

    req.user = data.user;

    next();
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};
  
  // const authHeader = req.headers.authorization
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return res.status(401).json({ error: 'Not authenticated' })
  // }
  // const token = authHeader.split(' ')[1];
  // const {
  //   data, 
  //   error
  // } = await supabase.auth.getUser(token)
  // console.log(req.user);

  // if (error) {
  //   return res.status(401).json({
  //     error: 'Invalid token'
  //   })
  // }
  // req.user = data
  // next()

