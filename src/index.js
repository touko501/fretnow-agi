// ═══════════════════════════════════════════════════════════════════════════
// FRETNOW AGI — API SERVER v5.1
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
// Stripe webhook needs raw body — must be before json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ═══ STATIC FILES ═══
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Serve frontend from public/
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
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

// ═══ SEED ENDPOINT (one-time use) ═══
app.get('/api/seed', async (req, res) => {
  try {
    const prisma = require('./config/database');
    const count = await prisma.user.count();
    if (count > 0) return res.json({ message: `Already seeded (${count} users)` });
    const sqlFile = path.join(__dirname, '../sql/fretnow-seed.sql');
    if (!fs.existsSync(sqlFile)) return res.status(404).json({ error: 'No seed file' });
    const sql = fs.readFileSync(sqlFile, 'utf8').replace(/DO \$\$[\s\S]*?\$\$;?/g, '');
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(sql);
    await client.end();
    const users = await prisma.user.count();
    const missions = await prisma.mission.count();
    const companies = await prisma.company.count();
    res.json({ seeded: true, data: { users, missions, companies } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ FIX ENDPOINT (one-time) ═══
app.get('/api/fix', async (req, res) => {
  try {
    const { Client } = require('pg');
    const bcrypt = require('bcryptjs');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    // Add PLATEFORME to CompanyType enum if not exists
    await client.query(`DO $tag$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PLATEFORME' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CompanyType')) THEN ALTER TYPE "CompanyType" ADD VALUE 'PLATEFORME'; END IF; END $tag$;`);
    // Update FRETNOW company type
    await client.query(`UPDATE "Company" SET type = 'PLATEFORME' WHERE id = 'co-fretnow'`);
    // Fix all password hashes (admin123)
    const hash = await bcrypt.hash('admin123', 12);
    const result = await client.query(`UPDATE "User" SET "passwordHash" = $1`, [hash]);
    await client.end();
    res.json({ fixed: true, passwordsUpdated: result.rowCount, newHash: hash.substring(0, 20) + '...' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ API DOCS (dev only) ═══
app.get('/api', (req, res) => {
  res.json({
    name: 'FRETNOW AGI API',
    version: '5.1.0',
    status: 'running',
    endpoints: {
      auth: { register: 'POST /api/auth/register', login: 'POST /api/auth/login', me: 'GET /api/auth/me', refresh: 'POST /api/auth/refresh', logout: 'POST /api/auth/logout', password: 'PUT /api/auth/password' },
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
      public: { health: 'GET /api/health', zones: 'GET /api/zones', settings: 'GET /api/settings', cnr: 'GET /api/cnr' },
    },
  });
});

// ═══ 404 HANDLER (API) ═══
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl });
});

// ═══ SPA CATCH-ALL ═══
const indexHtml = path.join(__dirname, '../public/index.html');
if (fs.existsSync(indexHtml)) {
  app.get('*', (req, res) => res.sendFile(indexHtml));
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
║  🚛 FRETNOW AGI API v5.1                         ║
║  Mode: ${env.NODE_ENV.padEnd(42)}║
║  Port: ${String(env.PORT).padEnd(42)}║
║  DB: ${(env.DATABASE_URL ? '✅ Connected' : '❌ Missing').padEnd(44)}║
║  Stripe: ${(env.STRIPE_SECRET_KEY ? '✅ Ready' : '⚠️  Not configured').padEnd(40)}║
╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
