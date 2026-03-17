/**
 * NOVA Chat API v3 — Route Express pour FRETNOW
 * Backend pour le widget NOVA avec Claude AI
 * Rate limiting: 20 msg/min par IP
 */
const express = require('express');
const router = express.Router();

const NOVA_SYSTEM_PROMPT = `Tu es NOVA, l'agent IA #009 de FRETNOW.
Tu es professionnelle, chaleureuse, experte du fret routier.
Tu reponds en francais, max 150 mots sauf si on demande des details.
FRETNOW: marketplace B2B, commission 10% vs 25% courtiers, paiement J+1, 10 agents IA, Mobilic integre.
Les 4 verticales: Fret lourd, Messagerie, Express, Dernier km.
URL inscription: https://fretnow-agi.onrender.com/register
Lancement: 1er avril 2026.
Ne jamais inventer d'infos. Toujours proposer une action suivante.`;

const rateLimiter = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimiter.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + RATE_WINDOW; }
  record.count++;
  rateLimiter.set(ip, record);
  return record.count <= RATE_LIMIT;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimiter.entries()) {
    if (now > record.resetAt + RATE_WINDOW) rateLimiter.delete(ip);
  }
}, 300000);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'NOVA', version: '3.0', apiConfigured: !!process.env.ANTHROPIC_API_KEY });
});

router.post('/chat', async (req, res) => {
  const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIP)) return res.status(429).json({ error: 'Trop de messages.', type: 'rate_limit' });
  const { messages, sessionId } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'Messages requis' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Service IA non configure.', type: 'config' });

  const trimmedMessages = messages.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content.slice(0, 2000) : ''
  }));

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 600, system: NOVA_SYSTEM_PROMPT, messages: trimmedMessages
    });
    res.json({
      response: response.content[0]?.text || "Desolee, reessayez !",
      sessionId: sessionId || ('nova_' + Date.now().toString(36)),
      usage: { input_tokens: response.usage?.input_tokens, output_tokens: response.usage?.output_tokens }
    });
  } catch (error) {
    console.error('[NOVA Error]', error.message);
    if (error.status === 401) return res.status(500).json({ error: 'Erreur config serveur.', type: 'auth' });
    if (error.status === 429) return res.status(429).json({ error: 'Service surcharge.', type: 'overload' });
    res.status(500).json({ error: 'Souci technique, reessayez.', type: 'server_error' });
  }
});

module.exports = router;
