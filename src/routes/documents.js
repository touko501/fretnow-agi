const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { uploadLimiter } = require('../config/security');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

router.post('/upload', authenticate, uploadLimiter, uploadSingle, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
    const { type, missionId } = req.body;
    const validTypes = [
      'KBIS','ATTESTATION_ASSURANCE','ASSURANCE_MARCHANDISE','LICENCE_TRANSPORT','CGV',
      'PERMIS_CONDUIRE','CARTE_CONDUCTEUR','FIMO_FCO','ADR','CMR',
      'BON_LIVRAISON','PHOTO_CHARGEMENT','PHOTO_LIVRAISON','FACTURE','AVOIR',
      'CARTE_GRISE','CONTROLE_TECHNIQUE','AUTRE',
    ];
    if (!type || !validTypes.includes(type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Type de document invalide', validTypes });
    }
    const doc = await prisma.document.create({
      data: {
        userId: req.user.id, missionId: missionId || null, type,
        name: req.body.name || req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype, sizeBytes: req.file.size,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user.id, action: 'document.upload', entity: 'Document', entityId: doc.id,
        details: { type, filename: req.file.filename, size: req.file.size },
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/upload-multiple', authenticate, uploadLimiter, uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Aucun fichier' });
    const { type, missionId } = req.body;
    const docs = [];
    for (const file of req.files) {
      const doc = await prisma.document.create({
        data: {
          userId: req.user.id, missionId: missionId || null, type: type || 'AUTRE',
          name: file.originalname, url: `/uploads/${file.filename}`,
          mimeType: file.mimetype, sizeBytes: file.size,
        },
      });
      docs.push(doc);
    }
    res.status(201).json({ documents: docs, count: docs.length });
  } catch (err) {
    console.error('Multi-upload error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { type, missionId } = req.query;
    const where = {};
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) where.userId = req.user.id;
    if (type) where.type = type;
    if (missionId) where.missionId = missionId;
    const documents = await prisma.document.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    res.json(documents);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    if (doc.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      if (doc.missionId) {
        const mission = await prisma.mission.findUnique({ where: { id: doc.missionId } });
        const bid = await prisma.bid.findFirst({
          where: { missionId: doc.missionId, transporteurId: req.user.id, status: 'ACCEPTED' },
        });
        if (!mission || (mission.clientId !== req.user.id && !bid)) {
          return res.status(403).json({ error: 'Accès interdit à ce document' });
        }
      } else { return res.status(403).json({ error: 'Accès interdit' }); }
    }
    const filePath = path.join(__dirname, '../..', doc.url);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable' });
    res.download(filePath, doc.name);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.post('/:id/verify', authenticate, isAdmin, async (req, res) => {
  try {
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { isVerified: true, verifiedAt: new Date(), verifiedBy: req.user.id },
    });
    await prisma.notification.create({
      data: {
        userId: doc.userId, type: 'DOCUMENT_VALIDATED', title: 'Document validé',
        message: `Votre document "${doc.name}" a été validé par l'équipe FRETNOW.`, sentEmail: true,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user.id, action: 'document.verify', entity: 'Document', entityId: doc.id,
        details: { documentType: doc.type, ownerId: doc.userId },
      },
    });
    res.json(doc);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    if (doc.userId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    const filePath = path.join(__dirname, '../..', doc.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.document.delete({ where: { id: doc.id } });
    res.json({ message: 'Document supprimé' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/expiring/soon', authenticate, isAdmin, async (req, res) => {
  try {
    const inDays = parseInt(req.query.days) || 30;
    const limit = new Date(Date.now() + inDays * 24 * 60 * 60 * 1000);
    const docs = await prisma.document.findMany({
      where: { expiresAt: { lte: limit, gte: new Date() } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, company: { select: { name: true } } } } },
      orderBy: { expiresAt: 'asc' },
    });
    res.json({ documents: docs, count: docs.length, withinDays: inDays });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
