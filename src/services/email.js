// ═══════════════════════════════════════════════════════════════════════════
// FRETNOW AGI — EMAIL SERVICE v8.0
// Service d'envoi d'emails (Nodemailer-ready, console fallback)
// ═══════════════════════════════════════════════════════════════════════════

const env = require('../config/env');

// En production: configurer SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// Pour l'instant: log en console + stockage notification
const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

let transporter = null;

// Initialiser le transporteur SMTP si configuré
async function initTransporter() {
  if (SMTP_CONFIGURED) {
    try {
      const nodemailer = require('nodemailer');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: (process.env.SMTP_PORT === '465'),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.verify();
      console.log('📧 SMTP configured and verified');
    } catch (err) {
      console.warn('⚠️ SMTP verification failed:', err.message);
      transporter = null;
    }
  }
}

// Envoyer un email (ou logger en console si SMTP non configuré)
async function sendEmail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || 'FRETNOW <noreply@fretnow.com>';

  if (transporter) {
    try {
      const result = await transporter.sendMail({ from, to, subject, text, html });
      console.log(`📧 Email sent to ${to}: ${subject}`);
      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error(`❌ Email failed to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Fallback: log en console
  console.log(`\n📧 ═══ EMAIL (console mode) ═══`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${text?.substring(0, 200) || '(HTML only)'}...`);
  console.log(`   ═══════════════════════════\n`);
  return { success: true, messageId: 'console-' + Date.now() };
}

// Templates

function contactNotificationEmail(contact) {
  const subject = `[FRETNOW] Nouveau contact: ${contact.firstName} ${contact.lastName}`;
  const text = `Nouveau message de contact FRETNOW\n\n` +
    `Nom: ${contact.firstName} ${contact.lastName}\n` +
    `Email: ${contact.email}\n` +
    `Tél: ${contact.phone || 'Non renseigné'}\n` +
    `Entreprise: ${contact.company || 'Non renseigné'}\n` +
    `Type: ${contact.role || 'Non précisé'}\n` +
    `Sujet: ${contact.subject || 'Contact général'}\n\n` +
    `Message:\n${contact.message}\n\n` +
    `---\nReçu le ${new Date().toLocaleString('fr-FR')} via ${contact.source}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#060B18;color:white;padding:20px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;color:#06B6D4">🚛 FRETNOW — Nouveau contact</h2>
      </div>
      <div style="padding:20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;color:#666;width:120px">Nom</td><td style="padding:8px;font-weight:bold">${contact.firstName} ${contact.lastName}</td></tr>
          <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px"><a href="mailto:${contact.email}">${contact.email}</a></td></tr>
          <tr><td style="padding:8px;color:#666">Téléphone</td><td style="padding:8px">${contact.phone || '—'}</td></tr>
          <tr><td style="padding:8px;color:#666">Entreprise</td><td style="padding:8px">${contact.company || '—'}</td></tr>
          <tr><td style="padding:8px;color:#666">Type</td><td style="padding:8px">${contact.role === 'TRANSPORTEUR' ? '🚛 Transporteur' : contact.role === 'CHARGEUR' ? '📦 Chargeur' : '🏢 Autre'}</td></tr>
          <tr><td style="padding:8px;color:#666">Sujet</td><td style="padding:8px">${contact.subject || 'Contact général'}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px;border-left:4px solid #06B6D4">
          <p style="margin:0;white-space:pre-wrap">${contact.message}</p>
        </div>
        <p style="margin-top:16px;color:#999;font-size:12px">Reçu le ${new Date().toLocaleString('fr-FR')} via ${contact.source}</p>
      </div>
    </div>`;

  return { subject, text, html };
}

function welcomeEmail(user) {
  const subject = 'Bienvenue sur FRETNOW ! 🚛';
  const text = `Bonjour ${user.firstName},\n\nBienvenue sur FRETNOW ! Votre compte a été créé avec succès.\n\n` +
    `Prochaines étapes :\n` +
    `1. Complétez votre profil entreprise\n` +
    `2. Uploadez vos documents (KBIS, assurance)\n` +
    `3. ${user.role === 'TRANSPORTEUR' ? 'Ajoutez vos véhicules et explorez la bourse de fret' : 'Publiez votre première mission de fret'}\n\n` +
    `Accédez à votre espace : ${process.env.FRONTEND_URL || 'https://fretnow-agi.onrender.com'}/app.html\n\n` +
    `L'équipe FRETNOW`;

  return { subject, text };
}

function newRegistrationAdminEmail(user, company) {
  const subject = `[FRETNOW ADMIN] Nouvelle inscription: ${user.firstName} ${user.lastName}`;
  const text = `Nouvelle inscription sur FRETNOW\n\n` +
    `Utilisateur: ${user.firstName} ${user.lastName}\n` +
    `Email: ${user.email}\n` +
    `Rôle: ${user.role}\n` +
    `Entreprise: ${company?.name || 'Non renseigné'}\n` +
    `SIRET: ${company?.siret || 'Non renseigné'}\n\n` +
    `Action requise: Vérifier le compte dans l'admin panel.`;

  return { subject, text };
}

// Init au démarrage
initTransporter();

module.exports = { sendEmail, contactNotificationEmail, welcomeEmail, newRegistrationAdminEmail };
