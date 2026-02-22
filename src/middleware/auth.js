const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/database');

// Verify JWT token
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, status: true, companyId: true, deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.status === 'BANNED' || user.status === 'DELETED') {
      return res.status(401).json({ error: 'Compte désactivé ou supprimé' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Compte suspendu. Contactez le support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// Optional auth — doesn't fail if no token
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, status: true, companyId: true },
      });
    }
  } catch (_) {}
  next();
}

// Generate tokens
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

module.exports = { authenticate, optionalAuth, generateTokens };
