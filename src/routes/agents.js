const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const ai = require('../services/ai');
const complianceAgent = require('../../agents/compliance');

const prisma = new PrismaClient();

// ═══ GET /agents/status — Status des agents IA ═══
router.get('/status', authenticate, (req, res) => {
  const baseStatus = ai.getAgentsStatus();
  res.json({
    ...baseStatus,
    compliance: complianceAgent.getStatus(),
  });
});

// ═══ POST /agents/pricing/:missionId — Estimer le prix ═══
router.post('/pricing/:missionId', authenticate, async (req, res) => {
  try {
    const result = await ai.estimatePrice(req.params.missionId);
    res.json(result);
  } catch (err) {
    console.error('AI Pricing error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ POST /agents/match/:missionId — Trouver les meilleurs transporteurs ═══
router.post('/match/:missionId', authenticate, async (req, res) => {
  try {
    const result = await ai.findMatches(req.params.missionId);
    res.json(result);
  } catch (err) {
    console.error('AI Matcher error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ POST /agents/risk/:companyId — Évaluer le risque d'une entreprise ═══
router.post('/risk/:companyId', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await ai.assessCompanyRisk(req.params.companyId);
    res.json(result);
  } catch (err) {
    console.error('AI Risk error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ POST /agents/compliance/analyze/:driverId — Analyser la conformité d'un conducteur ═══
router.post('/compliance/analyze/:driverId', authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const result = await complianceAgent.analyzeDriver(prisma, req.params.driverId, parseInt(days));
    res.json(result);
  } catch (err) {
    console.error('Compliance analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ POST /agents/compliance/can-accept — Le conducteur peut-il prendre cette mission ? ═══
router.post('/compliance/can-accept', authenticate, async (req, res) => {
  try {
    const { driverId, estimatedDriveMinutes, estimatedWorkMinutes } = req.body;
    if (!driverId) return res.status(400).json({ error: 'driverId requis' });
    const result = await complianceAgent.canAcceptMission(prisma, {
      driverId,
      estimatedDriveMinutes: estimatedDriveMinutes || 0,
      estimatedWorkMinutes: estimatedWorkMinutes || 0,
    });
    res.json(result);
  } catch (err) {
    console.error('Compliance can-accept error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ GET /agents/compliance/available/:companyId — Conducteurs disponibles ═══
router.get('/compliance/available/:companyId', authenticate, async (req, res) => {
  try {
    const result = await complianceAgent.getAvailableDrivers(prisma, req.params.companyId);
    res.json(result);
  } catch (err) {
    console.error('Compliance available error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ GET /agents/compliance/certification/:companyId — Score de certification ═══
router.get('/compliance/certification/:companyId', authenticate, async (req, res) => {
  try {
    const result = await complianceAgent.getCertificationScore(prisma, req.params.companyId);
    res.json(result);
  } catch (err) {
    console.error('Compliance certification error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ GET /agents/compliance/anomalies/:companyId — Détection d'anomalies ═══
router.get('/compliance/anomalies/:driverId', authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const { mobilicAPI } = require('../../services/mobilic-api');
    const result = await mobilicAPI.detectAnomalies(prisma, req.params.driverId, parseInt(days));
    res.json(result);
  } catch (err) {
    console.error('Compliance anomalies error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
