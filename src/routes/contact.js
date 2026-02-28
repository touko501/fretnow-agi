const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

// ═══ POST /contact ═══ (public)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, company } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nom, email et message requis' });
    }

    const contact = await prisma.auditLog.create({
      data: {
        action: 'contact.submit',
        entity: 'Contact',
        entityId: email,
        details: { name, email, phone, subject, message, company, submittedAt: new Date() },
      },
    });

    // Notifier les admins
    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, deletedAt: null } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id, type: 'SYSTEM',
          title: `Nouveau message contact : ${subject || 'Sans objet'}`,
          message: `De ${name} (${email}): ${message.substring(0, 200)}`,
        },
      });
    }

    res.status(201).json({ message: 'Message envoyé avec succès. Nous vous répondrons rapidement.' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /contact/newsletter ═══ (public)
router.post('/newsletter', async (req, res) => {
  try {
    const { email, firstName } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    await prisma.auditLog.create({
      data: {
        action: 'newsletter.subscribe',
        entity: 'Newsletter',
        entityId: email,
        details: { email, firstName, subscribedAt: new Date() },
      },
    });

    res.json({ message: 'Inscription à la newsletter confirmée !' });
  } catch (err) {
    if (err.code === 'P2002') return res.json({ message: 'Déjà inscrit à la newsletter.' });
    console.error('Newsletter error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ GET /contact/messages ═══ (admin only)
router.get('/messages', authenticate, isAdmin, async (req, res) => {
  try {
    const messages = await prisma.auditLog.findMany({
      where: { action: 'contact.submit' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(messages.map(m => ({ id: m.id, ...m.details, createdAt: m.createdAt })));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
