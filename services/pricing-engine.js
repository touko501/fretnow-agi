/**
 * 💰 PRICING ENGINE — Dynamic Pricing for Freight Marketplace
 *
 * Mission: Compute optimal prices based on CNR + market conditions
 * Inspiration: Greenscreens.ai dynamic pricing, Transfix lane pricing
 *
 * Key Features:
 * - Base cost calculation from vehicle CNR data
 * - Dynamic adjustments (demand, urgency, seasonality, weather)
 * - Commission strategy (standard, express, international)
 * - Market rate comparison and confidence scoring
 * - Full integration with routing service
 *
 * Last updated: 15/03/2026
 */

const routing = require('./routing');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cost per kilometer (€) by vehicle type
 * CNR reference data 2026
 */
const COST_PER_KM = {
  FOURGON_3T5: 0.45,
  FOURGON_12M3: 0.50,
  FOURGON_20M3: 0.55,
  PORTEUR_7T5: 0.95,
  PORTEUR_12T: 1.20,
  PORTEUR_19T: 1.35,
  SEMI_TAUTLINER: 1.50,
  SEMI_FRIGO: 1.65,
  SEMI_BACHE: 1.45,
  SEMI_BENNE: 1.55,
  SEMI_CITERNE: 1.60,
  SEMI_PLATEAU: 1.48,
  SEMI_PORTE_CONTENEUR: 1.70,
  MEGA_TRAILER: 1.85
};

/**
 * Driver hourly cost (€) by vehicle type
 */
const DRIVER_COST_PER_HOUR = {
  FOURGON_3T5: 22,
  FOURGON_12M3: 23,
  FOURGON_20M3: 24,
  PORTEUR_7T5: 25,
  PORTEUR_12T: 27,
  PORTEUR_19T: 28,
  SEMI_TAUTLINER: 30,
  SEMI_FRIGO: 32,
  SEMI_BACHE: 30,
  SEMI_BENNE: 31,
  SEMI_CITERNE: 32,
  SEMI_PLATEAU: 30,
  SEMI_PORTE_CONTENEUR: 33,
  MEGA_TRAILER: 35
};

/**
 * Daily vehicle costs (€) by type
 */
const DAILY_VEHICLE_COST = {
  FOURGON_3T5: 180,
  FOURGON_12M3: 220,
  FOURGON_20M3: 250,
  PORTEUR_7T5: 280,
  PORTEUR_12T: 320,
  PORTEUR_19T: 350,
  SEMI_TAUTLINER: 400,
  SEMI_FRIGO: 450,
  SEMI_BACHE: 400,
  SEMI_BENNE: 420,
  SEMI_CITERNE: 460,
  SEMI_PLATEAU: 390,
  SEMI_PORTE_CONTENEUR: 480,
  MEGA_TRAILER: 520
};

/**
 * Average speed (km/h) by vehicle type for duration estimation
 */
const AVERAGE_SPEED = {
  FOURGON_3T5: 75,
  FOURGON_12M3: 70,
  FOURGON_20M3: 68,
  PORTEUR_7T5: 65,
  PORTEUR_12T: 63,
  PORTEUR_19T: 60,
  SEMI_TAUTLINER: 62,
  SEMI_FRIGO: 60,
  SEMI_BACHE: 62,
  SEMI_BENNE: 55,
  SEMI_CITERNE: 58,
  SEMI_PLATEAU: 63,
  SEMI_PORTE_CONTENEUR: 60,
  MEGA_TRAILER: 58
};

/**
 * Commission rates by mission type
 */
const COMMISSION_RATES = {
  STANDARD: 0.10,      // 10%
  EXPRESS: 0.18,       // 18% (avg of 15-20%)
  INTERNATIONAL: 0.225, // 22.5% (avg of 20-25%)
  FRAGILE: 0.15,       // 15%
  HAZMAT: 0.20         // 20%
};

/**
 * Peak months for freight (higher demand)
 */
const PEAK_MONTHS = [8, 11, 12]; // September, November, December

// ═══════════════════════════════════════════════════════════════════════════
// PRICING ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class PricingEngine {
  /**
   * Initialize the pricing engine with Prisma client
   * @param {Object} prisma - Prisma client instance
   * @param {Object} options - Configuration options
   */
  constructor(prisma, options = {}) {
    if (!prisma) {
      throw new Error('Prisma client is required');
    }

    this.prisma = prisma;
    this.baseFuelPrice = options.baseFuelPrice || 1.85; // €/L reference
    this.platformFeeDefault = options.platformFeeDefault || 0.08; // 8% default
    this.minPriceThreshold = options.minPriceThreshold || 50; // €50 minimum
    this.maxPriceThreshold = options.maxPriceThreshold || 50000; // €50k maximum
    this.cache = new Map();
    this.cacheTimeout = 60 * 1000; // 1 minute for market rates

    this.stats = {
      pricesCalculated: 0,
      averagePrice: 0,
      averageConfidence: 0,
      priceHistory: []
    };
  }

  /**
   * Calculate complete price for a mission
   * @param {Object} mission - Mission with pickup, delivery, vehicle, etc.
   * @param {Object} options - { carrierAverageRate, demandMultiplier, fuelPrice }
   * @returns {Promise<Object>} Complete pricing breakdown
   */
  async calculatePrice(mission, options = {}) {
    try {
      // Validate mission
      if (!mission.pickupLatitude || !mission.deliveryLatitude) {
        throw new Error('Mission must have pickup and delivery coordinates');
      }

      if (!mission.vehicleType) {
        throw new Error('Mission must specify vehicleType');
      }

      // Get route information
      const route = await routing.getRoute(
        { lat: mission.pickupLatitude, lon: mission.pickupLongitude },
        { lat: mission.deliveryLatitude, lon: mission.deliveryLongitude }
      );

      const distanceKm = route.distance_km;
      const durationMinutes = route.duration_min;

      // Get fuel cost estimate
      const fuelPrice = options.fuelPrice || this.baseFuelPrice;
      const fuelCost = routing.estimateFuelCost(
        distanceKm,
        mission.vehicleType,
        mission.fuelType || 'DIESEL_B7',
        fuelPrice
      );

      // Get tolls estimate
      const tollsCost = routing.estimateTolls(distanceKm, mission.vehicleType);

      // Phase 1: Calculate base cost
      const baseCost = this._calculateBaseCost(distanceKm, durationMinutes, mission.vehicleType);

      // Phase 2: Calculate adjustments
      const adjustments = await this._calculateAdjustments(mission, options);

      // Phase 3: Apply adjustments to base cost
      const adjustedCost = baseCost * adjustments.totalMultiplier;

      // Phase 4: Calculate commission
      const missionType = mission.missionType || 'STANDARD';
      const commissionPercent = COMMISSION_RATES[missionType] || COMMISSION_RATES.STANDARD;

      // Phase 5: Calculate prices (HT = before tax, TTC = after tax)
      const costBeforeTax = adjustedCost + fuelCost + tollsCost;
      const transporteurCostBefore = costBeforeTax;

      // Pricing formula: What do we charge the shipper?
      // We need to cover transporter cost + our margin
      const platformFee = options.platformFee || this.platformFeeDefault;
      const priceHt = costBeforeTax / (1 - platformFee);

      // Add VAT (20% in France)
      const vatRate = 0.20;
      const priceTtc = Math.round(priceHt * (1 + vatRate) * 100) / 100;

      // What the transporter receives
      const transporteurCents = Math.round(costBeforeTax * 100);
      const platformFeeCents = Math.round(priceTtc * platformFee * 100);

      // Commission is separate from platform fee
      const commissionCents = Math.round(priceTtc * commissionPercent * 100);

      // Confidence score
      const confidence = this._calculateConfidence(mission, route, adjustments);

      // Market comparison
      const marketRate = await this._getMarketRate(mission.pickupCityId, mission.deliveryCityId, mission.vehicleType);
      const marketComparison = this._compareToMarket(priceTtc, marketRate);

      // Update stats
      this.stats.pricesCalculated++;
      this.stats.averagePrice = (this.stats.averagePrice * (this.stats.pricesCalculated - 1) + priceTtc) /
        this.stats.pricesCalculated;
      this.stats.averageConfidence = (this.stats.averageConfidence * (this.stats.pricesCalculated - 1) + confidence) /
        this.stats.pricesCalculated;

      this.stats.priceHistory.push({
        price: priceTtc,
        confidence,
        timestamp: new Date()
      });

      return {
        priceHtCents: Math.round(priceHt * 100),
        priceTtcCents: Math.round(priceTtc * 100),
        priceHtEur: Math.round(priceHt * 100) / 100,
        priceTtcEur: Math.round(priceTtc * 100) / 100,
        commissionPercent: Math.round(commissionPercent * 100),
        commissionCents,
        commissionEur: commissionCents / 100,
        platformFee: Math.round(platformFee * 100),
        platformFeeCents,
        platformFeeEur: platformFeeCents / 100,
        transporteurCents,
        transporteurEur: transporteurCents / 100,
        breakdown: {
          baseCost: Math.round(baseCost * 100) / 100,
          fuelCost: Math.round(fuelCost * 100) / 100,
          tollsCost: Math.round(tollsCost * 100) / 100,
          costSubtotal: Math.round(costBeforeTax * 100) / 100,
          costBreakdown: {
            costPerKm: COST_PER_KM[mission.vehicleType],
            driverCostPerHour: DRIVER_COST_PER_HOUR[mission.vehicleType],
            durationHours: Math.round((durationMinutes / 60) * 100) / 100,
            distanceKm
          }
        },
        adjustments: {
          demand: Math.round(adjustments.demand * 100) / 100,
          urgency: Math.round(adjustments.urgency * 100) / 100,
          seasonality: Math.round(adjustments.seasonality * 100) / 100,
          dayOfWeek: Math.round(adjustments.dayOfWeek * 100) / 100,
          weather: Math.round(adjustments.weather * 100) / 100,
          returnTrip: Math.round(adjustments.returnTrip * 100) / 100,
          eco: Math.round(adjustments.eco * 100) / 100,
          totalAdjustmentPercent: Math.round((adjustments.totalMultiplier - 1) * 100)
        },
        confidence: Math.round(confidence * 100),
        marketComparison,
        route: {
          distanceKm,
          durationMinutes,
          durationHours: Math.round((durationMinutes / 60) * 100) / 100
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating price:', error.message);
      throw error;
    }
  }

  /**
   * Calculate base cost from CNR data
   * @private
   */
  _calculateBaseCost(distanceKm, durationMinutes, vehicleType) {
    const costPerKm = COST_PER_KM[vehicleType] || COST_PER_KM.PORTEUR_12T;
    const driverCostPerHour = DRIVER_COST_PER_HOUR[vehicleType] || DRIVER_COST_PER_HOUR.PORTEUR_12T;
    const dailyVehicleCost = DAILY_VEHICLE_COST[vehicleType] || DAILY_VEHICLE_COST.PORTEUR_12T;

    const kmCost = distanceKm * costPerKm;
    const durationHours = durationMinutes / 60;
    const driverCost = durationHours * driverCostPerHour;

    // Daily cost applies after 8 hours
    const numDays = Math.max(0, Math.ceil((durationHours - 8) / 24));
    const vehicleDailyCost = numDays > 0 ? numDays * dailyVehicleCost : 0;

    const maintenance = distanceKm * 0.07; // €0.07 per km for wear & tear

    return kmCost + driverCost + vehicleDailyCost + maintenance;
  }

  /**
   * Calculate dynamic adjustments to base cost
   * @private
   */
  async _calculateAdjustments(mission, options = {}) {
    const adjustments = {
      demand: 1.0,
      urgency: 1.0,
      seasonality: 1.0,
      dayOfWeek: 1.0,
      weather: 1.0,
      returnTrip: 1.0,
      eco: 1.0
    };

    // 1. Demand multiplier
    if (options.demandMultiplier) {
      adjustments.demand = Math.max(0.8, Math.min(1.5, options.demandMultiplier));
    }

    // 2. Urgency adjustment
    if (mission.urgencyType === 'EXPRESS') {
      adjustments.urgency = 1.30; // +30%
    } else if (mission.urgencyType === 'STANDARD_PLUS') {
      adjustments.urgency = 1.15; // +15%
    } else if (mission.urgencyType === 'PLANNED') {
      adjustments.urgency = 0.95; // -5% (discount for planned)
    }

    // 3. Seasonality
    const month = new Date(mission.pickupDate || Date.now()).getMonth();
    if (PEAK_MONTHS.includes(month + 1)) {
      adjustments.seasonality = 1.08; // +8% in peak months
    } else {
      adjustments.seasonality = 0.98; // -2% in off-peak
    }

    // 4. Day of week
    const dayOfWeek = new Date(mission.pickupDate || Date.now()).getDay();
    if (dayOfWeek === 5 || dayOfWeek === 1) { // Friday or Monday
      adjustments.dayOfWeek = 1.05; // +5%
    }

    // 5. Weather impact
    if (options.weatherAlert) {
      const alerts = Array.isArray(options.weatherAlert) ? options.weatherAlert : [options.weatherAlert];
      adjustments.weather = 1 + (alerts.length * 0.10); // +10% per alert
    }

    // 6. Return trip discount
    if (mission.isReturnTrip) {
      adjustments.returnTrip = 0.85; // -15% discount
    }

    // 7. Eco vehicle discount
    if (mission.ecoVehicle || mission.fuelType?.includes('HVO') || mission.fuelType?.includes('ELECTRIQUE')) {
      adjustments.eco = 0.95; // -5% discount for green vehicles
    }

    // Calculate total multiplier
    adjustments.totalMultiplier =
      adjustments.demand *
      adjustments.urgency *
      adjustments.seasonality *
      adjustments.dayOfWeek *
      adjustments.weather *
      adjustments.returnTrip *
      adjustments.eco;

    return adjustments;
  }

  /**
   * Get historical market rate for a lane
   * @private
   */
  async _getMarketRate(pickupCityId, deliveryCityId, vehicleType) {
    try {
      // Check cache first
      const cacheKey = `market_${pickupCityId}_${deliveryCityId}_${vehicleType}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.rate;
      }

      // Query historical missions for this lane
      const recentMissions = await this.prisma.mission.findMany({
        where: {
          pickupCityId,
          deliveryCityId,
          vehicleType,
          status: 'COMPLETED',
          finalPrice: {
            not: null
          }
        },
        orderBy: {
          deliveryDate: 'desc'
        },
        take: 50 // Last 50 completed missions
      });

      if (recentMissions.length === 0) {
        return null;
      }

      const avgPrice = recentMissions.reduce((sum, m) => sum + m.finalPrice, 0) / recentMissions.length;
      const minPrice = Math.min(...recentMissions.map(m => m.finalPrice));
      const maxPrice = Math.max(...recentMissions.map(m => m.finalPrice));

      const rate = {
        average: Math.round(avgPrice * 100) / 100,
        min: Math.round(minPrice * 100) / 100,
        max: Math.round(maxPrice * 100) / 100,
        count: recentMissions.length,
        sampleSize: recentMissions.length
      };

      // Cache the result
      this.cache.set(cacheKey, { rate, timestamp: Date.now() });

      return rate;
    } catch (error) {
      console.warn('Error getting market rate:', error.message);
      return null;
    }
  }

  /**
   * Get market rate for a lane (public method)
   * @param {string} pickupCityId
   * @param {string} deliveryCityId
   * @param {string} vehicleType
   * @returns {Promise<Object>} Market rate statistics
   */
  async getMarketRate(pickupCityId, deliveryCityId, vehicleType) {
    return this._getMarketRate(pickupCityId, deliveryCityId, vehicleType);
  }

  /**
   * Get demand multiplier for a lane
   * Based on current missions vs available carriers
   * @param {string} pickupCityId
   * @param {string} deliveryCityId
   * @returns {Promise<number>} Multiplier (0.8-1.5)
   */
  async getDemandMultiplier(pickupCityId, deliveryCityId) {
    try {
      // Count open missions on this lane
      const openMissions = await this.prisma.mission.count({
        where: {
          pickupCityId,
          deliveryCityId,
          status: 'PUBLISHED',
          confirmedCarrierId: null
        }
      });

      // Count available carriers
      const availableCarriers = await this.prisma.carrier.count({
        where: {
          status: 'active'
        }
      });

      if (availableCarriers === 0) {
        return 1.5; // High demand, no supply
      }

      const demandRatio = openMissions / availableCarriers;

      // Map demand ratio to multiplier
      if (demandRatio > 2) return 1.4;
      if (demandRatio > 1.5) return 1.3;
      if (demandRatio > 1.0) return 1.15;
      if (demandRatio > 0.5) return 1.0;
      if (demandRatio > 0.2) return 0.9;
      return 0.8;
    } catch (error) {
      console.warn('Error calculating demand multiplier:', error.message);
      return 1.0; // Default: no adjustment
    }
  }

  /**
   * Get urgency multiplier
   * @param {string} missionType - STANDARD, EXPRESS, PLANNED
   * @param {string} slaType - SAME_DAY, NEXT_DAY, etc.
   * @returns {number} Urgency multiplier
   */
  getUrgencyMultiplier(missionType, slaType) {
    const urgencyMap = {
      EXPRESS: 1.40,
      SAME_DAY: 1.40,
      NEXT_DAY: 1.20,
      STANDARD_PLUS: 1.15,
      STANDARD: 1.0,
      PLANNED: 0.95
    };

    return urgencyMap[missionType || 'STANDARD'] || 1.0;
  }

  /**
   * Get seasonality multiplier
   * @param {Date} date
   * @returns {number} Seasonality multiplier
   */
  getSeasonalityMultiplier(date) {
    const month = date.getMonth() + 1;
    if (PEAK_MONTHS.includes(month)) {
      return 1.08;
    }
    return 0.98;
  }

  /**
   * Get day of week multiplier
   * @param {Date} date
   * @returns {number} Day of week multiplier
   */
  getDayOfWeekMultiplier(date) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 1) { // Friday or Monday
      return 1.05;
    }
    return 1.0;
  }

  /**
   * Calculate confidence in the price
   * @private
   */
  _calculateConfidence(mission, route, adjustments) {
    let confidence = 0.9; // Start at 90%

    // Reduce confidence for high adjustment factors
    const totalAdjustment = adjustments.totalMultiplier;
    if (totalAdjustment > 1.3 || totalAdjustment < 0.85) {
      confidence -= 0.15; // High uncertainty with extreme adjustments
    }

    // Reduce confidence if missing data
    if (!mission.vehicleType) {
      confidence -= 0.15;
    }
    if (!mission.pickupDate) {
      confidence -= 0.10;
    }

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  /**
   * Compare price to market average
   * @private
   */
  _compareToMarket(ourPrice, marketRate) {
    if (!marketRate || !marketRate.average) {
      return {
        comparison: 'INSUFFICIENT_DATA',
        percentageVsAverage: null,
        position: 'UNKNOWN'
      };
    }

    const percentageDiff = ((ourPrice - marketRate.average) / marketRate.average) * 100;

    let position = 'MARKET_RATE';
    if (percentageDiff < -15) position = 'HIGHLY_COMPETITIVE';
    else if (percentageDiff < -5) position = 'COMPETITIVE';
    else if (percentageDiff > 15) position = 'EXPENSIVE';
    else if (percentageDiff > 5) position = 'PREMIUM';

    return {
      comparison: `${percentageDiff > 0 ? '+' : ''}${Math.round(percentageDiff)}% vs market average`,
      percentageVsAverage: Math.round(percentageDiff),
      position,
      marketAverage: marketRate.average,
      marketMin: marketRate.min,
      marketMax: marketRate.max
    };
  }

  /**
   * Get pricing engine statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const recentPrices = this.stats.priceHistory.slice(-100);
    const avgPrice = recentPrices.length > 0
      ? recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length
      : 0;

    return {
      pricesCalculated: this.stats.pricesCalculated,
      averagePriceEur: Math.round(avgPrice * 100) / 100,
      averageConfidence: Math.round(this.stats.averageConfidence * 100),
      cacheSize: this.cache.size,
      recentPrices: recentPrices.slice(-10).map(p => ({
        price: p.price,
        confidence: Math.round(p.confidence * 100),
        timestamp: p.timestamp
      }))
    };
  }

  /**
   * Clear cache (for testing)
   */
  clearCache() {
    this.cache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = { PricingEngine };
