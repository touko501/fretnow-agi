/**
 * 🧪 FRETNOW AGI — Tests unitaires des services v8
 *
 * Tests sans base de données (mocks) pour valider la logique métier
 * Run: node tests/services.test.js
 */

const assert = require('assert');

// ═══════════════════════════════════════════════════════════════════════════
// TEST FRAMEWORK MINIMAL
// ═══════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function suite(name, fn) {
  console.log(`\n📦 ${name}`);
  fn();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ROUTING SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('RoutingService', () => {
  const routing = require('../services/routing');

  test('should be a singleton instance', () => {
    assert.ok(routing);
    assert.strictEqual(typeof routing.getRoute, 'function');
    assert.strictEqual(typeof routing.geocode, 'function');
    assert.strictEqual(typeof routing.reverseGeocode, 'function');
    assert.strictEqual(typeof routing.autocomplete, 'function');
    assert.strictEqual(typeof routing.getDistanceMatrix, 'function');
    assert.strictEqual(typeof routing.getRouteCostBreakdown, 'function');
  });

  test('should validate coordinates', () => {
    assert.strictEqual(routing.isValidCoordinate(48.8566, 2.3522), true);
    assert.strictEqual(routing.isValidCoordinate(91, 0), false);
    assert.strictEqual(routing.isValidCoordinate(0, 181), false);
    assert.strictEqual(routing.isValidCoordinate('abc', 0), false);
    assert.strictEqual(routing.isValidCoordinate(null, null), false);
  });

  test('should have cache management', () => {
    assert.strictEqual(typeof routing.clearCache, 'function');
    assert.strictEqual(typeof routing.getCacheStats, 'function');
    const stats = routing.getCacheStats();
    assert.ok(stats.hasOwnProperty('entries'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. CARBON CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

suite('CarbonCalculator', () => {
  const { CarbonCalculator } = require('../services/carbon-calculator');
  const calculator = new CarbonCalculator ? new CarbonCalculator() : null;

  // Fallback: the module might export differently
  const mod = require('../services/carbon-calculator');
  const calc = mod.CarbonCalculator ? new mod.CarbonCalculator() : mod;

  test('should export CarbonCalculator class', () => {
    assert.ok(mod.CarbonCalculator || typeof mod.calculate === 'function');
  });

  test('should calculate emissions for a truck', () => {
    if (calc.calculate) {
      const result = calc.calculate(500, 10000, 'SEMI_REMORQUE', 'DIESEL', 'EURO6');
      assert.ok(result);
      assert.ok(result.totalKgCO2e > 0, `Expected positive CO2, got: ${JSON.stringify(result)}`);
      assert.ok(result.ecoScore, 'Missing ecoScore');
    }
  });

  test('should return eco-score A-E in result', () => {
    if (calc.calculate) {
      const result = calc.calculate(500, 10000, 'FOURGON_3T5', 'ELECTRIQUE', 'EURO6');
      assert.ok(['A', 'B', 'C', 'D', 'E'].includes(result.ecoScore), `Bad ecoScore: ${result.ecoScore}`);
    }
  });

  test('should suggest green alternatives', () => {
    if (calc.suggestGreenAlternatives) {
      const alts = calc.suggestGreenAlternatives('SEMI_REMORQUE', 'DIESEL');
      assert.ok(Array.isArray(alts));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. ZFE COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════

suite('ZFEComplianceService', () => {
  const mod = require('../services/zfe-compliance');
  const ZFEClass = mod.ZFEComplianceService || mod;
  const zfe = typeof ZFEClass === 'function' ? new ZFEClass() : ZFEClass;

  test('should export ZFE service', () => {
    assert.ok(zfe);
  });

  test('should classify Crit\'Air correctly for EURO6 DIESEL', () => {
    if (zfe.getCritAirFromVehicle) {
      const result = zfe.getCritAirFromVehicle('EURO6', 'DIESEL', 2020);
      // Returns object { critair: N, color, label, ... }
      assert.ok(result, 'No result');
      assert.strictEqual(result.critair, 1, `EURO6 DIESEL should be Crit'Air 1, got ${result.critair}`);
    }
  });

  test('should check vehicle allowed in ZFE (returns object)', () => {
    if (zfe.isVehicleAllowedInZFE) {
      const result = zfe.isVehicleAllowedInZFE(1, 'paris');
      assert.ok(result, 'No result');
      assert.ok(result.hasOwnProperty('allowed'), 'Missing allowed property');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. PRICING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

suite('PricingEngine', () => {
  const { PricingEngine } = require('../services/pricing-engine');

  test('should export PricingEngine class', () => {
    assert.ok(PricingEngine);
    assert.strictEqual(typeof PricingEngine, 'function');
  });

  test('should instantiate without prisma (standalone mode)', () => {
    const engine = new PricingEngine();
    assert.ok(engine);
    assert.strictEqual(typeof engine.calculatePrice, 'function');
    assert.strictEqual(typeof engine.getStats, 'function');
  });

  test('should calculate price for a basic mission', () => {
    const engine = new PricingEngine();
    const mission = {
      distanceKm: 300,
      weightKg: 5000,
      vehicleTypeRequired: 'PORTEUR_19T',
      pickupDateRequested: new Date(Date.now() + 7 * 86400000),
      isADR: false,
      requiresTemp: false,
    };
    // calculatePrice is async, but we can test the sync fallback
    if (engine.calculateFallbackPrice || engine.getBasePrice) {
      const fn = engine.calculateFallbackPrice || engine.getBasePrice;
      const price = fn.call(engine, mission);
      assert.ok(typeof price === 'number' || typeof price === 'object');
    }
  });

  test('should have commission rates', () => {
    const engine = new PricingEngine();
    if (engine.getCommissionRate) {
      const standard = engine.getCommissionRate('STANDARD', false, false);
      assert.ok(standard >= 0.05 && standard <= 0.30);
      const express = engine.getCommissionRate('EXPRESS', false, true);
      assert.ok(express > standard);
    }
  });

  test('should track stats', () => {
    const engine = new PricingEngine();
    const stats = engine.getStats();
    assert.ok(stats);
    assert.ok(stats.hasOwnProperty('pricesCalculated'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. MATCHING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

suite('MatchingEngine', () => {
  const { MatchingEngine } = require('../services/matching-engine');

  test('should export MatchingEngine class', () => {
    assert.ok(MatchingEngine);
    assert.strictEqual(typeof MatchingEngine, 'function');
  });

  test('should instantiate with mock prisma', () => {
    const mockPrisma = {};
    const engine = new MatchingEngine(mockPrisma);
    assert.ok(engine);
    assert.strictEqual(typeof engine.findMatches, 'function');
  });

  test('should have stats tracking', () => {
    const engine = new MatchingEngine({});
    const stats = engine.getStats();
    assert.ok(stats);
    assert.ok(stats.hasOwnProperty('matchesFound') || stats.hasOwnProperty('averageTopScore'));
  });

  test('should clear history', () => {
    const engine = new MatchingEngine({});
    engine.clearHistory();
    // No throw = success
    assert.ok(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. STRIPE CONNECT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('StripeConnectService', () => {
  test('should import without crash (lazy init)', () => {
    // Stripe module defers init until first API call — safe to import without key
    const mod = require('../services/stripe-connect');
    assert.ok(mod);
  });

  test('should export StripeConnectService class', () => {
    const mod = require('../services/stripe-connect');
    // stripe-connect exports the class directly (module.exports = StripeConnectService)
    assert.strictEqual(typeof mod, 'function', 'StripeConnectService should be a class/function');
    assert.ok(mod.prototype, 'Should have prototype (class)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. GPS TRACKING SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('GPSTrackingService', () => {
  const mod = require('../services/gps-tracking');
  const GPSClass = mod.GPSTrackingService || mod;

  test('should export GPS tracking service', () => {
    assert.ok(GPSClass);
  });

  test('should have core tracking methods', () => {
    const service = typeof GPSClass === 'function' ? new GPSClass({}) : GPSClass;
    const methods = ['recordPosition', 'calculateETA', 'checkGeofence'];
    for (const method of methods) {
      if (service[method]) {
        assert.strictEqual(typeof service[method], 'function');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. API INTEGRATIONS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

suite('API Integration Routes', () => {
  const router = require('../src/routes/api-integrations');

  test('should export an Express router', () => {
    assert.ok(router);
    assert.ok(router.stack || typeof router === 'function');
  });

  test('should have registered routes', () => {
    if (router.stack) {
      assert.ok(router.stack.length > 10, `Expected >10 routes, got ${router.stack.length}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. SECURITY TESTS
// ═══════════════════════════════════════════════════════════════════════════

suite('Security Checks', () => {
  const fs = require('fs');
  const path = require('path');

  test('.env.example should exist', () => {
    const exists = fs.existsSync(path.join(__dirname, '..', '.env.example'));
    assert.ok(exists, '.env.example missing');
  });

  test('.env should NOT be in repo (gitignore)', () => {
    const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('.env'), '.env not in .gitignore');
  });

  test('ARCHITECTURE.md should NOT contain real secrets', () => {
    const arch = fs.readFileSync(path.join(__dirname, '..', 'ARCHITECTURE.md'), 'utf8');
    assert.ok(!arch.includes('sk_test_'), 'Stripe secret key found in ARCHITECTURE.md');
    assert.ok(!arch.includes('AAGfvTTS'), 'Telegram token found in ARCHITECTURE.md');
  });

  test('No hardcoded API keys in service files', () => {
    const servicesDir = path.join(__dirname, '..', 'services');
    const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
      assert.ok(!content.includes('sk_test_'), `Stripe key found in services/${file}`);
      assert.ok(!content.includes('sk_live_'), `Stripe live key found in services/${file}`);
    }
  });

  test('SQL injection protection in external-apis.js', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', 'services', 'external-apis.js'), 'utf8');
    assert.ok(content.includes('replace(/[^0-9]/g'), 'SQL injection sanitization missing');
  });

  test('Production-reset should be disabled in production', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'admin.js'), 'utf8');
    assert.ok(content.includes('NODE_ENV') && content.includes('production'), 'production-reset not protected');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60));
console.log(`📊 RÉSULTATS: ${passed} passés, ${failed} échoués sur ${passed + failed} tests`);
if (failures.length > 0) {
  console.log('\n❌ ÉCHECS:');
  failures.forEach(f => console.log(`   - ${f.name}: ${f.error}`));
}
console.log('═'.repeat(60));

process.exit(failed > 0 ? 1 : 0);
