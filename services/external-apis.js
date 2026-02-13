/**
 * 🔌 EXTERNAL APIS SERVICE — Connexion au Monde Réel
 * 
 * APIs gratuites intégrées:
 * - Prix carburant (data.gouv.fr)
 * - Météo (Open-Meteo)
 * - Entreprises (API SIRENE)
 * - Adresses (API Adresse gouv)
 * - Trafic (TomTom / estimation)
 */

const axios = require('axios');

class ExternalAPIs {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    this.endpoints = {
      fuel: 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records',
      weather: 'https://api.open-meteo.com/v1/forecast',
      address: 'https://api-adresse.data.gouv.fr/search',
      sirene: 'https://api.insee.fr/entreprises/sirene/V3.11/siret',
      geo: 'https://geo.api.gouv.fr'
    };
  }

  /**
   * Cache wrapper
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
      // Retourner le cache même expiré en cas d'erreur
      if (cached) return cached.data;
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 PRIX CARBURANT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère les prix du carburant en France
   */
  async getFuelPrices(department = null) {
    return this.cached(`fuel_${department || 'all'}`, async () => {
      try {
        const params = {
          limit: 100,
          select: 'id,adresse,ville,cp,prix_maj,prix_nom,prix_valeur',
          where: "prix_nom='Gazole'"
        };

        if (department) {
          params.where += ` AND cp LIKE '${department}%'`;
        }

        const response = await axios.get(this.endpoints.fuel, { params, timeout: 5000 });
        
        const prices = response.data.results || [];
        
        // Calculer les statistiques
        const values = prices.map(p => p.prix_valeur / 1000).filter(v => v > 0);
        
        return {
          count: values.length,
          diesel: {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            median: this.median(values)
          },
          stations: prices.slice(0, 10).map(p => ({
            address: p.adresse,
            city: p.ville,
            postalCode: p.cp,
            price: p.prix_valeur / 1000,
            updatedAt: p.prix_maj
          })),
          fetchedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error('Erreur API carburant:', error.message);
        // Valeur par défaut
        return {
          diesel: { avg: 1.85, min: 1.75, max: 1.95 },
          error: error.message,
          fetchedAt: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Prix moyen du diesel
   */
  async getDieselPrice() {
    const prices = await this.getFuelPrices();
    return prices.diesel?.avg || 1.85;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌤️ MÉTÉO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère les conditions météo
   */
  async getWeather(lat, lng) {
    return this.cached(`weather_${lat}_${lng}`, async () => {
      try {
        const response = await axios.get(this.endpoints.weather, {
          params: {
            latitude: lat,
            longitude: lng,
            current: 'temperature_2m,precipitation,weather_code,wind_speed_10m',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
            timezone: 'Europe/Paris',
            forecast_days: 3
          },
          timeout: 5000
        });

        const data = response.data;
        
        return {
          current: {
            temperature: data.current?.temperature_2m,
            precipitation: data.current?.precipitation,
            weatherCode: data.current?.weather_code,
            condition: this.weatherCodeToCondition(data.current?.weather_code),
            windSpeed: data.current?.wind_speed_10m
          },
          forecast: data.daily?.time?.map((date, i) => ({
            date,
            tempMax: data.daily.temperature_2m_max[i],
            tempMin: data.daily.temperature_2m_min[i],
            precipitation: data.daily.precipitation_sum[i],
            condition: this.weatherCodeToCondition(data.daily.weather_code[i])
          })) || [],
          alerts: this.detectWeatherAlerts(data),
          impactOnTransport: this.assessWeatherImpact(data),
          fetchedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error('Erreur API météo:', error.message);
        return {
          current: { condition: 'unknown' },
          alerts: [],
          impactOnTransport: 'normal',
          error: error.message
        };
      }
    });
  }

  /**
   * Convertit le code météo en condition lisible
   */
  weatherCodeToCondition(code) {
    const conditions = {
      0: 'clear',
      1: 'mainly_clear', 2: 'partly_cloudy', 3: 'overcast',
      45: 'fog', 48: 'fog',
      51: 'light_rain', 53: 'moderate_rain', 55: 'heavy_rain',
      61: 'light_rain', 63: 'moderate_rain', 65: 'heavy_rain',
      71: 'light_snow', 73: 'moderate_snow', 75: 'heavy_snow',
      77: 'snow_grains',
      80: 'rain_showers', 81: 'rain_showers', 82: 'heavy_rain_showers',
      85: 'snow_showers', 86: 'heavy_snow_showers',
      95: 'thunderstorm', 96: 'thunderstorm_hail', 99: 'thunderstorm_hail'
    };
    return conditions[code] || 'unknown';
  }

  /**
   * Détecte les alertes météo
   */
  detectWeatherAlerts(data) {
    const alerts = [];
    const current = data.current || {};
    
    if (current.wind_speed_10m > 50) {
      alerts.push({ type: 'wind', severity: 'high', message: 'Vents violents' });
    }
    if (current.precipitation > 10) {
      alerts.push({ type: 'rain', severity: 'medium', message: 'Fortes précipitations' });
    }
    if ([71, 73, 75, 77, 85, 86].includes(current.weather_code)) {
      alerts.push({ type: 'snow', severity: 'high', message: 'Conditions neigeuses' });
    }
    if ([95, 96, 99].includes(current.weather_code)) {
      alerts.push({ type: 'storm', severity: 'high', message: 'Orages' });
    }

    return alerts;
  }

  /**
   * Évalue l'impact météo sur le transport
   */
  assessWeatherImpact(data) {
    const alerts = this.detectWeatherAlerts(data);
    if (alerts.some(a => a.severity === 'high')) return 'severe';
    if (alerts.some(a => a.severity === 'medium')) return 'moderate';
    return 'normal';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🏢 ENTREPRISES (SIRENE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Vérifie un SIRET
   */
  async verifySiret(siret) {
    return this.cached(`siret_${siret}`, async () => {
      try {
        // API SIRENE nécessite une clé - on utilise une alternative
        const response = await axios.get(
          `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${siret}`,
          { timeout: 5000 }
        );

        const data = response.data.etablissement;
        
        return {
          valid: true,
          siret: data.siret,
          siren: data.siren,
          company: {
            name: data.unite_legale?.denomination || data.denomination_usuelle,
            legalForm: data.unite_legale?.categorie_juridique,
            creationDate: data.date_creation,
            activity: data.activite_principale,
            activityLabel: data.libelle_activite_principale
          },
          address: {
            street: `${data.numero_voie || ''} ${data.type_voie || ''} ${data.libelle_voie || ''}`.trim(),
            postalCode: data.code_postal,
            city: data.libelle_commune,
            country: 'France'
          },
          status: {
            active: data.etat_administratif === 'A',
            employees: data.tranche_effectifs
          },
          fetchedAt: new Date().toISOString()
        };
      } catch (error) {
        if (error.response?.status === 404) {
          return { valid: false, error: 'SIRET non trouvé' };
        }
        console.error('Erreur API SIRENE:', error.message);
        return { valid: null, error: error.message };
      }
    }, 24 * 60 * 60 * 1000); // Cache 24h pour les données entreprise
  }

  /**
   * Recherche d'entreprises
   */
  async searchCompanies(query, options = {}) {
    try {
      const params = {
        q: query,
        per_page: options.limit || 10,
        page: options.page || 1
      };

      // Filtrer par code NAF transport si spécifié
      if (options.transportOnly) {
        params.activite_principale = '49.41A,49.41B,49.41C,52.29A,52.29B';
      }

      const response = await axios.get(
        'https://entreprise.data.gouv.fr/api/sirene/v3/etablissements',
        { params, timeout: 5000 }
      );

      return {
        total: response.data.total_results,
        companies: response.data.etablissements?.map(e => ({
          siret: e.siret,
          name: e.unite_legale?.denomination || e.denomination_usuelle,
          activity: e.libelle_activite_principale,
          city: e.libelle_commune,
          postalCode: e.code_postal,
          active: e.etat_administratif === 'A'
        })) || [],
        page: options.page || 1
      };
    } catch (error) {
      console.error('Erreur recherche entreprises:', error.message);
      return { total: 0, companies: [], error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📍 ADRESSES & GÉOLOCALISATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Autocomplete d'adresse
   */
  async autocompleteAddress(query, options = {}) {
    return this.cached(`addr_${query}`, async () => {
      try {
        const response = await axios.get(this.endpoints.address, {
          params: {
            q: query,
            limit: options.limit || 5,
            type: options.type || 'housenumber'
          },
          timeout: 3000
        });

        return {
          results: response.data.features?.map(f => ({
            label: f.properties.label,
            street: f.properties.name,
            city: f.properties.city,
            postalCode: f.properties.postcode,
            context: f.properties.context,
            coordinates: {
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0]
            },
            score: f.properties.score
          })) || []
        };
      } catch (error) {
        console.error('Erreur autocomplete:', error.message);
        return { results: [], error: error.message };
      }
    }, 60 * 1000); // Cache 1 minute
  }

  /**
   * Géocode une adresse
   */
  async geocode(address) {
    const result = await this.autocompleteAddress(address, { limit: 1 });
    return result.results[0] || null;
  }

  /**
   * Calcule la distance entre deux points
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 1.2); // +20% pour routes réelles
  }

  /**
   * Estime le temps de trajet
   */
  estimateTravelTime(distanceKm, vehicleType = 'PL') {
    const speeds = {
      'VL': 80,
      'PL': 65,
      'SPL': 60
    };
    const avgSpeed = speeds[vehicleType] || 65;
    const hours = distanceKm / avgSpeed;
    
    // Ajouter pauses obligatoires (45min toutes les 4h30)
    const mandatoryBreaks = Math.floor(hours / 4.5) * 0.75;
    
    return {
      hours: Math.round((hours + mandatoryBreaks) * 10) / 10,
      minutes: Math.round((hours + mandatoryBreaks) * 60),
      breakdown: {
        driving: Math.round(hours * 60),
        breaks: Math.round(mandatoryBreaks * 60)
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚦 TRAFIC (Estimation)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Estime les conditions de trafic
   */
  getTrafficConditions() {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    
    // Heures de pointe
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isWeekend = day === 0 || day === 6;
    
    let congestionIndex = 0.2; // Base
    
    if (!isWeekend && isPeakHour) {
      congestionIndex = 0.6;
    } else if (!isWeekend && hour >= 9 && hour <= 17) {
      congestionIndex = 0.4;
    } else if (isWeekend) {
      congestionIndex = 0.15;
    }
    
    // Ajouter un peu d'aléatoire
    congestionIndex += (Math.random() - 0.5) * 0.1;
    
    return {
      index: Math.max(0, Math.min(1, congestionIndex)),
      level: congestionIndex > 0.5 ? 'heavy' : congestionIndex > 0.3 ? 'moderate' : 'light',
      delayMultiplier: 1 + congestionIndex * 0.3,
      timestamp: new Date().toISOString()
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Récupère toutes les données de marché
   */
  async getMarketData(location = { lat: 48.8566, lng: 2.3522 }) {
    const [fuel, weather, traffic] = await Promise.all([
      this.getFuelPrices(),
      this.getWeather(location.lat, location.lng),
      Promise.resolve(this.getTrafficConditions())
    ]);

    return {
      fuel,
      weather,
      traffic,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { ExternalAPIs };
