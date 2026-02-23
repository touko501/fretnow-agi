const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const env = require('../config/env');

let stripe;
if (env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(env.STRIPE_SECRET_KEY);
}

// ═══ GET /wallet/balance — Solde du wallet ═══
router.get('/balance', authenticate, async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ error: 'Aucune entreprise liée à votre compte' });

    let wallet = await prisma.wallet.findUnique({ where: { companyId: req.user.companyId } });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { companyId: req.user.companyId, balanceCents: 0, reservedCents: 0 },
      });
    }

    res.json({
      balanceCents: wallet.balanceCents,
      reservedCents: wallet.reservedCents,
      availableCents: wallet.balanceCents - wallet.reservedCents,
      currency: wallet.currency,
    });
  } catch (err) {
    console.error('Wallet balance error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ GET /wallet/transactions — Historique des mouvements ═══
router.get('/transactions', authenticate, async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ error: 'Aucune entreprise liée' });

    const wallet = await prisma.wallet.findUnique({ where: { companyId: req.user.companyId } });
    if (!wallet) return res.json({ transactions: [], total: 0 });

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    res.json({ transactions, total });
  } catch (err) {
    console.error('Wallet transactions error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /wallet/topup — Recharger le wallet via Stripe ═══
router.post('/topup', authenticate, async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ error: 'Aucune entreprise liée' });

    const { amountCents } = req.body;
    if (!amountCents || amountCents < 1000) {
      return res.status(400).json({ error: 'Montant minimum: 10€' });
    }
    if (amountCents > 10000000) {
      return res.status(400).json({ error: 'Montant maximum: 100 000€' });
    }

    let wallet = await prisma.wallet.findUnique({ where: { companyId: req.user.companyId } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { companyId: req.user.companyId, balanceCents: 0, reservedCents: 0 },
      });
    }

    // Si Stripe est configuré, créer un PaymentIntent
    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'eur',
        metadata: { walletId: wallet.id, companyId: req.user.companyId, type: 'wallet_topup' },
        description: `FRETNOW Wallet - Rechargement`,
      });

      return res.json({
        clientSecret: paymentIntent.client_secret,
        amountCents,
        message: 'Paiement Stripe en attente de confirmation',
      });
    }

    // Mode sans Stripe : crédit direct (pour tests/démo)
    const newBalance = wallet.balanceCents + amountCents;

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'TOPUP',
          amountCents: amountCents,
          balanceAfter: newBalance,
          description: `Rechargement de ${(amountCents / 100).toFixed(2)}€`,
        },
      }),
    ]);

    res.json({
      success: true,
      balanceCents: newBalance,
      amountCents,
      message: `Wallet rechargé de ${(amountCents / 100).toFixed(2)}€`,
    });
  } catch (err) {
    console.error('Wallet topup error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /wallet/reserve — Réserver un montant (escrow) pour une mission ═══
router.post('/reserve', authenticate, async (req, res) => {
  try {
    const { missionId } = req.body;
    if (!missionId) return res.status(400).json({ error: 'missionId requis' });
    if (!req.user.companyId) return res.status(400).json({ error: 'Aucune entreprise liée' });

    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });
    if (mission.clientId !== req.user.id) return res.status(403).json({ error: 'Ce n\'est pas votre mission' });

    const amountCents = mission.finalPriceCents || mission.budgetMaxCents;
    if (!amountCents) return res.status(400).json({ error: 'Aucun montant défini pour cette mission' });

    // Calcul commission
    const commissionCents = Math.round(amountCents * (mission.commissionPercent / 100));
    const transporteurCents = amountCents - commissionCents;

    const wallet = await prisma.wallet.findUnique({ where: { companyId: req.user.companyId } });
    if (!wallet) return res.status(400).json({ error: 'Wallet non trouvé. Rechargez d\'abord.' });

    const available = wallet.balanceCents - wallet.reservedCents;
    if (available < amountCents) {
      return res.status(400).json({
        error: 'Solde insuffisant',
        required: amountCents,
        available,
        deficit: amountCents - available,
      });
    }

    // Vérifier pas déjà un escrow
    const existingEscrow = await prisma.escrow.findUnique({ where: { missionId } });
    if (existingEscrow) return res.status(409).json({ error: 'Montant déjà réservé pour cette mission' });

    // Créer escrow + mettre à jour wallet en transaction
    const result = await prisma.$transaction(async (tx) => {
      const escrow = await tx.escrow.create({
        data: {
          walletId: wallet.id,
          missionId,
          amountCents,
          commissionCents,
          transporteurCents,
          status: 'HELD',
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { reservedCents: wallet.reservedCents + amountCents },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'RESERVE',
          amountCents: -amountCents,
          balanceAfter: wallet.balanceCents,
          description: `Réservation mission ${mission.reference}`,
          missionId,
        },
      });

      return escrow;
    });

    res.json({
      escrow: result,
      message: `${(amountCents / 100).toFixed(2)}€ réservés pour la mission ${mission.reference}`,
    });
  } catch (err) {
    console.error('Wallet reserve error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /wallet/release — Libérer l'escrow après livraison (paiement transporteur J+1) ═══
router.post('/release', authenticate, async (req, res) => {
  try {
    const { missionId } = req.body;
    if (!missionId) return res.status(400).json({ error: 'missionId requis' });

    const escrow = await prisma.escrow.findUnique({
      where: { missionId },
      include: { wallet: true, mission: true },
    });
    if (!escrow) return res.status(404).json({ error: 'Aucun escrow pour cette mission' });
    if (escrow.status !== 'HELD') return res.status(400).json({ error: `Escrow déjà ${escrow.status}` });

    // Vérifier que la mission est bien livrée
    const validStatuses = ['DELIVERED', 'COMPLETED'];
    if (!validStatuses.includes(escrow.mission.status)) {
      return res.status(400).json({ error: 'La mission doit être livrée avant de libérer le paiement' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Libérer l'escrow
      const updated = await tx.escrow.update({
        where: { id: escrow.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });

      // Débiter le wallet (diminuer balance + reserved)
      await tx.wallet.update({
        where: { id: escrow.walletId },
        data: {
          balanceCents: escrow.wallet.balanceCents - escrow.amountCents,
          reservedCents: escrow.wallet.reservedCents - escrow.amountCents,
        },
      });

      // Transaction de paiement
      await tx.walletTransaction.create({
        data: {
          walletId: escrow.walletId,
          type: 'PAYMENT',
          amountCents: -escrow.amountCents,
          balanceAfter: escrow.wallet.balanceCents - escrow.amountCents,
          description: `Paiement mission ${escrow.mission.reference}`,
          missionId,
        },
      });

      // Transaction de commission FRETNOW
      await tx.walletTransaction.create({
        data: {
          walletId: escrow.walletId,
          type: 'COMMISSION',
          amountCents: escrow.commissionCents,
          balanceAfter: escrow.wallet.balanceCents - escrow.amountCents,
          description: `Commission FRETNOW ${escrow.mission.reference} (${escrow.mission.commissionPercent}%)`,
          missionId,
        },
      });

      // Créer le paiement dans la table Payment
      await tx.payment.create({
        data: {
          missionId,
          amountCents: escrow.amountCents,
          amountHtCents: escrow.transporteurCents,
          tvaCents: Math.round(escrow.amountCents * 0.2),
          commissionCents: escrow.commissionCents,
          transporteurCents: escrow.transporteurCents,
          status: 'PROCESSING',
          method: 'PLATEFORME',
        },
      });

      // Notifier le transporteur
      if (escrow.mission.driverId || escrow.mission.vehicleId) {
        const transporteurMission = await tx.bid.findFirst({
          where: { missionId, status: 'ACCEPTED' },
        });
        if (transporteurMission) {
          await tx.notification.create({
            data: {
              userId: transporteurMission.transporteurId,
              missionId,
              type: 'PAYMENT_SENT',
              title: 'Paiement en cours',
              message: `Le paiement de ${(escrow.transporteurCents / 100).toFixed(2)}€ pour la mission ${escrow.mission.reference} sera viré sous 24h.`,
            },
          });
        }
      }

      return updated;
    });

    res.json({
      escrow: result,
      message: `Paiement de ${(escrow.transporteurCents / 100).toFixed(2)}€ libéré pour le transporteur. Virement J+1.`,
      details: {
        totalCents: escrow.amountCents,
        commissionCents: escrow.commissionCents,
        transporteurCents: escrow.transporteurCents,
      },
    });
  } catch (err) {
    console.error('Wallet release error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ POST /wallet/refund — Rembourser un escrow (annulation mission) ═══
router.post('/refund', authenticate, async (req, res) => {
  try {
    const { missionId } = req.body;
    if (!missionId) return res.status(400).json({ error: 'missionId requis' });

    const escrow = await prisma.escrow.findUnique({
      where: { missionId },
      include: { wallet: true, mission: true },
    });
    if (!escrow) return res.status(404).json({ error: 'Aucun escrow pour cette mission' });
    if (escrow.status !== 'HELD') return res.status(400).json({ error: `Impossible de rembourser: escrow ${escrow.status}` });

    const result = await prisma.$transaction(async (tx) => {
      await tx.escrow.update({
        where: { id: escrow.id },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      });

      await tx.wallet.update({
        where: { id: escrow.walletId },
        data: { reservedCents: escrow.wallet.reservedCents - escrow.amountCents },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: escrow.walletId,
          type: 'REFUND',
          amountCents: escrow.amountCents,
          balanceAfter: escrow.wallet.balanceCents,
          description: `Remboursement mission annulée ${escrow.mission.reference}`,
          missionId,
        },
      });

      return true;
    });

    res.json({
      success: true,
      message: `${(escrow.amountCents / 100).toFixed(2)}€ remboursés sur votre wallet`,
    });
  } catch (err) {
    console.error('Wallet refund error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══ Webhook Stripe pour confirmer les topups ═══
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return res.status(200).send();
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      if (pi.metadata?.type === 'wallet_topup') {
        const wallet = await prisma.wallet.findUnique({ where: { id: pi.metadata.walletId } });
        if (wallet) {
          const newBalance = wallet.balanceCents + pi.amount;
          await prisma.$transaction([
            prisma.wallet.update({
              where: { id: wallet.id },
              data: { balanceCents: newBalance },
            }),
            prisma.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'TOPUP',
                amountCents: pi.amount,
                balanceAfter: newBalance,
                description: `Rechargement Stripe ${(pi.amount / 100).toFixed(2)}€`,
                stripePaymentId: pi.id,
              },
            }),
          ]);
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Wallet webhook error:', err);
    res.status(400).json({ error: 'Webhook error' });
  }
});

module.exports = router;
