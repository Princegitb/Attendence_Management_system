const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 10, // High limit in dev mode for easy testing
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev, // Skip rate limiting in development mode
});

const attendanceRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 1000 : 30,
  message: { success: false, message: 'Too many attendance submissions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev, // Skip rate limiting in development mode
});

module.exports = {
  loginRateLimiter,
  attendanceRateLimiter
};
