require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: 6543,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: decodeURIComponent(process.env.PGPASSWORD), // Decode in case of %40
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Connecting to database via port 6543 (Session Pooler IPv4)...');
    const client = await pool.connect();
    
    console.log('Altering payroll_details table...');
    await client.query(`
      ALTER TABLE payroll_details
      ALTER COLUMN present_days TYPE NUMERIC(5, 2),
      ALTER COLUMN absent_days TYPE NUMERIC(5, 2);
    `);
    
    console.log('Migration successful!');
    client.release();
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

runMigration();
