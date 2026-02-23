const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isTransporteur, isAdmin, isVerified } = require('../middleware/roles');
const { validate, schemas } = require('../middleware/validate');

router.get('/', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.user.companyId) where.companyId = req.user.companyId;
    const vehicles = await prisma.vehicle.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { company: { select: { name: true } } },
    });
    res.json(vehicles);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/', authenticate, isTransporteur, isVerified, validate(schemas.vehicleSchema), async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ error: 'Entreprise requise' });
    const existing = await prisma.vehicle.findUnique({ where: { licensePlate: req.validated.licensePlate } });
    if (existing) return res.status(409).json({ error: 'Immatriculation déjà enregistrée' });
    const vehicle = await prisma.vehicle.create({ data: { ...req.validated, companyId: req.user.companyId } });
    res.status(201).json(vehicle);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.put('/:id', authenticate, isTransporteur, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!vehicle) return res.status(404).json({ error: 'Véhicule non trouvé' });
    // Filtrer les champs modifiables (SÉCURITÉ)
    const { brand, model, year, capacityKg, volumeM3, palletSpots, hasTailLift, hasADR, fuelType, costPerKm, costPerHour, costPerDay, isActive } = req.body;
    const updated = await prisma.vehicle.update({ where: { id: vehicle.id }, data: { brand, model, year, capacityKg, volumeM3, palletSpots, hasTailLift, hasADR, fuelType, costPerKm, costPerHour, costPerDay, isActive } });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/:id', authenticate, isTransporteur, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!vehicle) return res.status(404).json({ error: 'Véhicule non trouvé' });
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { isActive: false } });
    res.json({ message: 'Véhicule désactivé' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
