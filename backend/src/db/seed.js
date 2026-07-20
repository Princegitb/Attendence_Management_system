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
  } catch (err) {
    console.error('Error seeding initial system data:', err.message);
  }
}

if (require.main === module) {
  seedDb().then(() => process.exit(0));
}

module.exports = seedDb;
