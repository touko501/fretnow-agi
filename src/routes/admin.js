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

router.post('/users/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
    await prisma.notification.create({
      data: {
        userId: req.params.id, type: 'VERIFICATION_REJECTED', title: 'Inscription refusée',
        message: req.body.reason || 'Votre inscription a été refusée par l\'administration.',
        sentEmail: true, sentPush: true,
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'admin.reject_user', entity: 'User', entityId: req.params.id, details: { reason: req.body.reason } },
    });
    res.json({ message: 'Utilisateur refusé' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
    // Soft delete
    await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: 'SUSPENDED' } });
    await prisma.session.deleteMany({ where: { userId: req.params.id } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'admin.delete_user', entity: 'User', entityId: req.params.id },
    });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/companies/:id/verify', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.company.update({ where: { id: req.params.id }, data: { isVerified: true, verifiedAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'admin.verify_company', entity: 'Company', entityId: req.params.id },
    });
    res.json({ message: 'Entreprise vérifiée' });
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

// ═══ POST /admin/production-reset — Nettoyer la DB pour la production ═══
router.post('/production-reset', authenticate, isAdmin, async (req, res) => {
  try {
    const { newPassword, confirmReset } = req.body;
    if (confirmReset !== 'RESET_PRODUCTION_FRETNOW') {
      return res.status(400).json({ error: 'Confirmez avec confirmReset: "RESET_PRODUCTION_FRETNOW"' });
    }
    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: 'Nouveau mot de passe requis (min 12 caractères)' });
    }

    const bcrypt = require('bcryptjs');
    const fs = require('fs');
    const path = require('path');

    // Exécuter le SQL de reset
    const sqlFile = path.join(__dirname, '../../sql/production-reset.sql');
    if (fs.existsSync(sqlFile)) {
      const sql = fs.readFileSync(sqlFile, 'utf8');
      const { Client } = require('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      await client.query(sql);
      await client.end();
    } else {
      // Reset manuel si pas de fichier SQL
      await prisma.notification.deleteMany();
      await prisma.dispute.deleteMany();
      await prisma.rating.deleteMany();
      await prisma.missionStatusLog.deleteMany();
      await prisma.missionChecklist.deleteMany();
      await prisma.gpsPosition.deleteMany();
      await prisma.invoice.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.document.deleteMany();
      await prisma.bid.deleteMany();
      await prisma.mission.deleteMany();
      await prisma.vehicleCheckItem.deleteMany();
      await prisma.vehicleCheck.deleteMany();
      await prisma.driver.deleteMany();
      await prisma.vehicle.deleteMany();
      await prisma.walletTransaction.deleteMany();
      await prisma.escrow.deleteMany();
      await prisma.wallet.deleteMany();
      await prisma.session.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.favorite.deleteMany();
      await prisma.inviteCode.deleteMany();
      await prisma.transporteurZone.deleteMany();
      await prisma.zone.deleteMany();
      await prisma.user.deleteMany({ where: { email: { not: 'admin@fretnow.com' } } });
      await prisma.company.deleteMany({ where: { id: { not: 'co-fretnow' } } });
    }

    // Mettre à jour le mot de passe admin
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { email: 'admin@fretnow.com' },
      data: {
        passwordHash,
        status: 'ACTIVE',
        emailVerified: true,
        kycVerified: true,
        role: 'SUPER_ADMIN',
      },
    });

    // Créer le wallet FRETNOW si pas existant
    const existingWallet = await prisma.wallet.findUnique({ where: { companyId: 'co-fretnow' } });
    if (!existingWallet) {
      await prisma.wallet.create({
        data: { companyId: 'co-fretnow', balanceCents: 0, reservedCents: 0 },
      });
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'admin.production_reset',
        entity: 'System',
        details: { timestamp: new Date().toISOString() },
      },
    });

    // Compter ce qui reste
    const [users, companies, missions] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.mission.count(),
    ]);

    res.json({
      success: true,
      message: 'Base de données nettoyée pour la production',
      remaining: { users, companies, missions },
      adminPasswordUpdated: true,
    });
  } catch (err) {
    console.error('Production reset error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
