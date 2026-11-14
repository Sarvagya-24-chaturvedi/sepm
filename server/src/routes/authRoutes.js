const express = require('express');
const { login, logout, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
