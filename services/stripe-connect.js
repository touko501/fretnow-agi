/**
 * 💳 STRIPE CONNECT SERVICE — Marketplace Payments & Carrier Payouts
 *
 * Features:
 * - Express account onboarding for carriers
 * - Payment intent creation with commission splits
 * - Automatic payouts after delivery confirmation
 * - Refund handling with reason tracking
 * - Webhook event processing
 * - Commission rate calculation by mission type
 *
 * Commission Structure:
 * - Standard: 10%
 * - Express: 15-20%
 * - International: 20-25%
 *
 * Last updated: 15/03/2026
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Commission rates by mission type
 * Applied to TTC (after VAT) amount
 */
const COMMISSION_RATES = {
  STANDARD: 0.10,        // 10%
  EXPRESS: 0.15,         // 15%
  EXPRESS_PREMIUM: 0.20, // 20%
  INTERNATIONAL: 0.20,   // 20%
  INTERNATIONAL_PLUS: 0.25, // 25%
};

class StripeConnectService {
  /**
   * Create a Stripe Express account for a carrier
   * @param {Object} carrier - Carrier data { id, firstName, lastName, email, company, ...}
   * @returns {Object} { stripeAccountId, onboardingUrl? }
   */
  async createConnectedAccount(carrier) {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: carrier.email,
        business_profile: {
          name: carrier.company?.name || `${carrier.firstName} ${carrier.lastName}`,
          product_category: 'transport',
          mcc: 4213, // Trucking and freight services
          support_phone: carrier.phone || '',
          support_email: carrier.email,
        },
        individual: {
          first_name: carrier.firstName,
          last_name: carrier.lastName,
          dob: carrier.dateOfBirth ? {
            day: new Date(carrier.dateOfBirth).getDate(),
            month: new Date(carrier.dateOfBirth).getMonth() + 1,
            year: new Date(carrier.dateOfBirth).getFullYear(),
          } : undefined,
          email: carrier.email,
          address: {
            city: carrier.city || '',
            postal_code: carrier.postalCode || '',
            country: 'FR',
            line1: carrier.address || '',
          },
        },
        business_type: 'individual',
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      });

      return {
        stripeAccountId: account.id,
        created: true,
      };
    } catch (error) {
      console.error('Stripe account creation error:', error);
      throw new Error(`Failed to create Stripe account: ${error.message}`);
    }
  }

  /**
   * Create onboarding link for carrier to complete verification
   * @param {string} stripeAccountId
   * @param {string} carrierId - FRETNOW carrier ID
   * @param {string} returnUrl - Frontend return URL
   * @returns {Object} { url }
   */
  async createOnboardingLink(stripeAccountId, carrierId, returnUrl) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        type: 'account_onboarding',
        refresh_url: `${returnUrl}?refresh=true&carrierId=${carrierId}`,
        return_url: `${returnUrl}?success=true&carrierId=${carrierId}`,
      });

      return {
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000),
      };
    } catch (error) {
      console.error('Onboarding link creation error:', error);
      throw new Error(`Failed to create onboarding link: ${error.message}`);
    }
  }

  /**
   * Get account verification status
   * @param {string} stripeAccountId
   * @returns {Object} { isVerified, chargesEnabled, payoutsEnabled, requirements }
   */
  async getAccountStatus(stripeAccountId) {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);

      return {
        isVerified: account.charges_enabled && account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
        },
        email: account.email,
        businessName: account.business_profile?.name,
        country: account.country,
        type: account.type,
      };
    } catch (error) {
      console.error('Account status retrieval error:', error);
      throw new Error(`Failed to retrieve account status: ${error.message}`);
    }
  }

  /**
   * Create payment intent with commission split
   * Handles both card and SEPA debit payments
   *
   * @param {Object} options
   * - {number} amountCents - Amount in cents (TTC, after VAT)
   * - {string} mode - 'payment' or 'setup'
   * - {string} carrierStripeAccountId - Carrier's Stripe account ID
   * - {string} missionId - FRETNOW mission ID
   * - {string} description - Payment description
   * - {string} currency - ISO currency code (default: 'eur')
   * - {string} paymentMethodType - 'card', 'sepa_debit', or 'all' (default: 'all')
   * @returns {Object} { paymentIntentId, clientSecret, commissionAmount, carrierAmount }
   */
  async createPaymentIntent({
    amountCents,
    mode = 'payment',
    carrierStripeAccountId,
    missionId,
    description,
    currency = 'eur',
    paymentMethodType = 'all',
    missionType = 'STANDARD',
  }) {
    try {
      // Calculate commission
      const commissionRate = COMMISSION_RATES[missionType] || COMMISSION_RATES.STANDARD;
      const commissionCents = Math.round(amountCents * commissionRate);
      const carrierCents = amountCents - commissionCents;

      // Determine payment methods
      let payment_method_types = [];
      if (paymentMethodType === 'all' || paymentMethodType === 'card') {
        payment_method_types.push('card');
      }
      if (paymentMethodType === 'all' || paymentMethodType === 'sepa_debit') {
        payment_method_types.push('sepa_debit');
      }
      if (payment_method_types.length === 0) {
        payment_method_types = ['card', 'sepa_debit'];
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        payment_method_types,
        metadata: {
          missionId,
          commissionCents,
          carrierCents,
          missionType,
        },
        description,
        transfer_data: {
          destination: carrierStripeAccountId,
          amount: carrierCents, // Carrier receives this amount
        },
        application_fee_amount: commissionCents, // Platform fee (commission)
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        commissionCents,
        carrierCents,
        totalCents: amountCents,
        currency,
        status: paymentIntent.status,
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Confirm delivery and trigger automatic payout
   * Called after mission completion
   *
   * @param {string} missionId
   * @param {Object} prisma - Prisma client for DB updates
   * @returns {Object} { transferId, status, amount }
   */
  async confirmDeliveryAndPayout(missionId, prisma) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { missionId, status: 'COMPLETED' },
      });

      if (!payment) {
        throw new Error('No completed payment found for this mission');
      }

      if (payment.stripeTransferId) {
        // Transfer already processed
        return {
          transferId: payment.stripeTransferId,
          status: 'already_transferred',
          amount: payment.transporteurCents,
        };
      }

      // Get the payment intent to access connected account info
      const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
      if (!paymentIntent.transfer_data?.destination) {
        throw new Error('No carrier Stripe account associated with this payment');
      }

      // Create transfer to carrier account
      const transfer = await stripe.transfers.create({
        amount: payment.transporteurCents,
        currency: 'eur',
        destination: paymentIntent.transfer_data.destination,
        source_transaction: payment.stripePaymentId,
        metadata: { missionId, paymentId: payment.id },
        description: `FRETNOW Mission ${missionId} - Payout`,
      });

      // Update payment with transfer ID
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeTransferId: transfer.id,
          transferredAt: new Date(),
        },
      });

      return {
        transferId: transfer.id,
        status: transfer.status,
        amount: transfer.amount,
        arrivalDate: transfer.arrival_date,
      };
    } catch (error) {
      console.error('Payout confirmation error:', error);
      throw new Error(`Failed to confirm delivery payout: ${error.message}`);
    }
  }

  /**
   * Refund a payment
   * @param {string} paymentIntentId
   * @param {number} amountCents - Amount to refund (optional, full refund if not provided)
   * @param {string} reason - Refund reason ('duplicate', 'fraudulent', 'requested_by_customer')
   * @param {Object} prisma - Prisma client for DB updates
   * @returns {Object} { refundId, status, amount, created }
   */
  async refundPayment(paymentIntentId, amountCents, reason = 'requested_by_customer', prisma) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const chargeId = paymentIntent.charges.data[0]?.id;

      if (!chargeId) {
        throw new Error('No charge found for this payment intent');
      }

      const refundParams = {
        charge: chargeId,
        reason,
        metadata: { reason_details: reason },
      };

      if (amountCents) {
        refundParams.amount = amountCents;
      }

      const refund = await stripe.refunds.create(refundParams);

      // Update payment in DB if Prisma provided
      if (prisma) {
        const payment = await prisma.payment.findFirst({
          where: { stripePaymentId: paymentIntentId },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              stripeRefundId: refund.id,
              status: 'REFUNDED',
              refundedAt: new Date(),
            },
          });
        }
      }

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount,
        created: new Date(refund.created * 1000),
        reason: refund.reason,
      };
    } catch (error) {
      console.error('Refund error:', error);
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook events
   * Processes all relevant events and updates local DB state
   *
   * @param {Object} event - Stripe event object
   * @param {Object} prisma - Prisma client for DB updates
   * @returns {Object} { processed, eventType, missionId? }
   */
  async handleWebhookEvent(event, prisma) {
    try {
      const { type, data } = event;
      const object = data.object;

      console.log(`Processing Stripe webhook: ${type}`);

      switch (type) {
        case 'payment_intent.succeeded':
          return await this._handlePaymentSucceeded(object, prisma);

        case 'payment_intent.payment_failed':
          return await this._handlePaymentFailed(object, prisma);

        case 'charge.refunded':
          return await this._handleChargeRefunded(object, prisma);

        case 'transfer.created':
          return await this._handleTransferCreated(object, prisma);

        case 'transfer.failed':
          return await this._handleTransferFailed(object, prisma);

        case 'account.updated':
          return await this._handleAccountUpdated(object, prisma);

        default:
          console.log(`Unhandled webhook type: ${type}`);
          return { processed: false, eventType: type };
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw new Error(`Failed to handle webhook: ${error.message}`);
    }
  }

  /**
   * Calculate commission rate by mission characteristics
   * @param {string} missionType - 'STANDARD', 'EXPRESS', 'INTERNATIONAL', etc.
   * @param {boolean} isInternational - Is international shipment
   * @param {boolean} isExpress - Is express SLA
   * @returns {number} Commission rate (0-1)
   */
  getCommissionRate(missionType = 'STANDARD', isInternational = false, isExpress = false) {
    if (isInternational) {
      return isExpress ? COMMISSION_RATES.INTERNATIONAL_PLUS : COMMISSION_RATES.INTERNATIONAL;
    }
    if (isExpress) {
      return COMMISSION_RATES.EXPRESS_PREMIUM;
    }
    return COMMISSION_RATES[missionType] || COMMISSION_RATES.STANDARD;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE WEBHOOK HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  async _handlePaymentSucceeded(paymentIntent, prisma) {
    const missionId = paymentIntent.metadata?.missionId;

    if (!missionId) {
      console.warn('Payment succeeded but no missionId in metadata');
      return { processed: false, eventType: 'payment_intent.succeeded' };
    }

    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(paymentIntent.created * 1000),
        },
      });

      // Update mission status
      await prisma.mission.update({
        where: { id: missionId },
        data: { status: 'PAID' },
      });
    }

    return {
      processed: true,
      eventType: 'payment_intent.succeeded',
      missionId,
    };
  }

  async _handlePaymentFailed(paymentIntent, prisma) {
    const missionId = paymentIntent.metadata?.missionId;

    if (!missionId) return { processed: false, eventType: 'payment_intent.payment_failed' };

    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }

    return {
      processed: true,
      eventType: 'payment_intent.payment_failed',
      missionId,
    };
  }

  async _handleChargeRefunded(charge, prisma) {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: charge.payment_intent },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(charge.refunded * 1000),
        },
      });
    }

    return {
      processed: true,
      eventType: 'charge.refunded',
      paymentId: payment?.id,
    };
  }

  async _handleTransferCreated(transfer, prisma) {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: transfer.source_transaction },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeTransferId: transfer.id,
          transferredAt: new Date(transfer.created * 1000),
        },
      });
    }

    return {
      processed: true,
      eventType: 'transfer.created',
      transferId: transfer.id,
    };
  }

  async _handleTransferFailed(transfer, prisma) {
    const payment = await prisma.payment.findFirst({
      where: { stripeTransferId: transfer.id },
    });

    if (payment) {
      console.error(`Transfer failed for payment ${payment.id}: ${transfer.failure_message}`);
      // Don't update status, admin needs to investigate
    }

    return {
      processed: true,
      eventType: 'transfer.failed',
      transferId: transfer.id,
      failureMessage: transfer.failure_message,
    };
  }

  async _handleAccountUpdated(account, prisma) {
    // Account verification updated
    // This is handled by the frontend checking account status
    return {
      processed: true,
      eventType: 'account.updated',
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }
}

module.exports = StripeConnectService;
