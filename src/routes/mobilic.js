/**
 * FRETNOW AGI — Routes Mobilic
 * OAuth2, activités temps de travail, conformité, certification
 */

const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { mobilicAPI, LEGAL_LIMITS } = require('../../services/mobilic-api');
const complianceAgent = require('../../agents/compliance');

const router = Router();
const prisma = new PrismaClient();

// =========================================================
// OAUTH2 — Connexion Mobilic
// =========================================================

/**
 * GET /api/mobilic/connect
 * Génère l'URL de connexion OAuth2 Mobilic
 */
router.get('/connect', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
    });

    if (!user.company) {
      return res.status(400).json({ error: 'Vous devez avoir une entreprise pour connecter Mobilic' });
    }

    const state = Buffer.from(JSON.stringify({
      userId: req.user.id,
      companyId: user.company.id,
    })).toString('base64');

    const authUrl = mobilicAPI.getAuthorizationUrl(state);
    res.json({ authUrl, companyId: user.company.id });
  } catch (error) {
    console.error('Mobilic connect error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mobilic/callback
 * Callback OAuth2 — échange le code contre des tokens
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`${process.env.FRONTEND_URL}/app.html?mobilic=error&reason=${oauthError}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/app.html?mobilic=error&reason=missing_params`);
    }

    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const tokens = await mobilicAPI.exchangeCode(code);

    // Sauvegarder les tokens
    await prisma.mobilicToken.create({
      data: {
        companyId: stateData.companyId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
      },
    });

    // Activer Mobilic pour l'entreprise
    await prisma.company.update({
      where: { id: stateData.companyId },
      data: { mobilicEnabled: true },
    });

    res.redirect(`${process.env.FRONTEND_URL}/app.html?mobilic=connected`);
  } catch (error) {
    console.error('Mobilic callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/app.html?mobilic=error&reason=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/mobilic/status
 * Vérifie le statut de connexion Mobilic pour l'entreprise
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
    });

    if (!user.company) {
      return res.json({ connected: false, reason: 'no_company' });
    }

    const token = await prisma.mobilicToken.findFirst({
      where: { companyId: user.company.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      connected: !!token,
      mobilicEnabled: user.company.mobilicEnabled,
      mobilicCertified: user.company.mobilicCertified,
      complianceScore: user.company.complianceScore,
      tokenExpired: token ? token.expiresAt < new Date() : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================
// ACTIVITÉS — Enregistrement temps de travail
// =========================================================

/**
 * POST /api/mobilic/activity/start
 * Démarre une activité pour un conducteur
 */
router.post('/activity/start', authenticate, async (req, res) => {
  try {
    const { driverId, activity, missionId, startLat, startLon } = req.body;

    if (!driverId || !activity) {
      return res.status(400).json({ error: 'driverId et activity requis' });
    }

    const validActivities = ['DRIVE', 'WORK', 'REST', 'SUPPORT', 'TRANSFER', 'OFF'];
    if (!validActivities.includes(activity)) {
      return res.status(400).json({ error: `Activité invalide. Valeurs: ${validActivities.join(', ')}` });
    }

    // Vérifier que le conducteur appartient à l'entreprise de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
    });

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver || driver.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Conducteur non autorisé' });
    }

    // Fermer l'activité précédente si elle est encore ouverte
    const openLog = await prisma.mobilicWorkLog.findFirst({
      where: { driverId, endedAt: null },
    });

    if (openLog) {
      const now = new Date();
      const duration = Math.round((now - openLog.startedAt) / 60000);
      await prisma.mobilicWorkLog.update({
        where: { id: openLog.id },
        data: { endedAt: now, durationMinutes: duration },
      });
    }

    // Créer le nouveau log
    const log = await prisma.mobilicWorkLog.create({
      data: {
        driverId,
        companyId: user.companyId,
        missionId: missionId || null,
        activity,
        startedAt: new Date(),
        startLat: startLat || null,
        startLon: startLon || null,
      },
    });

    res.status(201).json({ log });
  } catch (error) {
    console.error('Start activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mobilic/activity/:logId/end
 * Termine une activité en cours
 */
router.post('/activity/:logId/end', authenticate, async (req, res) => {
  try {
    const { logId } = req.params;
    const { endLat, endLon } = req.body;

    const log = await prisma.mobilicWorkLog.findUnique({ where: { id: logId } });
    if (!log) return res.status(404).json({ error: 'Log introuvable' });
    if (log.endedAt) return res.status(400).json({ error: 'Activité déjà terminée' });

    const now = new Date();
    const duration = Math.round((now - log.startedAt) / 60000);

    const updated = await prisma.mobilicWorkLog.update({
      where: { id: logId },
      data: {
        endedAt: now,
        durationMinutes: duration,
        endLat: endLat || null,
        endLon: endLon || null,
      },
    });

    res.json({ log: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mobilic/driver/:driverId/today
 * Résumé de la journée d'un conducteur
 */
router.get('/driver/:driverId/today', authenticate, async (req, res) => {
  try {
    const { driverId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.mobilicWorkLog.findMany({
      where: {
        driverId,
        startedAt: { gte: today },
      },
      orderBy: { startedAt: 'asc' },
    });

    let driveMinutes = 0;
    let workMinutes = 0;
    let restMinutes = 0;
    let currentActivity = null;

    for (const log of logs) {
      const duration = log.durationMinutes || (log.endedAt ? Math.round((log.endedAt - log.startedAt) / 60000) : Math.round((new Date() - log.startedAt) / 60000));

      if (!log.endedAt) currentActivity = log;

      switch (log.activity) {
        case 'DRIVE': driveMinutes += duration; break;
        case 'REST':
        case 'OFF': restMinutes += duration; break;
        default: workMinutes += duration;
      }
    }

    res.json({
      driverId,
      date: today.toISOString().split('T')[0],
      driveMinutes,
      workMinutes: workMinutes + driveMinutes,
      restMinutes,
      remainingDrive: Math.max(0, LEGAL_LIMITS.MAX_DAILY_DRIVE - driveMinutes),
      remainingWork: Math.max(0, LEGAL_LIMITS.MAX_DAILY_WORK - (workMinutes + driveMinutes)),
      currentActivity: currentActivity ? { id: currentActivity.id, activity: currentActivity.activity, startedAt: currentActivity.startedAt } : null,
      logsCount: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mobilic/driver/:driverId/logs
 * Historique des logs d'un conducteur
 */
router.get('/driver/:driverId/logs', authenticate, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { days = 7 } = req.query;

    const fromDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const logs = await prisma.mobilicWorkLog.findMany({
      where: {
        driverId,
        startedAt: { gte: fromDate },
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });

    res.json({ driverId, period: `${days}j`, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mobilic/driver/:driverId/availability
 * Vérifie la disponibilité d'un conducteur
 */
router.get('/driver/:driverId/availability', authenticate, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { driveMinutes = 0, workMinutes = 0 } = req.query;

    const result = await complianceAgent.canAcceptMission(prisma, {
      driverId,
      estimatedDriveMinutes: parseInt(driveMinutes),
      estimatedWorkMinutes: parseInt(workMinutes),
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mobilic/logs/:logId/validate
 * Valide un log de temps de travail (gestionnaire)
 */
router.post('/logs/:logId/validate', authenticate, async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await prisma.mobilicWorkLog.update({
      where: { id: logId },
      data: {
        validated: true,
        validatedBy: req.user.id,
        validatedAt: new Date(),
      },
    });

    res.json({ log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mobilic/logs/validate-batch
 * Valide plusieurs logs en batch
 */
router.post('/logs/validate-batch', authenticate, async (req, res) => {
  try {
    const { logIds } = req.body;
    if (!logIds || !Array.isArray(logIds)) {
      return res.status(400).json({ error: 'logIds (array) requis' });
    }

    const result = await prisma.mobilicWorkLog.updateMany({
      where: { id: { in: logIds } },
      data: {
        validated: true,
        validatedBy: req.user.id,
        validatedAt: new Date(),
      },
    });

    res.json({ validated: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================
// CONFORMITÉ — Dashboard et alertes
// =========================================================

/**
 * GET /api/mobilic/compliance/dashboard
 * Dashboard conformité de l'entreprise
 */
router.get('/compliance/dashboard', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
    });

    if (!user.company) {
      return res.status(400).json({ error: 'Entreprise requise' });
    }

    const [certification, availableDrivers, recentAlerts] = await Promise.all([
      complianceAgent.getCertificationScore(prisma, user.companyId),
      complianceAgent.getAvailableDrivers(prisma, user.companyId),
      prisma.mobilicComplianceAlert.findMany({
        where: { companyId: user.companyId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    res.json({
      company: {
        id: user.company.id,
        name: user.company.name,
        mobilicEnabled: user.company.mobilicEnabled,
      },
      certification,
      drivers: availableDrivers,
      recentAlerts,
      legalLimits: LEGAL_LIMITS,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mobilic/compliance/score
 * Score de conformité de l'entreprise
 */
router.get('/compliance/score', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const score = await complianceAgent.getCertificationScore(prisma, user.companyId);
    res.json(score);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mobilic/compliance/alerts
 * Alertes conformité de l'entreprise
 */
router.get('/compliance/alerts', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const { resolved = 'false', limit = 50 } = req.query;

    const alerts = await prisma.mobilicComplianceAlert.findMany({
      where: {
        companyId: user.companyId,
        ...(resolved !== 'all' ? { resolved: resolved === 'true' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    res.json({ count: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mobilic/compliance/alerts/:id/resolve
 * Résoudre une alerte
 */
router.post('/compliance/alerts/:id/resolve', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const alert = await prisma.mobilicComplianceAlert.update({
      where: { id },
      data: {
        resolved: true,
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
        resolvedNotes: notes || null,
      },
    });

    res.json({ alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
