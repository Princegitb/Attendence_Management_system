const bcrypt = require('bcryptjs');
const db = require('./index');
const initDb = require('./init');

async function seedDb() {
  await initDb();

  try {
    // Production Initial Super Admin Account Initialization
    const adminMobile = process.env.ADMIN_MOBILE || '9876543210';
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'adminpassword';
    const mgrPasswordHash = await bcrypt.hash(adminPassword, 10);

    await db.query(
      `INSERT INTO managers (name, mobile, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (mobile) DO NOTHING`,
      ['Super Admin Manager', adminMobile, mgrPasswordHash, 'MANAGER']
    );

    console.log(`✅ Production Initial Super Admin ready. (Mobile: ${adminMobile})`);

    // Seed default sample posts if not present
    const existingPosts = await db.query(`SELECT id FROM posts LIMIT 1`);
    if (!existingPosts.rows || existingPosts.rows.length === 0) {
      await db.query(
        `INSERT INTO posts (name, address, latitude, longitude, allowed_radius_metres) VALUES ($1, $2, $3, $4, $5)`,
        ['Main Gate - HQ', 'Central Business District, New Delhi', 28.613939, 77.209021, 100]
      );
      await db.query(
        `INSERT INTO posts (name, address, latitude, longitude, allowed_radius_metres) VALUES ($1, $2, $3, $4, $5)`,
        ['Warehouse North', 'Industrial Area Phase 2, New Delhi', 28.650000, 77.220000, 150]
      );
      console.log('✅ Default sample posts seeded.');
    }

    // Seed default sample shifts if not present
    const existingShifts = await db.query(`SELECT id FROM shifts LIMIT 1`);
    if (!existingShifts.rows || existingShifts.rows.length === 0) {
      await db.query(
        `INSERT INTO shifts (name, start_time, end_time, grace_period_minutes) VALUES ($1, $2, $3, $4)`,
        ['Day Shift', '08:00:00', '16:00:00', 15]
      );
      await db.query(
        `INSERT INTO shifts (name, start_time, end_time, grace_period_minutes) VALUES ($1, $2, $3, $4)`,
        ['Night Shift', '20:00:00', '04:00:00', 15]
      );
      console.log('✅ Default sample shifts seeded.');
    }
  } catch (err) {
    console.error('Error seeding initial system data:', err.message);
  }
}

if (require.main === module) {
  seedDb().then(() => process.exit(0));
}

module.exports = seedDb;

