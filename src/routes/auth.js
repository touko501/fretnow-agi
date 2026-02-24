const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const prisma = require('../config/database');
const env = require('../config/env');
const { authenticate, generateTokens } = require('../middleware/auth');
const { authLimiter } = require('../config/security');
const { validate, schemas } = require('../middleware/validate');

// ═══ POST /auth/register ═══
router.post('/register', authLimiter, validate(schemas.registerSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role, company } = req.validated;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      let companyId = null;

      if (company) {
        const existingSiren = await tx.company.findUnique({ where: { siren: company.siren } });
        if (existingSiren) throw new Error('SIREN déjà enregistré');

        const newCompany = await tx.company.create({
          data: {
            type: role === 'TRANSPORTEUR' ? 'TRANSPORTEUR' : 'CHARGEUR',
            name: company.name, siren: company.siren, siret: company.siret,
            address: company.address, postalCode: company.postalCode, city: company.city, country: 'FR',
          },
        });
        companyId = newCompany.id;
      }

      const user = await tx.user.create({
        data: { email, passwordHash, firstName, lastName, phone, role, status: 'PENDING_VERIFICATION', companyId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
      });

      await tx.auditLog.create({
        data: { userId: user.id, action: 'auth.register', entity: 'User', entityId: user.id, details: { role } },
      });

      // Notifier tous les admins d'une nouvelle inscription
      const admins = await tx.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, deletedAt: null } });
      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id, type: 'NEW_REGISTRATION',
            title: `Nouvelle inscription : ${firstName} ${lastName}`,
            message: `${firstName} ${lastName} (${role}) s'est inscrit${company ? ` — ${company.name}` : ''}. Vérification requise.`,
            sentEmail: false, sentPush: true,
          },
        });
      }

      return user;
    });

    const tokens = generateTokens(result.id);
    res.status(201).json({ user: result, ...tokens });
  } catch (err) {
    if (err.message.includes('SIREN')) return res.status(409).json({ error: err.message });
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /auth/login ═══
router.post('/login', authLimiter, validate(schemas.loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validated;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, status: true, passwordHash: true, companyId: true, deletedAt: true,
      },
    });

    if (!user || user.deletedAt) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    if (user.status === 'BANNED' || user.status === 'DELETED') return res.status(403).json({ error: 'Compte désactivé' });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = generateTokens(user.id);

    await prisma.session.create({
      data: {
        userId: user.id, token: tokens.accessToken, refreshToken: tokens.refreshToken,
        userAgent: req.headers['user-agent'] || 'unknown', ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const { passwordHash, ...userSafe } = user;
    res.json({ user: userSafe, ...tokens });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /auth/refresh ═══
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token manquant' });

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Token invalide' });

    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session) return res.status(401).json({ error: 'Session expirée' });

    const tokens = generateTokens(decoded.userId);

    await prisma.session.update({
      where: { id: session.id },
      data: { token: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Refresh token invalide' });
  }
});

// ═══ GET /auth/me ═══
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true,
        role: true, status: true, emailVerified: true, kycVerified: true,
        locale: true, timezone: true, companyId: true, createdAt: true,
        company: { select: { id: true, name: true, siren: true, city: true, isVerified: true, type: true } },
      },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /auth/logout ═══
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    await prisma.session.deleteMany({ where: { token } });
    res.json({ message: 'Déconnecté' });
  } catch (err) {
    res.json({ message: 'Déconnecté' });
  }
});

// ═══ PUT /auth/password ═══
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Mot de passe invalide (min 8 chars)' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

    await prisma.session.deleteMany({ where: { userId: req.user.id } });

    res.json({ message: 'Mot de passe modifié. Reconnectez-vous.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /auth/forgot-password ═══
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, firstName: true, deletedAt: true } });

    // Toujours répondre OK (sécurité: ne pas révéler si l'email existe)
    if (!user || user.deletedAt) {
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    }

    // Générer un token JWT de reset (1h)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password-reset' },
      env.JWT_SECRET + user.id, // secret unique par user
      { expiresIn: '1h' }
    );

    // Log le lien (en production: envoyer par email)
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
    console.log(`\n🔑 Password reset for ${email}: ${resetLink}\n`);

    // Audit
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'auth.forgot_password', entity: 'User', entityId: user.id },
    });

    // Notifier l'utilisateur
    await prisma.notification.create({
      data: {
        userId: user.id, type: 'SYSTEM',
        title: 'Réinitialisation de mot de passe',
        message: 'Une demande de réinitialisation a été effectuée. Vérifiez vos emails.',
      },
    });

    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.', resetLink });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /auth/reset-password ═══
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: 'Token, email et nouveau mot de passe requis' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Token invalide ou expiré' });

    // Vérifier le token (signé avec secret + userId)
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET + user.id);
    } catch (e) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    if (decoded.type !== 'password-reset' || decoded.userId !== user.id) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    // Mettre à jour le mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Invalider toutes les sessions
    await prisma.session.deleteMany({ where: { userId: user.id } });

    // Audit
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'auth.reset_password', entity: 'User', entityId: user.id },
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
