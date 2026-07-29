const bcrypt = require('bcryptjs');
const db = require('./index');
const initDb = require('./init');

async function seedDb() {
  await initDb();

  try {
    // Production Initial Super Admin Account Initialization
    const adminMobile = process.env.ADMIN_MOBILE;
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (!adminMobile || !adminPassword) {
      throw new Error('ADMIN_MOBILE and ADMIN_INITIAL_PASSWORD must be configured in environment variables.');
    }
    const mgrPasswordHash = await bcrypt.hash(adminPassword, 10);

    // Check if initial admin already exists
    const existingAdmin = await db.query(`SELECT id FROM managers WHERE mobile = $1`, [adminMobile]);
    const isFirstTimeInit = !existingAdmin.rows || existingAdmin.rows.length === 0;

    if (isFirstTimeInit) {
      await db.query(
        `INSERT INTO managers (name, mobile, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (mobile) DO NOTHING`,
        ['Super Admin Manager', adminMobile, mgrPasswordHash, 'MANAGER']
      );

      console.log(`✅ Production Initial Super Admin ready. (Mobile: ${adminMobile})`);
    }
  } catch (err) {
    console.error('Error seeding initial system data:', err.message);
  }
}

if (require.main === module) {
  seedDb().then(() => process.exit(0));
}

module.exports = seedDb;

