/**
 * FRETNOW AGI — Service Mobilic API
 * Intégration complète avec l'API Mobilic (temps de travail transport léger)
 * https://developers.mobilic.beta.gouv.fr/
 */

const env = require('../src/config/env');

const MOBILIC_API_URL = process.env.MOBILIC_API_URL || 'https://mobilic.beta.gouv.fr/api';
const MOBILIC_SANDBOX_URL = 'https://sandbox.mobilic.beta.gouv.fr/api';
const MOBILIC_CLIENT_ID = process.env.MOBILIC_CLIENT_ID;
const MOBILIC_CLIENT_SECRET = process.env.MOBILIC_CLIENT_SECRET;
const MOBILIC_REDIRECT_URI = process.env.MOBILIC_REDIRECT_URI || `${env.FRONTEND_URL}/api/mobilic/callback`;

// Limites légales (en minutes)
const LEGAL_LIMITS = {
  MAX_DAILY_DRIVE: 600,       // 10h
  MAX_WEEKLY_DRIVE: 3360,     // 56h
  MAX_DAILY_WORK: 720,        // 12h
  MIN_DAILY_REST: 660,        // 11h
  MAX_CONTINUOUS_DRIVE: 270,  // 4h30
  MIN_BREAK: 45,              // 45min après 6h de travail
  MAX_WEEKLY_WORK: 2880,      // 48h (moyenne sur 4 mois)
};

class MobilicAPI {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' ? MOBILIC_API_URL : MOBILIC_SANDBOX_URL;
    this.graphqlUrl = `${this.baseUrl}/graphql`;
  }

  // =========================================================
  // OAUTH2 — Authentification
  // =========================================================

  /**
   * Génère l'URL d'autorisation OAuth2 pour connecter une entreprise à Mobilic
   */
  getAuthorizationUrl(state = '') {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: MOBILIC_CLIENT_ID,
      redirect_uri: MOBILIC_REDIRECT_URI,
      scope: 'openid companies:read activities:read activities:write',
      state,
    });
    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Échange le code d'autorisation contre des tokens
   */
  async exchangeCode(code) {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: MOBILIC_CLIENT_ID,
        client_secret: MOBILIC_CLIENT_SECRET,
        redirect_uri: MOBILIC_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mobilic OAuth error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  }

  /**
   * Rafraîchit un token expiré
   */
  async refreshToken(refreshToken) {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: MOBILIC_CLIENT_ID,
        client_secret: MOBILIC_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mobilic refresh error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  // =========================================================
  // GRAPHQL — Requêtes API
  // =========================================================

  /**
   * Exécute une requête GraphQL sur l'API Mobilic
   */
  async graphql(query, variables = {}, accessToken = null) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      const errorMsg = data.errors.map(e => e.message).join(', ');
      throw new Error(`Mobilic GraphQL error: ${errorMsg}`);
    }

    return data.data;
  }

  // =========================================================
  // ACTIVITÉS — Enregistrement temps de travail
  // =========================================================

  /**
   * Crée/démarre une nouvelle activité pour un conducteur
   */
  async createActivity(accessToken, { driverId, type, startTime, missionId = null }) {
    const query = `
      mutation CreateActivity($input: ActivityInput!) {
        activities {
          createActivity(input: $input) {
            id
            type
            startTime
            userId
          }
        }
      }
    `;

    const variables = {
      input: {
        type: type.toUpperCase(), // DRIVE, WORK, REST, SUPPORT, TRANSFER
        startTime: startTime || new Date().toISOString(),
        userId: driverId,
        ...(missionId && { context: { missionId } }),
      },
    };

    return this.graphql(query, variables, accessToken);
  }

  /**
   * Termine une activité en cours
   */
  async endActivity(accessToken, { activityId, endTime, driverId }) {
    const query = `
      mutation EndActivity($input: ActivityEndInput!) {
        activities {
          endActivity(input: $input) {
            id
            type
            startTime
            endTime
            userId
          }
        }
      }
    `;

    const variables = {
      input: {
        activityId,
        endTime: endTime || new Date().toISOString(),
        userId: driverId,
      },
    };

    return this.graphql(query, variables, accessToken);
  }

  /**
   * Enregistre plusieurs activités en batch (mode rattrapage)
   */
  async logActivitiesBatch(accessToken, { driverId, activities }) {
    const query = `
      mutation LogActivities($input: ActivitiesLogInput!) {
        activities {
          logActivities(input: $input) {
            id
            type
            startTime
            endTime
          }
        }
      }
    `;

    const variables = {
      input: {
        userId: driverId,
        activities: activities.map(a => ({
          type: a.type.toUpperCase(),
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      },
    };

    return this.graphql(query, variables, accessToken);
  }

  // =========================================================
  // LECTURE — Consultation des données
  // =========================================================

  /**
   * Récupère les activités d'un conducteur sur une période
   */
  async getDriverActivities(accessToken, { driverId, fromDate, toDate }) {
    const query = `
      query GetActivities($userId: Int!, $fromDate: Date!, $toDate: Date!) {
        user(id: $userId) {
          activities(fromDate: $fromDate, toDate: $toDate) {
            edges {
              node {
                id
                type
                startTime
                endTime
                mission {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      userId: parseInt(driverId),
      fromDate,
      toDate,
    };

    return this.graphql(query, variables, accessToken);
  }

  /**
   * Récupère le résumé journalier d'un conducteur
   */
  async getDriverDailySummary(accessToken, { driverId, date }) {
    const activities = await this.getDriverActivities(accessToken, {
      driverId,
      fromDate: date,
      toDate: date,
    });

    const edges = activities?.user?.activities?.edges || [];
    const logs = edges.map(e => e.node);

    let totalDrive = 0;
    let totalWork = 0;
    let totalRest = 0;
    let continuousDrive = 0;
    let maxContinuousDrive = 0;

    for (const log of logs) {
      if (!log.endTime) continue;
      const duration = (new Date(log.endTime) - new Date(log.startTime)) / 60000; // minutes

      switch (log.type) {
        case 'DRIVE':
          totalDrive += duration;
          continuousDrive += duration;
          if (continuousDrive > maxContinuousDrive) maxContinuousDrive = continuousDrive;
          break;
        case 'WORK':
          totalWork += duration;
          continuousDrive = 0;
          break;
        case 'REST':
        case 'OFF':
          totalRest += duration;
          continuousDrive = 0;
          break;
        default:
          totalWork += duration;
          continuousDrive = 0;
      }
    }

    return {
      date,
      driverId,
      totalDriveMinutes: Math.round(totalDrive),
      totalWorkMinutes: Math.round(totalWork + totalDrive),
      totalRestMinutes: Math.round(totalRest),
      maxContinuousDriveMinutes: Math.round(maxContinuousDrive),
      activitiesCount: logs.length,
      activities: logs,
    };
  }

  // =========================================================
  // CONFORMITÉ — Vérification des limites légales
  // =========================================================

  /**
   * Vérifie la conformité d'un conducteur (journée en cours)
   */
  async checkDriverCompliance(accessToken, { driverId, date }) {
    const summary = await this.getDriverDailySummary(accessToken, { driverId, date });

    const alerts = [];

    // Temps de conduite journalier
    if (summary.totalDriveMinutes > LEGAL_LIMITS.MAX_DAILY_DRIVE) {
      alerts.push({
        type: 'MAX_DRIVE_TIME',
        severity: 'CRITICAL',
        message: `Temps de conduite dépassé: ${summary.totalDriveMinutes}min / ${LEGAL_LIMITS.MAX_DAILY_DRIVE}min max`,
        excess: summary.totalDriveMinutes - LEGAL_LIMITS.MAX_DAILY_DRIVE,
      });
    } else if (summary.totalDriveMinutes > LEGAL_LIMITS.MAX_DAILY_DRIVE * 0.9) {
      alerts.push({
        type: 'MAX_DRIVE_TIME',
        severity: 'WARNING',
        message: `Temps de conduite proche du maximum: ${summary.totalDriveMinutes}min / ${LEGAL_LIMITS.MAX_DAILY_DRIVE}min`,
        remaining: LEGAL_LIMITS.MAX_DAILY_DRIVE - summary.totalDriveMinutes,
      });
    }

    // Temps de travail journalier
    if (summary.totalWorkMinutes > LEGAL_LIMITS.MAX_DAILY_WORK) {
      alerts.push({
        type: 'MAX_WORK_TIME',
        severity: 'CRITICAL',
        message: `Temps de travail dépassé: ${summary.totalWorkMinutes}min / ${LEGAL_LIMITS.MAX_DAILY_WORK}min max`,
        excess: summary.totalWorkMinutes - LEGAL_LIMITS.MAX_DAILY_WORK,
      });
    }

    // Conduite continue
    if (summary.maxContinuousDriveMinutes > LEGAL_LIMITS.MAX_CONTINUOUS_DRIVE) {
      alerts.push({
        type: 'MAX_CONTINUOUS_DRIVE',
        severity: 'CRITICAL',
        message: `Conduite continue dépassée: ${summary.maxContinuousDriveMinutes}min / ${LEGAL_LIMITS.MAX_CONTINUOUS_DRIVE}min max`,
        excess: summary.maxContinuousDriveMinutes - LEGAL_LIMITS.MAX_CONTINUOUS_DRIVE,
      });
    }

    // Repos journalier minimum
    const totalActiveMinutes = summary.totalWorkMinutes + summary.totalDriveMinutes;
    const dayMinutes = 1440; // 24h
    const restMinutes = dayMinutes - totalActiveMinutes;
    if (restMinutes < LEGAL_LIMITS.MIN_DAILY_REST && totalActiveMinutes > 0) {
      alerts.push({
        type: 'MIN_REST',
        severity: 'WARNING',
        message: `Repos journalier insuffisant: ~${Math.round(restMinutes)}min / ${LEGAL_LIMITS.MIN_DAILY_REST}min minimum`,
      });
    }

    const isCompliant = alerts.filter(a => a.severity === 'CRITICAL').length === 0;

    return {
      driverId,
      date,
      isCompliant,
      summary,
      alerts,
      legalLimits: LEGAL_LIMITS,
      remainingDrive: Math.max(0, LEGAL_LIMITS.MAX_DAILY_DRIVE - summary.totalDriveMinutes),
      remainingWork: Math.max(0, LEGAL_LIMITS.MAX_DAILY_WORK - summary.totalWorkMinutes),
    };
  }

  /**
   * Vérifie si un conducteur peut accepter une nouvelle mission
   */
  async canAcceptMission(accessToken, { driverId, estimatedDriveMinutes, estimatedWorkMinutes }) {
    const today = new Date().toISOString().split('T')[0];
    const compliance = await this.checkDriverCompliance(accessToken, { driverId, date: today });

    const canDrive = compliance.remainingDrive >= (estimatedDriveMinutes || 0);
    const canWork = compliance.remainingWork >= (estimatedWorkMinutes || 0);

    return {
      canAccept: canDrive && canWork && compliance.isCompliant,
      reason: !canDrive ? 'Temps de conduite restant insuffisant' :
              !canWork ? 'Temps de travail restant insuffisant' :
              !compliance.isCompliant ? 'Conducteur non conforme' : null,
      compliance,
      estimatedDriveMinutes,
      estimatedWorkMinutes,
    };
  }

  /**
   * Calcule le score de conformité d'une entreprise
   */
  async getCompanyComplianceScore(prisma, companyId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Récupérer tous les logs des 30 derniers jours
    const logs = await prisma.mobilicWorkLog.findMany({
      where: {
        companyId,
        startedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Récupérer les alertes non résolues
    const unresolvedAlerts = await prisma.mobilicComplianceAlert.count({
      where: {
        companyId,
        resolved: false,
      },
    });

    // Récupérer les alertes critiques des 30 derniers jours
    const criticalAlerts = await prisma.mobilicComplianceAlert.count({
      where: {
        companyId,
        severity: 'CRITICAL',
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Calcul du score (100 = parfait)
    let score = 100;
    score -= unresolvedAlerts * 5;   // -5 par alerte non résolue
    score -= criticalAlerts * 10;    // -10 par alerte critique
    score = Math.max(0, Math.min(100, score));

    // Déterminer le niveau de certification
    let certificationLevel = 'NON_CERTIFIE';
    if (score >= 90 && logs.length >= 20) certificationLevel = 'CERTIFIE_OR';
    else if (score >= 75 && logs.length >= 10) certificationLevel = 'CERTIFIE_ARGENT';
    else if (score >= 60 && logs.length >= 5) certificationLevel = 'CERTIFIE_BRONZE';

    return {
      companyId,
      score,
      certificationLevel,
      totalLogs: logs.length,
      unresolvedAlerts,
      criticalAlerts,
      period: '30j',
    };
  }

  /**
   * Détecte les anomalies dans les logs d'un conducteur
   */
  async detectAnomalies(prisma, driverId, days = 7) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const logs = await prisma.mobilicWorkLog.findMany({
      where: {
        driverId,
        startedAt: { gte: fromDate },
      },
      orderBy: { startedAt: 'asc' },
    });

    const anomalies = [];

    // Grouper par jour
    const byDay = {};
    for (const log of logs) {
      const day = log.startedAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(log);
    }

    for (const [day, dayLogs] of Object.entries(byDay)) {
      let dailyDrive = 0;
      let dailyWork = 0;

      for (const log of dayLogs) {
        const duration = log.durationMinutes || 0;
        if (log.activity === 'DRIVE') dailyDrive += duration;
        dailyWork += duration;
      }

      if (dailyDrive > LEGAL_LIMITS.MAX_DAILY_DRIVE) {
        anomalies.push({
          type: 'MAX_DRIVE_TIME',
          severity: 'CRITICAL',
          day,
          value: dailyDrive,
          limit: LEGAL_LIMITS.MAX_DAILY_DRIVE,
          message: `Dépassement conduite le ${day}: ${dailyDrive}min`,
        });
      }

      if (dailyWork > LEGAL_LIMITS.MAX_DAILY_WORK) {
        anomalies.push({
          type: 'MAX_WORK_TIME',
          severity: 'CRITICAL',
          day,
          value: dailyWork,
          limit: LEGAL_LIMITS.MAX_DAILY_WORK,
          message: `Dépassement travail le ${day}: ${dailyWork}min`,
        });
      }

      // Jours sans logs
      if (dayLogs.length === 0) {
        anomalies.push({
          type: 'MISSING_LOG',
          severity: 'WARNING',
          day,
          message: `Aucun log enregistré le ${day}`,
        });
      }
    }

    return {
      driverId,
      period: `${days}j`,
      anomalies,
      totalAnomalies: anomalies.length,
      criticalCount: anomalies.filter(a => a.severity === 'CRITICAL').length,
    };
  }
}

// Singleton
const mobilicAPI = new MobilicAPI();

module.exports = {
  mobilicAPI,
  MobilicAPI,
  LEGAL_LIMITS,
};
