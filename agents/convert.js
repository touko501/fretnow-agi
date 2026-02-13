/**
 * 🎯 CONVERT AGENT — Le Closer
 * 
 * Mission: Transformer les prospects en clients
 * - Scoring de conversion
 * - Parcours personnalisé
 * - Relance intelligente
 * - A/B testing automatique
 */

class ConvertAgent {
  constructor(config = {}) {
    this.name = 'CONVERT';
    this.priority = 78;
    this.config = {
      maxFollowUps: config.maxFollowUps || 5,
      followUpDelays: config.followUpDelays || [1, 3, 7, 14, 30], // jours
      conversionGoal: config.conversionGoal || 0.15, // 15%
      ...config
    };
    this.stats = {
      leadsProcessed: 0,
      conversions: 0,
      followUpsSent: 0,
      abTests: {}
    };
    this.conversionFunnel = {
      new: 0,
      contacted: 0,
      responded: 0,
      interested: 0,
      negotiating: 0,
      converted: 0,
      lost: 0
    };
  }

  async init() {
    console.log(`  🎯 Convert Agent initialisé | Objectif: ${this.config.conversionGoal * 100}%`);
  }

  async execute(state) {
    let processed = 0;
    let followUps = 0;
    let conversions = 0;

    // Mettre à jour le funnel
    this.updateFunnel(state.activeLeads);

    // Identifier les leads à relancer
    const leadsToFollowUp = this.identifyFollowUps(state.activeLeads);

    // Scorer et prioriser
    for (const lead of state.activeLeads) {
      if (!lead.conversionScore) {
        lead.conversionScore = this.calculateConversionScore(lead);
        lead.conversionPath = this.determineConversionPath(lead);
        processed++;
      }

      // Vérifier les conversions
      if (lead.status === 'converted' && !lead.conversionTracked) {
        conversions++;
        lead.conversionTracked = true;
        this.stats.conversions++;
      }
    }

    // Planifier les relances
    for (const lead of leadsToFollowUp) {
      const followUp = this.scheduleFollowUp(lead);
      if (followUp) {
        lead.nextFollowUp = followUp;
        followUps++;
      }
    }

    this.stats.leadsProcessed += processed;
    this.stats.followUpsSent += followUps;

    // Calculer le taux de conversion
    const conversionRate = this.calculateConversionRate(state.activeLeads);

    return {
      summary: `Conv: ${(conversionRate * 100).toFixed(1)}% | ${followUps} relances planifiées`,
      processed,
      followUps,
      conversions,
      conversionRate,
      funnel: this.conversionFunnel
    };
  }

  /**
   * Calcule le score de conversion (0-100)
   */
  calculateConversionScore(lead) {
    let score = 50; // Base

    // Score du lead (+30 max)
    score += (lead.score || 50) * 0.3;

    // Engagement (+20 max)
    if (lead.responded) score += 10;
    if (lead.clickedLink) score += 5;
    if (lead.visitedSite) score += 5;

    // Timing (+10 max)
    const hoursSinceContact = lead.contactedAt 
      ? (Date.now() - new Date(lead.contactedAt).getTime()) / (1000 * 60 * 60)
      : 0;
    if (hoursSinceContact < 24) score += 10;
    else if (hoursSinceContact < 72) score += 5;

    // Profil idéal (+15 max)
    if (lead.fleet?.vehicles >= 5) score += 5;
    if (lead.fleet?.vehicles >= 10) score += 5;
    if (['Île-de-France', 'Rhône-Alpes', 'PACA'].includes(lead.contact?.region)) score += 5;

    // Réduction si trop de relances (-20 max)
    const followUpCount = lead.followUps?.length || 0;
    if (followUpCount >= 3) score -= 10;
    if (followUpCount >= 5) score -= 10;

    // Réduction si risque élevé (-15 max)
    if (lead.riskAssessment?.riskScore > 0.5) score -= 15;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Détermine le parcours de conversion optimal
   */
  determineConversionPath(lead) {
    const paths = {
      fast: {
        name: 'Conversion Rapide',
        steps: ['contact_direct', 'demo_video', 'inscription'],
        targetDays: 3
      },
      standard: {
        name: 'Parcours Standard',
        steps: ['email_intro', 'appel_decouverte', 'demo_personnalisee', 'inscription'],
        targetDays: 14
      },
      nurture: {
        name: 'Nurturing Long',
        steps: ['newsletter', 'contenu_educatif', 'webinar', 'appel', 'inscription'],
        targetDays: 30
      }
    };

    // Choisir le parcours selon le profil
    if (lead.conversionScore > 80) {
      return { ...paths.fast, assignedAt: new Date().toISOString() };
    } else if (lead.conversionScore > 50) {
      return { ...paths.standard, assignedAt: new Date().toISOString() };
    } else {
      return { ...paths.nurture, assignedAt: new Date().toISOString() };
    }
  }

  /**
   * Identifie les leads à relancer
   */
  identifyFollowUps(leads) {
    const now = Date.now();
    
    return leads.filter(lead => {
      // Ignorer les convertis et perdus
      if (['converted', 'lost', 'unsubscribed'].includes(lead.status)) return false;

      // Ignorer si pas encore contacté
      if (!lead.contacted) return false;

      // Ignorer si trop de relances
      const followUpCount = lead.followUps?.length || 0;
      if (followUpCount >= this.config.maxFollowUps) return false;

      // Vérifier le délai depuis le dernier contact
      const lastContact = lead.lastContactAt || lead.contactedAt;
      if (!lastContact) return false;

      const daysSinceContact = (now - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24);
      const requiredDelay = this.config.followUpDelays[followUpCount] || 30;

      return daysSinceContact >= requiredDelay;
    });
  }

  /**
   * Planifie une relance
   */
  scheduleFollowUp(lead) {
    const followUpCount = lead.followUps?.length || 0;
    
    // Déterminer le type de relance
    const followUpTypes = [
      { type: 'email', subject: 'Avez-vous des questions sur FRETNOW ?' },
      { type: 'sms', message: 'Bonjour ! Votre inscription FRETNOW est en attente. Besoin d\'aide ?' },
      { type: 'call', script: 'Appel de suivi - Répondre aux objections' },
      { type: 'email', subject: 'Dernière chance : 3 mois GRATUITS expire bientôt' },
      { type: 'email', subject: 'Vos concurrents utilisent déjà FRETNOW...' }
    ];

    const followUp = followUpTypes[followUpCount] || followUpTypes[followUpTypes.length - 1];

    // Personnaliser le message
    const personalizedFollowUp = {
      ...followUp,
      leadId: lead.id,
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      abVariant: this.selectABVariant(followUp.type)
    };

    // Enregistrer
    if (!lead.followUps) lead.followUps = [];
    lead.followUps.push(personalizedFollowUp);

    return personalizedFollowUp;
  }

  /**
   * Sélectionne une variante A/B
   */
  selectABVariant(type) {
    // Simple A/B: 50/50
    const variant = Math.random() > 0.5 ? 'A' : 'B';
    
    if (!this.stats.abTests[type]) {
      this.stats.abTests[type] = { A: { sent: 0, converted: 0 }, B: { sent: 0, converted: 0 } };
    }
    this.stats.abTests[type][variant].sent++;

    return variant;
  }

  /**
   * Met à jour le funnel
   */
  updateFunnel(leads) {
    this.conversionFunnel = {
      new: 0,
      contacted: 0,
      responded: 0,
      interested: 0,
      negotiating: 0,
      converted: 0,
      lost: 0
    };

    for (const lead of leads) {
      const status = lead.status || 'new';
      if (this.conversionFunnel.hasOwnProperty(status)) {
        this.conversionFunnel[status]++;
      } else {
        this.conversionFunnel.new++;
      }
    }
  }

  /**
   * Calcule le taux de conversion
   */
  calculateConversionRate(leads) {
    const contacted = leads.filter(l => l.contacted).length;
    const converted = leads.filter(l => l.status === 'converted').length;
    
    return contacted > 0 ? converted / contacted : 0;
  }

  /**
   * Analyse les performances A/B
   */
  getABResults() {
    const results = {};
    
    for (const [type, variants] of Object.entries(this.stats.abTests)) {
      const aRate = variants.A.sent > 0 ? variants.A.converted / variants.A.sent : 0;
      const bRate = variants.B.sent > 0 ? variants.B.converted / variants.B.sent : 0;
      
      results[type] = {
        winner: aRate > bRate ? 'A' : bRate > aRate ? 'B' : 'tie',
        A: { ...variants.A, rate: aRate },
        B: { ...variants.B, rate: bRate },
        improvement: aRate > bRate 
          ? ((aRate - bRate) / bRate * 100).toFixed(1) + '%'
          : ((bRate - aRate) / aRate * 100).toFixed(1) + '%'
      };
    }

    return results;
  }

  getStats() {
    return {
      ...this.stats,
      conversionRate: this.stats.leadsProcessed > 0 
        ? this.stats.conversions / this.stats.leadsProcessed 
        : 0,
      funnel: this.conversionFunnel,
      abResults: this.getABResults()
    };
  }
}

module.exports = { ConvertAgent };
