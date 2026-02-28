// ═══════════════════════════════════════════════════════════════════════════
// FRETNOW AGI — API SERVER v6.1
// Marketplace Fret Routier B2B · Plateforme Digitale
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const env = require('./config/env');
const { applySecurity } = require('./config/security');

const app = express();

// ═══ SECURITY ═══
applySecurity(app);

// ═══ LOGGING ═══
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ═══ BODY PARSING ═══
// Stripe webhooks need raw body — must be before json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/wallet/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ═══ STATIC FILES ═══
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Serve React frontend from public-react/ (priority) or fallback to public/
const reactDir = path.join(__dirname, '../public-react');
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(reactDir)) {
  app.use(express.static(reactDir));
} else if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}
// Also serve legacy HTML from /legacy/
if (fs.existsSync(publicDir)) {
  app.use('/legacy', express.static(publicDir));
}

// ═══ API ROUTES ═══
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const missionRoutes = require('./routes/missions');
const bidRoutes = require('./routes/bids');
const documentRoutes = require('./routes/documents');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const ratingRoutes = require('./routes/ratings');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const walletRoutes = require('./routes/wallet');
const agentRoutes = require('./routes/agents');
const sharedRouteRoutes = require('./routes/shared-routes');
const contactRoutes = require('./routes/contact');
const monitoringRoutes = require('./routes/monitoring');
const gdprRoutes = require('./routes/gdpr');
const mobilicRoutes = require('./routes/mobilic');
const messagerieRoutes = require('./routes/messagerie');

app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/shared-routes', sharedRouteRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/mobilic', mobilicRoutes);
app.use('/api/messagerie', messagerieRoutes);

// ═══ API DOCS ═══
app.get('/api', (req, res) => {
  res.json({
    name: 'FRETNOW AGI API',
    version: '7.3.0',
    status: 'running',
    endpoints: {
      auth: { register: 'POST /api/auth/register', login: 'POST /api/auth/login', me: 'GET /api/auth/me', refresh: 'POST /api/auth/refresh', logout: 'POST /api/auth/logout', password: 'PUT /api/auth/password', forgotPassword: 'POST /api/auth/forgot-password', resetPassword: 'POST /api/auth/reset-password' },
      missions: { list: 'GET /api/missions', create: 'POST /api/missions', detail: 'GET /api/missions/:id', update: 'PUT /api/missions/:id', publish: 'POST /api/missions/:id/publish', assign: 'POST /api/missions/:id/assign', status: 'POST /api/missions/:id/status', delete: 'DELETE /api/missions/:id' },
      bids: { create: 'POST /api/bids', mine: 'GET /api/bids/mine', withdraw: 'DELETE /api/bids/:id' },
      documents: { upload: 'POST /api/documents/upload', list: 'GET /api/documents', download: 'GET /api/documents/:id/download', verify: 'POST /api/documents/:id/verify (admin)', expiring: 'GET /api/documents/expiring/soon (admin)' },
      vehicles: { list: 'GET /api/vehicles', create: 'POST /api/vehicles', update: 'PUT /api/vehicles/:id', delete: 'DELETE /api/vehicles/:id' },
      drivers: { list: 'GET /api/drivers', create: 'POST /api/drivers', update: 'PUT /api/drivers/:id', delete: 'DELETE /api/drivers/:id' },
      ratings: { create: 'POST /api/ratings', user: 'GET /api/ratings/user/:userId' },
      payments: { create: 'POST /api/payments/create', list: 'GET /api/payments', invoices: 'GET /api/payments/invoices', webhook: 'POST /api/payments/webhook' },
      notifications: { list: 'GET /api/notifications', read: 'POST /api/notifications/:id/read', readAll: 'POST /api/notifications/read-all' },
      users: { profile: 'PUT /api/users/profile', company: 'PUT /api/users/company', favorites: 'GET /api/users/favorites', publicProfile: 'GET /api/users/:id/public', deleteAccount: 'DELETE /api/users/account' },
      admin: { dashboard: 'GET /api/admin/dashboard', users: 'GET /api/admin/users', verify: 'POST /api/admin/users/:id/verify', suspend: 'POST /api/admin/users/:id/suspend', companies: 'GET /api/admin/companies', audit: 'GET /api/admin/audit' },
      wallet: { balance: 'GET /api/wallet/balance', transactions: 'GET /api/wallet/transactions', topup: 'POST /api/wallet/topup', reserve: 'POST /api/wallet/reserve', release: 'POST /api/wallet/release', refund: 'POST /api/wallet/refund' },
      agents: { status: 'GET /api/agents/status', pricing: 'POST /api/agents/pricing/:missionId', match: 'POST /api/agents/match/:missionId', risk: 'POST /api/agents/risk/:companyId', compliance_analyze: 'POST /api/agents/compliance/analyze/:driverId', compliance_can_accept: 'POST /api/agents/compliance/can-accept', compliance_available: 'GET /api/agents/compliance/available/:companyId', compliance_certification: 'GET /api/agents/compliance/certification/:companyId' },
      mobilic: { connect: 'GET /api/mobilic/connect', callback: 'GET /api/mobilic/callback', status: 'GET /api/mobilic/status', start_activity: 'POST /api/mobilic/activity/start', end_activity: 'POST /api/mobilic/activity/:logId/end', driver_today: 'GET /api/mobilic/driver/:driverId/today', driver_logs: 'GET /api/mobilic/driver/:driverId/logs', driver_availability: 'GET /api/mobilic/driver/:driverId/availability', validate_log: 'POST /api/mobilic/logs/:logId/validate', validate_batch: 'POST /api/mobilic/logs/validate-batch', compliance_dashboard: 'GET /api/mobilic/compliance/dashboard', compliance_score: 'GET /api/mobilic/compliance/score', compliance_alerts: 'GET /api/mobilic/compliance/alerts', resolve_alert: 'POST /api/mobilic/compliance/alerts/:id/resolve' },
      messagerie: { create: 'POST /api/messagerie/missions', list: 'GET /api/messagerie/missions', nearby: 'GET /api/messagerie/missions/nearby', confirm_delivery: 'POST /api/messagerie/missions/:id/confirm-delivery', sla_overview: 'GET /api/messagerie/sla/overview', sla_stats: 'GET /api/messagerie/sla/stats' },
      public: { health: 'GET /api/health', zones: 'GET /api/zones', settings: 'GET /api/settings', cnr: 'GET /api/cnr' },
    },
  });
});

// ═══ 404 HANDLER (API) ═══
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl });
});

// ═══ CONVENIENCE REDIRECTS ═══
app.get('/app', (req, res) => res.redirect('/app.html'));
app.get('/dashboard', (req, res) => res.redirect('/app.html'));

// ═══ SPA CATCH-ALL ═══
const reactIndex = path.join(__dirname, '../public-react/index.html');
const indexHtml = path.join(__dirname, '../public/index.html');
const spaFile = fs.existsSync(reactIndex) ? reactIndex : indexHtml;
if (fs.existsSync(spaFile)) {
  app.get('*', (req, res) => res.sendFile(spaFile));
}

// ═══ ERROR HANDLER ═══
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({
    error: env.NODE_ENV === 'production' ? 'Erreur serveur interne' : err.message,
  });
});

// ═══ START SERVER ═══
app.listen(env.PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║  🚛 FRETNOW AGI API v7.3.0                       ║
║  Mode: ${env.NODE_ENV.padEnd(42)}║
║  Port: ${String(env.PORT).padEnd(42)}║
║  DB: ${(env.DATABASE_URL ? '✅ Connected' : '❌ Missing').padEnd(44)}║
║  Stripe: ${(env.STRIPE_SECRET_KEY ? '✅ Ready' : '⚠️  Not configured').padEnd(40)}║
║  Mobilic: ${(process.env.MOBILIC_CLIENT_ID ? '✅ Ready' : '⏳ Awaiting sandbox access').padEnd(39)}║
║  AI: ✅ 10 Agents (incl. Compliance)            ║
║  Routes: Fret + Messagerie + Express + Mobilic  ║
╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
