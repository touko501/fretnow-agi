/**
 * 📊 ANALYST AGENT — L'Œil qui Voit Tout
 * 
 * Mission: Transformer les données en décisions
 * - Dashboards temps réel
 * - Détection d'anomalies
 * - Rapports automatiques
 * - Benchmarking sectoriel
 */

class AnalystAgent {
  constructor(config = {}) {
    this.name = 'ANALYST';
    this.priority = 65;
    this.config = {
      anomalyThreshold: config.anomalyThreshold || 2, // Écarts-types
      reportFrequency: config.reportFrequency || 'daily',
      benchmarks: config.benchmarks || this.getIndustryBenchmarks(),
      ...config
    };
    this.stats = {
      analysesPerformed: 0,
      anomaliesDetected: 0,
      reportsGenerated: 0
    };
    this.metrics = {
      history: [],
      kpis: {},
      anomalies: []
    };
  }

  async init() {
    console.log(`  📊 Analyst Agent initialisé | Seuil anomalie: ${this.config.anomalyThreshold}σ`);
  }

  async execute(state) {
    // Collecter les métriques
    const currentMetrics = this.collectMetrics(state);
    this.metrics.history.push(currentMetrics);

    // Garder 30 jours d'historique
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.metrics.history = this.metrics.history.filter(m => m.timestamp > thirtyDaysAgo);

    // Calculer les KPIs
    const kpis = this.calculateKPIs(state);
    this.metrics.kpis = kpis;

    // Détecter les anomalies
    const anomalies = this.detectAnomalies(currentMetrics);
    if (anomalies.length > 0) {
      this.metrics.anomalies.push(...anomalies);
      state.anomalyAlerts = (state.anomalyAlerts || []).concat(anomalies);
    }

    // Générer les insights
    const insights = this.generateInsights(kpis, anomalies);

    // Benchmark vs industrie
    const benchmark = this.compareToBenchmark(kpis);

    this.stats.analysesPerformed++;
    this.stats.anomaliesDetected += anomalies.length;

    return {
      summary: `KPIs: ${Object.keys(kpis).length} | Anomalies: ${anomalies.length}`,
      kpis,
      anomalies: anomalies.length,
      benchmark,
      insights: insights.slice(0, 3)
    };
  }

  /**
   * Collecte les métriques actuelles
   */
  collectMetrics(state) {
    const now = Date.now();
    
    return {
      timestamp: now,
      
      // Volume
      totalLeads: state.activeLeads?.length || 0,
      qualifiedLeads: state.activeLeads?.filter(l => l.status === 'qualified').length || 0,
      contactedLeads: state.activeLeads?.filter(l => l.contacted).length || 0,
      convertedLeads: state.activeLeads?.filter(l => l.status === 'converted').length || 0,
      
      // Missions
      pendingMissions: state.pendingMissions?.length || 0,
      matchedMissions: state.matchedPairs?.length || 0,
      
      // Performance
      avgLeadScore: this.average(state.activeLeads?.map(l => l.score) || []),
      avgMatchScore: this.average(state.matchedPairs?.map(m => m.score) || []),
      avgConversionScore: this.average(state.activeLeads?.map(l => l.conversionScore) || []),
      
      // Marché
      demandIndex: state.marketConditions?.demandIndex || 0,
      supplyIndex: state.marketConditions?.supplyIndex || 0,
      
      // Risque
      highRiskLeads: state.activeLeads?.filter(l => l.riskAssessment?.riskScore > 0.7).length || 0
    };
  }

  /**
   * Calcule les KPIs
   */
  calculateKPIs(state) {
    const leads = state.activeLeads || [];
    const missions = state.pendingMissions || [];
    const matches = state.matchedPairs || [];

    // Taux de conversion
    const contacted = leads.filter(l => l.contacted).length;
    const converted = leads.filter(l => l.status === 'converted').length;
    const conversionRate = contacted > 0 ? converted / contacted : 0;

    // Taux de matching
    const matchingRate = missions.length > 0 ? matches.length / missions.length : 0;

    // Score moyen
    const avgScore = this.average(leads.map(l => l.score));

    // Temps moyen de réponse (simulé)
    const avgResponseTime = this.average(leads.map(l => l.metrics?.responseTime || 12));

    // Valeur potentielle
    const potentialValue = leads.reduce((sum, l) => {
      const valuePerVehicle = 500; // €/mois estimé
      return sum + (l.fleet?.vehicles || 1) * valuePerVehicle;
    }, 0);

    // KPIs calculés
    return {
      // Acquisition
      totalLeads: leads.length,
      newLeadsToday: leads.filter(l => this.isToday(l.createdAt)).length,
      leadGrowthRate: this.calculateGrowthRate('totalLeads'),
      
      // Qualité
      avgLeadScore: Math.round(avgScore),
      qualificationRate: leads.length > 0 
        ? leads.filter(l => l.status === 'qualified').length / leads.length 
        : 0,
      
      // Conversion
      conversionRate,
      conversionRateTrend: this.calculateTrend('conversionRate'),
      
      // Matching
      matchingRate,
      avgMatchScore: Math.round(this.average(matches.map(m => m.score)) * 100),
      
      // Engagement
      avgResponseTime,
      contactRate: leads.length > 0 ? contacted / leads.length : 0,
      
      // Valeur
      potentialMonthlyRevenue: Math.round(potentialValue * conversionRate * 0.1),
      lifetimeValue: Math.round(potentialValue * conversionRate * 0.1 * 24), // 24 mois
      
      // Santé
      riskRate: leads.length > 0 
        ? leads.filter(l => l.riskAssessment?.riskScore > 0.7).length / leads.length 
        : 0,
      
      // Timestamp
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Détecte les anomalies
   */
  detectAnomalies(currentMetrics) {
    const anomalies = [];
    const metricsToCheck = ['totalLeads', 'avgLeadScore', 'demandIndex', 'highRiskLeads'];

    for (const metric of metricsToCheck) {
      const historical = this.metrics.history
        .slice(-100)
        .map(h => h[metric])
        .filter(v => v !== undefined);

      if (historical.length < 10) continue;

      const mean = this.average(historical);
      const stdDev = this.standardDeviation(historical);

      const current = currentMetrics[metric];
      const zScore = stdDev > 0 ? (current - mean) / stdDev : 0;

      if (Math.abs(zScore) > this.config.anomalyThreshold) {
        anomalies.push({
          metric,
          current,
          mean: Math.round(mean * 100) / 100,
          zScore: Math.round(zScore * 100) / 100,
          direction: zScore > 0 ? 'above' : 'below',
          severity: Math.abs(zScore) > 3 ? 'high' : 'medium',
          timestamp: new Date().toISOString(),
          message: `${metric} ${zScore > 0 ? 'anormalement élevé' : 'anormalement bas'} (${Math.abs(zScore).toFixed(1)}σ)`
        });
      }
    }

    return anomalies;
  }

  /**
   * Génère des insights
   */
  generateInsights(kpis, anomalies) {
    const insights = [];

    // Insight conversion
    if (kpis.conversionRate < 0.10) {
      insights.push({
        type: 'warning',
        category: 'conversion',
        message: 'Taux de conversion faible (<10%). Revoir le parcours client.',
        priority: 'high'
      });
    } else if (kpis.conversionRate > 0.20) {
      insights.push({
        type: 'success',
        category: 'conversion',
        message: 'Excellent taux de conversion (>20%)!',
        priority: 'low'
      });
    }

    // Insight qualité leads
    if (kpis.avgLeadScore < 60) {
      insights.push({
        type: 'warning',
        category: 'quality',
        message: 'Score moyen des leads faible. Affiner les critères de ciblage.',
        priority: 'medium'
      });
    }

    // Insight matching
    if (kpis.matchingRate < 0.5) {
      insights.push({
        type: 'info',
        category: 'matching',
        message: 'Moins de 50% des missions matchées. Recruter plus de transporteurs.',
        priority: 'medium'
      });
    }

    // Insight risque
    if (kpis.riskRate > 0.15) {
      insights.push({
        type: 'warning',
        category: 'risk',
        message: 'Plus de 15% de leads à haut risque. Renforcer la vérification.',
        priority: 'high'
      });
    }

    // Insights basés sur les anomalies
    for (const anomaly of anomalies.filter(a => a.severity === 'high')) {
      insights.push({
        type: 'alert',
        category: 'anomaly',
        message: anomaly.message,
        priority: 'high'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Compare aux benchmarks de l'industrie
   */
  compareToBenchmark(kpis) {
    const benchmarks = this.config.benchmarks;
    const comparison = {};

    for (const [metric, benchmark] of Object.entries(benchmarks)) {
      if (kpis[metric] !== undefined) {
        const diff = ((kpis[metric] - benchmark) / benchmark) * 100;
        comparison[metric] = {
          value: kpis[metric],
          benchmark,
          diff: Math.round(diff),
          status: diff > 10 ? 'above' : diff < -10 ? 'below' : 'on_par'
        };
      }
    }

    return comparison;
  }

  /**
   * Benchmarks de l'industrie du fret
   */
  getIndustryBenchmarks() {
    return {
      conversionRate: 0.12, // 12%
      avgLeadScore: 65,
      matchingRate: 0.70, // 70%
      avgResponseTime: 8, // heures
      riskRate: 0.10 // 10%
    };
  }

  /**
   * Génère un rapport
   */
  generateReport(state) {
    const kpis = this.calculateKPIs(state);
    const benchmark = this.compareToBenchmark(kpis);
    const insights = this.generateInsights(kpis, this.metrics.anomalies.slice(-10));

    this.stats.reportsGenerated++;

    return {
      title: `Rapport FRETNOW - ${new Date().toLocaleDateString('fr-FR')}`,
      generatedAt: new Date().toISOString(),
      period: 'daily',
      
      summary: {
        leads: kpis.totalLeads,
        conversions: Math.round(kpis.totalLeads * kpis.conversionRate),
        revenue: kpis.potentialMonthlyRevenue
      },
      
      kpis,
      benchmark,
      insights,
      
      trends: {
        conversionRate: this.calculateTrend('conversionRate'),
        leadGrowth: this.calculateGrowthRate('totalLeads')
      },
      
      recommendations: insights
        .filter(i => i.type === 'warning')
        .map(i => i.message)
    };
  }

  // Helpers
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + (b || 0), 0) / arr.length;
  }

  standardDeviation(arr) {
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }

  isToday(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  calculateGrowthRate(metric) {
    const history = this.metrics.history;
    if (history.length < 2) return 0;
    
    const recent = history.slice(-7).map(h => h[metric]);
    const older = history.slice(-14, -7).map(h => h[metric]);
    
    if (older.length === 0) return 0;
    
    const recentAvg = this.average(recent);
    const olderAvg = this.average(older);
    
    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  calculateTrend(metric) {
    const rate = this.calculateGrowthRate(metric);
    if (rate > 0.05) return 'up';
    if (rate < -0.05) return 'down';
    return 'stable';
  }

  getStats() {
    return {
      ...this.stats,
      kpis: this.metrics.kpis,
      recentAnomalies: this.metrics.anomalies.slice(-5)
    };
  }
}

module.exports = { AnalystAgent };
