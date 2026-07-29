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
    await client.query('BEGIN');
    console.log('BEGIN');

    const checkRes = await client.query('SELECT id FROM payrolls WHERE month = 7 AND year = 2026');
    console.log('checkRes:', checkRes.rows);

    if (checkRes.rows.length > 0) {
      await client.query('DELETE FROM payrolls WHERE id = $1', [checkRes.rows[0].id]);
      console.log('DELETED', checkRes.rows[0].id);
    }

    const insertRes = await client.query(
      `INSERT INTO payrolls (month, year, status, total_basic_earnings, total_ot_earnings, total_advance_deductions, total_net_salary) 
       VALUES (7, 2026, 'APPROVED', 0, 0, 0, 0) RETURNING id`
    );
    console.log('INSERTED', insertRes.rows[0].id);

    await client.query('ROLLBACK'); // Rollback so we don't mess up their DB
    console.log('ROLLBACK');
  } catch(e) {
    console.error('ERROR:', e.message);
    await client.query('ROLLBACK');
  } finally {
    client.end();
  }
}
run();
