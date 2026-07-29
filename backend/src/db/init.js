const fs = require('fs');
const path = require('path');
const db = require('./index');

async function initDb() {
  console.log('Initializing PostgreSQL database schema...');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await db.query(schemaSql);
    // Auto-migration for token_version column on existing tables
    await db.query(`ALTER TABLE managers ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1`);
    await db.query(`ALTER TABLE field_officers ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1`);
    console.log('✅ Database schema initialized successfully with token_version migrations.');
  } catch (err) {
    console.error('❌ Error initializing database schema:', err.message);
  }
}

if (require.main === module) {
  initDb().then(() => process.exit(0));
}

module.exports = initDb;
