const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

const startTime = Date.now();

// ═══ GET /monitoring/health ═══ (public)
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: '6.1.0',
      database: 'connected',
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// ═══ GET /monitoring/metrics ═══ (admin)
router.get('/metrics', authenticate, isAdmin, async (req, res) => {
  try {
    const [users, companies, missions, bids, payments] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.company.count(),
      prisma.mission.count(),
      prisma.bid.count(),
      prisma.payment.count(),
    ]);

    const activeMissions = await prisma.mission.count({
      where: { status: { in: ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'IN_TRANSIT'] } },
    });

    const completedMissions = await prisma.mission.count({ where: { status: 'COMPLETED' } });

    const totalRevenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED' },
    });

    res.json({
      users, companies, missions, bids, payments,
      activeMissions, completedMissions,
      totalRevenue: totalRevenue._sum.amount || 0,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memoryUsage: process.memoryUsage(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ GET /monitoring/status ═══ (public)
router.get('/status', (req, res) => {
  res.json({
    api: 'operational',
    version: '6.1.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    agents: {
      matcher: 'active', pricing: 'active', scout: 'active',
      communicator: 'active', convert: 'active', risk: 'active',
      predict: 'active', analyst: 'active', compliance: 'standby',
    },
  });
});

module.exports = router;
