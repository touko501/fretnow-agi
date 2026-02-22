const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, avatar, locale, timezone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, phone, avatar, locale, timezone },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, locale: true, timezone: true },
    });
    res.json(user);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.put('/company', authenticate, async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ error: 'Pas d\'entreprise associée' });
    const company = await prisma.company.update({ where: { id: req.user.companyId }, data: req.body });
    res.json(company);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/favorites', authenticate, async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { giverId: req.user.id },
      include: {
        receiver: {
          select: { id: true, firstName: true, lastName: true, role: true, company: { select: { name: true, city: true } } },
        },
      },
    });
    res.json(favorites);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/favorites/:userId', authenticate, async (req, res) => {
  try {
    const existing = await prisma.favorite.findUnique({
      where: { giverId_receiverId: { giverId: req.user.id, receiverId: req.params.userId } },
    });
    if (existing) return res.status(409).json({ error: 'Déjà en favoris' });
    const fav = await prisma.favorite.create({ data: { giverId: req.user.id, receiverId: req.params.userId } });
    res.status(201).json(fav);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/favorites/:userId', authenticate, async (req, res) => {
  try {
    await prisma.favorite.deleteMany({ where: { giverId: req.user.id, receiverId: req.params.userId } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/:id/public', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, firstName: true, lastName: true, role: true, createdAt: true,
        company: { select: { name: true, city: true, isVerified: true, type: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const stats = await prisma.rating.aggregate({
      where: { receiverId: req.params.id }, _avg: { score: true }, _count: true,
    });
    const missionsCompleted = await prisma.bid.count({
      where: { transporteurId: req.params.id, status: 'ACCEPTED', mission: { status: 'COMPLETED' } },
    });
    res.json({ ...user, rating: stats._avg.score, totalRatings: stats._count, missionsCompleted });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/account', authenticate, async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.user.id },
        data: { status: 'DELETED', deletedAt: new Date(), email: `deleted_${req.user.id}@fretnow.com`, passwordHash: 'DELETED' },
      });
      await tx.session.deleteMany({ where: { userId: req.user.id } });
      await tx.auditLog.create({
        data: { userId: req.user.id, action: 'user.delete_account', entity: 'User', entityId: req.user.id },
      });
    });
    res.json({ message: 'Compte supprimé (RGPD). Données anonymisées.' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
