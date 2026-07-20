const fs = require('fs');
const path = require('path');
const db = require('./index');

async function initDb() {
  console.log('Initializing PostgreSQL database schema...');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await db.query(schemaSql);
    console.log('✅ Database schema initialized successfully.');
  } catch (err) {
    console.error('❌ Error initializing database schema:', err.message);
  }
}

if (require.main === module) {
  initDb().then(() => process.exit(0));
}

module.exports = initDb;
