/**
 * FRETNOW AI Service v8.0 — Bridge entre services IA v8 et base de données Prisma
 * Connecte PricingEngine, MatchingEngine, RiskAgent au serveur production
 *
 * Migration v8: PricingAgent → PricingEngine, MatcherAgent → MatchingEngine
 */

const prisma = require('../config/database');
const { PricingEngine } = require('../../services/pricing-engine');
const { MatchingEngine } = require('../../services/matching-engine');
const { RiskAgent } = require('../../agents/risk');

// Instancier les services v8
const pricingEngine = new PricingEngine();
const matchingEngine = new MatchingEngine(prisma);
const riskAgent = new RiskAgent();

// Initialiser
let initialized = false;
async function initAgents() {
  if (initialized) return;
  // RiskAgent still uses legacy init pattern
  if (typeof riskAgent.init === 'function') {
    await riskAgent.init();
  }
  initialized = true;
  console.log('🤖 AI Services v8 initialisés (PricingEngine, MatchingEngine, Risk)');
}

/**
 * 💰 PRICING — Estimer le prix d'une mission
 */
async function estimatePrice(missionId) {
  await initAgents();

  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { client: { include: { company: true } } }
  });
  if (!mission) throw new Error('Mission non trouvée');

  try {
    // Use new PricingEngine v8
    const result = await pricingEngine.calculatePrice(mission, {
      includeBreakdown: true,
      includeMarketComparison: true,
    });

    // Sauvegarder l'estimation
    if (result.totalPrice) {
      await prisma.mission.update({
        where: { id: missionId },
        data: { estimatedPriceCents: Math.round(result.totalPrice * 100) }
      });
    }

    return {
      estimatedPrice: result.totalPrice,
      breakdown: result.breakdown || {},
      confidence: result.confidence || 'medium',
      adjustments: result.adjustments || {},
      marketComparison: result.marketComparison || null,
    };
  } catch (err) {
    console.error('PricingEngine error:', err.message);
    // Fallback: prix simple basé sur distance
    const fallbackPrice = calculateFallbackPrice(mission);
    return { estimatedPrice: fallbackPrice, breakdown: { method: 'fallback' }, confidence: 'low' };
  }
}

/**
 * 🤖 MATCHER — Trouver les transporteurs compatibles pour une mission
 */
async function findMatches(missionId) {
  await initAgents();

  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
  });
  if (!mission) throw new Error('Mission non trouvée');

  try {
    // Use new MatchingEngine v8
    const result = await matchingEngine.findMatches(mission, {
      limit: 10,
      includeReturnTrips: true,
    });

    return {
      matches: (result.matches || []).slice(0, 10).map(m => ({
        transporteurId: m.carrierId || m.transporter?.id,
        company: m.companyName || m.transporter?.company,
        score: Math.round((m.score || 0) * 100),
        factors: m.factors || {},
        isReturnTrip: m.isReturnTrip || false,
      })),
      totalCandidates: result.totalCandidates || 0,
      summary: result.summary || '',
    };
  } catch (err) {
    console.error('MatchingEngine error:', err.message);
    // Fallback: retourner les transporteurs triés par note
    const transporteurs = await prisma.user.findMany({
      where: { role: 'TRANSPORTEUR', status: 'ACTIVE', deletedAt: null },
      include: { ratingsReceived: { select: { score: true } } },
      take: 10,
    });
    return {
      matches: transporteurs
        .map(t => {
          const avgRating = t.ratingsReceived.length > 0
            ? t.ratingsReceived.reduce((a, r) => a + r.score, 0) / t.ratingsReceived.length
            : 3;
          return { transporteurId: t.id, score: Math.round(avgRating * 20), factors: { method: 'fallback-rating' } };
        })
        .sort((a, b) => b.score - a.score),
      totalCandidates: transporteurs.length,
      summary: 'Fallback: tri par note',
    };
  }
}

/**
 * 🛡️ RISK — Évaluer le risque d'une entreprise
 */
async function assessCompanyRisk(companyId) {
  await initAgents();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      users: { select: { id: true, createdAt: true, status: true, ratingsReceived: { select: { score: true } } } },
      vehicles: { select: { id: true, isActive: true, lastInspection: true, insuranceExpiry: true } },
      invoicesSent: { select: { status: true, amountTtcCents: true } },
      invoicesReceived: { select: { status: true, dueAt: true, paidAt: true } },
    }
  });
  if (!company) throw new Error('Entreprise non trouvée');

  const lead = {
    id: company.id,
    siren: company.siren,
    siret: company.siret,
    name: company.name,
    type: company.type,
    createdAt: company.createdAt,
    city: company.city,
    isVerified: company.isVerified,
    hasLicence: !!company.licenceNumber,
    hasInsurance: !!company.insuranceNumber,
    insuranceExpiry: company.insuranceExpiry,
    vehicleCount: company.vehicles.length,
    activeVehicles: company.vehicles.filter(v => v.isActive).length,
    expiredInspections: company.vehicles.filter(v => v.lastInspection && new Date(v.lastInspection) < new Date(Date.now() - 365 * 24 * 3600 * 1000)).length,
    avgRating: company.users.flatMap(u => u.ratingsReceived).length > 0
      ? company.users.flatMap(u => u.ratingsReceived).reduce((a, r) => a + r.score, 0) / company.users.flatMap(u => u.ratingsReceived).length
      : null,
    overdueInvoices: company.invoicesReceived.filter(i => i.status === 'OVERDUE').length,
    totalInvoices: company.invoicesReceived.length,
  };

  const state = { activeLeads: [lead] };

  try {
    const result = await riskAgent.execute(state);
    return {
      companyId,
      companyName: company.name,
      riskScore: lead.riskAssessment?.riskScore || 0,
      riskLevel: lead.riskAssessment?.riskLevel || 'unknown',
      factors: lead.riskAssessment?.topRisks || [],
      flagged: lead.flagged || false,
      recommendation: lead.riskAssessment?.recommendation || 'Vérification manuelle requise',
    };
  } catch (err) {
    console.error('RiskAgent error:', err.message);
    return { companyId, riskScore: 0.5, riskLevel: 'unknown', factors: [], flagged: false, recommendation: 'Évaluation impossible' };
  }
}

/**
 * 📊 Status de tous les agents
 */
function getAgentsStatus() {
  return {
    initialized,
    agents: [
      { name: 'PRICING_ENGINE_V8', status: initialized ? 'active' : 'idle', stats: pricingEngine.getStats ? pricingEngine.getStats() : {} },
      { name: 'MATCHING_ENGINE_V8', status: initialized ? 'active' : 'idle', stats: matchingEngine.getStats ? matchingEngine.getStats() : {} },
      { name: 'RISK', status: initialized ? 'active' : 'idle', stats: riskAgent.stats || {} },
    ],
    timestamp: new Date().toISOString(),
  };
}

// === HELPERS ===

function calculateFallbackPrice(mission) {
  const distance = mission.distanceKm || 100;
  const baseRate = 1.45; // €/km moyen France
  const weightSurcharge = (mission.weightKg || 0) > 15000 ? 1.15 : 1.0;
  const adrSurcharge = mission.isADR ? 1.30 : 1.0;
  const frigoSurcharge = mission.requiresTemp ? 1.25 : 1.0;
  return Math.round(distance * baseRate * weightSurcharge * adrSurcharge * frigoSurcharge);
}

module.exports = {
  initAgents,
  estimatePrice,
  findMatches,
  assessCompanyRisk,
  getAgentsStatus,
};
