const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/', authenticate, validate(schemas.ratingSchema), async (req, res) => {
  try {
    const { missionId, receiverId, score, punctuality, communication, cargoCondition, comment } = req.validated;
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission || !['COMPLETED', 'DELIVERED'].includes(mission.status)) {
      return res.status(400).json({ error: 'Mission non terminée' });
    }
    const existing = await prisma.rating.findUnique({
      where: { missionId_giverId: { missionId, giverId: req.user.id } },
    });
    if (existing) return res.status(409).json({ error: 'Vous avez déjà noté cette mission' });
    const rating = await prisma.rating.create({
      data: { missionId, giverId: req.user.id, receiverId, score, punctuality, communication, cargoCondition, comment },
    });
    await prisma.notification.create({
      data: {
        userId: receiverId, missionId,
        type: 'RATING_RECEIVED', title: 'Évaluation reçue',
        message: `Vous avez reçu ${score}/5 pour ${mission.pickupCity} → ${mission.deliveryCity}`,
        sentEmail: true,
      },
    });
    res.status(201).json(rating);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const ratings = await prisma.rating.findMany({
      where: { receiverId: req.params.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        giver: { select: { firstName: true, lastName: true } },
        mission: { select: { reference: true, pickupCity: true, deliveryCity: true } },
      },
    });
    const avg = await prisma.rating.aggregate({
      where: { receiverId: req.params.userId },
      _avg: { score: true, punctuality: true, communication: true, cargoCondition: true },
      _count: true,
    });
    res.json({ ratings, stats: avg });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
