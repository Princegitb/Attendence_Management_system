require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.PGHOST,
  port: 6543, // Session pooler
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: decodeURIComponent(process.env.PGPASSWORD),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, month, year FROM payrolls');
    console.log('Payrolls:', res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
}
run();
