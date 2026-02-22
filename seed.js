const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function seed() {
  const prisma = new PrismaClient();
  try {
    // Check if already seeded
    const count = await prisma.user.count();
    if (count > 0) {
      console.log(`DB already has ${count} users — skipping seed.`);
      return;
    }

    const sqlFile = path.join(__dirname, 'sql', 'fretnow-seed.sql');
    if (!fs.existsSync(sqlFile)) {
      console.log('No seed file found — skipping.');
      return;
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    // Split on semicolons, filter empty, execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('DO $$'));

    console.log(`Seeding ${statements.length} statements...`);
    for (let i = 0; i < statements.length; i++) {
      try {
        await prisma.$executeRawUnsafe(statements[i]);
        if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${statements.length} done`);
      } catch (err) {
        // Skip duplicates
        if (err.code === 'P2002' || err.message.includes('duplicate')) {
          continue;
        }
        console.error(`Statement ${i + 1} error:`, err.message.slice(0, 100));
      }
    }
    console.log('Seed complete!');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
