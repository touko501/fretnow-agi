/**
 * 🌱 CARBON CALCULATOR SERVICE — Empreinte Carbone Transport
 *
 * Calcul de l'empreinte carbone pour chaque trajet basé sur les données ADEME.
 * Intégration de la Base Carbone officielle pour facteurs d'émission.
 *
 * Données utilisées:
 * - Facteurs d'émission ADEME (gCO2e/t.km) par type véhicule + carburant
 * - Comparaisons vs rail, vs moyenne industrie
 * - Notation écologique A-E (style étiquette alimentaire)
 * - Estimation coût compensation CO2 (marché volontaire)
 *
 * Sources:
 * - Base Carbone ADEME v3 (2026): https://bilans-ges.ademe.fr/
 * - Données de transport routier marchandises
 * - Facteurs lifecycle (puit-à-roue)
 *
 * Dernière mise à jour: 15/03/2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// ADEME EMISSION FACTORS — Base Carbone Officielle
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Facteurs d'émission ADEME (gCO2e/t.km)
 * Valeurs pour transport routier marchandises
 * Source: Base Carbone ADEME 2026
 */
const EMISSION_FACTORS = {
  // ▶ Diesel (véhicules conventionnels)
  DIESEL: {
    EURO_1: 155,      // Avant 1997 — très polluant
    EURO_2: 145,      // 1997-2000
    EURO_3: 125,      // 2001-2005
    EURO_4: 100,      // 2006-2010
    EURO_5: 85,       // 2011-2014
    EURO_6: 82        // 2015+ — référence secteur
  },

  // ▶ Essence (rare pour poids lourds)
  GASOLINE: {
    EURO_1: 165,
    EURO_2: 155,
    EURO_3: 140,
    EURO_4: 120,
    EURO_5: 95,
    EURO_6: 90
  },

  // ▶ Gaz naturel (GNV)
  GNV: {
    EURO_4: 95,
    EURO_5: 85,
    EURO_6: 80,       // ~8% réduction vs diesel
    BIO_GNV: 20       // Gaz naturel renouvelable — ~80% réduction
  },

  // ▶ Biocarburants
  HVO100: 15,         // Hydrogenated Vegetable Oil — ~82% réduction vs diesel
  BIOETHANOL: 45,     // Éthanol — ~60% réduction
  BIODIESEL: 35,      // Biodiesel — ~60% réduction

  // ▶ Électrique (facteur lié au mix électrique français)
  ELECTRIC: 4,        // Très bas grâce au mix nucléaire français

  // ▶ Hydrogène (production + distribution)
  HYDROGEN: 3,        // Hydrogène vert — quasi zéro avec production verte

  // ▶ Hybride (moyenne diesel + électrique)
  HYBRID: {
    EURO_5: 50,       // Moitié diesel
    EURO_6: 45
  },

  // ▶ Autres carburants
  LPG: {
    EURO_4: 105,
    EURO_5: 90,
    EURO_6: 85
  }
};

/**
 * Facteurs comparatifs pour contexte
 */
const COMPARATIVE_FACTORS = {
  RAIL: 5.4,          // SNCF — très efficace
  AIR: 250,           // Aviation commerciale — très polluant
  MARITIME: 8,        // Bateau porte-conteneurs — éco-efficient
  ROAD_AVERAGE: 110   // Moyenne actuelle transport routier FR
};

/**
 * Système d'éco-score (A-E)
 */
const ECO_SCORE_RANGES = {
  A: {
    minFactor: 0,
    maxFactor: 15,
    label: 'Excellent',
    description: 'Électrique, hydrogène ou biocarburant avancé',
    color: '#2E7D32'
  },
  B: {
    minFactor: 15,
    maxFactor: 40,
    label: 'Très bon',
    description: 'Biocarburant HVO100 ou GNV renouvelable',
    color: '#558B2F'
  },
  C: {
    minFactor: 40,
    maxFactor: 85,
    label: 'Bon',
    description: 'Euro 6 diesel/essence moderne',
    color: '#F57F17'
  },
  D: {
    minFactor: 85,
    maxFactor: 130,
    label: 'Passable',
    description: 'Euro 4-5 diesel/essence',
    color: '#E65100'
  },
  E: {
    minFactor: 130,
    maxFactor: 300,
    label: 'Très polluant',
    description: 'Euro 1-3 ou ancien carburant',
    color: '#C62828'
  }
};

/**
 * Prix de compensation CO2 (marché volontaire)
 * Moyenne 2026: ~25€/tCO2
 */
const CARBON_OFFSET_PRICE_EUR_PER_TONNE = 25;

// ═══════════════════════════════════════════════════════════════════════════
// CARBON CALCULATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

class CarbonCalculator {
  constructor() {
    this.emissionFactors = EMISSION_FACTORS;
    this.comparativeFactors = COMPARATIVE_FACTORS;
    this.ecoScoreRanges = ECO_SCORE_RANGES;
    this.offsetPrice = CARBON_OFFSET_PRICE_EUR_PER_TONNE;
    this.cache = new Map();
  }

  /**
   * Récupère le facteur d'émission pour une combinaison véhicule/carburant
   * @param {string} vehicleType - Type de véhicule (DIESEL, ELECTRIC, GNV, etc.)
   * @param {string} fuelType - Type carburant (diesel, essence, electric, gnv, hydrogen, hvo100, etc.)
   * @returns {number} Facteur en gCO2e/t.km
   */
  getEmissionFactor(vehicleType, fuelType) {
    const fuel = fuelType.toUpperCase().trim();
    const vehicle = vehicleType.toUpperCase().trim();

    // Carburants spécialisés (biocarburants)
    if (fuel === 'HVO100') return EMISSION_FACTORS.HVO100;
    if (fuel === 'BIOETHANOL') return EMISSION_FACTORS.BIOETHANOL;
    if (fuel === 'BIODIESEL') return EMISSION_FACTORS.BIODIESEL;
    if (fuel === 'ELECTRIC') return EMISSION_FACTORS.ELECTRIC;
    if (fuel === 'HYDROGEN') return EMISSION_FACTORS.HYDROGEN;

    // Défaut
    console.warn(`Combinaison inconnue: ${vehicle}/${fuel}`);
    return EMISSION_FACTORS.DIESEL.EURO_6; // Défaut sûr
  }

  /**
   * Récupère le facteur d'émission avec norme Euro
   * @param {string} vehicleType - Type (DIESEL, GASOLINE, GNV, etc.)
   * @param {number} euroNorm - Norme Euro (1-6)
   * @returns {number} Facteur en gCO2e/t.km
   */
  getEmissionFactorWithEuro(vehicleType, euroNorm) {
    const type = vehicleType.toUpperCase().trim();
    const euro = `EURO_${Math.min(Math.max(euroNorm, 1), 6)}`;

    if (EMISSION_FACTORS[type] && EMISSION_FACTORS[type][euro]) {
      return EMISSION_FACTORS[type][euro];
    }

    // Fallback
    return EMISSION_FACTORS.DIESEL.EURO_6;
  }

  /**
   * Calcule l'empreinte carbone d'un trajet
   * @param {number} distanceKm - Distance en km
   * @param {number} weightKg - Poids total en kg
   * @param {string} vehicleType - Type de véhicule (DIESEL, ELECTRIC, GNV, etc.)
   * @param {string} fuelType - Type carburant
   * @param {number} euroNorm - Norme Euro (1-6)
   * @returns {Object} Détail complet des émissions
   */
  calculate(distanceKm, weightKg, vehicleType, fuelType, euroNorm = 6) {
    if (distanceKm <= 0 || weightKg <= 0) {
      return { error: 'Distance et poids doivent être positifs' };
    }

    // Convertir poids en tonnes
    const weightTonnes = weightKg / 1000;

    // Récupérer facteur d'émission
    let emissionFactor;
    if (fuelType.toUpperCase() === 'DIESEL' ||
        fuelType.toUpperCase() === 'GASOLINE' ||
        fuelType.toUpperCase() === 'GNV' ||
        fuelType.toUpperCase() === 'HYBRID' ||
        fuelType.toUpperCase() === 'LPG') {
      emissionFactor = this.getEmissionFactorWithEuro(fuelType, euroNorm);
    } else {
      emissionFactor = this.getEmissionFactor(vehicleType, fuelType);
    }

    // Calcul: distance (km) × poids (t) × facteur (gCO2e/t.km)
    const totalGramsCO2e = distanceKm * weightTonnes * emissionFactor;
    const totalKgCO2e = totalGramsCO2e / 1000;
    const totalTonnesCO2e = totalKgCO2e / 1000;

    // Facteur par tonne-km
    const perTonKm = emissionFactor;

    // Éco-score
    const ecoScore = this.getEcoScore(vehicleType, fuelType, euroNorm);

    // Coûts de compensation
    const offsetCostEur = Math.round(totalTonnesCO2e * this.offsetPrice * 100) / 100;

    // Comparaisons
    const railEmissions = distanceKm * weightTonnes * COMPARATIVE_FACTORS.RAIL;
    const railEmissionsKg = railEmissions / 1000;

    const avgEmissions = distanceKm * weightTonnes * COMPARATIVE_FACTORS.ROAD_AVERAGE;
    const avgEmissionsKg = avgEmissions / 1000;

    const bestEmissions = distanceKm * weightTonnes * EMISSION_FACTORS.ELECTRIC;
    const bestEmissionsKg = bestEmissions / 1000;

    return {
      // Résultats principaux
      totalKgCO2e: Math.round(totalKgCO2e * 100) / 100,
      totalTonnesCO2e: Math.round(totalTonnesCO2e * 10000) / 10000,
      perTonKm,

      // Éco-score
      ecoScore: ecoScore.score,
      ecoLabel: ecoScore.label,
      ecoDescription: ecoScore.description,
      ecoColor: ecoScore.color,

      // Compensation carbone
      offsetCostEur,
      offsetTonnesRequired: Math.round(totalTonnesCO2e * 100) / 100,

      // Comparaisons
      comparison: {
        vsRail: {
          railKgCO2e: Math.round(railEmissionsKg * 100) / 100,
          ratio: Math.round((totalKgCO2e / railEmissionsKg) * 10) / 10,
          message: `${Math.round((totalKgCO2e / railEmissionsKg) * 10) / 10}x plus polluant que le rail`
        },
        vsAverage: {
          avgKgCO2e: Math.round(avgEmissionsKg * 100) / 100,
          ratio: Math.round((totalKgCO2e / avgEmissionsKg) * 10) / 10,
          message: totalKgCO2e < avgEmissionsKg ? 'Meilleur que la moyenne' : 'Au-dessus de la moyenne'
        },
        vsBest: {
          bestKgCO2e: Math.round(bestEmissionsKg * 100) / 100,
          ratio: Math.round((totalKgCO2e / bestEmissionsKg) * 10) / 10,
          message: `Électrique réduirait de ${Math.round(((totalKgCO2e - bestEmissionsKg) / totalKgCO2e) * 100)}%`
        }
      },

      // Détails du calcul
      calculation: {
        distance: distanceKm,
        weight: weightKg,
        weightTonnes: Math.round(weightTonnes * 1000) / 1000,
        vehicleType,
        fuelType,
        euroNorm,
        emissionFactor
      },

      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Détermine l'éco-score (A-E) basé sur facteur d'émission
   * @param {string} vehicleType - Type de véhicule
   * @param {string} fuelType - Type carburant
   * @param {number} euroNorm - Norme Euro
   * @returns {Object} { score: 'A'-'E', label, description, color }
   */
  getEcoScore(vehicleType, fuelType, euroNorm = 6) {
    const factor = euroNorm
      ? this.getEmissionFactorWithEuro(fuelType, euroNorm)
      : this.getEmissionFactor(vehicleType, fuelType);

    for (const [score, range] of Object.entries(ECO_SCORE_RANGES)) {
      if (factor >= range.minFactor && factor <= range.maxFactor) {
        return {
          score,
          label: range.label,
          description: range.description,
          color: range.color,
          factor: Math.round(factor),
          range: `${range.minFactor}-${range.maxFactor} gCO2e/t.km`
        };
      }
    }

    // Fallback si facteur hors plage
    return ECO_SCORE_RANGES.E;
  }

  /**
   * Suggère des alternatives vertes avec impact carbone estimé
   * @param {string} vehicleType - Type actuel
   * @param {string} fuelType - Carburant actuel
   * @returns {Array} Suggestions avec réductions CO2
   */
  suggestGreenAlternatives(vehicleType, fuelType) {
    const currentFactor = this.getEmissionFactor(vehicleType, fuelType);
    const alternatives = [];

    // 1. Électrique
    alternatives.push({
      name: 'Véhicule électrique',
      fuel: 'ELECTRIC',
      factor: EMISSION_FACTORS.ELECTRIC,
      reduction: {
        absolute: currentFactor - EMISSION_FACTORS.ELECTRIC,
        percentage: Math.round(((currentFactor - EMISSION_FACTORS.ELECTRIC) / currentFactor) * 100)
      },
      advantages: [
        'Zéro émission directe',
        'Autonomie 200-400km (suffisant pour collectes)',
        'Réduction maintenance'
      ],
      challenges: [
        'Investissement initial élevé (80k-150k€)',
        'Infrastructure recharge requise',
        'Payload réduit (capacité batterie)'
      ],
      timeframe: '6-12 mois',
      roiYears: 4
    });

    // 2. Hydrogène
    alternatives.push({
      name: 'Véhicule hydrogène',
      fuel: 'HYDROGEN',
      factor: EMISSION_FACTORS.HYDROGEN,
      reduction: {
        absolute: currentFactor - EMISSION_FACTORS.HYDROGEN,
        percentage: Math.round(((currentFactor - EMISSION_FACTORS.HYDROGEN) / currentFactor) * 100)
      },
      advantages: [
        'Zéro émission',
        'Autonomie > 400km',
        'Ravitaillement rapide (3-5 min)',
        'Payload complet'
      ],
      challenges: [
        'Infrastructure très rare',
        'Technologie émergente',
        'Coût très élevé'
      ],
      timeframe: '24+ mois',
      roiYears: 8
    });

    // 3. HVO100 (si diesel)
    if (fuelType.toUpperCase() === 'DIESEL') {
      alternatives.push({
        name: 'Diesel HVO100 (biocarburant)',
        fuel: 'HVO100',
        factor: EMISSION_FACTORS.HVO100,
        reduction: {
          absolute: currentFactor - EMISSION_FACTORS.HVO100,
          percentage: Math.round(((currentFactor - EMISSION_FACTORS.HVO100) / currentFactor) * 100)
        },
        advantages: [
          'Utilise moteurs existants',
          'Compatible Euro 3+',
          'Réduit CO2 de ~82%',
          'Disponibilité croissante'
        ],
        challenges: [
          'Disponibilité limitée en stations',
          'Surcoût carburant ~10-20%',
          'Coût initial: 0€'
        ],
        timeframe: 'Immédiat',
        roiYears: 1
      });
    }

    // 4. GNV/BioGNV
    if (fuelType.toUpperCase() === 'GNV' || !['ELECTRIC', 'HYDROGEN'].includes(fuelType.toUpperCase())) {
      alternatives.push({
        name: 'BioGNL (gaz naturel renouvelable)',
        fuel: 'BIO_GNV',
        factor: EMISSION_FACTORS.GNV.BIO_GNV,
        reduction: {
          absolute: currentFactor - EMISSION_FACTORS.GNV.BIO_GNV,
          percentage: Math.round(((currentFactor - EMISSION_FACTORS.GNV.BIO_GNV) / currentFactor) * 100)
        },
        advantages: [
          'Réduction CO2 ~80%',
          'Moteurs GNV existants',
          'Infrastructure développement'
        ],
        challenges: [
          'Disponibilité encore très limitée',
          'Surcoût carburant',
          'Nécessite conversion véhicule'
        ],
        timeframe: '6-18 mois',
        roiYears: 3
      });
    }

    return alternatives;
  }

  /**
   * Génère un rapport carbone agrégé pour une liste de trajets
   * @param {Array} missions - Array de missions: [{distance, weight, vehicleType, fuelType, euroNorm}, ...]
   * @returns {Object} Rapport synthétique
   */
  generateCarbonReport(missions) {
    if (!Array.isArray(missions) || missions.length === 0) {
      return { error: 'Aucune mission à analyser' };
    }

    const results = missions.map((m, idx) => {
      const calc = this.calculate(
        m.distance || 0,
        m.weight || 0,
        m.vehicleType || 'DIESEL',
        m.fuelType || 'diesel',
        m.euroNorm || 6
      );
      return { missionIndex: idx, ...calc };
    });

    // Agrégation
    const totalKgCO2e = results.reduce((sum, r) => sum + (r.totalKgCO2e || 0), 0);
    const totalTonnesCO2e = totalKgCO2e / 1000;

    // Médiane éco-score
    const ecoScores = results
      .map(r => Object.keys(ECO_SCORE_RANGES).indexOf(r.ecoScore))
      .filter(s => s !== -1);
    const medianEcoScore = ecoScores.length > 0
      ? Object.keys(ECO_SCORE_RANGES)[Math.floor(ecoScores.length / 2)]
      : 'N/A';

    // Comparaisons globales
    const totalRailEmissions = results.reduce((sum, r) => sum + (r.comparison?.vsRail?.railKgCO2e || 0), 0);
    const totalAvgEmissions = results.reduce((sum, r) => sum + (r.comparison?.vsAverage?.avgKgCO2e || 0), 0);

    // Suggestions consolidées
    const vehicleTypes = [...new Set(missions.map(m => m.vehicleType))];
    const fuelTypes = [...new Set(missions.map(m => m.fuelType))];
    const suggestionsMap = new Map();

    missions.forEach((m, idx) => {
      const sugg = this.suggestGreenAlternatives(m.vehicleType, m.fuelType);
      sugg.forEach(s => {
        const key = s.name;
        if (!suggestionsMap.has(key)) {
          suggestionsMap.set(key, { ...s, impactedMissions: [idx] });
        } else {
          suggestionsMap.get(key).impactedMissions.push(idx);
        }
      });
    });

    return {
      // Résumé global
      totalMissions: missions.length,
      totalDistanceKm: missions.reduce((sum, m) => sum + (m.distance || 0), 0),
      totalWeightKg: missions.reduce((sum, m) => sum + (m.weight || 0), 0),

      // Émissions
      totalKgCO2e: Math.round(totalKgCO2e * 100) / 100,
      totalTonnesCO2e: Math.round(totalTonnesCO2e * 10000) / 10000,
      avgKgCO2ePerMission: Math.round((totalKgCO2e / missions.length) * 100) / 100,

      // Éco-score
      medianEcoScore,
      ecoDistribution: this.getEcoDistribution(results),

      // Comparaisons
      comparison: {
        vsRail: {
          railTotalKgCO2e: Math.round(totalRailEmissions * 100) / 100,
          ratio: Math.round((totalKgCO2e / totalRailEmissions) * 10) / 10
        },
        vsAverage: {
          avgTotalKgCO2e: Math.round(totalAvgEmissions * 100) / 100,
          ratio: Math.round((totalKgCO2e / totalAvgEmissions) * 10) / 10
        }
      },

      // Compensation
      offsetCostEur: Math.round(totalTonnesCO2e * this.offsetPrice * 100) / 100,

      // Recommandations par mission
      missions: results,

      // Alternatives globales
      topAlternatives: Array.from(suggestionsMap.values())
        .sort((a, b) => b.impactedMissions.length - a.impactedMissions.length)
        .slice(0, 3),

      // Flotte
      fleetComposition: {
        vehicleTypes,
        fuelTypes
      },

      reportGeneratedAt: new Date().toISOString()
    };
  }

  /**
   * Calcule la distribution des éco-scores
   * @private
   */
  getEcoDistribution(results) {
    const distribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0
    };

    results.forEach(r => {
      if (r.ecoScore && distribution.hasOwnProperty(r.ecoScore)) {
        distribution[r.ecoScore]++;
      }
    });

    return distribution;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

module.exports = { CarbonCalculator };
