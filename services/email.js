/**
 * FRETNOW AGI — Service Email
 * Gestion des emails transactionnels et notifications
 */

const env = require('../src/config/env');

class EmailService {
  constructor() {
    this.from = process.env.EMAIL_FROM || 'NOVA FRETNOW <fretnow.nova@outlook.com>';
    this.enabled = !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
  }

  /**
   * Envoie un email via Resend ou SendGrid
   */
  async send({ to, subject, html, text }) {
    if (!this.enabled) {
      console.log(`📧 [EMAIL MOCK] To: ${to} | Subject: ${subject}`);
      return { success: true, mock: true };
    }

    try {
      if (process.env.RESEND_API_KEY) {
        return await this._sendViaResend({ to, subject, html, text });
      }
      if (process.env.SENDGRID_API_KEY) {
        return await this._sendViaSendGrid({ to, subject, html, text });
      }
    } catch (error) {
      console.error('❌ Email send error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async _sendViaResend({ to, subject, html, text }) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || undefined,
        text: text || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Resend error');
    return { success: true, id: data.id, provider: 'resend' };
  }

  async _sendViaSendGrid({ to, subject, html, text }) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'fretnow.nova@outlook.com', name: 'NOVA FRETNOW' },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          ...(html ? [{ type: 'text/html', value: html }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    return { success: true, provider: 'sendgrid' };
  }

  // =========================================================
  // TEMPLATES — Emails transactionnels
  // =========================================================

  /**
   * Email de bienvenue après inscription
   */
  async sendWelcome({ to, firstName, role }) {
    const roleLabel = role === 'TRANSPORTEUR' ? 'transporteur' : 'expéditeur';
    return this.send({
      to,
      subject: `Bienvenue sur FRETNOW, ${firstName} ! 🚛`,
      html: this._template(`
        <h2>Bienvenue sur FRETNOW !</h2>
        <p>Bonjour ${firstName},</p>
        <p>Votre compte ${roleLabel} a bien été créé. Je suis <strong>NOVA</strong>, l'IA qui gère la plateforme FRETNOW.</p>
        <p>Voici les prochaines étapes :</p>
        <ol>
          <li>Complétez votre profil entreprise (SIRET, licence transport)</li>
          <li>Ajoutez vos véhicules${role === 'TRANSPORTEUR' ? ' et conducteurs' : ''}</li>
          <li>${role === 'TRANSPORTEUR' ? 'Consultez les missions disponibles et enchérissez' : 'Créez votre première mission de transport'}</li>
        </ol>
        <p><a href="${env.FRONTEND_URL}/app.html" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Accéder à mon tableau de bord</a></p>
        <p>À très vite sur la route !<br><strong>NOVA</strong> — IA Managing Partner, FRETNOW</p>
      `),
    });
  }

  /**
   * Notification nouvelle mission publiée (pour transporteurs)
   */
  async sendNewMission({ to, firstName, mission }) {
    return this.send({
      to,
      subject: `Nouvelle mission : ${mission.pickupCity} → ${mission.deliveryCity} 📦`,
      html: this._template(`
        <h2>Nouvelle mission disponible</h2>
        <p>Bonjour ${firstName},</p>
        <p>Une nouvelle mission correspond à votre profil :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Départ</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${mission.pickupCity} (${mission.pickupPostalCode})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Arrivée</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${mission.deliveryCity} (${mission.deliveryPostalCode})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Distance</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${mission.distanceKm ? mission.distanceKm + ' km' : 'À calculer'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Budget max</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${mission.budgetMaxCents ? (mission.budgetMaxCents / 100).toFixed(2) + ' €' : 'Non défini'}</td></tr>
          <tr><td style="padding:8px"><strong>Type</strong></td><td style="padding:8px">${mission.missionType || 'FRET_LOURD'}</td></tr>
        </table>
        <p><a href="${env.FRONTEND_URL}/app.html#mission-${mission.id}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Voir et enchérir</a></p>
        <p>NOVA — FRETNOW</p>
      `),
    });
  }

  /**
   * Notification offre reçue (pour expéditeur)
   */
  async sendBidReceived({ to, firstName, mission, bid }) {
    return this.send({
      to,
      subject: `Nouvelle offre reçue pour ${mission.pickupCity} → ${mission.deliveryCity} 💰`,
      html: this._template(`
        <h2>Vous avez reçu une offre !</h2>
        <p>Bonjour ${firstName},</p>
        <p>Un transporteur a soumis une offre pour votre mission :</p>
        <p style="font-size:24px;text-align:center;margin:20px"><strong>${(bid.amountCents / 100).toFixed(2)} € HT</strong></p>
        <p style="text-align:center">${mission.pickupCity} → ${mission.deliveryCity}</p>
        <p><a href="${env.FRONTEND_URL}/app.html#mission-${mission.id}" style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Voir l'offre</a></p>
        <p>NOVA — FRETNOW</p>
      `),
    });
  }

  /**
   * Notification mission assignée (pour transporteur)
   */
  async sendMissionAssigned({ to, firstName, mission }) {
    return this.send({
      to,
      subject: `Mission assignée ! ${mission.pickupCity} → ${mission.deliveryCity} ✅`,
      html: this._template(`
        <h2>Mission confirmée !</h2>
        <p>Bonjour ${firstName},</p>
        <p>Votre offre a été acceptée. Voici les détails :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Ref</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${mission.reference}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Enlèvement</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${mission.pickupCity} — ${mission.pickupDateRequested ? new Date(mission.pickupDateRequested).toLocaleDateString('fr-FR') : 'À confirmer'}</td></tr>
          <tr><td style="padding:8px"><strong>Livraison</strong></td><td style="padding:8px">${mission.deliveryCity}</td></tr>
        </table>
        <p>Le paiement sera versé en <strong>J+1</strong> après confirmation de livraison.</p>
        <p><a href="${env.FRONTEND_URL}/app.html#mission-${mission.id}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Voir la mission</a></p>
        <p>Bonne route !<br>NOVA — FRETNOW</p>
      `),
    });
  }

  /**
   * Notification livraison confirmée
   */
  async sendDeliveryConfirmed({ to, firstName, mission, paymentAmount }) {
    return this.send({
      to,
      subject: `Livraison confirmée — Paiement J+1 🎉`,
      html: this._template(`
        <h2>Livraison confirmée !</h2>
        <p>Bonjour ${firstName},</p>
        <p>La mission <strong>${mission.reference}</strong> a été livrée avec succès.</p>
        <p style="font-size:20px;text-align:center;margin:20px;color:#16a34a"><strong>${(paymentAmount / 100).toFixed(2)} €</strong> seront versés sur votre compte demain (J+1)</p>
        <p>Merci pour votre travail !<br>NOVA — FRETNOW</p>
      `),
    });
  }

  /**
   * Alerte conformité Mobilic
   */
  async sendComplianceAlert({ to, firstName, alert }) {
    const severityColor = alert.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b';
    return this.send({
      to,
      subject: `⚠️ Alerte conformité Mobilic — ${alert.alertType}`,
      html: this._template(`
        <h2 style="color:${severityColor}">Alerte Conformité</h2>
        <p>Bonjour ${firstName},</p>
        <p>${alert.message}</p>
        <p style="background:#fef2f2;padding:12px;border-radius:8px;border-left:4px solid ${severityColor}">
          <strong>Sévérité :</strong> ${alert.severity}<br>
          <strong>Type :</strong> ${alert.alertType}<br>
          ${alert.details ? `<strong>Détails :</strong> ${alert.details}` : ''}
        </p>
        <p>Veuillez régulariser la situation dans les plus brefs délais.</p>
        <p>NOVA — FRETNOW</p>
      `),
    });
  }

  /**
   * Reset de mot de passe
   */
  async sendPasswordReset({ to, firstName, resetToken }) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    return this.send({
      to,
      subject: `Réinitialisation de votre mot de passe FRETNOW`,
      html: this._template(`
        <h2>Réinitialisation du mot de passe</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous :</p>
        <p><a href="${resetUrl}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Réinitialiser mon mot de passe</a></p>
        <p style="color:#6b7280;font-size:12px">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        <p>NOVA — FRETNOW</p>
      `),
    });
  }

  // =========================================================
  // TEMPLATE HTML — Base
  // =========================================================

  _template(content) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937">
        <div style="text-align:center;margin-bottom:24px;padding:16px;background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px">
          <h1 style="color:white;margin:0;font-size:28px">🚛 FRETNOW</h1>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:14px">Plateforme Intelligente du Transport Routier</p>
        </div>
        <div style="padding:20px 0">
          ${content}
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <div style="text-align:center;color:#9ca3af;font-size:12px">
          <p>FRETNOW AGI — Commission 10% · Paiement J+1 · Conformité Mobilic intégrée</p>
          <p>Cet email a été envoyé par NOVA, l'IA Managing Partner de FRETNOW.</p>
        </div>
      </body>
      </html>
    `;
  }
}

const emailService = new EmailService();
module.exports = { emailService, EmailService };
