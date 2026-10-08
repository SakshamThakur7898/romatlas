/** express-rate-limit sends plain text by default; the frontend expects the standard JSON error shape. */
export const limited = (message = 'Too many requests. Please try again shortly.') => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});
