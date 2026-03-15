/**
 * 🔗 API INTEGRATIONS ROUTER — Marketplace Services Endpoints
 *
 * Exposes all external service integrations:
 * - Routing & Geocoding (OSRM, GraphHopper, API Adresse)
 * - Mission Matching Engine
 * - Dynamic Pricing
 * - ZFE Compliance
 * - Carbon Tracking
 * - GPS Tracking (Traccar)
 * - Stripe Connect (Marketplace Payments)
 *
 * Last updated: 15/03/2026
 */

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const env = require('../config/env');
const { authenticate } = require('../middleware/auth');
const { isAdmin, isChargeur, isTransporteur, isVerified } = require('../middleware/roles');

// Import services
const RoutingService = require('../../services/routing');
const PricingEngine = require('../../services/pricing-engine');
const MatchingEngine = require('../../services/matching-engine');
const ZFEComplianceService = require('../../services/zfe-compliance');
const CarbonCalculator = require('../../services/carbon-calculator');
const GPSTrackingService = require('../../services/gps-tracking');
const StripeConnectService = require('../../services/stripe-connect');

// Initialize services
const routingService = new RoutingService();
const pricingEngine = new PricingEngine();
const matchingEngine = new MatchingEngine(prisma);
const zfeService = new ZFEComplianceService();
const carbonService = new CarbonCalculator();
const gpsService = new GPSTrackingService(prisma);

let stripeService;
if (env.STRIPE_SECRET_KEY) {
  stripeService = new StripeConnectService();
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTING & GEOCODING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Geocode an address to coordinates
 * GET /geocode?q=address
 */
router.get('/geocode', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Address query required',
      });
    }

    const result = await routingService.geocode(q.trim());
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Geocoding error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Reverse geocode coordinates to address
 * GET /reverse-geocode?lat=48.8566&lon=2.3522
 */
router.get('/reverse-geocode', authenticate, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude required',
      });
    }

    const result = await routingService.reverseGeocode(parseFloat(lat), parseFloat(lon));
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Calculate route between two points
 * GET /route?origin_lat=48.8&origin_lon=2.3&dest_lat=49.0&dest_lon=2.5&vehicle_type=SEMI_BACHE
 */
router.get('/route', authenticate, async (req, res) => {
  try {
    const { origin_lat, origin_lon, dest_lat, dest_lon, vehicle_type } = req.query;

    if (!origin_lat || !origin_lon || !dest_lat || !dest_lon) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination coordinates required',
      });
    }

    const result = await routingService.calculateRoute({
      startLat: parseFloat(origin_lat),
      startLon: parseFloat(origin_lon),
      endLat: parseFloat(dest_lat),
      endLon: parseFloat(dest_lon),
      vehicleType: vehicle_type || 'SEMI_BACHE',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Route calculation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get full cost breakdown for a route
 * GET /route/cost?origin_lat=...&dest_lat=...&vehicle_type=...&total_weight_kg=...
 */
router.get('/route/cost', authenticate, async (req, res) => {
  try {
    const {
      origin_lat,
      origin_lon,
      dest_lat,
      dest_lon,
      vehicle_type,
      total_weight_kg,
    } = req.query;

    if (!origin_lat || !origin_lon || !dest_lat || !dest_lon) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates required',
      });
    }

    const route = await routingService.calculateRoute({
      startLat: parseFloat(origin_lat),
      startLon: parseFloat(origin_lon),
      endLat: parseFloat(dest_lat),
      endLon: parseFloat(dest_lon),
      vehicleType: vehicle_type || 'SEMI_BACHE',
    });

    const costBreakdown = routingService.calculateCostBreakdown(route, {
      vehicleType: vehicle_type || 'SEMI_BACHE',
      weightKg: total_weight_kg ? parseInt(total_weight_kg) : 1000,
    });

    res.json({
      success: true,
      data: {
        route,
        costBreakdown,
      },
    });
  } catch (error) {
    console.error('Cost calculation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MATCHING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get potential matches for a mission
 * GET /missions/:id/matches
 */
router.get('/missions/:id/matches', authenticate, isChargeur, async (req, res) => {
  try {
    const { id: missionId } = req.params;
    const { limit = 20 } = req.query;

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { client: true },
    });

    if (!mission || mission.clientId !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: 'Mission not found',
      });
    }

    const matches = await matchingEngine.findMatches(mission, parseInt(limit));

    res.json({
      success: true,
      data: {
        missionId,
        matchCount: matches.length,
        matches,
      },
    });
  } catch (error) {
    console.error('Matching error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Trigger batch matching (admin only)
 * POST /matching/run
 * Body: { batchSize?: 50, maxMinutesOld?: 30 }
 */
router.post('/matching/run', authenticate, isAdmin, async (req, res) => {
  try {
    const { batchSize = 50, maxMinutesOld = 30 } = req.body;

    const result = await matchingEngine.runBatchMatching(batchSize, maxMinutesOld);

    res.json({
      success: true,
      data: {
        missionsProcessed: result.length,
        totalMatches: result.reduce((sum, m) => sum + (m.matches?.length || 0), 0),
        detail: result.slice(0, 10), // First 10 for preview
      },
    });
  } catch (error) {
    console.error('Batch matching error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PRICING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate price for a mission
 * GET /missions/:id/price
 */
router.get('/missions/:id/price', authenticate, async (req, res) => {
  try {
    const { id: missionId } = req.params;

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { vehicle: true },
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission not found',
      });
    }

    const pricing = await pricingEngine.calculateMissionPrice(mission);

    res.json({
      success: true,
      data: {
        missionId,
        pricing,
      },
    });
  } catch (error) {
    console.error('Pricing error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get market rate for a lane/route
 * GET /pricing/market-rate?origin_city=...&dest_city=...&vehicle_type=...
 */
router.get('/pricing/market-rate', authenticate, async (req, res) => {
  try {
    const { origin_city, dest_city, vehicle_type } = req.query;

    if (!origin_city || !dest_city) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination cities required',
      });
    }

    const marketRate = await pricingEngine.getMarketRateForLane({
      originCity: origin_city,
      destinationCity: dest_city,
      vehicleType: vehicle_type || 'SEMI_BACHE',
    });

    res.json({
      success: true,
      data: marketRate,
    });
  } catch (error) {
    console.error('Market rate error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ZFE COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a route passes through ZFE (Zero Emission Zone)
 * GET /zfe/check?origin_lat=...&dest_lat=...&vehicle_euro_standard=EURO6
 */
router.get('/zfe/check', authenticate, async (req, res) => {
  try {
    const { origin_lat, origin_lon, dest_lat, dest_lon, vehicle_euro_standard } = req.query;

    if (!origin_lat || !origin_lon || !dest_lat || !dest_lon) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates required',
      });
    }

    const result = await zfeService.checkRouteCompliance({
      startLat: parseFloat(origin_lat),
      startLon: parseFloat(origin_lon),
      endLat: parseFloat(dest_lat),
      endLon: parseFloat(dest_lon),
      euroStandard: vehicle_euro_standard || 'EURO6',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('ZFE check error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get list of all ZFE zones in France
 * GET /zfe/zones
 */
router.get('/zfe/zones', authenticate, async (req, res) => {
  try {
    const zones = await zfeService.getZFEZones();

    res.json({
      success: true,
      data: {
        zoneCount: zones.length,
        zones,
      },
    });
  } catch (error) {
    console.error('ZFE zones error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Crit'Air badge for a vehicle
 * GET /vehicles/:id/critair
 */
router.get('/vehicles/:id/critair', authenticate, async (req, res) => {
  try {
    const { id: vehicleId } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        registration: true,
        euroStandard: true,
        make: true,
        model: true,
        year: true,
        fuelType: true,
      },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    const critair = zfeService.getCritAirLevel(vehicle);

    res.json({
      success: true,
      data: {
        vehicleId,
        vehicle,
        critair,
      },
    });
  } catch (error) {
    console.error('Crit\'Air error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CARBON TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate carbon footprint for a mission
 * GET /missions/:id/carbon
 */
router.get('/missions/:id/carbon', authenticate, async (req, res) => {
  try {
    const { id: missionId } = req.params;

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { vehicle: true },
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission not found',
      });
    }

    const carbonFootprint = await carbonService.calculateMissionCarbon(mission);

    res.json({
      success: true,
      data: {
        missionId,
        carbonFootprint,
      },
    });
  } catch (error) {
    console.error('Carbon calculation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get eco-score for a vehicle
 * GET /carbon/eco-score?vehicle_id=...
 */
router.get('/carbon/eco-score', authenticate, async (req, res) => {
  try {
    const { vehicle_id } = req.query;

    if (!vehicle_id) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID required',
      });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicle_id },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    const ecoScore = carbonService.calculateVehicleEcoScore(vehicle);

    res.json({
      success: true,
      data: {
        vehicleId: vehicle_id,
        ecoScore,
      },
    });
  } catch (error) {
    console.error('Eco-score error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GPS TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a GPS position (from Traccar)
 * POST /tracking/position
 * Body: { missionId?, vehicleId, driverId, lat, lon, speed?, heading?, accuracy? }
 */
router.post('/tracking/position', authenticate, isTransporteur, isVerified, async (req, res) => {
  try {
    const { missionId, vehicleId, driverId, lat, lon, speed, heading, accuracy } = req.body;

    if (!vehicleId || !driverId || lat === undefined || lon === undefined) {
      return res.status(400).json({
        success: false,
        error: 'vehicleId, driverId, lat, lon required',
      });
    }

    const result = await gpsService.recordPosition({
      missionId,
      vehicleId,
      driverId,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      speed: speed ? parseFloat(speed) : undefined,
      heading: heading ? parseFloat(heading) : undefined,
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Position recording error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get complete track for a mission
 * GET /missions/:id/track
 */
router.get('/missions/:id/track', authenticate, async (req, res) => {
  try {
    const { id: missionId } = req.params;
    const { limit = 1000 } = req.query;

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission not found',
      });
    }

    // Check access: client or assigned transporteur
    if (
      mission.clientId !== req.user.id &&
      !mission.driverId &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const track = await gpsService.getMissionTrack(missionId, parseInt(limit));
    const stats = await gpsService.getMissionGPSStats(missionId);

    res.json({
      success: true,
      data: {
        missionId,
        positionCount: track.length,
        positions: track,
        stats,
      },
    });
  } catch (error) {
    console.error('Track retrieval error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get ETA for a mission
 * GET /missions/:id/eta?avg_speed_kmh=70
 */
router.get('/missions/:id/eta', authenticate, async (req, res) => {
  try {
    const { id: missionId } = req.params;
    const { avg_speed_kmh = 70 } = req.query;

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission not found',
      });
    }

    const eta = await gpsService.calculateETA(missionId, parseFloat(avg_speed_kmh));

    res.json({
      success: true,
      data: {
        missionId,
        eta,
      },
    });
  } catch (error) {
    console.error('ETA calculation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get live positions for multiple missions (dashboard)
 * GET /tracking/live?mission_ids=id1,id2,id3
 */
router.get('/tracking/live', authenticate, async (req, res) => {
  try {
    const { mission_ids } = req.query;

    if (!mission_ids) {
      return res.status(400).json({
        success: false,
        error: 'mission_ids query parameter required (comma-separated)',
      });
    }

    const missionIds = mission_ids.split(',').map((id) => id.trim());
    const positions = await gpsService.getLivePositions(missionIds);

    res.json({
      success: true,
      data: {
        requestedMissions: missionIds.length,
        missionsWithPositions: Object.keys(positions).length,
        positions,
      },
    });
  } catch (error) {
    console.error('Live positions error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE CONNECT (MARKETPLACE PAYMENTS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start carrier onboarding with Stripe Connect
 * POST /stripe/onboard
 * Body: { carrierId, returnUrl }
 */
router.post('/stripe/onboard', authenticate, isTransporteur, isVerified, async (req, res) => {
  try {
    if (!stripeService) {
      return res.status(503).json({
        success: false,
        error: 'Stripe not configured',
      });
    }

    const { carrierId, returnUrl } = req.body;

    if (!carrierId || !returnUrl) {
      return res.status(400).json({
        success: false,
        error: 'carrierId and returnUrl required',
      });
    }

    // Verify the carrier is the authenticated user
    if (carrierId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Can only onboard yourself',
      });
    }

    const carrier = await prisma.user.findUnique({
      where: { id: carrierId },
      include: { company: true },
    });

    if (!carrier || carrier.role !== 'TRANSPORTEUR') {
      return res.status(404).json({
        success: false,
        error: 'Carrier not found',
      });
    }

    // Check if already has Stripe account
    let stripeAccountId = carrier.stripeAccountId;

    if (!stripeAccountId) {
      const accountResult = await stripeService.createConnectedAccount(carrier);
      stripeAccountId = accountResult.stripeAccountId;

      // Save to DB
      await prisma.user.update({
        where: { id: carrierId },
        data: { stripeAccountId },
      });
    }

    // Create onboarding link
    const onboarding = await stripeService.createOnboardingLink(
      stripeAccountId,
      carrierId,
      returnUrl
    );

    res.json({
      success: true,
      data: {
        onboardingUrl: onboarding.url,
        expiresAt: onboarding.expiresAt,
        stripeAccountId,
      },
    });
  } catch (error) {
    console.error('Onboarding error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Check carrier's Stripe account status
 * GET /stripe/account-status
 */
router.get('/stripe/account-status', authenticate, isTransporteur, async (req, res) => {
  try {
    if (!stripeService) {
      return res.status(503).json({
        success: false,
        error: 'Stripe not configured',
      });
    }

    const carrier = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, stripeAccountId: true },
    });

    if (!carrier?.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Not onboarded to Stripe',
      });
    }

    const status = await stripeService.getAccountStatus(carrier.stripeAccountId);

    res.json({
      success: true,
      data: {
        carrierId: req.user.id,
        stripeAccountId: carrier.stripeAccountId,
        status,
      },
    });
  } catch (error) {
    console.error('Account status error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Stripe webhook endpoint (no auth required)
 * POST /stripe/webhook
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripeService || !env.STRIPE_WEBHOOK_SECRET) {
      return res.status(200).send();
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({
        success: false,
        error: 'Invalid signature',
      });
    }

    const result = await stripeService.handleWebhookEvent(event, prisma);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Health check for API integrations
 * GET /health
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      routing: 'ok',
      pricing: 'ok',
      matching: 'ok',
      zfe: 'ok',
      carbon: 'ok',
      gps: 'ok',
      stripe: stripeService ? 'ok' : 'unavailable',
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
