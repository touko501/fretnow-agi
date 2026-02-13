/**
 * 📈 PREDICT AGENT — L'Oracle
 * 
 * Mission: Voir le futur du marché
 * - Prévision demande à 7 jours
 * - Anticipation pics saisonniers
 * - Tendances de prix
 * - Alerte opportunités
 */

class PredictAgent {
  constructor(config = {}) {
    this.name = 'PREDICT';
    this.priority = 70;
    this.config = {
      forecastDays: config.forecastDays || 7,
      confidenceThreshold: config.confidenceThreshold || 0.7,
      ...config
    };
    this.stats = {
      predictions: 0,
      accuratePredictions: 0,
      opportunitiesDetected: 0
    };
    this.historicalData = [];
    this.seasonalPatterns = this.initSeasonalPatterns();
  }

  async init() {
    console.log(`  📈 Predict Agent initialisé | Horizon: ${this.config.forecastDays} jours`);
  }

  async execute(state) {
    // Collecter les données actuelles
    this.collectData(state);

    // Générer les prévisions
    const forecast = this.generateForecast();
    state.marketForecast = forecast;

    // Détecter les opportunités
    const opportunities = this.detectOpportunities(forecast, state);
    
    // Ajouter au state
    if (opportunities.length > 0) {
      state.predictedOpportunities = (state.predictedOpportunities || []).concat(opportunities);
    }

    this.stats.predictions++;
    this.stats.opportunitiesDetected += opportunities.length;

    return {
      summary: `Prévision ${this.config.forecastDays}j | ${opportunities.length} opportunités`,
      forecast: {
        demandTrend: forecast.demandTrend,
        priceTrend: forecast.priceTrend,
        confidence: forecast.confidence
      },
      opportunities: opportunities.length
    };
  }

  /**
   * Collecte les données pour l'historique
   */
  collectData(state) {
    const dataPoint = {
      timestamp: new Date(),
      dayOfWeek: new Date().getDay(),
      hour: new Date().getHours(),
      demandIndex: state.marketConditions?.demandIndex || 0.5,
      supplyIndex: state.marketConditions?.supplyIndex || 0.5,
      activeLeads: state.activeLeads?.length || 0,
      pendingMissions: state.pendingMissions?.length || 0,
      matches: state.matchedPairs?.length || 0,
      fuelPrice: state.marketConditions?.fuelPrice?.diesel || 1.85
    };

    this.historicalData.push(dataPoint);

    // Garder seulement les 7 derniers jours
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.historicalData = this.historicalData.filter(d => d.timestamp > sevenDaysAgo);
  }

  /**
   * Génère les prévisions
   */
  generateForecast() {
    const now = new Date();
    const forecasts = [];

    for (let day = 1; day <= this.config.forecastDays; day++) {
      const forecastDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
      const dayOfWeek = forecastDate.getDay();
      
      // Prévision basée sur les patterns saisonniers
      const seasonal = this.seasonalPatterns[dayOfWeek];
      
      // Ajustement basé sur l'historique récent
      const recentTrend = this.calculateRecentTrend();
      
      // Prévision de demande
      const demandForecast = seasonal.demandBase * (1 + recentTrend.demand * 0.3);
      
      // Prévision de prix
      const priceForecast = seasonal.priceMultiplier * (1 + recentTrend.price * 0.2);

      forecasts.push({
        date: forecastDate.toISOString().split('T')[0],
        dayOfWeek,
        dayName: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dayOfWeek],
        demandIndex: Math.min(1, Math.max(0, demandForecast)),
        priceMultiplier: priceForecast,
        confidence: this.calculateConfidence(day),
        events: this.getSpecialEvents(forecastDate)
      });
    }

    // Calculer les tendances globales
    const demandTrend = this.calculateTrend(forecasts.map(f => f.demandIndex));
    const priceTrend = this.calculateTrend(forecasts.map(f => f.priceMultiplier));

    return {
      generatedAt: new Date().toISOString(),
      horizon: this.config.forecastDays,
      daily: forecasts,
      demandTrend: demandTrend > 0.05 ? 'hausse' : demandTrend < -0.05 ? 'baisse' : 'stable',
      priceTrend: priceTrend > 0.02 ? 'hausse' : priceTrend < -0.02 ? 'baisse' : 'stable',
      confidence: forecasts.reduce((a, b) => a + b.confidence, 0) / forecasts.length,
      recommendations: this.generateRecommendations(forecasts, demandTrend, priceTrend)
    };
  }

  /**
   * Patterns saisonniers par jour de la semaine
   */
  initSeasonalPatterns() {
    return {
      0: { demandBase: 0.3, priceMultiplier: 0.95, name: 'Dimanche' },   // Dim - faible
      1: { demandBase: 0.8, priceMultiplier: 1.05, name: 'Lundi' },      // Lun - fort
      2: { demandBase: 0.85, priceMultiplier: 1.03, name: 'Mardi' },     // Mar - très fort
      3: { demandBase: 0.8, priceMultiplier: 1.02, name: 'Mercredi' },   // Mer - fort
      4: { demandBase: 0.85, priceMultiplier: 1.05, name: 'Jeudi' },     // Jeu - très fort
      5: { demandBase: 0.7, priceMultiplier: 1.00, name: 'Vendredi' },   // Ven - moyen
      6: { demandBase: 0.4, priceMultiplier: 0.98, name: 'Samedi' }      // Sam - faible
    };
  }

  /**
   * Calcule la tendance récente
   */
  calculateRecentTrend() {
    if (this.historicalData.length < 10) {
      return { demand: 0, price: 0 };
    }

    const recent = this.historicalData.slice(-24); // Dernières 24 mesures
    const older = this.historicalData.slice(-48, -24);

    if (older.length === 0) {
      return { demand: 0, price: 0 };
    }

    const recentDemand = recent.reduce((a, b) => a + b.demandIndex, 0) / recent.length;
    const olderDemand = older.reduce((a, b) => a + b.demandIndex, 0) / older.length;

    const recentPrice = recent.reduce((a, b) => a + b.fuelPrice, 0) / recent.length;
    const olderPrice = older.reduce((a, b) => a + b.fuelPrice, 0) / older.length;

    return {
      demand: (recentDemand - olderDemand) / olderDemand,
      price: (recentPrice - olderPrice) / olderPrice
    };
  }

  /**
   * Calcule la tendance d'une série
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    const first = values.slice(0, Math.ceil(values.length / 2));
    const last = values.slice(Math.floor(values.length / 2));
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
    return (lastAvg - firstAvg) / firstAvg;
  }

  /**
   * Calcule la confiance de la prévision
   */
  calculateConfidence(daysAhead) {
    // La confiance diminue avec l'horizon
    const baseConfidence = 0.9;
    const decay = 0.05;
    return Math.max(0.5, baseConfidence - decay * daysAhead);
  }

  /**
   * Détecte les événements spéciaux
   */
  getSpecialEvents(date) {
    const events = [];
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Jours fériés français
    const holidays = [
      { m: 1, d: 1, name: 'Jour de l\'An' },
      { m: 5, d: 1, name: 'Fête du Travail' },
      { m: 5, d: 8, name: 'Victoire 1945' },
      { m: 7, d: 14, name: 'Fête Nationale' },
      { m: 8, d: 15, name: 'Assomption' },
      { m: 11, d: 1, name: 'Toussaint' },
      { m: 11, d: 11, name: 'Armistice' },
      { m: 12, d: 25, name: 'Noël' }
    ];

    for (const h of holidays) {
      if (h.m === month && h.d === day) {
        events.push({ type: 'holiday', name: h.name, impact: 'low_demand' });
      }
    }

    // Périodes spéciales
    if (month === 12 && day >= 15) {
      events.push({ type: 'season', name: 'Rush Noël', impact: 'high_demand' });
    }
    if (month === 8) {
      events.push({ type: 'season', name: 'Vacances été', impact: 'low_supply' });
    }

    return events;
  }

  /**
   * Génère des recommandations
   */
  generateRecommendations(forecasts, demandTrend, priceTrend) {
    const recommendations = [];

    if (demandTrend === 'hausse') {
      recommendations.push({
        priority: 'high',
        action: 'Intensifier la prospection',
        reason: 'Demande en hausse prévue'
      });
    }

    if (priceTrend === 'hausse') {
      recommendations.push({
        priority: 'medium',
        action: 'Augmenter les marges de 2-3%',
        reason: 'Prix du marché en hausse'
      });
    }

    // Chercher les pics
    const highDemandDays = forecasts.filter(f => f.demandIndex > 0.75);
    if (highDemandDays.length > 0) {
      recommendations.push({
        priority: 'high',
        action: `Maximiser la capacité ${highDemandDays.map(d => d.dayName).join(', ')}`,
        reason: 'Pics de demande prévus'
      });
    }

    return recommendations;
  }

  /**
   * Détecte les opportunités
   */
  detectOpportunities(forecast, state) {
    const opportunities = [];

    // Opportunité: pic de demande imminent
    const tomorrow = forecast.daily[0];
    if (tomorrow && tomorrow.demandIndex > 0.75) {
      opportunities.push({
        type: 'DEMAND_SPIKE',
        date: tomorrow.date,
        confidence: tomorrow.confidence,
        action: 'Préparer capacité supplémentaire',
        potentialRevenue: Math.round(state.activeLeads.length * 50 * tomorrow.demandIndex)
      });
    }

    // Opportunité: prix favorable
    const highPriceDays = forecast.daily.filter(d => d.priceMultiplier > 1.05);
    if (highPriceDays.length >= 2) {
      opportunities.push({
        type: 'PRICE_OPPORTUNITY',
        dates: highPriceDays.map(d => d.date),
        confidence: 0.8,
        action: 'Ajuster les prix à la hausse',
        potentialGain: '+5-8% sur les marges'
      });
    }

    // Opportunité: faible concurrence
    if (forecast.daily.some(d => d.events.some(e => e.impact === 'low_supply'))) {
      opportunities.push({
        type: 'LOW_COMPETITION',
        confidence: 0.7,
        action: 'Capter les clients des concurrents en vacances'
      });
    }

    return opportunities;
  }

  getStats() {
    return {
      ...this.stats,
      accuracy: this.stats.predictions > 0 
        ? this.stats.accuratePredictions / this.stats.predictions 
        : 0,
      dataPoints: this.historicalData.length
    };
  }
}

module.exports = { PredictAgent };
