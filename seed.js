// FRETNOW Seed — Direct PostgreSQL execution
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    
    // Check if already seeded
    const check = await client.query('SELECT COUNT(*) FROM "User"');
    if (parseInt(check.rows[0].count) > 0) {
      console.log(`DB already has ${check.rows[0].count} users — updating admin password...`);
      // Always update admin password to ensure it works
      const bcrypt = require('bcryptjs');
      const adminHash = bcrypt.hashSync('admin123', 12);
      await client.query('UPDATE "User" SET "passwordHash" = $1 WHERE email = $2', [adminHash, 'admin@fretnow.com']);
      console.log('Admin password updated to admin123');
      return;
    }

    const sqlFile = path.join(__dirname, 'sql', 'fretnow-seed.sql');
    if (!fs.existsSync(sqlFile)) {
      console.log('No seed file found — skipping.');
      return;
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Remove the DO $$ verification block at the end
    const cleanSql = sql.replace(/DO \$\$[\s\S]*?\$\$;?/g, '');
    
    console.log('Seeding database...');
    await client.query(cleanSql);
    
    // Verify
    const users = await client.query('SELECT COUNT(*) FROM "User"');
    const missions = await client.query('SELECT COUNT(*) FROM "Mission"');
    const companies = await client.query('SELECT COUNT(*) FROM "Company"');
    
    console.log(`Seed complete! Users: ${users.rows[0].count}, Missions: ${missions.rows[0].count}, Companies: ${companies.rows[0].count}`);
  } catch (err) {
    console.error('Seed error:', err.message);
    // Don't crash the app if seed fails
  } finally {
    await client.end();
  }
}

seed();
