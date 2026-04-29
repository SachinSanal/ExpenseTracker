/**
 * Maps Supabase Auth API errors to clearer copy for the UI.
 * @param {unknown} err
 * @param {string} fallback
 */
export function messageForAuthError(err, fallback = 'Something went wrong. Please try again.') {
  const raw = typeof err?.message === 'string' ? err.message : ''
  const msg = raw.toLowerCase()

  if (
    msg.includes('rate limit') ||
    msg.includes('too many') ||
    msg.includes('email rate') ||
    msg.includes('over_request_rate')
  ) {
    return 'Too many emails were sent from this app recently. Please wait about an hour before requesting another link, or try again tomorrow.'
  }

  return raw || fallback
}
