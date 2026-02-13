/**
 * 🔍 SMART AUTOCOMPLETE SERVICE
 * 
 * Autocomplétion intelligente pour:
 * - Adresses (API Adresse gouv.fr)
 * - Entreprises SIRENE (API INSEE/data.gouv)
 * - Villes
 */

const axios = require('axios');

class SmartAutocompleteService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    this.endpoints = {
      address: 'https://api-adresse.data.gouv.fr/search',
      addressReverse: 'https://api-adresse.data.gouv.fr/reverse',
      sirene: 'https://recherche-entreprises.api.gouv.fr/search',
      geo: 'https://geo.api.gouv.fr'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📍 AUTOCOMPLÉTION ADRESSES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Recherche d'adresses avec autocomplétion
   * @param {string} query - Texte saisi par l'utilisateur
   * @param {object} options - Options de recherche
   */
  async searchAddress(query, options = {}) {
    if (!query || query.length < 3) {
      return { results: [], query };
    }

    const cacheKey = `addr_${query}_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        q: query,
        limit: options.limit || 5,
        autocomplete: 1
      };

      // Filtrer par type si spécifié
      if (options.type) {
        params.type = options.type; // housenumber, street, locality, municipality
      }

      // Filtrer par code postal si spécifié
      if (options.postcode) {
        params.postcode = options.postcode;
      }

      // Biais géographique si coordonnées fournies
      if (options.lat && options.lon) {
        params.lat = options.lat;
        params.lon = options.lon;
      }

      const response = await axios.get(this.endpoints.address, {
        params,
        timeout: 3000
      });

      const results = {
        query,
        results: (response.data.features || []).map(feature => ({
          id: feature.properties.id,
          label: feature.properties.label,
          name: feature.properties.name,
          housenumber: feature.properties.housenumber,
          street: feature.properties.street,
          postcode: feature.properties.postcode,
          city: feature.properties.city,
          citycode: feature.properties.citycode,
          context: feature.properties.context,
          type: feature.properties.type,
          importance: feature.properties.importance,
          score: feature.properties.score,
          coordinates: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          }
        })),
        attribution: 'Base Adresse Nationale'
      };

      this.setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error('Erreur autocomplétion adresse:', error.message);
      return { query, results: [], error: error.message };
    }
  }

  /**
   * Géocodage inverse (coordonnées → adresse)
   */
  async reverseGeocode(lat, lng) {
    try {
      const response = await axios.get(this.endpoints.addressReverse, {
        params: { lat, lon: lng },
        timeout: 3000
      });

      const feature = response.data.features?.[0];
      if (!feature) return null;

      return {
        label: feature.properties.label,
        street: feature.properties.street,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        coordinates: { lat, lng }
      };
    } catch (error) {
      console.error('Erreur géocodage inverse:', error.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🏢 AUTOCOMPLÉTION ENTREPRISES (SIRENE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Recherche d'entreprises avec autocomplétion
   * @param {string} query - Nom, SIRET ou SIREN
   * @param {object} options - Options de recherche
   */
  async searchCompany(query, options = {}) {
    if (!query || query.length < 2) {
      return { results: [], query };
    }

    const cacheKey = `company_${query}_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        q: query,
        per_page: options.limit || 5,
        page: 1
      };

      // Filtrer par code NAF transport si demandé
      if (options.transportOnly) {
        params.activite_principale = '49.41A,49.41B,49.41C,49.42Z,52.29A,52.29B';
      }

      // Filtrer par département
      if (options.department) {
        params.code_postal = options.department;
      }

      // Uniquement les entreprises actives
      if (options.activeOnly !== false) {
        params.etat_administratif = 'A';
      }

      const response = await axios.get(this.endpoints.sirene, {
        params,
        timeout: 5000
      });

      const results = {
        query,
        total: response.data.total_results || 0,
        results: (response.data.results || []).map(company => ({
          siren: company.siren,
          siret: company.siege?.siret,
          name: company.nom_complet,
          legalName: company.nom_raison_sociale,
          tradeName: company.nom_commercial,
          legalForm: company.nature_juridique,
          legalFormLabel: this.getLegalFormLabel(company.nature_juridique),
          activity: company.activite_principale,
          activityLabel: company.libelle_activite_principale,
          category: company.categorie_entreprise,
          employees: company.tranche_effectif_salarie,
          employeesLabel: this.getEmployeesLabel(company.tranche_effectif_salarie),
          creationDate: company.date_creation,
          address: {
            street: company.siege?.adresse,
            postcode: company.siege?.code_postal,
            city: company.siege?.libelle_commune,
            department: company.siege?.departement,
            region: company.siege?.region
          },
          coordinates: company.siege?.latitude && company.siege?.longitude ? {
            lat: parseFloat(company.siege.latitude),
            lng: parseFloat(company.siege.longitude)
          } : null,
          isActive: company.etat_administratif === 'A',
          isHeadquarters: true
        })),
        attribution: 'API Recherche Entreprises (INSEE)'
      };

      this.setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error('Erreur recherche entreprise:', error.message);
      return { query, results: [], error: error.message };
    }
  }

  /**
   * Vérifie un SIRET spécifique
   */
  async verifySiret(siret) {
    if (!siret || !/^\d{14}$/.test(siret)) {
      return { valid: false, error: 'Format SIRET invalide' };
    }

    const cacheKey = `siret_${siret}`;
    const cached = this.getFromCache(cacheKey, 24 * 60 * 60 * 1000); // Cache 24h
    if (cached) return cached;

    try {
      // Rechercher par SIRET exact
      const response = await axios.get(this.endpoints.sirene, {
        params: { q: siret, per_page: 1 },
        timeout: 5000
      });

      const company = response.data.results?.[0];
      
      if (!company || company.siege?.siret !== siret) {
        return { valid: false, siret, error: 'SIRET non trouvé' };
      }

      const result = {
        valid: true,
        siret,
        siren: company.siren,
        company: {
          name: company.nom_complet,
          legalName: company.nom_raison_sociale,
          tradeName: company.nom_commercial,
          legalForm: company.nature_juridique,
          activity: company.activite_principale,
          activityLabel: company.libelle_activite_principale,
          creationDate: company.date_creation,
          category: company.categorie_entreprise
        },
        address: {
          street: company.siege?.adresse,
          postcode: company.siege?.code_postal,
          city: company.siege?.libelle_commune
        },
        status: {
          isActive: company.etat_administratif === 'A',
          employees: company.tranche_effectif_salarie
        },
        isTransportCompany: this.isTransportActivity(company.activite_principale)
      };

      this.setCache(cacheKey, result, 24 * 60 * 60 * 1000);
      return result;

    } catch (error) {
      console.error('Erreur vérification SIRET:', error.message);
      return { valid: null, siret, error: error.message };
    }
  }

  /**
   * Recherche entreprises de transport par zone
   */
  async searchTransportCompanies(options = {}) {
    const params = {
      activite_principale: '49.41A,49.41B,49.41C,49.42Z',
      etat_administratif: 'A',
      per_page: options.limit || 25
    };

    if (options.department) {
      params.code_postal = options.department;
    }

    if (options.minEmployees) {
      params.tranche_effectif_salarie = options.minEmployees;
    }

    try {
      const response = await axios.get(this.endpoints.sirene, {
        params,
        timeout: 5000
      });

      return {
        total: response.data.total_results || 0,
        companies: (response.data.results || []).map(c => ({
          siret: c.siege?.siret,
          siren: c.siren,
          name: c.nom_complet,
          activity: c.libelle_activite_principale,
          city: c.siege?.libelle_commune,
          postcode: c.siege?.code_postal,
          employees: this.getEmployeesLabel(c.tranche_effectif_salarie),
          creationDate: c.date_creation
        }))
      };
    } catch (error) {
      console.error('Erreur recherche transporteurs:', error.message);
      return { total: 0, companies: [], error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🏙️ AUTOCOMPLÉTION VILLES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Recherche de villes
   */
  async searchCity(query, options = {}) {
    if (!query || query.length < 2) {
      return { results: [] };
    }

    try {
      const response = await axios.get(`${this.endpoints.geo}/communes`, {
        params: {
          nom: query,
          fields: 'nom,code,codesPostaux,population,departement,region,centre',
          boost: 'population',
          limit: options.limit || 5
        },
        timeout: 3000
      });

      return {
        query,
        results: response.data.map(city => ({
          name: city.nom,
          code: city.code,
          postcodes: city.codesPostaux,
          population: city.population,
          department: city.departement?.nom,
          departmentCode: city.departement?.code,
          region: city.region?.nom,
          coordinates: city.centre ? {
            lat: city.centre.coordinates[1],
            lng: city.centre.coordinates[0]
          } : null
        }))
      };
    } catch (error) {
      console.error('Erreur recherche ville:', error.message);
      return { query, results: [], error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  isTransportActivity(codeNAF) {
    const transportCodes = ['49.41A', '49.41B', '49.41C', '49.42Z', '52.29A', '52.29B'];
    return transportCodes.some(code => codeNAF?.startsWith(code.replace('.', '')));
  }

  getLegalFormLabel(code) {
    const forms = {
      '1000': 'Entrepreneur individuel',
      '5499': 'SARL',
      '5710': 'SAS',
      '5720': 'SASU',
      '5599': 'SA',
      '6540': 'SCOP'
    };
    return forms[code] || code;
  }

  getEmployeesLabel(code) {
    const labels = {
      '00': '0 salarié',
      '01': '1-2 salariés',
      '02': '3-5 salariés',
      '03': '6-9 salariés',
      '11': '10-19 salariés',
      '12': '20-49 salariés',
      '21': '50-99 salariés',
      '22': '100-199 salariés',
      '31': '200-249 salariés',
      '32': '250-499 salariés',
      '41': '500-999 salariés',
      '42': '1000-1999 salariés',
      '51': '2000-4999 salariés',
      '52': '5000-9999 salariés',
      '53': '10000+ salariés'
    };
    return labels[code] || 'Non renseigné';
  }

  // Cache management
  getFromCache(key, timeout = this.cacheTimeout) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < timeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data, timeout = this.cacheTimeout) {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Nettoyer le cache périodiquement
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now - v.timestamp > timeout) {
          this.cache.delete(k);
        }
      }
    }
  }
}

module.exports = { SmartAutocompleteService };
