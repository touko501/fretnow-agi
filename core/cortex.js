/**
 * 🧠 FRETNOW CORTEX — Cerveau Central Orchestrateur
 * 
 * Inspiré par C.H. Robinson (30+ agents) et Uber Freight (Insights AI)
 * Adapté au marché français avec une UX supérieure
 */

const EventEmitter = require('events');

class Cortex extends EventEmitter {
  constructor(config = {}) {
    super();
    this.agents = new Map();
    this.state = {
      activeLeads: [],
      pendingMissions: [],
      matchedPairs: [],
      marketConditions: {},
      performanceMetrics: {},
      lastUpdate: null
    };
    this.config = {
      cycleInterval: config.cycleInterval || 60000,
      maxConcurrentAgents: config.maxConcurrentAgents || 5,
      ...config
    };
    this.metrics = {
      totalCycles: 0,
      agentExecutions: {},
      matchesCreated: 0,
      errors: []
    };
    this.isRunning = false;
  }

  /**
   * Enregistre un agent dans le cortex
   */
  registerAgent(agent) {
    this.agents.set(agent.name, agent);
    agent.cortex = this;
    agent.emit = (event, data) => this.emit(`${agent.name}:${event}`, data);
    console.log(`🧠 Agent enregistré: ${agent.name} (priorité: ${agent.priority || 0})`);
    return this;
  }

  /**
   * Démarre l'orchestration
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  🧠 FRETNOW CORTEX 2.0 — La Meilleure AGI Transport du Monde                 ║
║                                                                              ║
║  Agents: ${String(this.agents.size).padEnd(3)} | Cycle: ${String(this.config.cycleInterval/1000).padEnd(4)}s | Mode: PRODUCTION              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `);

    // Initialiser tous les agents
    for (const agent of this.agents.values()) {
      if (agent.init) await agent.init();
    }

    // Boucle principale
    await this.orchestrationLoop();
  }

  /**
   * Boucle d'orchestration principale
   */
  async orchestrationLoop() {
    while (this.isRunning) {
      const cycleStart = Date.now();
      this.metrics.totalCycles++;
      
      console.log(`\n${'━'.repeat(60)}`);
      console.log(`📍 Cycle #${this.metrics.totalCycles} | ${new Date().toLocaleTimeString()}`);
      console.log(`${'━'.repeat(60)}`);

      try {
        // Phase 1: Mise à jour du contexte marché
        await this.updateMarketContext();

        // Phase 2: Exécution des agents par priorité
        const sortedAgents = [...this.agents.values()]
          .sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const agent of sortedAgents) {
          await this.executeAgent(agent);
        }

        // Phase 3: Génération d'insights cross-agents
        const insights = this.generateCrossAgentInsights();
        if (insights.length > 0) {
          console.log(`\n💡 ${insights.length} insight(s) généré(s)`);
          this.emit('insights', insights);
        }

        // Phase 4: Auto-optimisation
        this.optimizeAgentPriorities();

        // Métriques du cycle
        const cycleDuration = Date.now() - cycleStart;
        console.log(`\n⏱️  Cycle terminé en ${cycleDuration}ms`);

      } catch (error) {
        console.error(`\n❌ Erreur cycle:`, error.message);
        this.metrics.errors.push({
          type: 'cycle_error',
          message: error.message,
          timestamp: new Date()
        });
      }

      // Attendre le prochain cycle
      this.state.lastUpdate = new Date().toISOString();
      await this.sleep(this.config.cycleInterval);
    }
  }

  /**
   * Exécute un agent avec métriques
   */
  async executeAgent(agent) {
    const start = Date.now();
    
    try {
      const result = await agent.execute(this.state);
      const duration = Date.now() - start;

      // Enregistrer les métriques
      if (!this.metrics.agentExecutions[agent.name]) {
        this.metrics.agentExecutions[agent.name] = { 
          runs: 0, 
          totalTime: 0, 
          successRate: 1,
          lastResult: null
        };
      }
      
      const metrics = this.metrics.agentExecutions[agent.name];
      metrics.runs++;
      metrics.totalTime += duration;
      metrics.lastResult = result;
      metrics.successRate = (metrics.successRate * (metrics.runs - 1) + 1) / metrics.runs;

      console.log(`  ✓ ${agent.name.padEnd(15)} ${String(duration).padStart(4)}ms | ${result?.summary || 'OK'}`);
      
      return result;

    } catch (error) {
      const duration = Date.now() - start;
      console.error(`  ✗ ${agent.name.padEnd(15)} ${String(duration).padStart(4)}ms | ${error.message}`);
      
      if (this.metrics.agentExecutions[agent.name]) {
        this.metrics.agentExecutions[agent.name].successRate *= 0.9;
      }
      
      this.metrics.errors.push({
        type: 'agent_error',
        agent: agent.name,
        message: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Met à jour le contexte marché
   */
  async updateMarketContext() {
    // Simulé pour l'instant - à connecter aux vraies APIs
    this.state.marketConditions = {
      timestamp: new Date().toISOString(),
      
      // Prix carburant (API gouvernement)
      fuelPrice: {
        diesel: 1.85,
        trend: 'stable',
        lastUpdate: new Date().toISOString()
      },
      
      // Indice de demande (calculé)
      demandIndex: this.calculateDemandIndex(),
      
      // Indice d'offre
      supplyIndex: this.calculateSupplyIndex(),
      
      // Conditions météo
      weatherAlerts: [],
      
      // Trafic
      trafficIndex: 0.3 + Math.random() * 0.3
    };
  }

  /**
   * Calcule l'indice de demande
   */
  calculateDemandIndex() {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Plus de demande en semaine et le matin
    let base = 0.5;
    if (dayOfWeek >= 1 && dayOfWeek <= 5) base += 0.2;
    if (hour >= 6 && hour <= 10) base += 0.15;
    if (hour >= 14 && hour <= 18) base += 0.1;
    
    return Math.min(1, base + (Math.random() * 0.1 - 0.05));
  }

  /**
   * Calcule l'indice d'offre
   */
  calculateSupplyIndex() {
    const activeTransporters = this.state.activeLeads.filter(l => l.status === 'active').length;
    const baseSupply = Math.min(1, activeTransporters / 100);
    return baseSupply + (Math.random() * 0.1);
  }

  /**
   * Génère des insights en croisant les données des agents
   */
  generateCrossAgentInsights() {
    const insights = [];
    const { demandIndex, supplyIndex } = this.state.marketConditions;

    // Opportunité de marché
    if (demandIndex > 0.7 && supplyIndex < 0.5) {
      insights.push({
        id: `insight_${Date.now()}_1`,
        type: 'MARKET_OPPORTUNITY',
        severity: 'high',
        title: 'Forte demande détectée',
        message: 'La demande dépasse l\'offre. Recommandation: intensifier la prospection.',
        action: { agent: 'SCOUT', command: 'increase_activity', factor: 1.5 },
        timestamp: new Date()
      });
    }

    // Surplus de leads
    const pendingLeads = this.state.activeLeads.filter(l => l.status === 'pending');
    if (pendingLeads.length > 50) {
      insights.push({
        id: `insight_${Date.now()}_2`,
        type: 'LEAD_OVERFLOW',
        severity: 'medium',
        title: 'Accumulation de leads',
        message: `${pendingLeads.length} leads en attente de contact.`,
        action: { agent: 'COMMS', command: 'batch_contact', targets: pendingLeads.slice(0, 20) },
        timestamp: new Date()
      });
    }

    // Opportunités de matching
    const unmatchedMissions = this.state.pendingMissions.filter(m => !m.matched);
    const availableTransporters = this.state.activeLeads.filter(l => l.available);
    
    if (unmatchedMissions.length > 0 && availableTransporters.length > 0) {
      const potentialMatches = this.findPotentialMatches(unmatchedMissions, availableTransporters);
      if (potentialMatches.length > 0) {
        insights.push({
          id: `insight_${Date.now()}_3`,
          type: 'MATCHING_OPPORTUNITY',
          severity: 'high',
          title: 'Matchings disponibles',
          message: `${potentialMatches.length} match(s) potentiel(s) identifié(s).`,
          action: { agent: 'MATCHER', command: 'execute_matches', matches: potentialMatches },
          timestamp: new Date()
        });
      }
    }

    return insights;
  }

  /**
   * Trouve les matchs potentiels
   */
  findPotentialMatches(missions, transporters) {
    const matches = [];

    for (const mission of missions) {
      for (const transporter of transporters) {
        const score = this.calculateMatchScore(mission, transporter);
        if (score > 0.7) {
          matches.push({
            mission,
            transporter,
            score,
            estimatedPrice: this.estimatePrice(mission, transporter)
          });
        }
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  /**
   * Calcule le score de matching
   */
  calculateMatchScore(mission, transporter) {
    let score = 0;
    
    // Proximité (25%)
    if (transporter.location && mission.pickup) {
      const distance = this.haversineDistance(
        transporter.location.lat, transporter.location.lng,
        mission.pickup.lat, mission.pickup.lng
      );
      score += 0.25 * Math.max(0, 1 - distance / 100);
    }

    // Véhicule compatible (20%)
    if (transporter.vehicleTypes?.includes(mission.vehicleType)) {
      score += 0.20;
    }

    // Historique (20%)
    score += 0.20 * (transporter.successRate || 0.8);

    // Disponibilité (15%)
    if (transporter.available) score += 0.15;

    // Réputation (10%)
    score += 0.10 * ((transporter.rating || 4) / 5);

    // Préférence route (10%)
    if (transporter.preferredRoutes?.some(r => 
      mission.pickup.city?.includes(r.from) && mission.delivery.city?.includes(r.to)
    )) {
      score += 0.10;
    }

    return score;
  }

  /**
   * Estime le prix d'une mission
   */
  estimatePrice(mission, transporter) {
    const distance = mission.distance || 100;
    const CK = 1.20; // Coût kilométrique moyen
    const CC = 25;   // Coût conducteur/heure
    const hours = distance / 70; // Vitesse moyenne
    const margin = 0.10;

    const basePrice = (CK * distance) + (CC * hours);
    const fuelAdjustment = (this.state.marketConditions.fuelPrice?.diesel || 1.85) / 1.80;
    const demandAdjustment = 1 + (this.state.marketConditions.demandIndex - 0.5) * 0.2;

    return Math.round(basePrice * fuelAdjustment * demandAdjustment / (1 - margin));
  }

  /**
   * Calcule la distance (Haversine)
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

  /**
   * Auto-optimise les priorités des agents
   */
  optimizeAgentPriorities() {
    // Les agents performants gagnent en priorité
    for (const [name, metrics] of Object.entries(this.metrics.agentExecutions)) {
      const agent = this.agents.get(name);
      if (agent && metrics.successRate > 0.9) {
        agent.priority = Math.min(100, (agent.priority || 50) + 1);
      } else if (agent && metrics.successRate < 0.7) {
        agent.priority = Math.max(0, (agent.priority || 50) - 1);
      }
    }
  }

  /**
   * Arrête le cortex
   */
  stop() {
    this.isRunning = false;
    console.log('\n🛑 CORTEX arrêté');
  }

  /**
   * Retourne les métriques
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.metrics.totalCycles * this.config.cycleInterval / 1000,
      state: {
        leads: this.state.activeLeads.length,
        missions: this.state.pendingMissions.length,
        matches: this.state.matchedPairs.length
      }
    };
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

module.exports = { Cortex };
