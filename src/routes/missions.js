const express = require('express');
const { v4: uuid } = require('uuid');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isChargeur, isVerified, isAdmin } = require('../middleware/roles');
const { validate, schemas } = require('../middleware/validate');

// ═══ GET /missions — Liste (filtrable) ═══
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, pickupCity, deliveryCity, vehicleType, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { deletedAt: null };

    // Chargeur: voit ses missions. Transporteur: voit les missions publiées + les siennes
    if (req.user.role === 'CHARGEUR') {
      where.clientId = req.user.id;
    } else if (req.user.role === 'TRANSPORTEUR') {
      where.OR = [
        { status: { in: ['PUBLISHED', 'BIDDING'] } },
        { bids: { some: { transporteurId: req.user.id } } },
      ];
    }
    // Admin voit tout

    if (status) where.status = status;
    if (pickupCity) where.pickupCity = { contains: pickupCity, mode: 'insensitive' };
    if (deliveryCity) where.deliveryCity = { contains: deliveryCity, mode: 'insensitive' };
    if (vehicleType) where.vehicleTypeRequired = vehicleType;

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, reference: true, status: true,
          pickupCity: true, pickupPostalCode: true, deliveryCity: true, deliveryPostalCode: true,
          pickupDateRequested: true, deliveryDateRequested: true,
          goodsDescription: true, weightKg: true, palletCount: true, vehicleTypeRequired: true,
          distanceKm: true, budgetMaxCents: true, finalPriceCents: true,
          commissionPercent: true, progressPercent: true,
          requiresTemp: true, isADR: true, isFragile: true,
          createdAt: true, publishedAt: true,
          _count: { select: { bids: true } },
          client: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true, city: true } } } },
        },
      }),
      prisma.mission.count({ where }),
    ]);

    res.json({
      missions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('List missions error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ GET /missions/:id — Détail ═══
router.get('/:id', authenticate, async (req, res) => {
  try {
    const mission = await prisma.mission.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true, company: { select: { name: true, city: true } } } },
        vehicle: { select: { id: true, type: true, brand: true, model: true, licensePlate: true } },
        driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        bids: {
          select: {
            id: true, status: true, priceCents: true, message: true, createdAt: true, expiresAt: true,
            transporteur: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } } },
            vehicle: { select: { id: true, type: true, brand: true, model: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        ratings: { select: { id: true, score: true, comment: true, giverId: true, receiverId: true } },
        documents: { select: { id: true, type: true, name: true, url: true, createdAt: true } },
        statusLogs: { orderBy: { createdAt: 'asc' } },
        _count: { select: { bids: true, gpsPositions: true } },
      },
    });

    if (!mission || mission.deletedAt) return res.status(404).json({ error: 'Mission non trouvée' });

    // Hide bids details from other transporteurs
    if (req.user.role === 'TRANSPORTEUR') {
      mission.bids = mission.bids.filter(b => b.transporteur.id === req.user.id);
    }

    res.json(mission);
  } catch (err) {
    console.error('Get mission error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /missions — Créer ═══
router.post('/', authenticate, isChargeur, isVerified, validate(schemas.missionSchema), async (req, res) => {
  try {
    const data = req.validated;
    const year = new Date().getFullYear();
    const count = await prisma.mission.count({ where: { createdAt: { gte: new Date(`${year}-01-01`) } } });
    const reference = `FN-${year}-${String(count + 1).padStart(4, '0')}`;

    const mission = await prisma.mission.create({
      data: {
        ...data,
        reference,
        clientId: req.user.id,
        status: 'DRAFT',
        pickupCountry: data.pickupCountry || 'FR',
        deliveryCountry: data.deliveryCountry || 'FR',
        pickupDateRequested: data.pickupDateRequested ? new Date(data.pickupDateRequested) : null,
        deliveryDateRequested: data.deliveryDateRequested ? new Date(data.deliveryDateRequested) : null,
      },
    });

    // Status log
    await prisma.missionStatusLog.create({
      data: { missionId: mission.id, toStatus: 'DRAFT', changedBy: req.user.id },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id, action: 'mission.create', entity: 'Mission', entityId: mission.id,
        details: { route: `${data.pickupCity} → ${data.deliveryCity}` },
      },
    });

    res.status(201).json(mission);
  } catch (err) {
    console.error('Create mission error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ PUT /missions/:id — Modifier (DRAFT only) ═══
router.put('/:id', authenticate, isChargeur, async (req, res) => {
  try {
    const mission = await prisma.mission.findUnique({ where: { id: req.params.id } });
    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });
    if (mission.clientId !== req.user.id) return res.status(403).json({ error: 'Accès interdit' });
    if (mission.status !== 'DRAFT') return res.status(400).json({ error: 'Modification impossible: mission déjà publiée' });

    const updated = await prisma.mission.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /missions/:id/publish — Publier ═══
router.post('/:id/publish', authenticate, isChargeur, isVerified, async (req, res) => {
  try {
    const mission = await prisma.mission.findUnique({ where: { id: req.params.id } });
    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });
    if (mission.clientId !== req.user.id) return res.status(403).json({ error: 'Accès interdit' });
    if (mission.status !== 'DRAFT') return res.status(400).json({ error: 'Seule une mission en brouillon peut être publiée' });

    const updated = await prisma.mission.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    await prisma.missionStatusLog.create({
      data: { missionId: mission.id, fromStatus: 'DRAFT', toStatus: 'PUBLISHED', changedBy: req.user.id },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /missions/:id/assign — Attribuer un bid ═══
router.post('/:id/assign', authenticate, isChargeur, async (req, res) => {
  try {
    const { bidId } = req.body;
    const mission = await prisma.mission.findUnique({ where: { id: req.params.id } });
    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });
    if (mission.clientId !== req.user.id) return res.status(403).json({ error: 'Accès interdit' });
    if (!['PUBLISHED', 'BIDDING'].includes(mission.status)) return res.status(400).json({ error: 'Mission non attribuable' });

    const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { vehicle: true } });
    if (!bid || bid.missionId !== mission.id) return res.status(404).json({ error: 'Offre non trouvée' });

    await prisma.$transaction(async (tx) => {
      await tx.bid.update({ where: { id: bidId }, data: { status: 'ACCEPTED', respondedAt: new Date() } });

      await tx.bid.updateMany({
        where: { missionId: mission.id, id: { not: bidId }, status: 'PENDING' },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });

      const commissionCents = Math.round(bid.priceCents * (mission.commissionPercent / 100));
      await tx.mission.update({
        where: { id: mission.id },
        data: {
          status: 'ASSIGNED',
          vehicleId: bid.vehicleId,
          finalPriceCents: bid.priceCents,
          commissionCents,
          assignedAt: new Date(),
        },
      });

      await tx.missionStatusLog.create({
        data: { missionId: mission.id, fromStatus: mission.status, toStatus: 'ASSIGNED', changedBy: req.user.id },
      });

      await tx.notification.create({
        data: {
          userId: bid.transporteurId, missionId: mission.id,
          type: 'MISSION_ASSIGNED', title: 'Mission attribuée',
          message: `Votre offre pour ${mission.pickupCity} → ${mission.deliveryCity} a été acceptée !`,
          sentEmail: true, sentPush: true,
        },
      });
    });

    res.json({ message: 'Mission attribuée', bidId });
  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /missions/:id/status — Changer le status ═══
router.post('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const mission = await prisma.mission.findUnique({ where: { id: req.params.id } });
    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });

    const transitions = {
      ASSIGNED: ['ACCEPTED'],
      ACCEPTED: ['PICKUP', 'CANCELLED'],
      PICKUP: ['IN_TRANSIT'],
      IN_TRANSIT: ['DELIVERED'],
      DELIVERED: ['COMPLETED', 'DISPUTED'],
    };

    const allowed = transitions[mission.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({ error: `Transition ${mission.status} → ${status} non autorisée` });
    }

    const updateData = { status };
    const now = new Date();
    if (status === 'ACCEPTED') updateData.acceptedAt = now;
    if (status === 'PICKUP') updateData.pickupStartedAt = now;
    if (status === 'IN_TRANSIT') { updateData.inTransitAt = now; updateData.pickupDateActual = now; }
    if (status === 'DELIVERED') { updateData.deliveredAt = now; updateData.deliveryDateActual = now; updateData.progressPercent = 100; }
    if (status === 'COMPLETED') updateData.completedAt = now;
    if (status === 'CANCELLED') { updateData.cancelledAt = now; updateData.cancelReason = req.body.reason; }

    const updated = await prisma.mission.update({ where: { id: mission.id }, data: updateData });

    await prisma.missionStatusLog.create({
      data: { missionId: mission.id, fromStatus: mission.status, toStatus: status, changedBy: req.user.id },
    });

    res.json(updated);
  } catch (err) {
    console.error('Status change error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ DELETE /missions/:id — Soft delete ═══
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const mission = await prisma.mission.findUnique({ where: { id: req.params.id } });
    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });
    if (mission.clientId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    if (!['DRAFT', 'CANCELLED'].includes(mission.status)) {
      return res.status(400).json({ error: 'Seules les missions en brouillon ou annulées peuvent être supprimées' });
    }

    await prisma.mission.update({ where: { id: mission.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Mission supprimée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
