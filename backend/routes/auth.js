const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const logger = require('../logger');

function logBlocked(req, limiterName) {
  try {
    const ip =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      (req.connection && req.connection.remoteAddress) ||
      'unknown';

    const log = req && req.logger ? req.logger : logger;

    log.warn('Rate limit blocked', {
      limiter: limiterName,
      ip,
      method: req.method,
      url: req.originalUrl
    });
  } catch (e) {
    logger.error('Rate limit logging failed', {
      error: e.message
    });
  }
}

// Stricter limiter for login: High volumetric DDoS shield, specific 5-attempt policy below
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logBlocked(req, 'loginLimiter');
    return res.status(429).json({
      message: 'Too many requests, please try again later.',
      locked: true
    });
  }
});

// In-memory failed attempts tracker: Key -> { count: number, lockUntil: number }
const failedLoginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute (60s) lockout

function getClientIp(req) {
  return (
    req.ip ||
    req.headers['x-forwarded-for'] ||
    (req.connection && req.connection.remoteAddress) ||
    '127.0.0.1'
  );
}

function getLoginAttemptKey(req, username) {
  const ip = getClientIp(req);
  return `${ip}_${(username || '').toLowerCase().trim()}`;
}

// Looser limiter for register: 10 requests per minute per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logBlocked(req, 'registerLimiter');

    return res.status(429).json({
      message: 'Too many requests, please try again later.'
    });
  }
});

router.post('/register', registerLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'Provide username and password'
    });
  }

  try {
    let user = await User.findOne({ username });

    if (user) {
      return res.status(400).json({
        message: 'User already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    user = new User({
      username,
      password: hash
    });

    await user.save();

    res.json({
      message: 'User created'
    });
  } catch (err) {
    const log = req && req.logger ? req.logger : logger;

    log.error('Register error', {
      message: err.message,
      stack: err.stack
    });

    res.status(500).json({
      message: 'Server error'
    });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'Provide username and password'
    });
  }

  const attemptKey = getLoginAttemptKey(req, username);
  const now = Date.now();
  const attemptRecord = failedLoginAttempts.get(attemptKey);

  // Check if account/IP is currently locked out
  if (attemptRecord && attemptRecord.lockUntil && attemptRecord.lockUntil > now) {
    const remainingSeconds = Math.ceil((attemptRecord.lockUntil - now) / 1000);
    logBlocked(req, 'loginLockout');
    return res.status(429).json({
      message: `Too many failed login attempts. Please try again in ${remainingSeconds} seconds.`,
      remainingSeconds,
      locked: true
    });
  }

  try {
    const user = await User.findOne({ username });
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isMatch) {
      let currentRecord = failedLoginAttempts.get(attemptKey) || { count: 0, lockUntil: 0 };
      if (currentRecord.lockUntil && currentRecord.lockUntil <= now) {
        currentRecord = { count: 0, lockUntil: 0 };
      }
      currentRecord.count += 1;

      if (currentRecord.count >= MAX_LOGIN_ATTEMPTS) {
        currentRecord.lockUntil = now + LOCKOUT_DURATION_MS;
        failedLoginAttempts.set(attemptKey, currentRecord);
        logBlocked(req, 'loginLockout');
        const remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
        return res.status(429).json({
          message: `Too many failed login attempts. Please try again in ${remainingSeconds} seconds.`,
          remainingSeconds,
          locked: true
        });
      } else {
        failedLoginAttempts.set(attemptKey, currentRecord);
        const remainingAttempts = MAX_LOGIN_ATTEMPTS - currentRecord.count;
        return res.status(400).json({
          message: `Incorrect password. You have ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`,
          remainingAttempts,
          locked: false
        });
      }
    }

    // Success -> Reset failed attempts counter to 0
    failedLoginAttempts.delete(attemptKey);

    // JWT_SECRET must be configured.
    // Never use a hard-coded fallback secret.
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured');

      return res.status(500).json({
        message: 'Server configuration error'
      });
    }

    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'user'
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: '1h'
      }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000
    };

    res.cookie('token', token, cookieOptions);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    const log = req && req.logger ? req.logger : logger;

    log.error('Login error', {
      message: err.message,
      stack: err.stack
    });

    res.status(500).json({
      message: 'Server error'
    });
  }
});

// Get current user from HTTP-only cookie
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (err) {
    const log = req && req.logger ? req.logger : logger;

    log.error('Get /me error', {
      message: err.message,
      stack: err.stack
    });

    res.status(500).json({
      message: 'Server error'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  });

  res.json({
    message: 'Logged out'
  });
});

module.exports = router;