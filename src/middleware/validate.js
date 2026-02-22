const { z } = require('zod');

// Generic validator middleware
function validate(schema) {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
        return res.status(400).json({ error: 'Données invalides', details: errors });
      }
      return res.status(400).json({ error: 'Données invalides' });
    }
  };
}

// ═══ SCHEMAS ═══

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères').max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Numéro invalide').optional(),
  role: z.enum(['CHARGEUR', 'TRANSPORTEUR']),
  company: z.object({
    name: z.string().min(1).max(200),
    siren: z.string().regex(/^[0-9]{9}$/, 'SIREN: 9 chiffres'),
    siret: z.string().regex(/^[0-9]{14}$/, 'SIRET: 14 chiffres'),
    address: z.string().min(1),
    postalCode: z.string().regex(/^[0-9]{5}$/, 'Code postal: 5 chiffres'),
    city: z.string().min(1),
  }).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const missionSchema = z.object({
  pickupAddress: z.string().min(1),
  pickupCity: z.string().min(1),
  pickupPostalCode: z.string().regex(/^[0-9]{5}$/),
  pickupLat: z.number().optional(),
  pickupLon: z.number().optional(),
  pickupContact: z.string().optional(),
  pickupPhone: z.string().optional(),
  pickupTimeWindow: z.string().optional(),
  pickupDateRequested: z.string().optional(),
  deliveryAddress: z.string().min(1),
  deliveryCity: z.string().min(1),
  deliveryPostalCode: z.string().regex(/^[0-9]{5}$/),
  deliveryLat: z.number().optional(),
  deliveryLon: z.number().optional(),
  deliveryContact: z.string().optional(),
  deliveryPhone: z.string().optional(),
  deliveryTimeWindow: z.string().optional(),
  deliveryDateRequested: z.string().optional(),
  goodsDescription: z.string().optional(),
  weightKg: z.number().positive().optional(),
  volumeM3: z.number().positive().optional(),
  palletCount: z.number().int().positive().optional(),
  vehicleTypeRequired: z.enum([
    'FOURGON_3T5','FOURGON_12M3','FOURGON_20M3','PORTEUR_7T5','PORTEUR_12T','PORTEUR_19T',
    'SEMI_TAUTLINER','SEMI_FRIGO','SEMI_BACHE','SEMI_BENNE','SEMI_CITERNE','SEMI_PLATEAU',
    'SEMI_PORTE_CONTENEUR','MEGA_TRAILER'
  ]).optional(),
  isFragile: z.boolean().optional(),
  requiresTemp: z.boolean().optional(),
  tempMin: z.number().optional(),
  tempMax: z.number().optional(),
  isADR: z.boolean().optional(),
  adrClass: z.string().optional(),
  budgetMaxCents: z.number().int().positive().optional(),
  conditions: z.string().optional(),
  notes: z.string().optional(),
});

const bidSchema = z.object({
  missionId: z.string().min(1),
  vehicleId: z.string().optional(),
  priceCents: z.number().int().positive('Montant positif requis'),
  message: z.string().max(1000).optional(),
  availableDate: z.string().optional(),
});

const ratingSchema = z.object({
  missionId: z.string().min(1),
  receiverId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  punctuality: z.number().int().min(1).max(5).optional(),
  communication: z.number().int().min(1).max(5).optional(),
  cargoCondition: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

const companySchema = z.object({
  name: z.string().min(1).max(200),
  siren: z.string().regex(/^[0-9]{9}$/),
  siret: z.string().regex(/^[0-9]{14}$/),
  address: z.string().min(1),
  postalCode: z.string().regex(/^[0-9]{5}$/),
  city: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  licenceNumber: z.string().optional(),
});

const vehicleSchema = z.object({
  type: z.enum([
    'FOURGON_3T5','FOURGON_12M3','FOURGON_20M3','PORTEUR_7T5','PORTEUR_12T','PORTEUR_19T',
    'SEMI_TAUTLINER','SEMI_FRIGO','SEMI_BACHE','SEMI_BENNE','SEMI_CITERNE','SEMI_PLATEAU',
    'SEMI_PORTE_CONTENEUR','MEGA_TRAILER'
  ]),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1990).max(2030).optional(),
  licensePlate: z.string().min(1),
  capacityKg: z.number().positive(),
  volumeM3: z.number().positive().optional(),
  palletSpots: z.number().int().positive().optional(),
  hasTailLift: z.boolean().optional(),
  hasADR: z.boolean().optional(),
  fuelType: z.enum(['DIESEL_B7','HVO100','B100_COLZA','GNL','BIO_GNL','ELECTRIQUE','HYDROGENE']).optional(),
});

const driverSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  email: z.string().email().optional(),
  licenceNumber: z.string().optional(),
  adrCertified: z.boolean().optional(),
});

module.exports = {
  validate,
  schemas: { registerSchema, loginSchema, missionSchema, bidSchema, ratingSchema, companySchema, vehicleSchema, driverSchema },
};
