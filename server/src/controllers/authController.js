const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { loginSchema } = require('../validators/authValidator');

const COOKIE_NAME = 'token';
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? process.env.COOKIE_SAMESITE || 'none' : 'lax',
    secure: isProd,
    maxAge: TOKEN_MAX_AGE_MS,
  };
}

async function login(req, res, next) {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = parsed.email.toLowerCase();

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
}

function logout(_req, res) {
  const { maxAge: _maxAge, ...clearOpts } = getCookieOptions();
  res.clearCookie(COOKIE_NAME, clearOpts);
  return res.json({ message: 'Logged out' });
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }
    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, logout, me };
