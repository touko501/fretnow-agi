/**
 * FRETNOW AGI — Routes Messagerie / Express / Dernier KM
 * Missions colis, palettes, SLA, preuve de livraison
 */

const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

// =========================================================
// MISSIONS MESSAGERIE
// =========================================================

/**
 * POST /api/messagerie/missions
 * Crée une mission messagerie/express/dernier km
 */
router.post('/missions', authenticate, async (req, res) => {
  try {
    const {
      missionType = 'MESSAGERIE', // MESSAGERIE, EXPRESS, DERNIER_KM
      pickupAddress, pickupCity, pickupPostalCode, pickupLat, pickupLon,
      pickupContact, pickupPhone, pickupInstructions, pickupDateRequested,
      deliveryAddress, deliveryCity, deliveryPostalCode, deliveryLat, deliveryLon,
      deliveryContact, deliveryPhone, deliveryInstructions,
      goodsDescription, weightKg, volumeM3,
      parcelCount, parcelRef, recipientName, recipientPhone,
      signatureRequired, returnTrip,
      slaType, // BEFORE_12H, BEFORE_18H, SAME_DAY, J_PLUS_1
      budgetMaxCents, vehicleTypeRequired,
    } = req.body;

    // Validations
    if (!['MESSAGERIE', 'EXPRESS', 'DERNIER_KM'].includes(missionType)) {
      return res.status(400).json({ error: 'missionType doit être MESSAGERIE, EXPRESS ou DERNIER_KM' });
    }

    if (!pickupCity || !deliveryCity) {
      return res.status(400).json({ error: 'Villes de départ et d\'arrivée requises' });
    }

    // Calculer la deadline SLA
    let slaDeadline = null;
    let slaPenaltyCents = null;

    if (slaType && (missionType === 'EXPRESS' || missionType === 'DERNIER_KM')) {
      const now = new Date();
      switch (slaType) {
        case 'BEFORE_12H':
          slaDeadline = new Date(now);
          slaDeadline.setHours(12, 0, 0, 0);
          if (slaDeadline < now) slaDeadline.setDate(slaDeadline.getDate() + 1);
          slaPenaltyCents = 2000; // 20€ de pénalité
          break;
        case 'BEFORE_18H':
          slaDeadline = new Date(now);
          slaDeadline.setHours(18, 0, 0, 0);
          if (slaDeadline < now) slaDeadline.setDate(slaDeadline.getDate() + 1);
          slaPenaltyCents = 1500;
          break;
        case 'SAME_DAY':
          slaDeadline = new Date(now);
          slaDeadline.setHours(23, 59, 59, 0);
          slaPenaltyCents = 1000;
          break;
        case 'J_PLUS_1':
          slaDeadline = new Date(now);
          slaDeadline.setDate(slaDeadline.getDate() + 1);
          slaDeadline.setHours(18, 0, 0, 0);
          slaPenaltyCents = 500;
          break;
      }
    }

    const mission = await prisma.mission.create({
      data: {
        clientId: req.user.id,
        missionType,
        status: 'DRAFT',
        pickupAddress: pickupAddress || '',
        pickupCity,
        pickupPostalCode: pickupPostalCode || '',
        pickupLat: pickupLat ? parseFloat(pickupLat) : null,
        pickupLon: pickupLon ? parseFloat(pickupLon) : null,
        pickupContact,
        pickupPhone,
        pickupInstructions,
        pickupDateRequested: pickupDateRequested ? new Date(pickupDateRequested) : null,
        deliveryAddress: deliveryAddress || '',
        deliveryCity,
        deliveryPostalCode: deliveryPostalCode || '',
        deliveryLat: deliveryLat ? parseFloat(deliveryLat) : null,
        deliveryLon: deliveryLon ? parseFloat(deliveryLon) : null,
        deliveryContact,
        deliveryPhone,
        deliveryInstructions,
        goodsDescription,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        volumeM3: volumeM3 ? parseFloat(volumeM3) : null,
        parcelCount: parcelCount ? parseInt(parcelCount) : null,
        parcelRef,
        recipientName,
        recipientPhone,
        signatureRequired: signatureRequired || false,
        returnTrip: returnTrip || false,
        slaType: slaType || null,
        slaDeadline,
        slaPenaltyCents,
        budgetMaxCents: budgetMaxCents ? parseInt(budgetMaxCents) : null,
        vehicleTypeRequired,
      },
    });

    res.status(201).json({ mission });
  } catch (error) {
    console.error('Create messagerie mission error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messagerie/missions
 * Liste les missions messagerie/express/dernier km
 */
router.get('/missions', authenticate, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      missionType: { in: type ? [type] : ['MESSAGERIE', 'EXPRESS', 'DERNIER_KM'] },
      deletedAt: null,
    };

    if (status) where.status = status;

    // Si transporteur, montrer les missions publiées
    // Si chargeur, montrer ses propres missions
    if (req.user.role === 'TRANSPORTEUR' || req.user.role === 'MESSAGER' || req.user.role === 'LIVREUR') {
      where.status = where.status || { in: ['PUBLISHED', 'BIDDING'] };
    } else {
      where.clientId = req.user.id;
    }

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { bids: true } },
        },
      }),
      prisma.mission.count({ where }),
    ]);

    res.json({
      missions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messagerie/missions/nearby
 * Missions à proximité d'un point GPS
 */
router.get('/missions/nearby', authenticate, async (req, res) => {
  try {
    const { lat, lon, radiusKm = 50, type } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat et lon requis' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const radius = parseFloat(radiusKm);

    // Formule Haversine simplifiée — filtre approximatif
    const latDelta = radius / 111;
    const lonDelta = radius / (111 * Math.cos(latitude * Math.PI / 180));

    const missions = await prisma.mission.findMany({
      where: {
        missionType: { in: type ? [type] : ['MESSAGERIE', 'EXPRESS', 'DERNIER_KM'] },
        status: { in: ['PUBLISHED', 'BIDDING'] },
        deletedAt: null,
        pickupLat: { gte: latitude - latDelta, lte: latitude + latDelta },
        pickupLon: { gte: longitude - lonDelta, lte: longitude + lonDelta },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Calcul distance exacte et tri
    const withDistance = missions.map(m => {
      const dist = haversineDistance(latitude, longitude, m.pickupLat, m.pickupLon);
      return { ...m, distanceFromYou: Math.round(dist * 10) / 10 };
    }).filter(m => m.distanceFromYou <= radius)
      .sort((a, b) => a.distanceFromYou - b.distanceFromYou);

    res.json({ count: withDistance.length, radiusKm: radius, missions: withDistance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messagerie/missions/:id/confirm-delivery
 * Confirme la livraison avec signature/preuve
 */
router.post('/missions/:id/confirm-delivery', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { proofOfDeliveryUrl, recipientSignature, notes } = req.body;

    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission) return res.status(404).json({ error: 'Mission introuvable' });

    if (!['IN_TRANSIT', 'DELIVERED'].includes(mission.status)) {
      return res.status(400).json({ error: 'La mission doit être en transit pour confirmer la livraison' });
    }

    // Vérifier SLA
    let slaRespected = true;
    let slaPenaltyApplied = false;

    if (mission.slaDeadline) {
      slaRespected = new Date() <= mission.slaDeadline;
      if (!slaRespected && mission.slaPenaltyCents) {
        slaPenaltyApplied = true;
      }
    }

    const updated = await prisma.mission.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        proofOfDeliveryUrl: proofOfDeliveryUrl || null,
        notes: notes ? `${mission.notes || ''}\n[Livraison] ${notes}` : mission.notes,
      },
    });

    // Log le changement de statut
    await prisma.missionStatusLog.create({
      data: {
        missionId: id,
        fromStatus: mission.status,
        toStatus: 'DELIVERED',
        changedBy: req.user.id,
        reason: slaRespected ? 'Livraison confirmée dans les délais' : 'Livraison confirmée HORS délai SLA',
      },
    });

    res.json({
      mission: updated,
      sla: {
        respected: slaRespected,
        deadline: mission.slaDeadline,
        penaltyApplied: slaPenaltyApplied,
        penaltyCents: slaPenaltyApplied ? mission.slaPenaltyCents : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================
// SLA — Suivi des engagements
// =========================================================

/**
 * GET /api/messagerie/sla/overview
 * Vue d'ensemble SLA pour l'entreprise
 */
router.get('/sla/overview', authenticate, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const missions = await prisma.mission.findMany({
      where: {
        missionType: { in: ['EXPRESS', 'MESSAGERIE', 'DERNIER_KM'] },
        slaDeadline: { not: null },
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
    });

    let onTime = 0;
    let late = 0;
    let totalPenaltyCents = 0;

    for (const m of missions) {
      if (m.deliveredAt && m.slaDeadline) {
        if (m.deliveredAt <= m.slaDeadline) {
          onTime++;
        } else {
          late++;
          totalPenaltyCents += m.slaPenaltyCents || 0;
        }
      }
    }

    const total = onTime + late;
    const slaRate = total > 0 ? Math.round((onTime / total) * 100) : 100;

    res.json({
      period: '30j',
      total,
      onTime,
      late,
      slaRate,
      totalPenaltyEuros: (totalPenaltyCents / 100).toFixed(2),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messagerie/sla/stats
 * Statistiques SLA détaillées par type
 */
router.get('/sla/stats', authenticate, async (req, res) => {
  try {
    const stats = {};

    for (const type of ['MESSAGERIE', 'EXPRESS', 'DERNIER_KM']) {
      const [total, delivered, withSla] = await Promise.all([
        prisma.mission.count({ where: { missionType: type } }),
        prisma.mission.count({ where: { missionType: type, status: { in: ['DELIVERED', 'COMPLETED'] } } }),
        prisma.mission.count({ where: { missionType: type, slaDeadline: { not: null } } }),
      ]);

      stats[type] = { total, delivered, withSla };
    }

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================
// HELPERS
// =========================================================

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;
