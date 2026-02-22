const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isTransporteur, isVerified } = require('../middleware/roles');
const { validate, schemas } = require('../middleware/validate');

// ═══ POST /bids — Faire une offre ═══
router.post('/', authenticate, isTransporteur, isVerified, validate(schemas.bidSchema), async (req, res) => {
  try {
    const { missionId, vehicleId, priceCents, message, availableDate } = req.validated;

    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission || mission.deletedAt) return res.status(404).json({ error: 'Mission non trouvée' });
    if (!['PUBLISHED', 'BIDDING'].includes(mission.status)) {
      return res.status(400).json({ error: 'Cette mission n\'accepte plus d\'offres' });
    }

    const existing = await prisma.bid.findUnique({
      where: { missionId_transporteurId: { missionId, transporteurId: req.user.id } },
    });
    if (existing) return res.status(409).json({ error: 'Vous avez déjà fait une offre sur cette mission' });

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, company: { users: { some: { id: req.user.id } } } },
      });
      if (!vehicle) return res.status(400).json({ error: 'Véhicule non trouvé dans votre flotte' });
    }

    const bid = await prisma.$transaction(async (tx) => {
      const newBid = await tx.bid.create({
        data: {
          missionId, transporteurId: req.user.id, vehicleId,
          priceCents, message,
          availableDate: availableDate ? new Date(availableDate) : null,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      if (mission.status === 'PUBLISHED') {
        await tx.mission.update({ where: { id: missionId }, data: { status: 'BIDDING' } });
      }

      await tx.notification.create({
        data: {
          userId: mission.clientId, missionId,
          type: 'NEW_BID', title: 'Nouvelle offre',
          message: `Nouvelle offre de ${priceCents / 100}€ pour ${mission.pickupCity} → ${mission.deliveryCity}`,
          sentEmail: true, sentPush: true,
        },
      });

      return newBid;
    });

    res.status(201).json(bid);
  } catch (err) {
    console.error('Create bid error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ GET /bids/mine — Mes offres ═══
router.get('/mine', authenticate, isTransporteur, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { transporteurId: req.user.id };
    if (status) where.status = status;

    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          mission: {
            select: {
              id: true, reference: true, status: true,
              pickupCity: true, deliveryCity: true,
              pickupDateRequested: true, vehicleTypeRequired: true,
              weightKg: true, palletCount: true,
            },
          },
          vehicle: { select: { id: true, type: true, brand: true, licensePlate: true } },
        },
      }),
      prisma.bid.count({ where }),
    ]);

    res.json({ bids, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ DELETE /bids/:id — Retirer une offre ═══
router.delete('/:id', authenticate, isTransporteur, async (req, res) => {
  try {
    const bid = await prisma.bid.findUnique({ where: { id: req.params.id } });
    if (!bid) return res.status(404).json({ error: 'Offre non trouvée' });
    if (bid.transporteurId !== req.user.id) return res.status(403).json({ error: 'Accès interdit' });
    if (bid.status !== 'PENDING') return res.status(400).json({ error: 'Seules les offres en attente peuvent être retirées' });

    await prisma.bid.update({ where: { id: bid.id }, data: { status: 'WITHDRAWN' } });
    res.json({ message: 'Offre retirée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
