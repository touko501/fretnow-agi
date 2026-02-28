/**
 * 💬 COMMS AGENT — Communicateur Omnicanal Intelligent
 * 
 * Mission: Engagement personnalisé à grande échelle
 * Canaux: WhatsApp, Telegram, Email (tous GRATUITS)
 */

class CommsAgent {
  constructor(config = {}) {
    this.name = 'COMMS';
    this.priority = 85;
    this.config = {
      channels: config.channels || ['telegram', 'whatsapp', 'email'],
      dailyLimit: config.dailyLimit || 150,
      messageTemplates: config.messageTemplates || this.getDefaultTemplates(),
      optimalHours: config.optimalHours || { start: 8, end: 19 },
      ...config
    };
    this.stats = {
      messagesSent: 0,
      responses: 0,
      conversions: 0,
      todayCount: 0,
      lastReset: new Date().toDateString(),
      byChannel: {
        telegram: { sent: 0, responses: 0 },
        whatsapp: { sent: 0, responses: 0 },
        email: { sent: 0, responses: 0 }
      }
    };
    this.messageQueue = [];
  }

  async init() {
    console.log(`  💬 Comms Agent initialisé | Canaux: ${this.config.channels.join(', ')}`);
  }

  async execute(state) {
    // Reset quotidien
    if (new Date().toDateString() !== this.stats.lastReset) {
      this.stats.todayCount = 0;
      this.stats.lastReset = new Date().toDateString();
    }

    // Vérifier les heures d'envoi
    const hour = new Date().getHours();
    if (hour < this.config.optimalHours.start || hour >= this.config.optimalHours.end) {
      return { summary: `Hors heures (${this.config.optimalHours.start}h-${this.config.optimalHours.end}h)` };
    }

    // Vérifier limite quotidienne
    if (this.stats.todayCount >= this.config.dailyLimit) {
      return { summary: `Limite atteinte (${this.stats.todayCount}/${this.config.dailyLimit})` };
    }

    // Sélectionner les leads à contacter
    const leadsToContact = state.activeLeads
      .filter(lead => 
        lead.status === 'qualified' && 
        !lead.contacted &&
        lead.score >= 60
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (leadsToContact.length === 0) {
      return { summary: 'Aucun lead à contacter' };
    }

    // Envoyer les messages
    let sent = 0;
    let errors = 0;

    for (const lead of leadsToContact) {
      if (this.stats.todayCount >= this.config.dailyLimit) break;

      try {
        const result = await this.contactLead(lead);
        if (result.success) {
          lead.contacted = true;
          lead.contactedAt = new Date().toISOString();
          lead.contactChannel = result.channel;
          lead.status = 'contacted';
          sent++;
          this.stats.todayCount++;
          this.stats.messagesSent++;
          this.stats.byChannel[result.channel].sent++;
        }
      } catch (error) {
        errors++;
        console.error(`    Erreur contact ${lead.company.name}: ${error.message}`);
      }

      // Pause entre les messages (anti-spam)
      await this.sleep(2000);
    }

    return {
      summary: `${sent} contactés, ${errors} erreurs (${this.stats.todayCount}/${this.config.dailyLimit})`,
      sent,
      errors,
      remaining: this.config.dailyLimit - this.stats.todayCount
    };
  }

  /**
   * Contacte un lead via le meilleur canal
   */
  async contactLead(lead) {
    // Sélectionner le canal optimal
    const channel = this.selectOptimalChannel(lead);
    
    // Personnaliser le message
    const message = this.personalizeMessage(lead, channel);
    
    // Envoyer selon le canal
    switch (channel) {
      case 'telegram':
        return await this.sendTelegram(lead, message);
      case 'whatsapp':
        return await this.sendWhatsApp(lead, message);
      case 'email':
        return await this.sendEmail(lead, message);
      default:
        throw new Error(`Canal inconnu: ${channel}`);
    }
  }

  /**
   * Sélectionne le canal optimal pour un lead
   */
  selectOptimalChannel(lead) {
    // Priorité: WhatsApp > Telegram > Email
    
    // Si on a un numéro mobile
    if (lead.contact.phone?.startsWith('06') || lead.contact.phone?.startsWith('07')) {
      if (this.config.channels.includes('whatsapp')) {
        return 'whatsapp';
      }
    }
    
    // Telegram si disponible
    if (this.config.channels.includes('telegram')) {
      return 'telegram';
    }
    
    // Email en fallback
    return 'email';
  }

  /**
   * Personnalise le message selon le lead
   */
  personalizeMessage(lead, channel) {
    const template = this.config.messageTemplates[channel];
    
    return template
      .replace('{company}', lead.company.name)
      .replace('{city}', lead.contact.city)
      .replace('{vehicles}', lead.fleet.vehicles)
      .replace('{score}', lead.score)
      .replace('{firstName}', this.extractFirstName(lead));
  }

  /**
   * Envoie un message Telegram
   */
  async sendTelegram(lead, message) {
    // Simulation - à connecter au vrai bot
    console.log(`    📱 Telegram → ${lead.company.name}`);
    
    // En production: utiliser l'API Telegram Bot
    // const response = await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    //   chat_id: lead.telegramId,
    //   text: message,
    //   parse_mode: 'HTML'
    // });
    
    return { success: true, channel: 'telegram', messageId: `tg_${Date.now()}` };
  }

  /**
   * Envoie un message WhatsApp
   */
  async sendWhatsApp(lead, message) {
    console.log(`    📲 WhatsApp → ${lead.contact.phone}`);
    
    // En production: utiliser whatsapp-web.js
    // await this.whatsappClient.sendMessage(lead.contact.phone + '@c.us', message);
    
    return { success: true, channel: 'whatsapp', messageId: `wa_${Date.now()}` };
  }

  /**
   * Envoie un email
   */
  async sendEmail(lead, message) {
    console.log(`    📧 Email → ${lead.contact.email}`);
    
    // En production: utiliser nodemailer
    // await this.transporter.sendMail({
    //   from: 'contact@fretnow.fr',
    //   to: lead.contact.email,
    //   subject: 'FRETNOW - Gagnez plus, payé plus vite',
    //   html: message
    // });
    
    return { success: true, channel: 'email', messageId: `em_${Date.now()}` };
  }

  /**
   * Templates de messages par défaut
   */
  getDefaultTemplates() {
    return {
      telegram: `🚛 Bonjour {company} !

Je suis de FRETNOW, la nouvelle bourse de fret qui révolutionne le transport.

💰 **Paiement J+1** (pas 60 jours)
📊 **Commission 10%** (pas 25%)
🔒 **Prix CNR** transparents

Avec vos {vehicles} véhicules à {city}, vous pourriez gagner jusqu'à 20% de plus.

👉 Intéressé(e) ? Répondez "OUI" ou visitez fretnow.fr

Les 50 premiers inscrits = 3 mois GRATUITS ! 🎁`,

      whatsapp: `🚛 *FRETNOW* - Le fret réinventé

Bonjour ! Je contacte {company} car vous correspondez à notre profil de transporteurs premium.

✅ Paiement J+1 garanti
✅ Commission 10% (vs 25% ailleurs)
✅ Prix CNR transparents
✅ Matching IA intelligent

Avec {vehicles} véhicules, vous pourriez optimiser vos revenus de 15-20%.

Répondez "INFO" pour en savoir plus ou visitez fretnow.fr 📱`,

      email: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0;">🚛 FRETNOW</h1>
    <p style="color: rgba(255,255,255,0.9);">Le fret réinventé. Paiement J+1.</p>
  </div>
  
  <div style="padding: 30px; background: #f8f9fa;">
    <p>Bonjour,</p>
    
    <p>Je me permets de vous contacter car <strong>{company}</strong> correspond parfaitement au profil de transporteurs que nous recherchons pour notre nouvelle plateforme de fret.</p>
    
    <h3>Pourquoi FRETNOW ?</h3>
    <ul>
      <li>💰 <strong>Paiement J+1</strong> - Fini les 60 jours d'attente</li>
      <li>📊 <strong>Commission 10%</strong> - Pas 25% comme les autres</li>
      <li>🔒 <strong>Prix CNR</strong> - Transparence totale</li>
      <li>🤖 <strong>Matching IA</strong> - Les meilleures missions pour vous</li>
    </ul>
    
    <p>Avec vos {vehicles} véhicules basés à {city}, vous pourriez augmenter vos revenus de 15 à 20%.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://fretnow.fr" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Découvrir FRETNOW →
      </a>
    </div>
    
    <p><strong>Offre de lancement</strong>: Les 50 premiers inscrits bénéficient de 3 mois GRATUITS ! 🎁</p>
    
    <p>Cordialement,<br>L'équipe FRETNOW</p>
  </div>
  
  <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
    <p>FRETNOW - FRETNOW AGI<br>
    <a href="https://fretnow.fr" style="color: #667eea;">fretnow.fr</a> | contact@fretnow.fr</p>
  </div>
</body>
</html>`
    };
  }

  extractFirstName(lead) {
    // Essayer d'extraire un prénom du nom de la société
    const name = lead.company.name;
    const match = name.match(/Transport\s+(\w+)/i);
    return match ? match[1] : 'Responsable';
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  getStats() {
    return this.stats;
  }
}

module.exports = { CommsAgent };
