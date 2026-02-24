const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const ai = require('../services/ai');

// ═══ GET /agents/status — Status des agents IA ═══
router.get('/status', authenticate, isAdmin, (req, res) => {
  res.json(ai.getAgentsStatus());
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

module.exports = router;
