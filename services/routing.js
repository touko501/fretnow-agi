/**
 * 🗺️ ROUTING SERVICE — Calcul d'itinéraires et géocodage
 *
 * Moteurs intégrés:
 * - OSRM (Open Source Routing Machine) — moteur principal
 * - GraphHopper — fallback et optimisation multi-stops
 * - API Adresse (BAN) — géocodage français + reverse
 *
 * Fonctionnalités:
 * - Calcul d'itinéraires avec estimation des coûts
 * - Matrice de distances pour l'algorithme de matching
 * - Snap-to-road pour les coordonnées imprécises
 * - Estimation péages français par catégorie
 * - Cache 15min avec fallback gracieux
 *
 * Dernière mise à jour: 15/03/2026
 */

const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Consommation carburant (L/100km) par type de véhicule
 * Basé sur Prisma VehicleType enum
 */
const FUEL_CONSUMPTION_PER_100KM = {
  FOURGON_3T5: 7.5,
  FOURGON_12M3: 8.2,
  FOURGON_20M3: 8.8,
  PORTEUR_7T5: 8.5,
  PORTEUR_12T: 9.5,
  PORTEUR_19T: 10.5,
  SEMI_TAUTLINER: 11.2,
  SEMI_FRIGO: 11.5,
  SEMI_BACHE: 10.8,
  SEMI_BENNE: 11.0,
  SEMI_CITERNE: 10.6,
  SEMI_PLATEAU: 10.5,
  SEMI_PORTE_CONTENEUR: 11.8,
  MEGA_TRAILER: 12.2
};

/**
 * Tarifs péages français (€/km) par catégorie
 * Source: Vinci Autoroutes, Sanef, ASF 2026
 */
const TOLL_RATES_PER_KM = {
  VL: 0.0125,        // Voiture légère
  FOURGON: 0.0185,   // Fourgonnette
  PORTEUR: 0.0285,   // Porteur
  SEMI: 0.0385       // Semi-remorque
};

/**
 * Taux de TVA
 */
const VAT_RATE = 0.20;

class RoutingService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes

    this.endpoints = {
      osrm: {
        base: 'https://router.project-osrm.org',
        route: '/route/v1/driving',
        table: '/table/v1/driving',
        nearest: '/nearest/v1/driving'
      },
      graphhopper: {
        base: 'https://graphhopper.com/api/1'
      },
      address: {
        search: 'https://api-adresse.data.gouv.fr/search',
        reverse: 'https://api-adresse.data.gouv.fr/reverse'
      }
    };

    this.graphhopperApiKey = process.env.GRAPHHOPPER_API_KEY || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Wrapper cache avec fallback gracieux
   */
  async cached(key, fetchFn, timeout = this.cacheTimeout) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < timeout) {
      return cached.data;
    }

    try {
      const data = await fetchFn();
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      // Retourner le cache expiré en cas d'erreur
      if (cached) {
        console.warn(`Cache fallback pour ${key}:`, error.message);
        return cached.data;
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE ROUTING METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcule un itinéraire simple (point A → point B)
   * @param {Object} origin - { lat, lon }
   * @param {Object} destination - { lat, lon }
   * @param {Object} options - { alternatives, geometries, annotations }
   * @returns {Promise<Object>} - { distance_km, duration_min, polyline, routes }
   */
  async getRoute(origin, destination, options = {}) {
    if (!origin?.lat || !origin?.lon || !destination?.lat || !destination?.lon) {
      throw new Error('Origin et destination doivent avoir lat/lon');
    }

    const cacheKey = `route_${origin.lat}_${origin.lon}_${destination.lat}_${destination.lon}`;

    return this.cached(cacheKey, async () => {
      try {
        // Format coords pour OSRM: lon,lat (inverse de lat,lon)
        const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
        const url = `${this.endpoints.osrm.base}${this.endpoints.osrm.route}/${coords}`;

        const params = {
          steps: true,
          annotations: ['duration', 'distance', 'speed'],
          geometries: 'geojson',
          overview: 'full',
          continue_straight: false
        };

        if (options.alternatives !== false) {
          params.alternatives = true;
        }

        const response = await axios.get(url, { params, timeout: 10000 });

        if (!response.data.routes || response.data.routes.length === 0) {
          throw new Error('Aucune route trouvée');
        }

        const bestRoute = response.data.routes[0];
        const distanceKm = Math.round((bestRoute.distance / 1000) * 100) / 100;
        const durationMinutes = Math.round(bestRoute.duration / 60);

        return {
          success: true,
          distance_km: distanceKm,
          duration_min: durationMinutes,
          polyline: bestRoute.geometry,
          legs: bestRoute.legs,
          alternativeRoutes: response.data.routes.slice(1).map(r => ({
            distance_km: Math.round((r.distance / 1000) * 100) / 100,
            duration_min: Math.round(r.duration / 60)
          })),
          provider: 'OSRM',
          timestamp: new Date().toISOString()
        };
      } catch (osrmError) {
        console.warn('Erreur OSRM:', osrmError.message);
        return this._fallbackToGraphHopper(origin, destination, options);
      }
    });
  }

  /**
   * Calcule un itinéraire multi-stops avec optimisation
   * @param {Array} waypoints - [{ lat, lon }, ...]
   * @param {Object} options - { optimize, locale }
   * @returns {Promise<Object>} - { total_distance_km, total_duration_min, waypoints, routes }
   */
  async getRouteWithWaypoints(waypoints, options = {}) {
    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      throw new Error('Au moins 2 waypoints requis');
    }

    const cacheKey = `multi_route_${waypoints.map(w => `${w.lat}_${w.lon}`).join('_')}`;

    return this.cached(cacheKey, async () => {
      try {
        // Utiliser GraphHopper pour l'optimisation multi-stops
        if (this.graphhopperApiKey) {
          return await this._graphhopperOptimization(waypoints, options);
        }

        // Fallback: itinéraires séquentiels avec OSRM
        console.info('GraphHopper non disponible, utilisation itinéraires séquentiels');
        let totalDistance = 0;
        let totalDuration = 0;
        const routes = [];

        for (let i = 0; i < waypoints.length - 1; i++) {
          const route = await this.getRoute(waypoints[i], waypoints[i + 1], {
            alternatives: false
          });
          totalDistance += route.distance_km;
          totalDuration += route.duration_min;
          routes.push(route);
        }

        return {
          success: true,
          total_distance_km: Math.round(totalDistance * 100) / 100,
          total_duration_min: totalDuration,
          waypoints_count: waypoints.length,
          routes,
          optimized: false,
          provider: 'OSRM',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Erreur calcul multi-stops:', error.message);
        throw error;
      }
    });
  }

  /**
   * Calcule une matrice de distances/durées
   * Utile pour l'algorithme de matching
   * @param {Array} origins - [{ lat, lon }, ...]
   * @param {Array} destinations - [{ lat, lon }, ...]
   * @returns {Promise<Object>} - { durations, distances, sources, destinations }
   */
  async getDistanceMatrix(origins, destinations) {
    if (!Array.isArray(origins) || !Array.isArray(destinations)) {
      throw new Error('Origins et destinations doivent être des tableaux');
    }

    const cacheKey = `matrix_${origins.length}_${destinations.length}`;

    return this.cached(cacheKey, async () => {
      try {
        // Format coords pour OSRM
        const coords = [
          ...origins.map(o => `${o.lon},${o.lat}`),
          ...destinations.map(d => `${d.lon},${d.lat}`)
        ].join(';');

        const url = `${this.endpoints.osrm.base}${this.endpoints.osrm.table}/${coords}`;

        const response = await axios.get(url, {
          params: {
            annotations: ['distance', 'duration']
          },
          timeout: 15000
        });

        return {
          success: true,
          durations: response.data.durations, // minutes
          distances: response.data.distances, // km
          sources: response.data.sources,
          destinations: response.data.destinations,
          provider: 'OSRM',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Erreur matrice distances:', error.message);
        throw error;
      }
    });
  }

  /**
   * Snaps coordonnée imprécise au point de route le plus proche
   * Utile pour les coordinates GPS imprécises
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<Object>} - { lat, lon, matchedPoint }
   */
  async snapToRoad(lat, lon) {
    const cacheKey = `snap_${lat}_${lon}`;

    return this.cached(cacheKey, async () => {
      try {
        const url = `${this.endpoints.osrm.base}${this.endpoints.osrm.nearest}/${lon},${lat}`;

        const response = await axios.get(url, {
          params: { number: 1 },
          timeout: 5000
        });

        if (!response.data.waypoints || response.data.waypoints.length === 0) {
          return {
            lat,
            lon,
            snapped: false,
            message: 'Aucun point de route trouvé'
          };
        }

        const matched = response.data.waypoints[0];

        return {
          lat: matched.location[1],
          lon: matched.location[0],
          snapped: true,
          distance: matched.distance,
          name: matched.name,
          provider: 'OSRM',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.warn('Erreur snap-to-road:', error.message);
        return {
          lat,
          lon,
          snapped: false,
          error: error.message
        };
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GEOCODING METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Géocode une adresse française
   * @param {string} address
   * @param {Object} options - { limit, type }
   * @returns {Promise<Object>} - { lat, lon, label, city, postcode, ...}
   */
  async geocode(address, options = {}) {
    const cacheKey = `geocode_${address}`;

    return this.cached(cacheKey, async () => {
      try {
        const response = await axios.get(this.endpoints.address.search, {
          params: {
            q: address,
            limit: options.limit || 1,
            type: options.type || 'housenumber'
          },
          timeout: 5000
        });

        if (!response.data.features || response.data.features.length === 0) {
          return null;
        }

        const feature = response.data.features[0];
        const props = feature.properties;

        return {
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          label: props.label,
          street: props.name,
          city: props.city,
          postcode: props.postcode,
          context: props.context,
          score: props.score,
          type: props.type,
          importance: props.importance,
          provider: 'BAN',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Erreur géocodage:', error.message);
        return null;
      }
    }, 60 * 1000); // Cache 1 minute
  }

  /**
   * Géocodage inverse: adresse depuis lat/lon
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<Object>} - { label, street, city, postcode, ... }
   */
  async reverseGeocode(lat, lon) {
    const cacheKey = `reverse_${lat}_${lon}`;

    return this.cached(cacheKey, async () => {
      try {
        const response = await axios.get(this.endpoints.address.reverse, {
          params: {
            lon,
            lat,
            limit: 1
          },
          timeout: 5000
        });

        if (!response.data.features || response.data.features.length === 0) {
          return null;
        }

        const feature = response.data.features[0];
        const props = feature.properties;

        return {
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          label: props.label,
          street: props.name,
          city: props.city,
          postcode: props.postcode,
          context: props.context,
          type: props.type,
          provider: 'BAN',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Erreur reverse géocodage:', error.message);
        return null;
      }
    }, 60 * 1000); // Cache 1 minute
  }

  /**
   * Autocomplete d'adresse pour champs de formulaire
   * @param {string} query
   * @param {number} limit
   * @returns {Promise<Array>} - [{ label, lat, lon, ... }]
   */
  async autocomplete(query, limit = 5) {
    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = `autocomplete_${query}_${limit}`;

    return this.cached(cacheKey, async () => {
      try {
        const response = await axios.get(this.endpoints.address.search, {
          params: {
            q: query,
            limit,
            type: 'housenumber'
          },
          timeout: 3000
        });

        return (response.data.features || []).map(f => ({
          label: f.properties.label,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          street: f.properties.name,
          city: f.properties.city,
          postcode: f.properties.postcode,
          score: f.properties.score,
          type: f.properties.type
        }));
      } catch (error) {
        console.error('Erreur autocomplete:', error.message);
        return [];
      }
    }, 30 * 1000); // Cache 30 sec
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COST ESTIMATION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Estime le coût carburant
   * @param {number} distanceKm
   * @param {string} fuelType - DIESEL_B7, HVO100, etc
   * @param {number} fuelPricePerLiter
   * @returns {number} coût en EUR
   */
  estimateFuelCost(distanceKm, vehicleType, fuelType = 'DIESEL_B7', fuelPricePerLiter = 1.85) {
    const consumption = FUEL_CONSUMPTION_PER_100KM[vehicleType] || 10;
    const litersNeeded = (distanceKm / 100) * consumption;

    // Ajustements selon type carburant
    const fuelAdjustments = {
      DIESEL_B7: 1.0,
      HVO100: 1.15,           // Surcoût carburant durable
      B100_COLZA: 1.20,
      GNL: 0.75,              // Moins cher
      BIO_GNL: 0.80,
      ELECTRIQUE: 0.15,       // Coût électricité
      HYDROGENE: 0.25
    };

    const adjustedPrice = fuelPricePerLiter * (fuelAdjustments[fuelType] || 1.0);
    return Math.round(litersNeeded * adjustedPrice * 100) / 100;
  }

  /**
   * Estime les péages français
   * @param {number} distanceKm
   * @param {string} vehicleType - FOURGON_3T5, PORTEUR_12T, etc
   * @returns {number} péage estimé en EUR
   */
  estimateTolls(distanceKm, vehicleType = 'PORTEUR_12T') {
    // Catégoriser le véhicule
    let tollCategory = 'VL';
    if (vehicleType.includes('FOURGON')) {
      tollCategory = 'FOURGON';
    } else if (vehicleType.includes('PORTEUR')) {
      tollCategory = 'PORTEUR';
    } else if (vehicleType.includes('SEMI') || vehicleType.includes('MEGA')) {
      tollCategory = 'SEMI';
    }

    const tollRate = TOLL_RATES_PER_KM[tollCategory] || TOLL_RATES_PER_KM.VL;
    return Math.round(distanceKm * tollRate * 100) / 100;
  }

  /**
   * Analyse complète des coûts d'itinéraire
   * @param {Object} origin
   * @param {Object} destination
   * @param {string} vehicleType
   * @param {string} fuelType
   * @param {Object} options - { fuelPrice }
   * @returns {Promise<Object>} breakdown complet
   */
  async getRouteCostBreakdown(origin, destination, vehicleType, fuelType = 'DIESEL_B7', options = {}) {
    const fuelPrice = options.fuelPrice || 1.85;

    try {
      const route = await this.getRoute(origin, destination);

      if (!route.success) {
        throw new Error('Impossible de calculer l\'itinéraire');
      }

      const distanceKm = route.distance_km;
      const durationMin = route.duration_min;
      const durationHours = Math.round((durationMin / 60) * 10) / 10;

      // Calculs
      const fuelCost = this.estimateFuelCost(distanceKm, vehicleType, fuelType, fuelPrice);
      const tollsCost = this.estimateTolls(distanceKm, vehicleType);

      // Usure et maintenance (€0.05 à €0.08 par km selon véhicule)
      const maintenanceCostPerKm = vehicleType.includes('SEMI') ? 0.08 : 0.06;
      const maintenanceCost = Math.round(distanceKm * maintenanceCostPerKm * 100) / 100;

      // Coûts conducteur (estimation: 28€/heure)
      const driverCostPerHour = 28.0;
      const driverCost = Math.round(durationHours * driverCostPerHour * 100) / 100;

      const subtotalHT = fuelCost + tollsCost + maintenanceCost + driverCost;
      const vat = Math.round(subtotalHT * VAT_RATE * 100) / 100;
      const totalTTC = Math.round((subtotalHT + vat) * 100) / 100;

      return {
        success: true,
        distance_km: distanceKm,
        duration_min: durationMin,
        duration_hours: durationHours,
        breakdown: {
          fuel: {
            liters_needed: Math.round((distanceKm / 100) * FUEL_CONSUMPTION_PER_100KM[vehicleType] * 10) / 10,
            price_per_liter: fuelPrice,
            fuel_type: fuelType,
            cost_eur: fuelCost
          },
          tolls: {
            distance_km: distanceKm,
            vehicle_category: this._getTollCategory(vehicleType),
            cost_eur: tollsCost
          },
          maintenance: {
            cost_per_km: maintenanceCostPerKm,
            cost_eur: maintenanceCost
          },
          driver: {
            hours: durationHours,
            cost_per_hour: driverCostPerHour,
            cost_eur: driverCost
          }
        },
        summary: {
          subtotal_ht_eur: subtotalHT,
          vat_percent: VAT_RATE * 100,
          vat_eur: vat,
          total_ttc_eur: totalTTC,
          cost_per_km: Math.round((totalTTC / distanceKm) * 100) / 100
        },
        vehicle_type: vehicleType,
        provider: route.provider,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur calcul coûts:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK & INTERNAL METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fallback vers GraphHopper quand OSRM échoue
   */
  async _fallbackToGraphHopper(origin, destination, options = {}) {
    if (!this.graphhopperApiKey) {
      console.warn('GraphHopper API key non disponible');
      throw new Error('Routage impossible: OSRM et GraphHopper indisponibles');
    }

    try {
      const url = `${this.endpoints.graphhopper.base}/route`;
      const response = await axios.get(url, {
        params: {
          points: [`${origin.lat},${origin.lon}`, `${destination.lat},${destination.lon}`],
          key: this.graphhopperApiKey,
          locale: 'en',
          points_encoded: false
        },
        timeout: 10000
      });

      if (!response.data.paths || response.data.paths.length === 0) {
        throw new Error('Aucune route GraphHopper trouvée');
      }

      const path = response.data.paths[0];
      const distanceKm = Math.round((path.distance / 1000) * 100) / 100;
      const durationMinutes = Math.round(path.time / 60000);

      return {
        success: true,
        distance_km: distanceKm,
        duration_min: durationMinutes,
        polyline: path.points,
        provider: 'GraphHopper',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur GraphHopper fallback:', error.message);
      throw error;
    }
  }

  /**
   * Optimisation multi-stops avec GraphHopper
   */
  async _graphhopperOptimization(waypoints, options = {}) {
    try {
      const url = `${this.endpoints.graphhopper.base}/route`;

      const points = waypoints.map(w => `${w.lat},${w.lon}`);

      const response = await axios.get(url, {
        params: {
          points,
          key: this.graphhopperApiKey,
          locale: 'en',
          points_encoded: false,
          algorithm: 'round_trip'
        },
        timeout: 15000
      });

      if (!response.data.paths || response.data.paths.length === 0) {
        throw new Error('Aucune route d\'optimisation trouvée');
      }

      const path = response.data.paths[0];
      const distanceKm = Math.round((path.distance / 1000) * 100) / 100;
      const durationMin = Math.round(path.time / 60000);

      return {
        success: true,
        total_distance_km: distanceKm,
        total_duration_min: durationMin,
        waypoints_count: waypoints.length,
        optimized: true,
        provider: 'GraphHopper',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur GraphHopper optimisation:', error.message);
      throw error;
    }
  }

  /**
   * Helper: détermine catégorie péage
   */
  _getTollCategory(vehicleType) {
    if (vehicleType.includes('FOURGON')) return 'FOURGON';
    if (vehicleType.includes('PORTEUR')) return 'PORTEUR';
    if (vehicleType.includes('SEMI') || vehicleType.includes('MEGA')) return 'SEMI';
    return 'VL';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcule distance haversine simple
   * Utile pour première approximation
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Valide une coordonnée
   */
  isValidCoordinate(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' &&
           lat >= -90 && lat <= 90 &&
           lon >= -180 && lon <= 180;
  }

  /**
   * Vide le cache
   */
  clearCache() {
    this.cache.clear();
    console.info('Cache de routage vidé');
  }

  /**
   * Retourne les stats du cache
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      estimatedSizeMb: Math.round((this.cache.size * 5) / 1024)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

module.exports = new RoutingService();
