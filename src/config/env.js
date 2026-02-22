require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 10000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_EXPIRES_IN: '30d',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  COMMISSION_PERCENT: parseFloat(process.env.STRIPE_COMMISSION_PERCENT) || 8.0,
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'fretnow-docs',
  STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
  STORAGE_PUBLIC_URL: process.env.STORAGE_PUBLIC_URL || '/uploads',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB) || 10,
};

if (env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!env[key]) { console.error(`❌ Missing: ${key}`); process.exit(1); }
  }
}

module.exports = env;
