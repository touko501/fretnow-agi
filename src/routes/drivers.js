const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isTransporteur, isVerified } = require('../middleware/roles');
const { validate, schemas } = require('../middleware/validate');

router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user.companyId) return res.json([]);
    const drivers = await prisma.driver.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(drivers);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/', authenticate, isTransporteur, isVerified, validate(schemas.driverSchema), async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ error: 'Entreprise requise' });
    const driver = await prisma.driver.create({ data: { ...req.validated, companyId: req.user.companyId } });
    res.status(201).json(driver);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.put('/:id', authenticate, isTransporteur, async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!driver) return res.status(404).json({ error: 'Conducteur non trouvé' });
    // Filtrer les champs modifiables (SÉCURITÉ)
    const { firstName, lastName, phone, email, licenceNumber, adrCertified, isActive } = req.body;
    const updated = await prisma.driver.update({ where: { id: driver.id }, data: { firstName, lastName, phone, email, licenceNumber, adrCertified, isActive } });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/:id', authenticate, isTransporteur, async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!driver) return res.status(404).json({ error: 'Conducteur non trouvé' });
    await prisma.driver.update({ where: { id: driver.id }, data: { isActive: false } });
    res.json({ message: 'Conducteur désactivé' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
