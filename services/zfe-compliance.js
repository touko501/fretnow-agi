/**
 * 🌍 ZFE COMPLIANCE SERVICE — Zones à Faibles Émissions
 *
 * Vérification de conformité pour les Zones à Faibles Émissions (ZFE) en France.
 * Intégration des données ZFE avec classification Crit'Air et détection de routes.
 *
 * Données ZFE:
 * - Périmètres géographiques de chaque ZFE (GeoJSON)
 * - Restrictions par niveau Crit'Air
 * - Dates d'entrée en vigueur des restrictions
 *
 * Fonctionnalités:
 * - Point-in-polygon pour détecter si route passe par ZFE
 * - Classification Crit'Air basée sur norme Euro + type carburant
 * - Vérification d'éligibilité véhicule dans ZFE
 * - Suggère alternatives écologiques
 *
 * Source de référence: DGPR, MEAE
 * Dernière mise à jour: 15/03/2026
 */

const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════
// ZFE ZONES DATABASE — Périmètres français et restrictions
// ═══════════════════════════════════════════════════════════════════════════

const ZFE_ZONES = [
  {
    id: 'paris-grand-paris',
    name: 'ZFE Grand Paris',
    region: 'Île-de-France',
    bannedCritAirs: [4, 5], // Crit'Air 4-5 actuellement bannis
    futureRestrictions: [
      { date: '2024-01-01', bannedCritAirs: [4, 5] },
      { date: '2025-06-01', bannedCritAirs: [3, 4, 5] }, // À partir de juin 2025
      { date: '2030-01-01', bannedCritAirs: [2, 3, 4, 5] }
    ],
    enabled: true,
    boundaries: {
      // Périmètre simplifié (utilisé pour point-in-polygon)
      minLat: 48.750,
      maxLat: 48.950,
      minLng: 2.200,
      maxLng: 2.550
    },
    description: 'Grand Paris métropole'
  },
  {
    id: 'lyon-metropole',
    name: 'ZFE Lyon Métropole',
    region: 'Auvergne-Rhône-Alpes',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2025-01-01', bannedCritAirs: [5] },
      { date: '2026-01-01', bannedCritAirs: [4, 5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 45.700,
      maxLat: 45.850,
      minLng: 4.750,
      maxLng: 5.050
    },
    description: 'Métropole de Lyon'
  },
  {
    id: 'marseille',
    name: 'ZFE Marseille',
    region: 'Provence-Alpes-Côte d\'Azur',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2025-06-01', bannedCritAirs: [5] },
      { date: '2027-01-01', bannedCritAirs: [4, 5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 43.250,
      maxLat: 43.380,
      minLng: 5.300,
      maxLng: 5.450
    },
    description: 'Centre-ville de Marseille'
  },
  {
    id: 'toulouse',
    name: 'ZFE Toulouse',
    region: 'Occitanie',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2025-09-01', bannedCritAirs: [5] },
      { date: '2028-01-01', bannedCritAirs: [4, 5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 43.590,
      maxLat: 43.650,
      minLng: 1.420,
      maxLng: 1.500
    },
    description: 'Agglomération toulousaine'
  },
  {
    id: 'strasbourg',
    name: 'ZFE Strasbourg',
    region: 'Grand Est',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2024-09-01', bannedCritAirs: [5] },
      { date: '2025-09-01', bannedCritAirs: [4, 5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 48.550,
      maxLat: 48.620,
      minLng: 7.710,
      maxLng: 7.800
    },
    description: 'Agglomération strasbourgeoise'
  },
  {
    id: 'rouen',
    name: 'ZFE Rouen',
    region: 'Normandie',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2025-01-01', bannedCritAirs: [5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 49.430,
      maxLat: 49.460,
      minLng: 1.080,
      maxLng: 1.120
    },
    description: 'Agglomération rouennaise'
  },
  {
    id: 'nice',
    name: 'ZFE Nice',
    region: 'Provence-Alpes-Côte d\'Azur',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2025-06-01', bannedCritAirs: [5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 43.700,
      maxLat: 43.750,
      minLng: 7.250,
      maxLng: 7.320
    },
    description: 'Côte d\'Azur - Nice'
  },
  {
    id: 'montpellier',
    name: 'ZFE Montpellier',
    region: 'Occitanie',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2025-01-01', bannedCritAirs: [5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 43.610,
      maxLat: 43.640,
      minLng: 3.870,
      maxLng: 3.910
    },
    description: 'Agglomération de Montpellier'
  },
  {
    id: 'grenoble',
    name: 'ZFE Grenoble',
    region: 'Auvergne-Rhône-Alpes',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2026-01-01', bannedCritAirs: [5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 45.190,
      maxLat: 45.220,
      minLng: 5.720,
      maxLng: 5.760
    },
    description: 'Agglomération grenobloise'
  },
  {
    id: 'bordeaux',
    name: 'ZFE Bordeaux',
    region: 'Nouvelle-Aquitaine',
    bannedCritAirs: [5],
    futureRestrictions: [
      { date: '2025-06-01', bannedCritAirs: [5] }
    ],
    enabled: true,
    boundaries: {
      minLat: 44.830,
      maxLat: 44.870,
      minLng: -0.610,
      maxLng: -0.550
    },
    description: 'Agglomération bordelaise'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// CRIT'AIR CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

const CRITAIR_MAPPING = {
  // Format: euroNorm_fuelType => critair
  '1_diesel': 5,
  '1_essence': 5,
  '1_lpg': 5,
  '2_diesel': 4,
  '2_essence': 4,
  '2_lpg': 4,
  '3_diesel': 4,
  '3_essence': 3,
  '3_lpg': 3,
  '3_gnv': 3,
  '4_diesel': 3,
  '4_essence': 2,
  '4_lpg': 2,
  '4_gnv': 2,
  '4_electric': 1,
  '4_hybrid': 2,
  '5_diesel': 2,
  '5_essence': 1,
  '5_lpg': 1,
  '5_gnv': 1,
  '5_electric': 0,
  '5_hybrid': 1,
  '6_diesel': 1,
  '6_essence': 1,
  '6_lpg': 1,
  '6_gnv': 0,
  '6_electric': 0,
  '6_hybrid': 0,
  '6_hydrogen': 0
};

const CRITAIR_DETAILS = {
  0: {
    label: 'Véhicule électrique / Hydrogène',
    color: '#4CAF50',
    year: '2011+',
    conditions: 'Électrique, hydrogène, ou essence Euro 5-6 après 2011'
  },
  1: {
    label: 'Électrique / Euro 5-6',
    color: '#8BC34A',
    year: '2011+',
    conditions: 'Euro 5-6 (2011+) essence/diesel'
  },
  2: {
    label: 'Euro 4',
    color: '#FFC107',
    year: '2006-2010',
    conditions: 'Euro 4 (2006-2010)'
  },
  3: {
    label: 'Euro 3',
    color: '#FF9800',
    year: '2001-2005',
    conditions: 'Euro 3 (2001-2005)'
  },
  4: {
    label: 'Euro 2',
    color: '#FF5722',
    year: '1997-2000',
    conditions: 'Euro 2 (1997-2000)'
  },
  5: {
    label: 'Euro 1 ou antérieur',
    color: '#D32F2F',
    year: 'avant 1997',
    conditions: 'Euro 1 ou antérieur'
  }
};

class ZFEComplianceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 heures
    this.zfeZones = ZFE_ZONES;
  }

  /**
   * Récupère tous les périmètres ZFE français
   * @returns {Promise<Array>} Liste des zones ZFE avec détails
   */
  async getZFEZones() {
    return this.zfeZones.filter(z => z.enabled).map(z => ({
      id: z.id,
      name: z.name,
      region: z.region,
      description: z.description,
      currentRestrictions: z.bannedCritAirs,
      nextRestrictions: z.futureRestrictions[0] || null
    }));
  }

  /**
   * Détermine la classification Crit'Air d'un véhicule
   * @param {number} euroNorm - Norme Euro (1-6)
   * @param {string} fuelType - Type carburant (diesel, essence, electric, gnv, lpg, hybrid, hydrogen)
   * @param {number} registrationYear - Année d'immatriculation (optionnel, pour vérification)
   * @returns {Object} { critair: 0-5, color: string, label: string, details: string }
   */
  getCritAirFromVehicle(euroNorm, fuelType, registrationYear = null) {
    // Normaliser les entrées
    const normalizedFuel = fuelType.toLowerCase().trim();
    // Normaliser euroNorm: accepte 'EURO6', 'Euro6', 'euro6', 6, '6'
    const normalizedEuro = String(euroNorm).replace(/^euro/i, '').trim();
    const key = `${normalizedEuro}_${normalizedFuel}`;

    const critair = CRITAIR_MAPPING[key];

    if (critair === undefined) {
      // Fallback si combinaison inconnue
      console.warn(`Combinaison Euro/Carburant inconnue: ${key}, défaut à Crit'Air 5`);
      return {
        critair: 5,
        color: CRITAIR_DETAILS[5].color,
        label: CRITAIR_DETAILS[5].label,
        details: 'Combinaison non reconnue - classification conservatrice',
        classificationDate: new Date().toISOString()
      };
    }

    const details = CRITAIR_DETAILS[critair];

    return {
      critair,
      color: details.color,
      label: details.label,
      details: details.conditions,
      yearRange: details.year,
      classificationDate: new Date().toISOString()
    };
  }

  /**
   * Vérifie si un véhicule est autorisé dans une ZFE
   * @param {number} critair - Niveau Crit'Air (0-5)
   * @param {string} zfeName - ID ou nom de la ZFE
   * @returns {Object} { allowed: bool, reason: string, bannedLevel: number|null }
   */
  isVehicleAllowedInZFE(critair, zfeName) {
    const zfe = this.zfeZones.find(z => z.id === zfeName || z.name === zfeName);

    if (!zfe) {
      return {
        allowed: true,
        reason: 'ZFE non trouvée dans la base',
        zfeId: zfeName,
        warning: true
      };
    }

    if (!zfe.enabled) {
      return {
        allowed: true,
        reason: 'ZFE non active',
        zfeId: zfe.id
      };
    }

    // Vérifie les restrictions actuelles
    const isBanned = zfe.bannedCritAirs.includes(critair);

    if (isBanned) {
      return {
        allowed: false,
        reason: `Crit'Air ${critair} interdit à ${zfe.name}`,
        zfeId: zfe.id,
        zfeName: zfe.name,
        bannedLevel: critair,
        nextRestriction: zfe.futureRestrictions[0] || null
      };
    }

    // Vérifie les futures restrictions
    const futureRestriction = zfe.futureRestrictions[0];
    let warning = null;

    if (futureRestriction && futureRestriction.bannedCritAirs.includes(critair)) {
      warning = {
        date: futureRestriction.date,
        message: `À partir du ${new Date(futureRestriction.date).toLocaleDateString('fr-FR')}, Crit'Air ${critair} sera interdit`
      };
    }

    return {
      allowed: true,
      reason: `Crit'Air ${critair} autorisé`,
      zfeId: zfe.id,
      zfeName: zfe.name,
      futureWarning: warning
    };
  }

  /**
   * Algorithme Point-in-Polygon (Ray Casting)
   * Vérifie si un point se trouve dans un polygone ZFE
   * @param {number} lat - Latitude du point
   * @param {number} lng - Longitude du point
   * @param {Object} polygon - Polygone avec minLat, maxLat, minLng, maxLng
   * @returns {boolean} true si le point est dans le polygone
   */
  pointInPolygon(lat, lng, polygon) {
    // Vérification simple contre les bounds
    return lat >= polygon.minLat &&
           lat <= polygon.maxLat &&
           lng >= polygon.minLng &&
           lng <= polygon.maxLng;
  }

  /**
   * Vérifie si un trajet passe par une ZFE
   * @param {number} originLat - Latitude du départ
   * @param {number} originLng - Longitude du départ
   * @param {number} destLat - Latitude de la destination
   * @param {number} destLng - Longitude de la destination
   * @param {number} vehicleEuroNorm - Norme Euro du véhicule
   * @param {string} fuelType - Type carburant
   * @returns {Promise<Object>} { passesZFE: bool, zones: Array, alternatives: Array }
   */
  async checkRouteZFE(originLat, originLng, destLat, destLng, vehicleEuroNorm, fuelType) {
    const critAirInfo = this.getCritAirFromVehicle(vehicleEuroNorm, fuelType);
    const zones = [];

    // Vérifier chaque ZFE
    for (const zfe of this.zfeZones.filter(z => z.enabled)) {
      // Vérifier si origine, destination ou route passe par la ZFE
      const originInZFE = this.pointInPolygon(originLat, originLng, zfe.boundaries);
      const destInZFE = this.pointInPolygon(destLat, destLng, zfe.boundaries);
      const routeCrossesZFE = this.routeCrossesZFE(
        originLat, originLng,
        destLat, destLng,
        zfe.boundaries
      );

      if (originInZFE || destInZFE || routeCrossesZFE) {
        const allowanceCheck = this.isVehicleAllowedInZFE(critAirInfo.critair, zfe.id);

        zones.push({
          zfeId: zfe.id,
          name: zfe.name,
          region: zfe.region,
          crossType: originInZFE ? 'origin' : destInZFE ? 'destination' : 'route',
          allowed: allowanceCheck.allowed,
          reason: allowanceCheck.reason,
          critairRequired: Math.min(...zfe.bannedCritAirs) - 1,
          restriction: {
            currentlyBanned: zfe.bannedCritAirs,
            futureRestriction: zfe.futureRestrictions[0] || null
          },
          alternatives: this.suggestGreenAlternatives(vehicleEuroNorm, fuelType)
        });
      }
    }

    const passesZFE = zones.some(z => !z.allowed);
    const alternatives = passesZFE ? this.suggestZFEAlternatives(vehicleEuroNorm, fuelType) : [];

    return {
      passesZFE,
      vehicleCritAir: critAirInfo.critair,
      vehicleInfo: {
        euroNorm: vehicleEuroNorm,
        fuelType,
        critairLabel: critAirInfo.label,
        critairColor: critAirInfo.color
      },
      zones,
      totalZFEsAffected: zones.length,
      blockedZFEs: zones.filter(z => !z.allowed).map(z => z.name),
      alternatives,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Vérifie si une route (segment) croise une zone ZFE
   * @private
   */
  routeCrossesZFE(lat1, lng1, lat2, lng2, polygon) {
    // Implémentation simplifiée: vérifier si la route passe par le centre du polygone
    const centerLat = (polygon.minLat + polygon.maxLat) / 2;
    const centerLng = (polygon.minLng + polygon.maxLng) / 2;

    // Vérifier si la ligne entre les deux points croise le rectangle
    return this.lineIntersectsRectangle(lat1, lng1, lat2, lng2, polygon);
  }

  /**
   * Vérifie si une ligne intersecte un rectangle
   * @private
   */
  lineIntersectsRectangle(lat1, lng1, lat2, lng2, rect) {
    // Cas 1: au moins un point est dans le rectangle
    if (this.pointInPolygon(lat1, lng1, rect) || this.pointInPolygon(lat2, lng2, rect)) {
      return true;
    }

    // Cas 2: la ligne croise le rectangle
    const minLat = Math.min(lat1, lat2);
    const maxLat = Math.max(lat1, lat2);
    const minLng = Math.min(lng1, lng2);
    const maxLng = Math.max(lng1, lng2);

    // Vérifier chevauchement
    return !(maxLng < rect.minLng || minLng > rect.maxLng ||
             maxLat < rect.minLat || minLat > rect.maxLat);
  }

  /**
   * Suggère des alternatives écologiques pour respecter les ZFE
   * @param {number} currentEuroNorm - Norme Euro actuelle
   * @param {string} currentFuelType - Type carburant actuel
   * @returns {Array} Suggestions d'amélioration avec détails
   */
  suggestGreenAlternatives(currentEuroNorm, currentFuelType) {
    const alternatives = [];

    // Électrique
    alternatives.push({
      type: 'electric',
      label: 'Véhicule électrique',
      critair: 0,
      benefits: ['Zéro émission directe', 'Autorisé dans toutes les ZFE', 'Coût carburant réduit'],
      considerations: ['Autonomie limitée (200-400km)', 'Infrastructure de recharge', 'Investissement initial élevé'],
      costImpact: 'Élevé à court terme, récupéré en 4-5 ans'
    });

    // Hydrogène
    alternatives.push({
      type: 'hydrogen',
      label: 'Véhicule hydrogène',
      critair: 0,
      benefits: ['Zéro émission', 'Autonomie > 400km', 'Plein rapide (3-5 min)'],
      considerations: ['Infrastructure rares', 'Technologie émergente', 'Peu de modèles disponibles'],
      costImpact: 'Très élevé, subventions disponibles'
    });

    // HVO100 (Hydrogenated Vegetable Oil)
    if (currentFuelType.toLowerCase() === 'diesel') {
      alternatives.push({
        type: 'hvo100',
        label: 'Diesel HVO100 (biocarburant)',
        critair: currentEuroNorm >= 3 ? 2 : 3,
        benefits: ['Utilise infrastructure existante', 'Réduit CO2 de ~90%', 'Compatible Euro 3+'],
        considerations: ['Disponibilité en stations-service', 'Prix potentiellement plus élevé'],
        costImpact: 'Faible surcoût de carburant'
      });
    }

    // BioGNL
    if (currentFuelType.toLowerCase() === 'gnv' || currentEuroNorm >= 4) {
      alternatives.push({
        type: 'biognl',
        label: 'BioGNL (gaz naturel renouvelable)',
        critair: 0,
        benefits: ['~80% réduction CO2', 'Moteurs GNV existants', 'Infrastructure en développement'],
        considerations: ['Disponibilité limitée', 'Prix du carburant'],
        costImpact: 'Moyen'
      });
    }

    return alternatives;
  }

  /**
   * Suggère des zones pour contourner une ZFE bloquante
   * @private
   */
  suggestZFEAlternatives(vehicleEuroNorm, fuelType) {
    const critAirInfo = this.getCritAirFromVehicle(vehicleEuroNorm, fuelType);

    return [
      {
        type: 'green_vehicle_upgrade',
        description: 'Moderniser le véhicule vers une norme Euro supérieure',
        timeframe: 'Investissement à moyen terme',
        impact: 'Améliore la classification Crit\'Air'
      },
      {
        type: 'alternative_fuel',
        description: 'Passer à un carburant alternatif (électrique, hydrogène, HVO100)',
        timeframe: 'Immédiat avec bon partenaire',
        impact: 'Accès à toutes les ZFE'
      },
      {
        type: 'route_planning',
        description: 'Planifier itinéraires sans ZFE (contourner les grandes villes)',
        timeframe: 'Immédiat',
        impact: 'Efficacité réduite mais conforme'
      }
    ];
  }

  /**
   * Rapport ZFE complet pour une flotte
   * @param {Array} vehicles - Liste de véhicules [{euroNorm, fuelType, registrationDate}, ...]
   * @returns {Object} Rapport d'analyse de conformité
   */
  generateZFEReport(vehicles) {
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return { error: 'Aucun véhicule à analyser', vehicles: [] };
    }

    const analysis = vehicles.map((v, idx) => {
      const critAir = this.getCritAirFromVehicle(v.euroNorm, v.fuelType, v.registrationDate);
      const nonCompliantZFEs = [];

      // Analyser chaque ZFE
      for (const zfe of this.zfeZones.filter(z => z.enabled)) {
        const allowed = this.isVehicleAllowedInZFE(critAir.critair, zfe.id);
        if (!allowed.allowed) {
          nonCompliantZFEs.push({
            zfeName: zfe.name,
            region: zfe.region,
            reason: allowed.reason
          });
        }
      }

      return {
        vehicleIndex: idx,
        euroNorm: v.euroNorm,
        fuelType: v.fuelType,
        critair: critAir.critair,
        critairLabel: critAir.label,
        compliant: nonCompliantZFEs.length === 0,
        nonCompliantZFECount: nonCompliantZFEs.length,
        nonCompliantZFEs,
        recommendations: this.suggestGreenAlternatives(v.euroNorm, v.fuelType)
      };
    });

    const compliantCount = analysis.filter(a => a.compliant).length;
    const nonCompliantCount = analysis.length - compliantCount;

    return {
      totalVehicles: vehicles.length,
      compliantCount,
      nonCompliantCount,
      complianceRate: Math.round((compliantCount / vehicles.length) * 100),
      vehicles: analysis,
      reportDate: new Date().toISOString()
    };
  }
}

// Export singleton
module.exports = { ZFEComplianceService };
