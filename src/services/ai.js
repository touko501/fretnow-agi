/**
 * FRETNOW AI Service — Bridge entre agents IA et base de données Prisma
 * Connecte PricingAgent, MatcherAgent, RiskAgent au serveur production
 */

const prisma = require('../config/database');
const PricingAgent = require('../../agents/pricing');
const MatcherAgent = require('../../agents/matcher');
const RiskAgent = require('../../agents/risk');

// Instancier les agents
const pricingAgent = new PricingAgent();
const matcherAgent = new MatcherAgent();
const riskAgent = new RiskAgent();

// Initialiser
let initialized = false;
async function initAgents() {
  if (initialized) return;
  await pricingAgent.init();
  await matcherAgent.init();
  await riskAgent.init();
  initialized = true;
  console.log('🤖 AI Agents initialisés (Pricing, Matcher, Risk)');
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

  // Récupérer les indices CNR récents
  const cnrIndices = await prisma.cnrIndex.findMany({
    orderBy: { month: 'desc' }, take: 1
  });

  // Construire l'objet mission pour l'agent
  const missionData = {
    id: mission.id,
    pickup: { city: mission.pickupCity, postalCode: mission.pickupPostalCode, lat: mission.pickupLat, lon: mission.pickupLon },
    delivery: { city: mission.deliveryCity, postalCode: mission.deliveryPostalCode, lat: mission.deliveryLat, lon: mission.deliveryLon },
    distance: mission.distanceKm || 0,
    weight: mission.weightKg || 0,
    volume: mission.volumeM3 || 0,
    pallets: mission.palletCount || 0,
    vehicleType: mapVehicleType(mission.vehicleTypeRequired),
    isADR: mission.isADR,
    requiresTemp: mission.requiresTemp,
    isFragile: mission.isFragile,
    pickupDate: mission.pickupDateRequested,
    deliveryDate: mission.deliveryDateRequested,
  };

  // Récupérer les prix historiques pour des routes similaires
  const historicalPrices = await prisma.mission.findMany({
    where: {
      status: { in: ['COMPLETED', 'DELIVERED'] },
      pickupPostalCode: { startsWith: mission.pickupPostalCode?.substring(0, 2) },
      deliveryPostalCode: { startsWith: mission.deliveryPostalCode?.substring(0, 2) },
      finalPriceCents: { not: null },
      deletedAt: null,
    },
    select: { finalPriceCents: true, distanceKm: true, weightKg: true, vehicleTypeRequired: true },
    orderBy: { completedAt: 'desc' },
    take: 20,
  });

  const marketConditions = {
    cnr: cnrIndices[0] || null,
    historicalPrices: historicalPrices.map(p => ({
      price: p.finalPriceCents / 100,
      distance: p.distanceKm,
      pricePerKm: p.distanceKm > 0 ? (p.finalPriceCents / 100) / p.distanceKm : 0,
    })),
    demand: await getDemandFactor(mission.pickupPostalCode),
  };

  const state = { pendingMissions: [missionData], marketConditions };

  try {
    const result = await pricingAgent.execute(state);
    const quote = missionData.price || missionData.priceBreakdown;

    // Sauvegarder l'estimation
    if (missionData.price) {
      await prisma.mission.update({
        where: { id: missionId },
        data: { estimatedPriceCents: Math.round(missionData.price * 100) }
      });
    }

    return {
      estimatedPrice: missionData.price,
      breakdown: missionData.priceBreakdown,
      confidence: result.confidence || 'medium',
      basedOn: historicalPrices.length + ' missions similaires',
    };
  } catch (err) {
    console.error('PricingAgent error:', err.message);
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

  // Récupérer les transporteurs actifs avec véhicules compatibles
  const transporteurs = await prisma.user.findMany({
    where: {
      role: 'TRANSPORTEUR',
      status: 'ACTIVE',
      deletedAt: null,
      company: { isVerified: true },
    },
    include: {
      company: {
        include: {
          vehicles: {
            where: { isActive: true },
            select: { id: true, type: true, capacityKg: true, volumeM3: true, palletSpots: true, hasTailLift: true, hasADR: true, tempMin: true, tempMax: true },
          },
          drivers: { where: { isActive: true }, select: { id: true, adrCertified: true } },
        }
      },
      ratingsReceived: { select: { score: true } },
      bids: {
        where: { status: 'ACCEPTED' },
        select: { id: true },
        take: 50,
      },
    },
  });

  // Construire les objets pour le MatcherAgent
  const missionData = {
    id: mission.id,
    status: 'pending',
    pickup: { city: mission.pickupCity, postalCode: mission.pickupPostalCode, lat: mission.pickupLat, lon: mission.pickupLon },
    delivery: { city: mission.deliveryCity, postalCode: mission.deliveryPostalCode, lat: mission.deliveryLat, lon: mission.deliveryLon },
    distance: mission.distanceKm || 0,
    weight: mission.weightKg || 0,
    volume: mission.volumeM3 || 0,
    pallets: mission.palletCount || 0,
    vehicleType: mapVehicleType(mission.vehicleTypeRequired),
    isADR: mission.isADR,
    requiresTemp: mission.requiresTemp,
    pickupDate: mission.pickupDateRequested,
  };

  const availableTransporters = transporteurs.map(t => ({
    id: t.id,
    companyId: t.companyId,
    status: 'active',
    company: t.company?.name,
    city: t.company?.city,
    lat: t.company?.lat,
    lon: t.company?.lon,
    vehicles: (t.company?.vehicles || []).map(v => ({
      type: v.type,
      capacity: v.capacityKg,
      volume: v.volumeM3,
      pallets: v.palletSpots,
      hasADR: v.hasADR,
      hasTailLift: v.hasTailLift,
    })),
    hasADRDriver: (t.company?.drivers || []).some(d => d.adrCertified),
    rating: t.ratingsReceived.length > 0
      ? t.ratingsReceived.reduce((a, r) => a + r.score, 0) / t.ratingsReceived.length
      : null,
    completedMissions: t.bids.length,
  }));

  const state = {
    pendingMissions: [missionData],
    activeLeads: availableTransporters,
  };

  try {
    const result = await matcherAgent.execute(state);
    return {
      matches: (result.topMatches || []).slice(0, 10).map(m => ({
        transporteurId: m.transporter?.id,
        company: m.transporter?.company,
        score: Math.round(m.score * 100),
        factors: m.factors,
        estimatedAcceptance: m.estimatedAcceptance,
      })),
      totalCandidates: availableTransporters.length,
      summary: result.summary,
    };
  } catch (err) {
    console.error('MatcherAgent error:', err.message);
    // Fallback: retourner les transporteurs triés par note
    return {
      matches: availableTransporters
        .filter(t => t.rating)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 10)
        .map(t => ({ transporteurId: t.id, company: t.company, score: Math.round((t.rating || 3) * 20), factors: { method: 'fallback-rating' } })),
      totalCandidates: availableTransporters.length,
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
      { name: 'PRICING', status: initialized ? 'active' : 'idle', stats: pricingAgent.stats },
      { name: 'MATCHER', status: initialized ? 'active' : 'idle', stats: matcherAgent.stats },
      { name: 'RISK', status: initialized ? 'active' : 'idle', stats: riskAgent.stats },
    ],
    timestamp: new Date().toISOString(),
  };
}

// === HELPERS ===

function mapVehicleType(prismaType) {
  if (!prismaType) return 'PL';
  if (prismaType.startsWith('FOURGON')) return 'VUL';
  if (prismaType.startsWith('PORTEUR')) return 'PL';
  if (prismaType.startsWith('SEMI_FRIGO')) return 'FRIGO';
  if (prismaType.startsWith('SEMI')) return 'SPL';
  return 'PL';
}

function calculateFallbackPrice(mission) {
  const distance = mission.distanceKm || 100;
  const baseRate = 1.45; // €/km moyen France
  const weightSurcharge = (mission.weightKg || 0) > 15000 ? 1.15 : 1.0;
  const adrSurcharge = mission.isADR ? 1.30 : 1.0;
  const frigoSurcharge = mission.requiresTemp ? 1.25 : 1.0;
  return Math.round(distance * baseRate * weightSurcharge * adrSurcharge * frigoSurcharge);
}

async function getDemandFactor(postalCode) {
  if (!postalCode) return 1.0;
  const dept = postalCode.substring(0, 2);
  const recentMissions = await prisma.mission.count({
    where: {
      pickupPostalCode: { startsWith: dept },
      status: { in: ['PUBLISHED', 'BIDDING'] },
      deletedAt: null,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    }
  });
  // Normaliser: >10 missions/semaine = forte demande
  return Math.min(1.5, Math.max(0.8, 1.0 + (recentMissions - 5) * 0.05));
}

module.exports = {
  initAgents,
  estimatePrice,
  findMatches,
  assessCompanyRisk,
  getAgentsStatus,
};
