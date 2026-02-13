/**
 * 💰 PRICING AGENT — Calculateur de Prix Dynamique
 * 
 * Mission: Prix optimal en temps réel basé sur CNR + marché
 * Inspiration: Greenscreens.ai dynamic pricing, Transfix lane pricing
 */

class PricingAgent {
  constructor(config = {}) {
    this.name = 'PRICING';
    this.priority = 80;
    this.config = {
      baseCNR: config.baseCNR || this.getDefaultCNR(),
      platformFee: config.platformFee || 0.10,
      minMargin: config.minMargin || 0.05,
      maxMargin: config.maxMargin || 0.25,
      ...config
    };
    this.stats = {
      quotesGenerated: 0,
      averagePrice: 0,
      priceHistory: []
    };
    this.cache = new Map();
  }

  async init() {
    console.log(`  💰 Pricing Agent initialisé | Marge: ${this.config.platformFee * 100}%`);
  }

  async execute(state) {
    // Mettre à jour les coefficients selon le marché
    await this.updateMarketCoefficients(state.marketConditions);

    // Générer des devis pour les missions en attente
    const missionsWithoutPrice = state.pendingMissions.filter(m => !m.price);
    let priced = 0;

    for (const mission of missionsWithoutPrice) {
      const quote = await this.generateQuote(mission, state);
      mission.price = quote.finalPrice;
      mission.priceBreakdown = quote.breakdown;
      mission.priceTimestamp = new Date().toISOString();
      priced++;

      this.stats.quotesGenerated++;
      this.stats.priceHistory.push({ price: quote.finalPrice, date: new Date() });
    }

    // Calculer le prix moyen
    if (this.stats.priceHistory.length > 0) {
      this.stats.averagePrice = this.stats.priceHistory
        .slice(-100)
        .reduce((a, b) => a + b.price, 0) / Math.min(100, this.stats.priceHistory.length);
    }

    return {
      summary: `${priced} devis générés | Prix moy: ${Math.round(this.stats.averagePrice)}€`,
      priced,
      averagePrice: this.stats.averagePrice
    };
  }

  /**
   * Génère un devis complet pour une mission
   */
  async generateQuote(mission, state) {
    const distance = mission.distance || await this.calculateDistance(mission.pickup, mission.delivery);
    const vehicleType = mission.vehicleType || 'PL';
    const market = state?.marketConditions || {};

    // 1. Coût de base CNR
    const cnr = this.config.baseCNR[vehicleType] || this.config.baseCNR['PL'];
    const baseCostKm = cnr.CK * distance;
    
    // 2. Coût conducteur
    const estimatedHours = distance / cnr.avgSpeed;
    const driverCost = cnr.CC * estimatedHours;
    
    // 3. Coût journalier (si mission > 8h)
    const days = Math.ceil(estimatedHours / 8);
    const dailyCost = cnr.CJ * (days > 1 ? days : 0);

    // 4. Coût de base total
    const baseCost = baseCostKm + driverCost + dailyCost;

    // 5. Ajustements dynamiques
    const adjustments = this.calculateAdjustments(mission, market);

    // 6. Prix après ajustements
    const adjustedCost = baseCost * adjustments.total;

    // 7. Marge plateforme
    const margin = this.calculateDynamicMargin(market);
    const finalPrice = adjustedCost / (1 - margin);

    // 8. Prix arrondi
    const roundedPrice = Math.ceil(finalPrice / 10) * 10;

    return {
      finalPrice: roundedPrice,
      breakdown: {
        distance,
        baseCostKm: Math.round(baseCostKm),
        driverCost: Math.round(driverCost),
        dailyCost: Math.round(dailyCost),
        baseCost: Math.round(baseCost),
        adjustments: {
          fuel: adjustments.fuel,
          demand: adjustments.demand,
          traffic: adjustments.traffic,
          weather: adjustments.weather,
          urgency: adjustments.urgency,
          total: adjustments.total
        },
        adjustedCost: Math.round(adjustedCost),
        margin: margin,
        platformFee: Math.round(roundedPrice * margin),
        transporterEarnings: Math.round(roundedPrice * (1 - margin))
      },
      competitiveRange: {
        min: Math.round(roundedPrice * 0.85),
        max: Math.round(roundedPrice * 1.15)
      },
      confidence: this.calculateConfidence(mission, adjustments)
    };
  }

  /**
   * Calcule les ajustements dynamiques
   */
  calculateAdjustments(mission, market) {
    let total = 1;
    const adjustments = {};

    // Ajustement carburant (référence: 1.80€/L)
    const fuelRef = 1.80;
    const currentFuel = market.fuelPrice?.diesel || 1.85;
    adjustments.fuel = 1 + (currentFuel - fuelRef) / fuelRef * 0.3;
    total *= adjustments.fuel;

    // Ajustement demande (0.5 = normal)
    const demandIndex = market.demandIndex || 0.5;
    adjustments.demand = 1 + (demandIndex - 0.5) * 0.2;
    total *= adjustments.demand;

    // Ajustement trafic
    const trafficIndex = market.trafficIndex || 0.3;
    adjustments.traffic = 1 + trafficIndex * 0.1;
    total *= adjustments.traffic;

    // Ajustement météo (alertes)
    const weatherAlerts = market.weatherAlerts?.length || 0;
    adjustments.weather = 1 + weatherAlerts * 0.05;
    total *= adjustments.weather;

    // Ajustement urgence
    if (mission.urgent) {
      adjustments.urgency = 1.25;
      total *= adjustments.urgency;
    } else {
      adjustments.urgency = 1;
    }

    adjustments.total = total;
    return adjustments;
  }

  /**
   * Calcule la marge dynamique
   */
  calculateDynamicMargin(market) {
    let margin = this.config.platformFee;

    // Plus de marge si forte demande
    const demandIndex = market.demandIndex || 0.5;
    if (demandIndex > 0.7) {
      margin += 0.02;
    }

    // Moins de marge si faible demande
    if (demandIndex < 0.3) {
      margin -= 0.02;
    }

    // Respecter les limites
    return Math.max(this.config.minMargin, Math.min(this.config.maxMargin, margin));
  }

  /**
   * Calcule le niveau de confiance du devis
   */
  calculateConfidence(mission, adjustments) {
    let confidence = 0.9;

    // Moins de confiance si beaucoup d'ajustements
    if (adjustments.total > 1.2 || adjustments.total < 0.9) {
      confidence -= 0.1;
    }

    // Moins de confiance si données manquantes
    if (!mission.distance) confidence -= 0.1;
    if (!mission.vehicleType) confidence -= 0.05;

    return Math.max(0.5, confidence);
  }

  /**
   * Met à jour les coefficients marché
   */
  async updateMarketCoefficients(market) {
    // Ici on pourrait appeler des APIs externes
    // pour avoir les vrais prix du marché
  }

  /**
   * Calcule la distance entre deux points
   */
  async calculateDistance(pickup, delivery) {
    if (!pickup || !delivery) return 100; // Défaut

    // Haversine
    const R = 6371;
    const dLat = (delivery.lat - pickup.lat) * Math.PI / 180;
    const dLng = (delivery.lng - pickup.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(pickup.lat * Math.PI / 180) * Math.cos(delivery.lat * Math.PI / 180) *
              Math.sin(dLng/2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    // Ajouter 20% pour les routes réelles vs vol d'oiseau
    return Math.round(distance * 1.2);
  }

  /**
   * Données CNR de référence par type de véhicule
   */
  getDefaultCNR() {
    return {
      // Véhicule Léger (< 3.5T)
      'VL': {
        CK: 0.45,  // €/km
        CC: 22,    // €/heure conducteur
        CJ: 180,   // €/jour véhicule
        avgSpeed: 70
      },
      // Poids Lourd (7.5T - 19T)
      'PL': {
        CK: 1.20,
        CC: 25,
        CJ: 280,
        avgSpeed: 65
      },
      // Super Poids Lourd (> 19T)
      'SPL': {
        CK: 1.45,
        CC: 28,
        CJ: 350,
        avgSpeed: 60
      },
      // Frigorifique
      'Frigo': {
        CK: 1.60,
        CC: 28,
        CJ: 400,
        avgSpeed: 60
      },
      // Benne
      'Benne': {
        CK: 1.35,
        CC: 26,
        CJ: 320,
        avgSpeed: 55
      },
      // Citerne
      'Citerne': {
        CK: 1.70,
        CC: 30,
        CJ: 420,
        avgSpeed: 55
      }
    };
  }

  /**
   * Obtient un devis rapide (API)
   */
  async getQuickQuote(params) {
    const mission = {
      pickup: params.pickup,
      delivery: params.delivery,
      vehicleType: params.vehicleType || 'PL',
      distance: params.distance,
      urgent: params.urgent || false
    };

    return await this.generateQuote(mission, { marketConditions: {} });
  }

  getStats() {
    return this.stats;
  }
}

module.exports = { PricingAgent };
