const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ═══ GET /gdpr/my-data ═══ (export all user data)
router.get('/my-data', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        company: true,
        missions: { take: 100, orderBy: { createdAt: 'desc' } },
        bids: { take: 100 },
        documents: { take: 50 },
        notifications: { take: 50, orderBy: { createdAt: 'desc' } },
        ratings: { take: 50 },
        favorites: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // Retirer le hash du mot de passe
    const { passwordHash, ...safeUser } = user;

    res.json({
      exportDate: new Date().toISOString(),
      user: safeUser,
      message: 'Voici l\'intégralité de vos données personnelles stockées sur FRETNOW.',
    });
  } catch (err) {
    console.error('GDPR export error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /gdpr/deletion-request ═══
router.post('/deletion-request', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;

    // Vérifier qu'il n'y a pas de missions en cours
    const activeMissions = await prisma.mission.count({
      where: {
        OR: [{ userId: req.user.id }, { assignedTo: req.user.id }],
        status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKUP', 'IN_TRANSIT'] },
      },
    });

    if (activeMissions > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer votre compte : vous avez des missions en cours. Terminez-les d\'abord.',
      });
    }

    // Log la demande
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'gdpr.deletion_request',
        entity: 'User',
        entityId: req.user.id,
        details: { reason, requestedAt: new Date() },
      },
    });

    // Notifier les admins
    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id, type: 'SYSTEM',
          title: 'Demande de suppression RGPD',
          message: `L'utilisateur ${req.user.email} demande la suppression de son compte.`,
        },
      });
    }

    res.json({
      message: 'Votre demande de suppression a été enregistrée. Elle sera traitée sous 30 jours conformément au RGPD.',
      requestId: `GDPR-${Date.now()}`,
    });
  } catch (err) {
    console.error('GDPR deletion error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
