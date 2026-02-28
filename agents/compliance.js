/**
 * FRETNOW AGI — Agent #010 : ComplianceAgent
 * Conformité Mobilic, suivi temps de travail, alertes, certification
 */

const { LEGAL_LIMITS } = require('../services/mobilic-api');

class ComplianceAgent {
  constructor() {
    this.name = 'ComplianceAgent';
    this.id = '010';
    this.version = '1.0.0';
  }

  /**
   * Analyse la conformité d'un conducteur sur une période
   * Utilise les logs locaux (MobilicWorkLog) sans appeler l'API Mobilic
   */
  async analyzeDriver(prisma, driverId, days = 7) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { company: true },
    });

    if (!driver) throw new Error('Conducteur introuvable');

    const logs = await prisma.mobilicWorkLog.findMany({
      where: {
        driverId,
        startedAt: { gte: fromDate },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Grouper par jour
    const dailyAnalysis = {};
    const alerts = [];

    for (const log of logs) {
      const day = log.startedAt.toISOString().split('T')[0];
      if (!dailyAnalysis[day]) {
        dailyAnalysis[day] = {
          date: day,
          driveMinutes: 0,
          workMinutes: 0,
          restMinutes: 0,
          totalMinutes: 0,
          maxContinuousDrive: 0,
          currentContinuousDrive: 0,
          logsCount: 0,
          validated: 0,
          unvalidated: 0,
        };
      }

      const d = dailyAnalysis[day];
      const duration = log.durationMinutes || 0;
      d.logsCount++;
      d.totalMinutes += duration;

      if (log.validated) d.validated++;
      else d.unvalidated++;

      switch (log.activity) {
        case 'DRIVE':
          d.driveMinutes += duration;
          d.currentContinuousDrive += duration;
          if (d.currentContinuousDrive > d.maxContinuousDrive) {
            d.maxContinuousDrive = d.currentContinuousDrive;
          }
          break;
        case 'WORK':
        case 'SUPPORT':
        case 'TRANSFER':
          d.workMinutes += duration;
          d.currentContinuousDrive = 0;
          break;
        case 'REST':
        case 'OFF':
          d.restMinutes += duration;
          d.currentContinuousDrive = 0;
          break;
      }
    }

    // Analyser chaque jour pour détecter les infractions
    for (const [day, data] of Object.entries(dailyAnalysis)) {
      const totalWork = data.driveMinutes + data.workMinutes;

      if (data.driveMinutes > LEGAL_LIMITS.MAX_DAILY_DRIVE) {
        alerts.push({
          alertType: 'MAX_DRIVE_TIME',
          severity: 'CRITICAL',
          message: `Dépassement conduite le ${day}: ${data.driveMinutes}min / ${LEGAL_LIMITS.MAX_DAILY_DRIVE}min`,
          details: JSON.stringify({ day, actual: data.driveMinutes, limit: LEGAL_LIMITS.MAX_DAILY_DRIVE }),
          driverId,
          companyId: driver.companyId,
        });
      }

      if (totalWork > LEGAL_LIMITS.MAX_DAILY_WORK) {
        alerts.push({
          alertType: 'MAX_WORK_TIME',
          severity: 'CRITICAL',
          message: `Dépassement travail le ${day}: ${totalWork}min / ${LEGAL_LIMITS.MAX_DAILY_WORK}min`,
          details: JSON.stringify({ day, actual: totalWork, limit: LEGAL_LIMITS.MAX_DAILY_WORK }),
          driverId,
          companyId: driver.companyId,
        });
      }

      if (data.maxContinuousDrive > LEGAL_LIMITS.MAX_CONTINUOUS_DRIVE) {
        alerts.push({
          alertType: 'MAX_CONTINUOUS_DRIVE',
          severity: 'CRITICAL',
          message: `Conduite continue excessive le ${day}: ${data.maxContinuousDrive}min / ${LEGAL_LIMITS.MAX_CONTINUOUS_DRIVE}min`,
          details: JSON.stringify({ day, actual: data.maxContinuousDrive, limit: LEGAL_LIMITS.MAX_CONTINUOUS_DRIVE }),
          driverId,
          companyId: driver.companyId,
        });
      }

      if (data.logsCount === 0) {
        alerts.push({
          alertType: 'MISSING_LOG',
          severity: 'WARNING',
          message: `Aucun enregistrement le ${day}`,
          driverId,
          companyId: driver.companyId,
        });
      }
    }

    // Sauvegarder les alertes en BDD
    if (alerts.length > 0) {
      await prisma.mobilicComplianceAlert.createMany({
        data: alerts,
        skipDuplicates: true,
      });
    }

    // Calcul score conducteur
    const totalDays = Object.keys(dailyAnalysis).length || 1;
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
    const driverScore = Math.max(0, 100 - (criticalAlerts * 15) - (alerts.length * 3));

    return {
      driverId,
      driverName: `${driver.firstName} ${driver.lastName}`,
      companyId: driver.companyId,
      period: `${days}j`,
      totalDays,
      totalLogs: logs.length,
      dailyAnalysis,
      alerts,
      score: Math.round(driverScore),
      isCompliant: criticalAlerts === 0,
    };
  }

  /**
   * Vérifie si un conducteur peut prendre une nouvelle mission
   */
  async canAcceptMission(prisma, { driverId, estimatedDriveMinutes = 0, estimatedWorkMinutes = 0 }) {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today);

    const todayLogs = await prisma.mobilicWorkLog.findMany({
      where: {
        driverId,
        startedAt: { gte: startOfDay },
      },
    });

    let currentDrive = 0;
    let currentWork = 0;
    for (const log of todayLogs) {
      const duration = log.durationMinutes || 0;
      if (log.activity === 'DRIVE') currentDrive += duration;
      currentWork += duration;
    }

    const remainingDrive = LEGAL_LIMITS.MAX_DAILY_DRIVE - currentDrive;
    const remainingWork = LEGAL_LIMITS.MAX_DAILY_WORK - currentWork;

    const canDrive = remainingDrive >= estimatedDriveMinutes;
    const canWork = remainingWork >= estimatedWorkMinutes;
    const canAccept = canDrive && canWork;

    return {
      canAccept,
      reason: !canDrive
        ? `Temps de conduite insuffisant: ${remainingDrive}min restantes, ${estimatedDriveMinutes}min nécessaires`
        : !canWork
        ? `Temps de travail insuffisant: ${remainingWork}min restantes, ${estimatedWorkMinutes}min nécessaires`
        : null,
      currentDriveMinutes: currentDrive,
      currentWorkMinutes: currentWork,
      remainingDriveMinutes: remainingDrive,
      remainingWorkMinutes: remainingWork,
      estimatedDriveMinutes,
      estimatedWorkMinutes,
    };
  }

  /**
   * Récupère les conducteurs disponibles d'une entreprise
   */
  async getAvailableDrivers(prisma, companyId) {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today);

    const drivers = await prisma.driver.findMany({
      where: { companyId, isActive: true },
    });

    const availability = [];

    for (const driver of drivers) {
      const todayLogs = await prisma.mobilicWorkLog.findMany({
        where: {
          driverId: driver.id,
          startedAt: { gte: startOfDay },
        },
      });

      let driveMinutes = 0;
      let workMinutes = 0;
      let currentActivity = null;

      for (const log of todayLogs) {
        const duration = log.durationMinutes || 0;
        if (log.activity === 'DRIVE') driveMinutes += duration;
        workMinutes += duration;

        if (!log.endedAt) {
          currentActivity = log.activity;
        }
      }

      const remainingDrive = LEGAL_LIMITS.MAX_DAILY_DRIVE - driveMinutes;
      const remainingWork = LEGAL_LIMITS.MAX_DAILY_WORK - workMinutes;
      const isAvailable = remainingDrive > 60 && remainingWork > 60; // Au moins 1h

      availability.push({
        driverId: driver.id,
        name: `${driver.firstName} ${driver.lastName}`,
        isAvailable,
        currentActivity,
        driveMinutesToday: driveMinutes,
        workMinutesToday: workMinutes,
        remainingDriveMinutes: Math.max(0, remainingDrive),
        remainingWorkMinutes: Math.max(0, remainingWork),
      });
    }

    return {
      companyId,
      date: today,
      total: drivers.length,
      available: availability.filter(a => a.isAvailable).length,
      drivers: availability,
    };
  }

  /**
   * Score de certification d'une entreprise
   */
  async getCertificationScore(prisma, companyId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalLogs, validatedLogs, criticalAlerts, unresolvedAlerts, drivers] = await Promise.all([
      prisma.mobilicWorkLog.count({ where: { companyId, startedAt: { gte: thirtyDaysAgo } } }),
      prisma.mobilicWorkLog.count({ where: { companyId, startedAt: { gte: thirtyDaysAgo }, validated: true } }),
      prisma.mobilicComplianceAlert.count({ where: { companyId, severity: 'CRITICAL', createdAt: { gte: thirtyDaysAgo } } }),
      prisma.mobilicComplianceAlert.count({ where: { companyId, resolved: false } }),
      prisma.driver.count({ where: { companyId, isActive: true } }),
    ]);

    // Score basé sur plusieurs critères
    let score = 100;
    
    // Pénalités alertes
    score -= criticalAlerts * 10;
    score -= unresolvedAlerts * 5;

    // Bonus validation
    const validationRate = totalLogs > 0 ? validatedLogs / totalLogs : 0;
    if (validationRate >= 0.95) score += 5;
    else if (validationRate < 0.5) score -= 10;

    // Bonus usage régulier
    const avgLogsPerDay = totalLogs / 30;
    if (avgLogsPerDay >= drivers * 2) score += 5; // Au moins 2 logs par conducteur par jour

    score = Math.max(0, Math.min(100, score));

    let level = 'NON_CERTIFIE';
    if (score >= 90 && totalLogs >= 50) level = 'OR';
    else if (score >= 75 && totalLogs >= 20) level = 'ARGENT';
    else if (score >= 60 && totalLogs >= 10) level = 'BRONZE';

    // Mettre à jour le score en BDD
    await prisma.company.update({
      where: { id: companyId },
      data: {
        complianceScore: score,
        mobilicCertified: level !== 'NON_CERTIFIE',
        ...(level !== 'NON_CERTIFIE' ? { mobilicCertifiedAt: new Date() } : {}),
      },
    });

    return {
      companyId,
      score,
      level,
      totalLogs,
      validatedLogs,
      validationRate: Math.round(validationRate * 100),
      criticalAlerts,
      unresolvedAlerts,
      activeDrivers: drivers,
      period: '30j',
    };
  }

  /**
   * Status de l'agent
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: 'ACTIVE',
      capabilities: [
        'driver-compliance-analysis',
        'mission-acceptance-check',
        'available-drivers',
        'company-certification',
        'anomaly-detection',
        'alert-generation',
      ],
      legalLimits: LEGAL_LIMITS,
    };
  }
}

module.exports = new ComplianceAgent();
