/**
 * 🛡️ RISK AGENT — Le Gardien
 * 
 * Mission: Zéro mauvaise surprise
 * - Scoring fiabilité transporteur
 * - Détection de fraude
 * - Alertes retard prédictives
 */

class RiskAgent {
  constructor(config = {}) {
    this.name = 'RISK';
    this.priority = 75;
    this.config = {
      fraudThreshold: config.fraudThreshold || 0.7,
      reliabilityMinScore: config.reliabilityMinScore || 60,
      ...config
    };
    this.stats = {
      assessments: 0,
      fraudsDetected: 0,
      alertsGenerated: 0
    };
    this.riskFactors = {
      newCompany: { weight: 0.15, threshold: 2 }, // < 2 ans
      lowCapital: { weight: 0.10, threshold: 10000 },
      noHistory: { weight: 0.20 },
      inconsistentData: { weight: 0.25 },
      blacklistedSiret: { weight: 0.30 }
    };
    this.blacklist = new Set();
  }

  async init() {
    console.log(`  🛡️ Risk Agent initialisé | Seuil fraude: ${this.config.fraudThreshold * 100}%`);
  }

  async execute(state) {
    let assessed = 0;
    let flagged = 0;
    let alerts = [];

    // Évaluer les nouveaux leads
    for (const lead of state.activeLeads) {
      if (!lead.riskAssessment) {
        const assessment = await this.assessRisk(lead);
        lead.riskAssessment = assessment;
        assessed++;

        if (assessment.riskScore > this.config.fraudThreshold) {
          lead.flagged = true;
          lead.flagReason = assessment.topRisks[0]?.reason || 'Risque élevé';
          flagged++;
        }

        if (assessment.alerts.length > 0) {
          alerts.push(...assessment.alerts);
        }
      }
    }

    // Évaluer les matchs en cours
    for (const match of state.matchedPairs) {
      if (match.status === 'proposed' && !match.riskCheck) {
        const transporter = state.activeLeads.find(l => l.id === match.transporterId);
        if (transporter?.riskAssessment?.riskScore > 0.5) {
          alerts.push({
            type: 'MATCH_RISK',
            severity: 'medium',
            matchId: match.id,
            message: `Match avec transporteur à risque modéré (${Math.round(transporter.riskAssessment.riskScore * 100)}%)`
          });
        }
        match.riskCheck = true;
      }
    }

    // Mettre à jour les stats
    this.stats.assessments += assessed;
    this.stats.fraudsDetected += flagged;
    this.stats.alertsGenerated += alerts.length;

    // Émettre les alertes
    if (alerts.length > 0) {
      state.riskAlerts = (state.riskAlerts || []).concat(alerts);
    }

    return {
      summary: `${assessed} évalués, ${flagged} flaggés, ${alerts.length} alertes`,
      assessed,
      flagged,
      alerts: alerts.length
    };
  }

  /**
   * Évalue le risque d'un lead
   */
  async assessRisk(lead) {
    const risks = [];
    let riskScore = 0;

    // 1. Vérifier entreprise récente
    const companyAge = this.getCompanyAge(lead.company?.creationDate);
    if (companyAge < this.riskFactors.newCompany.threshold) {
      const risk = this.riskFactors.newCompany.weight * (1 - companyAge / this.riskFactors.newCompany.threshold);
      risks.push({
        factor: 'newCompany',
        score: risk,
        reason: `Entreprise récente (${companyAge} an${companyAge > 1 ? 's' : ''})`
      });
      riskScore += risk;
    }

    // 2. Vérifier capital social
    if ((lead.company?.capital || 0) < this.riskFactors.lowCapital.threshold) {
      risks.push({
        factor: 'lowCapital',
        score: this.riskFactors.lowCapital.weight,
        reason: `Capital faible (${lead.company?.capital || 0}€)`
      });
      riskScore += this.riskFactors.lowCapital.weight;
    }

    // 3. Vérifier historique
    if (!lead.metrics?.successRate) {
      risks.push({
        factor: 'noHistory',
        score: this.riskFactors.noHistory.weight,
        reason: 'Aucun historique de missions'
      });
      riskScore += this.riskFactors.noHistory.weight;
    }

    // 4. Vérifier cohérence des données
    const inconsistencies = this.checkDataConsistency(lead);
    if (inconsistencies.length > 0) {
      const score = this.riskFactors.inconsistentData.weight * (inconsistencies.length / 5);
      risks.push({
        factor: 'inconsistentData',
        score,
        reason: `Données incohérentes: ${inconsistencies.join(', ')}`
      });
      riskScore += score;
    }

    // 5. Vérifier blacklist
    if (this.blacklist.has(lead.company?.siret)) {
      risks.push({
        factor: 'blacklisted',
        score: this.riskFactors.blacklistedSiret.weight,
        reason: 'SIRET blacklisté'
      });
      riskScore += this.riskFactors.blacklistedSiret.weight;
    }

    // Calculer le score de fiabilité (inverse du risque)
    const reliabilityScore = Math.round((1 - Math.min(1, riskScore)) * 100);

    // Générer des alertes si nécessaire
    const alerts = [];
    if (riskScore > this.config.fraudThreshold) {
      alerts.push({
        type: 'HIGH_RISK_LEAD',
        severity: 'high',
        leadId: lead.id,
        message: `Lead à haut risque détecté: ${lead.company?.name}`
      });
    }

    return {
      riskScore: Math.min(1, riskScore),
      reliabilityScore,
      topRisks: risks.sort((a, b) => b.score - a.score).slice(0, 3),
      allRisks: risks,
      alerts,
      assessedAt: new Date().toISOString()
    };
  }

  /**
   * Calcule l'âge de l'entreprise
   */
  getCompanyAge(creationDate) {
    if (!creationDate) return 0;
    const created = new Date(creationDate);
    const now = new Date();
    return (now - created) / (365.25 * 24 * 60 * 60 * 1000);
  }

  /**
   * Vérifie la cohérence des données
   */
  checkDataConsistency(lead) {
    const issues = [];

    // Email invalide
    if (lead.contact?.email && !this.isValidEmail(lead.contact.email)) {
      issues.push('email invalide');
    }

    // Téléphone invalide
    if (lead.contact?.phone && !this.isValidPhone(lead.contact.phone)) {
      issues.push('téléphone invalide');
    }

    // SIRET invalide
    if (lead.company?.siret && !this.isValidSiret(lead.company.siret)) {
      issues.push('SIRET invalide');
    }

    // Incohérence employés/véhicules
    if (lead.company?.employees && lead.fleet?.vehicles) {
      if (lead.fleet.vehicles > lead.company.employees * 3) {
        issues.push('ratio véhicules/employés suspect');
      }
    }

    return issues;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidPhone(phone) {
    return /^0[1-9][0-9]{8}$/.test(phone.replace(/\s/g, ''));
  }

  isValidSiret(siret) {
    if (!/^\d{14}$/.test(siret)) return false;
    // Algorithme de Luhn simplifié
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(siret[i]);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }

  /**
   * Ajoute un SIRET à la blacklist
   */
  addToBlacklist(siret, reason) {
    this.blacklist.add(siret);
    console.log(`🛡️ SIRET blacklisté: ${siret} (${reason})`);
  }

  getStats() {
    return this.stats;
  }
}

module.exports = { RiskAgent };
