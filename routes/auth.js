const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();
const passwordRounds = 12;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) {
        return reject(error);
      }

      req.session.userId = userId;
      req.session.save(saveError => (saveError ? reject(saveError) : resolve()));
    });
  });
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  next();
}

router.post('/signup', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, passwordRounds);
    const user = await User.createUser(email, passwordHash);

    await startSession(req, user.id);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findUserByEmail(email);

    if (!isValidEmail(email) || !user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await startSession(req, user.id);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res, next) => {
  if (!req.session) {
    return res.sendStatus(204);
  }

  req.session.destroy(error => {
    if (error) {
      return next(error);
    }

    res.clearCookie('connect.sid');
    return res.sendStatus(204);
  });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findUserById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'Authentication required' });
    }

    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
