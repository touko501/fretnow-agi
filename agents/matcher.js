/**
 * 🤖 MATCHER AGENT — Le Marieur de Fret Intelligent
 * 
 * Mission: Matching parfait fret ↔ transporteur (objectif 98% précision)
 * Inspiration: Convoy ML matching, Uber Freight instant matching
 */

class MatcherAgent {
  constructor(config = {}) {
    this.name = 'MATCHER';
    this.priority = 95; // Très haute priorité
    this.config = {
      minMatchScore: config.minMatchScore || 0.70,
      maxMatchesPerCycle: config.maxMatchesPerCycle || 20,
      weights: config.weights || {
        proximity: 0.25,
        vehicle: 0.20,
        history: 0.20,
        availability: 0.15,
        reputation: 0.10,
        preference: 0.10
      },
      ...config
    };
    this.stats = {
      matchesCreated: 0,
      matchesAccepted: 0,
      matchesRejected: 0,
      averageScore: 0,
      emptyMilesReduced: 0
    };
    this.matchHistory = [];
  }

  async init() {
    console.log(`  🤖 Matcher Agent initialisé | Score min: ${this.config.minMatchScore * 100}%`);
  }

  async execute(state) {
    // Récupérer les missions non matchées
    const unmatchedMissions = state.pendingMissions.filter(m => 
      !m.matched && m.status === 'pending'
    );

    // Récupérer les transporteurs disponibles
    const availableTransporters = state.activeLeads.filter(t => 
      t.status === 'active' || t.status === 'qualified'
    );

    if (unmatchedMissions.length === 0) {
      return { summary: 'Aucune mission à matcher' };
    }

    if (availableTransporters.length === 0) {
      return { summary: 'Aucun transporteur disponible' };
    }

    // Générer tous les matchs possibles
    const allMatches = [];
    for (const mission of unmatchedMissions) {
      for (const transporter of availableTransporters) {
        const score = this.calculateMatchScore(mission, transporter);
        if (score >= this.config.minMatchScore) {
          allMatches.push({
            mission,
            transporter,
            score,
            factors: this.getMatchFactors(mission, transporter),
            estimatedAcceptance: this.predictAcceptance(mission, transporter, score),
            returnOpportunity: this.findReturnOpportunity(mission, transporter, unmatchedMissions)
          });
        }
      }
    }

    // Trier par score et sélectionner les meilleurs
    const topMatches = allMatches
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxMatchesPerCycle);

    // Appliquer les matchs (éviter les doublons)
    const matchedMissionIds = new Set();
    const matchedTransporterIds = new Set();
    const appliedMatches = [];

    for (const match of topMatches) {
      if (matchedMissionIds.has(match.mission.id) || 
          matchedTransporterIds.has(match.transporter.id)) {
        continue;
      }

      // Appliquer le match
      match.mission.matched = true;
      match.mission.matchedTransporter = match.transporter.id;
      match.mission.matchScore = match.score;
      match.mission.matchedAt = new Date().toISOString();

      match.transporter.lastMatch = new Date().toISOString();

      // Ajouter au state
      state.matchedPairs.push({
        id: `match_${Date.now()}_${appliedMatches.length}`,
        missionId: match.mission.id,
        transporterId: match.transporter.id,
        score: match.score,
        factors: match.factors,
        returnOpportunity: match.returnOpportunity,
        status: 'proposed',
        createdAt: new Date().toISOString()
      });

      matchedMissionIds.add(match.mission.id);
      matchedTransporterIds.add(match.transporter.id);
      appliedMatches.push(match);

      this.stats.matchesCreated++;
      this.matchHistory.push({
        score: match.score,
        timestamp: new Date()
      });
    }

    // Calculer la moyenne
    if (this.matchHistory.length > 0) {
      this.stats.averageScore = this.matchHistory
        .slice(-100)
        .reduce((a, b) => a + b.score, 0) / Math.min(100, this.matchHistory.length);
    }

    // Calculer les km à vide réduits
    const emptyMilesSaved = appliedMatches
      .filter(m => m.returnOpportunity)
      .reduce((total, m) => total + (m.returnOpportunity.emptyMilesSaved || 0), 0);
    this.stats.emptyMilesReduced += emptyMilesSaved;

    return {
      summary: `${appliedMatches.length} matchs créés | Score moy: ${Math.round(this.stats.averageScore * 100)}%`,
      matchesCreated: appliedMatches.length,
      averageScore: this.stats.averageScore,
      emptyMilesSaved,
      topMatch: appliedMatches[0] ? {
        mission: appliedMatches[0].mission.id,
        transporter: appliedMatches[0].transporter.company?.name,
        score: appliedMatches[0].score
      } : null
    };
  }

  /**
   * Calcule le score de matching (0-1)
   */
  calculateMatchScore(mission, transporter) {
    const w = this.config.weights;
    let score = 0;

    // 1. Proximité géographique (25%)
    const proximityScore = this.calculateProximityScore(mission, transporter);
    score += w.proximity * proximityScore;

    // 2. Compatibilité véhicule (20%)
    const vehicleScore = this.calculateVehicleScore(mission, transporter);
    score += w.vehicle * vehicleScore;

    // 3. Historique de succès (20%)
    const historyScore = transporter.metrics?.successRate || 0.75;
    score += w.history * historyScore;

    // 4. Disponibilité (15%)
    const availabilityScore = this.calculateAvailabilityScore(mission, transporter);
    score += w.availability * availabilityScore;

    // 5. Réputation (10%)
    const reputationScore = ((transporter.rating || 4) / 5);
    score += w.reputation * reputationScore;

    // 6. Préférence déclarée (10%)
    const preferenceScore = this.calculatePreferenceScore(mission, transporter);
    score += w.preference * preferenceScore;

    return Math.min(1, score);
  }

  /**
   * Score de proximité
   */
  calculateProximityScore(mission, transporter) {
    if (!transporter.location || !mission.pickup) return 0.5;

    const distance = this.haversineDistance(
      transporter.location.lat, transporter.location.lng,
      mission.pickup.lat, mission.pickup.lng
    );

    // 0 km = 1.0, 100 km = 0, linéaire
    return Math.max(0, 1 - distance / 100);
  }

  /**
   * Score de compatibilité véhicule
   */
  calculateVehicleScore(mission, transporter) {
    if (!mission.vehicleType || !transporter.fleet?.types) return 0.5;

    // Match exact
    if (transporter.fleet.types.includes(mission.vehicleType)) {
      return 1.0;
    }

    // Véhicule supérieur peut faire le travail
    const hierarchy = ['VL', 'PL', 'SPL'];
    const missionIndex = hierarchy.indexOf(mission.vehicleType);
    const transporterTypes = transporter.fleet.types;

    for (const type of transporterTypes) {
      const typeIndex = hierarchy.indexOf(type);
      if (typeIndex > missionIndex) {
        return 0.7; // Surdimensionné mais possible
      }
    }

    return 0.3; // Incompatible probable
  }

  /**
   * Score de disponibilité
   */
  calculateAvailabilityScore(mission, transporter) {
    // Simplifié - en production, vérifier le calendrier réel
    if (transporter.available === true) return 1.0;
    if (transporter.available === false) return 0.0;
    return 0.6; // Incertain
  }

  /**
   * Score de préférence route
   */
  calculatePreferenceScore(mission, transporter) {
    if (!transporter.preferredRoutes || transporter.preferredRoutes.length === 0) {
      return 0.5;
    }

    const pickupCity = mission.pickup?.city?.toLowerCase() || '';
    const deliveryCity = mission.delivery?.city?.toLowerCase() || '';

    for (const route of transporter.preferredRoutes) {
      if (pickupCity.includes(route.from?.toLowerCase()) &&
          deliveryCity.includes(route.to?.toLowerCase())) {
        return 1.0;
      }
    }

    return 0.3;
  }

  /**
   * Détail des facteurs de matching
   */
  getMatchFactors(mission, transporter) {
    return {
      proximity: Math.round(this.calculateProximityScore(mission, transporter) * 100),
      vehicle: Math.round(this.calculateVehicleScore(mission, transporter) * 100),
      history: Math.round((transporter.metrics?.successRate || 0.75) * 100),
      availability: Math.round(this.calculateAvailabilityScore(mission, transporter) * 100),
      reputation: Math.round(((transporter.rating || 4) / 5) * 100),
      preference: Math.round(this.calculatePreferenceScore(mission, transporter) * 100)
    };
  }

  /**
   * Prédit la probabilité d'acceptation
   */
  predictAcceptance(mission, transporter, score) {
    // Facteurs qui influencent l'acceptation
    let acceptance = score;

    // Prix attractif
    if (mission.price && mission.priceBreakdown?.transporterEarnings) {
      const earningsPerKm = mission.priceBreakdown.transporterEarnings / (mission.distance || 100);
      if (earningsPerKm > 1.5) acceptance += 0.1;
      if (earningsPerKm < 1.0) acceptance -= 0.15;
    }

    // Temps de réponse historique
    if (transporter.metrics?.responseTime) {
      if (transporter.metrics.responseTime < 2) acceptance += 0.05;
      if (transporter.metrics.responseTime > 12) acceptance -= 0.1;
    }

    return Math.min(0.95, Math.max(0.1, acceptance));
  }

  /**
   * Cherche une opportunité de retour à vide
   */
  findReturnOpportunity(mission, transporter, allMissions) {
    // Chercher une mission qui part de la destination vers l'origine
    const returnMissions = allMissions.filter(m => 
      !m.matched &&
      m.id !== mission.id &&
      m.pickup?.city === mission.delivery?.city
    );

    if (returnMissions.length === 0) return null;

    // Trouver la meilleure
    let bestReturn = null;
    let bestScore = 0;

    for (const returnMission of returnMissions) {
      const score = this.calculateMatchScore(returnMission, transporter);
      if (score > bestScore) {
        bestScore = score;
        bestReturn = returnMission;
      }
    }

    if (bestReturn && bestScore >= 0.6) {
      const emptyMilesSaved = mission.distance || 100;
      return {
        missionId: bestReturn.id,
        score: bestScore,
        emptyMilesSaved,
        combinedEarnings: (mission.price || 0) + (bestReturn.price || 0)
      };
    }

    return null;
  }

  /**
   * Distance Haversine
   */
  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  getStats() {
    return {
      ...this.stats,
      acceptanceRate: this.stats.matchesCreated > 0 
        ? this.stats.matchesAccepted / this.stats.matchesCreated 
        : 0
    };
  }
}

module.exports = { MatcherAgent };
