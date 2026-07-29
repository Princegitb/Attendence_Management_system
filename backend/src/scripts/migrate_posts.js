require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: 6543,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: decodeURIComponent(process.env.PGPASSWORD),
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Adding required_guards to posts table...');
    await client.query(`
      ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS required_guards INT NOT NULL DEFAULT 1;
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
