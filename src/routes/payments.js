const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isAdmin, isChargeur } = require('../middleware/roles');
const env = require('../config/env');

let stripe;
if (env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(env.STRIPE_SECRET_KEY);
}

router.post('/create', authenticate, isChargeur, async (req, res) => {
  try {
    const { missionId } = req.body;
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission || mission.clientId !== req.user.id) return res.status(404).json({ error: 'Mission non trouvée' });
    if (!mission.finalPriceCents) return res.status(400).json({ error: 'Pas de prix final' });

    const tvaCents = Math.round(mission.finalPriceCents * (mission.tvaPercent / 100));
    const amountTtcCents = mission.finalPriceCents + tvaCents;
    const commissionCents = mission.commissionCents || Math.round(mission.finalPriceCents * (mission.commissionPercent / 100));
    const transporteurCents = mission.finalPriceCents - commissionCents;

    const payment = await prisma.payment.create({
      data: {
        missionId, amountCents: amountTtcCents, amountHtCents: mission.finalPriceCents,
        tvaCents, commissionCents, transporteurCents,
        status: 'PENDING', method: 'STRIPE',
      },
    });

    let clientSecret = null;
    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountTtcCents, currency: 'eur',
        metadata: { missionId, paymentId: payment.id },
        description: `FRETNOW Mission ${mission.reference}`,
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { stripePaymentId: paymentIntent.id } });
      clientSecret = paymentIntent.client_secret;
    }

    res.status(201).json({ payment, clientSecret });
  } catch (err) {
    console.error('Payment create error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return res.status(200).send();
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const payment = await prisma.payment.findFirst({ where: { stripePaymentId: pi.id } });
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED', paidAt: new Date() } });
        const year = new Date().getFullYear();
        const count = await prisma.invoice.count({ where: { createdAt: { gte: new Date(`${year}-01-01`) } } });
        const invoiceNumber = `FN-${year}-${String(count + 1).padStart(4, '0')}`;
        const mission = await prisma.mission.findUnique({
          where: { id: payment.missionId },
          include: { client: { include: { company: true } } },
        });
        if (mission?.client?.companyId) {
          await prisma.invoice.create({
            data: {
              number: invoiceNumber, missionId: payment.missionId,
              senderId: 'co-fretnow', receiverId: mission.client.companyId,
              amountHtCents: payment.amountHtCents, tvaCents: payment.tvaCents,
              amountTtcCents: payment.amountCents, status: 'PAID',
              issuedAt: new Date(), paidAt: new Date(),
            },
          });
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: 'Webhook error' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'CHARGEUR') where.mission = { clientId: req.user.id };
    const payments = await prisma.payment.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { mission: { select: { reference: true, pickupCity: true, deliveryCity: true } } },
    });
    res.json(payments);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

router.get('/invoices', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.user.companyId) {
      where.OR = [{ senderId: req.user.companyId }, { receiverId: req.user.companyId }];
    }
    const invoices = await prisma.invoice.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: {
        mission: { select: { reference: true, pickupCity: true, deliveryCity: true } },
        sender: { select: { name: true } }, receiver: { select: { name: true } },
      },
    });
    res.json(invoices);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
