/**
 * 🔍 SCOUT AGENT — Chasseur de Leads Intelligent
 * 
 * Mission: Identifier et qualifier les meilleurs transporteurs
 * Inspiration: Convoy's AI-powered carrier discovery
 */

const axios = require('axios');
const cheerio = require('cheerio');

class ScoutAgent {
  constructor(config = {}) {
    this.name = 'SCOUT';
    this.priority = 90; // Haute priorité
    this.config = {
      dailyTarget: config.dailyTarget || 100,
      minScore: config.minScore || 60,
      sources: config.sources || ['pappers', 'societe', 'annuaire'],
      ...config
    };
    this.stats = {
      leadsFound: 0,
      leadsQualified: 0,
      todayCount: 0,
      lastReset: new Date().toDateString()
    };
  }

  async init() {
    console.log(`  🔍 Scout Agent initialisé | Objectif: ${this.config.dailyTarget}/jour`);
  }

  async execute(state) {
    // Reset compteur quotidien
    if (new Date().toDateString() !== this.stats.lastReset) {
      this.stats.todayCount = 0;
      this.stats.lastReset = new Date().toDateString();
    }

    // Vérifier si objectif atteint
    if (this.stats.todayCount >= this.config.dailyTarget) {
      return { summary: `Objectif atteint (${this.stats.todayCount}/${this.config.dailyTarget})` };
    }

    // Nombre de leads à chercher ce cycle
    const remaining = this.config.dailyTarget - this.stats.todayCount;
    const batchSize = Math.min(10, remaining);

    // Rechercher des leads
    const newLeads = await this.searchLeads(batchSize);
    
    // Qualifier les leads
    const qualifiedLeads = await this.qualifyLeads(newLeads);
    
    // Ajouter au state
    for (const lead of qualifiedLeads) {
      if (!state.activeLeads.find(l => l.id === lead.id)) {
        state.activeLeads.push(lead);
      }
    }

    // Mettre à jour les stats
    this.stats.leadsFound += newLeads.length;
    this.stats.leadsQualified += qualifiedLeads.length;
    this.stats.todayCount += qualifiedLeads.length;

    return {
      summary: `+${qualifiedLeads.length} leads (${this.stats.todayCount}/${this.config.dailyTarget})`,
      leadsFound: newLeads.length,
      leadsQualified: qualifiedLeads.length
    };
  }

  /**
   * Recherche de leads multi-sources
   */
  async searchLeads(count) {
    const leads = [];

    // Simulation de recherche (à remplacer par vraies APIs)
    const regions = ['Île-de-France', 'Rhône-Alpes', 'PACA', 'Hauts-de-France', 'Grand Est'];
    const vehicleTypes = ['VL', 'PL', 'SPL', 'Frigo', 'Benne', 'Citerne'];
    
    for (let i = 0; i < count; i++) {
      const region = regions[Math.floor(Math.random() * regions.length)];
      const lead = {
        id: `lead_${Date.now()}_${i}`,
        createdAt: new Date().toISOString(),
        source: this.config.sources[Math.floor(Math.random() * this.config.sources.length)],
        status: 'new',
        
        // Infos entreprise
        company: {
          name: `Transport ${this.generateName()}`,
          siret: this.generateSiret(),
          siren: this.generateSiren(),
          creationDate: this.generateDate(-15, -1),
          capital: Math.floor(Math.random() * 100000) + 10000,
          employees: Math.floor(Math.random() * 50) + 1
        },
        
        // Contact
        contact: {
          phone: this.generatePhone(),
          email: `contact@transport-${this.generateName().toLowerCase()}.fr`,
          address: `${Math.floor(Math.random() * 200)} rue du Commerce`,
          city: this.getCityForRegion(region),
          postalCode: this.getPostalCode(region),
          region: region
        },
        
        // Capacités
        fleet: {
          vehicles: Math.floor(Math.random() * 20) + 1,
          types: vehicleTypes.slice(0, Math.floor(Math.random() * 3) + 1)
        },
        
        // Localisation
        location: this.getLocationForRegion(region),
        
        // Métriques (à enrichir)
        metrics: {
          successRate: 0.7 + Math.random() * 0.3,
          responseTime: Math.floor(Math.random() * 24) + 1
        }
      };
      
      leads.push(lead);
    }

    return leads;
  }

  /**
   * Qualification des leads avec scoring
   */
  async qualifyLeads(leads) {
    const qualified = [];

    for (const lead of leads) {
      const score = this.calculateLeadScore(lead);
      lead.score = score;
      lead.scoreDetails = this.getScoreDetails(lead);
      
      if (score >= this.config.minScore) {
        lead.status = 'qualified';
        lead.priority = score > 80 ? 'high' : score > 70 ? 'medium' : 'low';
        qualified.push(lead);
      }
    }

    return qualified;
  }

  /**
   * Calcule le score d'un lead (0-100)
   */
  calculateLeadScore(lead) {
    let score = 0;

    // Ancienneté entreprise (max 20 points)
    const yearsOld = this.getYearsOld(lead.company.creationDate);
    score += Math.min(20, yearsOld * 2);

    // Taille flotte (max 25 points)
    score += Math.min(25, lead.fleet.vehicles * 2.5);

    // Diversité véhicules (max 15 points)
    score += Math.min(15, lead.fleet.types.length * 5);

    // Capital social (max 15 points)
    if (lead.company.capital > 50000) score += 15;
    else if (lead.company.capital > 20000) score += 10;
    else if (lead.company.capital > 10000) score += 5;

    // Nombre employés (max 15 points)
    if (lead.company.employees > 20) score += 15;
    else if (lead.company.employees > 10) score += 10;
    else if (lead.company.employees > 5) score += 5;

    // Bonus région stratégique (max 10 points)
    const strategicRegions = ['Île-de-France', 'Rhône-Alpes', 'PACA'];
    if (strategicRegions.includes(lead.contact.region)) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Détail du score pour transparence
   */
  getScoreDetails(lead) {
    return {
      anciennete: Math.min(20, this.getYearsOld(lead.company.creationDate) * 2),
      flotte: Math.min(25, lead.fleet.vehicles * 2.5),
      diversite: Math.min(15, lead.fleet.types.length * 5),
      capital: lead.company.capital > 50000 ? 15 : lead.company.capital > 20000 ? 10 : 5,
      employes: lead.company.employees > 20 ? 15 : lead.company.employees > 10 ? 10 : 5,
      region: ['Île-de-France', 'Rhône-Alpes', 'PACA'].includes(lead.contact.region) ? 10 : 0
    };
  }

  // Helpers
  generateName() {
    const prefixes = ['Express', 'Rapid', 'Euro', 'Trans', 'Fret', 'Log'];
    const suffixes = ['Plus', 'Pro', 'Services', 'France', 'Solutions', ''];
    return prefixes[Math.floor(Math.random() * prefixes.length)] + 
           suffixes[Math.floor(Math.random() * suffixes.length)];
  }

  generateSiret() {
    return Array(14).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  }

  generateSiren() {
    return Array(9).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  }

  generatePhone() {
    const prefixes = ['01', '02', '03', '04', '05', '06', '07'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return prefix + Array(8).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  }

  generateDate(minYears, maxYears) {
    const now = new Date();
    const years = minYears + Math.random() * (maxYears - minYears);
    return new Date(now.getFullYear() + years, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString();
  }

  getYearsOld(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - date) / (365.25 * 24 * 60 * 60 * 1000));
  }

  getCityForRegion(region) {
    const cities = {
      'Île-de-France': ['Paris', 'Créteil', 'Nanterre', 'Bobigny', 'Versailles'],
      'Rhône-Alpes': ['Lyon', 'Grenoble', 'Saint-Étienne', 'Villeurbanne'],
      'PACA': ['Marseille', 'Nice', 'Toulon', 'Aix-en-Provence'],
      'Hauts-de-France': ['Lille', 'Amiens', 'Roubaix', 'Tourcoing'],
      'Grand Est': ['Strasbourg', 'Reims', 'Metz', 'Mulhouse']
    };
    const regionCities = cities[region] || ['Paris'];
    return regionCities[Math.floor(Math.random() * regionCities.length)];
  }

  getPostalCode(region) {
    const codes = {
      'Île-de-France': '75',
      'Rhône-Alpes': '69',
      'PACA': '13',
      'Hauts-de-France': '59',
      'Grand Est': '67'
    };
    return (codes[region] || '75') + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  }

  getLocationForRegion(region) {
    const coords = {
      'Île-de-France': { lat: 48.8566, lng: 2.3522 },
      'Rhône-Alpes': { lat: 45.7640, lng: 4.8357 },
      'PACA': { lat: 43.2965, lng: 5.3698 },
      'Hauts-de-France': { lat: 50.6292, lng: 3.0573 },
      'Grand Est': { lat: 48.5734, lng: 7.7521 }
    };
    const base = coords[region] || coords['Île-de-France'];
    return {
      lat: base.lat + (Math.random() - 0.5) * 0.5,
      lng: base.lng + (Math.random() - 0.5) * 0.5
    };
  }
}

module.exports = { ScoutAgent };
