const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 25;

const attemptsByIp = new Map();

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = attemptsByIp.get(ip);

  if (!entry || now > entry.resetAt) {
    attemptsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      message: 'Too many login attempts. Please try again later.',
    });
  }

  entry.count += 1;
  return next();
}

function resetLoginRateLimiter() {
  attemptsByIp.clear();
}

module.exports = { loginRateLimiter, resetLoginRateLimiter };
