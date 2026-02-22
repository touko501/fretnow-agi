const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

router.get('/dashboard', authenticate, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      totalUsers, totalCompanies, totalMissions, totalVehicles,
      activeMissions, pendingVerifications,
      monthlyMissions, monthlyRevenue,
      recentMissions, recentBids,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.company.count(),
      prisma.mission.count({ where: { deletedAt: null } }),
      prisma.vehicle.count({ where: { isActive: true } }),
      prisma.mission.count({ where: { status: { in: ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'ACCEPTED', 'PICKUP', 'IN_TRANSIT'] } } }),
      prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.mission.count({ where: { createdAt: { gte: thisMonth }, deletedAt: null } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: thisMonth } }, _sum: { commissionCents: true, amountCents: true } }),
      prisma.mission.findMany({
        take: 10, orderBy: { createdAt: 'desc' }, where: { deletedAt: null },
        select: { id: true, reference: true, status: true, pickupCity: true, deliveryCity: true, finalPriceCents: true, createdAt: true },
      }),
      prisma.bid.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        select: {
          id: true, priceCents: true, status: true, createdAt: true,
          transporteur: { select: { firstName: true, lastName: true } },
          mission: { select: { reference: true, pickupCity: true, deliveryCity: true } },
        },
      }),
    ]);
    res.json({
      stats: {
        totalUsers, totalCompanies, totalMissions, totalVehicles,
        activeMissions, pendingVerifications, monthlyMissions,
        monthlyRevenueEur: (monthlyRevenue._sum.commissionCents || 0) / 100,
        monthlyVolumeEur: (monthlyRevenue._sum.amountCents || 0) / 100,
      },
      recentMissions, recentBids,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;
    const where = { deletedAt: null };
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true, phone: true,
          role: true, status: true, emailVerified: true, kycVerified: true,
          createdAt: true, lastLoginAt: true,
          company: { select: { name: true, city: true, isVerified: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/users/:id/verify', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE', kycVerified: true, emailVerified: true },
    });
    if (user.companyId) {
      await prisma.company.update({ where: { id: user.companyId }, data: { isVerified: true, verifiedAt: new Date() } });
    }
    await prisma.notification.create({
      data: {
        userId: user.id, type: 'VERIFICATION_APPROVED', title: 'Compte vérifié',
        message: 'Votre compte FRETNOW a été vérifié. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
        sentEmail: true, sentPush: true,
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'admin.verify_user', entity: 'User', entityId: user.id },
    });
    res.json({ message: 'Utilisateur vérifié', user: { id: user.id, status: user.status } });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/users/:id/suspend', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { status: 'SUSPENDED' } });
    await prisma.session.deleteMany({ where: { userId: req.params.id } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'admin.suspend_user', entity: 'User', entityId: req.params.id, details: { reason: req.body.reason } },
    });
    res.json({ message: 'Utilisateur suspendu' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/companies', authenticate, isAdmin, async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, vehicles: true, drivers: true } } },
    });
    res.json(companies);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/audit', authenticate, isAdmin, async (req, res) => {
  try {
    const { action, userId, page = 1, limit = 50 } = req.query;
    const where = {};
    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;
    const logs = await prisma.auditLog.findMany({
      where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
