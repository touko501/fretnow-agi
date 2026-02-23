const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

// ═══ GET /health — Health check ═══
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'fretnow-api', version: '6.1.0', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// ═══ GET /zones ═══
router.get('/zones', async (req, res) => {
  try {
    const zones = await prisma.zone.findMany({ orderBy: { name: 'asc' } });
    res.json(zones);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// ═══ GET /settings ═══
router.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json(map);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// ═══ PUT /settings/:key (Admin) ═══
router.put('/settings/:key', authenticate, isAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    const setting = await prisma.setting.update({ where: { key: req.params.key }, data: { value: String(value) } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'admin.update_setting', entity: 'Setting', entityId: setting.id, details: { key: req.params.key, value } },
    });
    res.json(setting);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

// ═══ GET /cnr — Indices CNR ═══
router.get('/cnr', async (req, res) => {
  try {
    const indices = await prisma.cnrIndex.findMany({ orderBy: { month: 'desc' }, take: 12 });
    res.json(indices);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
