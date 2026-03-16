/**
 * 🔍 AUTOCOMPLETE & EXTERNAL APIs ROUTES
 * 
 * Endpoints publics et protégés pour:
 * - Autocomplétion d'adresses (BAN)
 * - Recherche d'entreprises (SIRENE)
 * - Vérification SIRET
 * - Prix carburant
 * - Météo
 * - Recherche de villes
 * 
 * APIs utilisées:
 * - api-adresse.data.gouv.fr ✅
 * - recherche-entreprises.api.gouv.fr ✅
 * - geo.api.gouv.fr ✅
 * - data.economie.gouv.fr ✅
 * - api.open-meteo.com ✅
 * 
 * Dernière vérification: 28/02/2026
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { ExternalAPIs } = require('../../services/external-apis');
const routing = require('../../services/routing');

// Instances singleton
const externalAPIs = new ExternalAPIs();

// Adapter: routing.js replaces smart-autocomplete.js (deleted in v8 cleanup)
const smartAutocomplete = {
  searchAddress: (q, opts) => routing.autocomplete(q, opts?.limit || 5),
  reverseGeocode: (lat, lon) => routing.reverseGeocode(lat, lon),
  searchCompany: (q, opts) => externalAPIs.searchCompanies ? externalAPIs.searchCompanies(q, opts) : Promise.resolve({ results: [] }),
  verifySiret: (siret) => externalAPIs.verifySiret ? externalAPIs.verifySiret(siret) : Promise.resolve({ valid: null }),
  searchTransportCompanies: (opts) => externalAPIs.searchCompanies ? externalAPIs.searchCompanies('transport', opts) : Promise.resolve({ total: 0, companies: [] }),
  searchCity: (q, opts) => routing.geocode(q).then(r => ({ results: Array.isArray(r) ? r : [r].filter(Boolean) })),
};

// ═══════════════════════════════════════════════════════════════════════════
// 📍 ADRESSES — Autocomplétion (public)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /autocomplete/address?q=10 rue de la paix&limit=5
 * Recherche d'adresses avec autocomplétion
 */
router.get('/address', async (req, res) => {
  try {
    const { q, limit, type, postcode, lat, lon } = req.query;
    
    if (!q || q.length < 3) {
      return res.json({ results: [], query: q || '' });
    }

    const results = await smartAutocomplete.searchAddress(q, {
      limit: parseInt(limit) || 5,
      type,
      postcode,
      lat: lat ? parseFloat(lat) : undefined,
      lon: lon ? parseFloat(lon) : undefined
    });

    res.json(results);
  } catch (error) {
    console.error('Erreur autocomplete adresse:', error.message);
    res.status(500).json({ error: 'Erreur serveur', results: [] });
  }
});

/**
 * GET /autocomplete/reverse?lat=48.8566&lng=2.3522
 * Géocodage inverse
 */
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat et lng requis' });
    }

    const result = await smartAutocomplete.reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json(result || { error: 'Adresse non trouvée' });
  } catch (error) {
    console.error('Erreur reverse geocode:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 ENTREPRISES — Recherche SIRENE (public)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /autocomplete/company?q=transtek&limit=5&transportOnly=true
 * Recherche d'entreprises
 */
router.get('/company', async (req, res) => {
  try {
    const { q, limit, transportOnly, department } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ results: [], query: q || '' });
    }

    const results = await smartAutocomplete.searchCompany(q, {
      limit: parseInt(limit) || 5,
      transportOnly: transportOnly === 'true',
      department
    });

    res.json(results);
  } catch (error) {
    console.error('Erreur recherche entreprise:', error.message);
    res.status(500).json({ error: 'Erreur serveur', results: [] });
  }
});

/**
 * GET /autocomplete/siret/:siret
 * Vérification SIRET
 */
router.get('/siret/:siret', async (req, res) => {
  try {
    const { siret } = req.params;
    
    if (!/^\d{14}$/.test(siret)) {
      return res.status(400).json({ valid: false, error: 'Format SIRET invalide (14 chiffres requis)' });
    }

    const result = await smartAutocomplete.verifySiret(siret);
    res.json(result);
  } catch (error) {
    console.error('Erreur vérification SIRET:', error.message);
    res.status(500).json({ valid: null, error: 'Erreur serveur' });
  }
});

/**
 * GET /autocomplete/siren/:siren
 * Recherche par SIREN (9 chiffres)
 */
router.get('/siren/:siren', async (req, res) => {
  try {
    const { siren } = req.params;
    
    if (!/^\d{9}$/.test(siren)) {
      return res.status(400).json({ valid: false, error: 'Format SIREN invalide (9 chiffres requis)' });
    }

    const results = await smartAutocomplete.searchCompany(siren, { limit: 1 });
    const company = results.results?.[0];
    
    if (!company || company.siren !== siren) {
      return res.json({ valid: false, siren, error: 'SIREN non trouvé' });
    }

    res.json({ valid: true, siren, ...company });
  } catch (error) {
    console.error('Erreur recherche SIREN:', error.message);
    res.status(500).json({ valid: null, error: 'Erreur serveur' });
  }
});

/**
 * GET /autocomplete/transport-companies?department=75&limit=25
 * Recherche entreprises de transport par zone
 */
router.get('/transport-companies', async (req, res) => {
  try {
    const { department, limit, minEmployees } = req.query;
    
    const results = await smartAutocomplete.searchTransportCompanies({
      department,
      limit: parseInt(limit) || 25,
      minEmployees
    });

    res.json(results);
  } catch (error) {
    console.error('Erreur recherche transporteurs:', error.message);
    res.status(500).json({ total: 0, companies: [], error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏙️ VILLES (public)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /autocomplete/city?q=Paris&limit=5
 */
router.get('/city', async (req, res) => {
  try {
    const { q, limit } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ results: [], query: q || '' });
    }

    const results = await smartAutocomplete.searchCity(q, {
      limit: parseInt(limit) || 5
    });

    res.json(results);
  } catch (error) {
    console.error('Erreur recherche ville:', error.message);
    res.status(500).json({ results: [], error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ⛽ CARBURANT (protégé)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /autocomplete/fuel?department=75
 * Prix du carburant
 */
router.get('/fuel', authenticate, async (req, res) => {
  try {
    const { department } = req.query;
    const prices = await externalAPIs.getFuelPrices(department || null);
    res.json(prices);
  } catch (error) {
    console.error('Erreur prix carburant:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /autocomplete/diesel-price
 * Prix moyen du diesel (pour calcul tarifaire)
 */
router.get('/diesel-price', async (req, res) => {
  try {
    const price = await externalAPIs.getDieselPrice();
    res.json({ price, currency: 'EUR', unit: 'L', fetchedAt: new Date().toISOString() });
  } catch (error) {
    res.json({ price: 1.75, currency: 'EUR', unit: 'L', estimated: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🌤️ MÉTÉO (protégé)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /autocomplete/weather?lat=48.8566&lng=2.3522
 * Conditions météo pour un point
 */
router.get('/weather', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat et lng requis' });
    }

    const weather = await externalAPIs.getWeather(parseFloat(lat), parseFloat(lng));
    res.json(weather);
  } catch (error) {
    console.error('Erreur météo:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📊 DONNÉES MARCHÉ (protégé)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /autocomplete/market-data?lat=48.8566&lng=2.3522
 * Toutes les données marché (carburant + météo + trafic)
 */
router.get('/market-data', authenticate, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 48.8566;
    const lng = parseFloat(req.query.lng) || 2.3522;
    
    const data = await externalAPIs.getMarketData({ lat, lng });
    res.json(data);
  } catch (error) {
    console.error('Erreur market data:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 DIAGNOSTIC APIs (admin)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /autocomplete/api-status
 * Vérifie l'état de toutes les APIs externes
 */
router.get('/api-status', async (req, res) => {
  const axios = require('axios');
  const checks = [
    { name: 'BAN (Adresses)', url: 'https://api-adresse.data.gouv.fr/search?q=test&limit=1' },
    { name: 'SIRENE (Entreprises)', url: 'https://recherche-entreprises.api.gouv.fr/search?q=test&per_page=1' },
    { name: 'Geo (Communes)', url: 'https://geo.api.gouv.fr/communes?nom=Paris&limit=1' },
    { name: 'Carburants', url: 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?limit=1' },
    { name: 'Météo (Open-Meteo)', url: 'https://api.open-meteo.com/v1/forecast?latitude=48.86&longitude=2.35&current=temperature_2m' }
  ];

  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        const start = Date.now();
        const resp = await axios.get(check.url, { timeout: 5000 });
        return {
          name: check.name,
          status: 'ok',
          httpCode: resp.status,
          responseTime: Date.now() - start
        };
      } catch (error) {
        return {
          name: check.name,
          status: 'error',
          httpCode: error.response?.status || 0,
          error: error.message,
          responseTime: null
        };
      }
    })
  );

  const allOk = results.every(r => r.status === 'ok');
  res.json({
    overall: allOk ? 'all_operational' : 'degraded',
    apis: results,
    checkedAt: new Date().toISOString()
  });
});

module.exports = router;
