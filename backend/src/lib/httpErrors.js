// Supabase, Postgres and storage error messages describe tables, constraints
// and buckets, so they are logged on the server and never sent to clients.
const GENERIC_ERROR_MESSAGE = 'Something went wrong on our end. Please try again.'

function sendInternalError(res, error, status = 500) {
  console.error(`[${status}]`, error?.message || error)
  return res.status(status).json({ error: GENERIC_ERROR_MESSAGE })
}

// An error the API raises itself, whose message is written for the user.
function publicError(status, message) {
  const error = new Error(message)
  error.status = status
  error.expose = true
  return error
}

// For catch blocks: pass through publicError()s, hide everything else.
function sendCaughtError(res, error) {
  if (error?.expose) return res.status(error.status).json({ error: error.message })
  return sendInternalError(res, error)
}

module.exports = { GENERIC_ERROR_MESSAGE, sendInternalError, publicError, sendCaughtError }
