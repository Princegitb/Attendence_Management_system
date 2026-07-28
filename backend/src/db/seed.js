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

      // Seed default sample posts ONLY on first-time initialization
      const post1Res = await db.query(
        `INSERT INTO posts (name, address, latitude, longitude, allowed_radius_metres) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Main Gate - HQ', 'Central Business District, New Delhi', 28.613939, 77.209021, 100]
      );
      await db.query(
        `INSERT INTO posts (name, address, latitude, longitude, allowed_radius_metres) VALUES ($1, $2, $3, $4, $5)`,
        ['Warehouse North', 'Industrial Area Phase 2, New Delhi', 28.650000, 77.220000, 150]
      );
      console.log('✅ Default sample posts seeded.');

      // Seed default sample shifts ONLY on first-time initialization
      const shift1Res = await db.query(
        `INSERT INTO shifts (name, start_time, end_time, grace_period_minutes) VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Day Shift', '08:00:00', '16:00:00', 15]
      );
      await db.query(
        `INSERT INTO shifts (name, start_time, end_time, grace_period_minutes) VALUES ($1, $2, $3, $4)`,
        ['Night Shift', '20:00:00', '04:00:00', 15]
      );
      console.log('✅ Default sample shifts seeded.');
    }

    // Retrieve active post & shift for seeding guards
    const posts = await db.query(`SELECT id FROM posts`);
    const shifts = await db.query(`SELECT id FROM shifts`);
    const post1Id = posts.rows[0]?.id;
    const shift1Id = shifts.rows[0]?.id;

    // Seed Sample Field Officer for attendance tagging
    const officerMobile = '9876543211';
    const officerPasswordHash = await bcrypt.hash('officerpassword', 10);
    let officerId;
    const existingOfficer = await db.query(`SELECT id FROM field_officers WHERE mobile = $1`, [officerMobile]);
    if (!existingOfficer.rows || existingOfficer.rows.length === 0) {
      const offRes = await db.query(
        `INSERT INTO field_officers (name, mobile, password_hash, must_change_password, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Sample Officer', officerMobile, officerPasswordHash, false, 'ACTIVE']
      );
      officerId = offRes.rows[0]?.id;
    } else {
      officerId = existingOfficer.rows[0]?.id;
    }

    // Seed Guards (Ramesh, Umesh, Suresh)
    const guardsData = [
      { name: 'Ramesh Kumar', mobile: '9999999991' },
      { name: 'Umesh Singh', mobile: '9999999992' },
      { name: 'Suresh Sharma', mobile: '9999999993' }
    ];

    for (const g of guardsData) {
      const existingGuard = await db.query(`SELECT id FROM guards WHERE mobile = $1`, [g.mobile]);
      let guardId;
      if (!existingGuard.rows || existingGuard.rows.length === 0) {
        const guardRes = await db.query(
          `INSERT INTO guards (name, mobile, assigned_post_id, assigned_shift_id, status)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [g.name, g.mobile, post1Id || null, shift1Id || null, 'ACTIVE']
        );
        guardId = guardRes.rows[0]?.id;
      } else {
        guardId = existingGuard.rows[0]?.id;
      }

      // Seed Default Salary Config: DAILY, ₹1000 wage, ₹150 OT, OT Eligible = true
      const existingConfig = await db.query(`SELECT id FROM salary_configurations WHERE guard_id = $1`, [guardId]);
      if (!existingConfig.rows || existingConfig.rows.length === 0) {
        await db.query(
          `INSERT INTO salary_configurations (guard_id, salary_type, basic_salary, ot_rate_per_hour, is_ot_eligible)
           VALUES ($1, $2, $3, $4, $5)`,
          [guardId, 'DAILY', 1000.00, 150.00, true]
        );
      }

      // Seed Attendance for the current month
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      const daysToSeed = g.name.includes('Ramesh') ? 22 : g.name.includes('Umesh') ? 25 : 18;
      
      for (let day = 1; day <= daysToSeed; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const existingAtt = await db.query(`SELECT id FROM attendance WHERE guard_id = $1 AND date = $2`, [guardId, dateStr]);
        if (!existingAtt.rows || existingAtt.rows.length === 0) {
          const attRes = await db.query(
            `INSERT INTO attendance (guard_id, marked_by_officer_id, date, status, check_in_time, check_out_time)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [
              guardId, 
              officerId || 1, 
              dateStr, 
              'CHECKED_OUT', 
              `${dateStr}T08:00:00Z`, 
              `${dateStr}T16:00:00Z`
            ]
          );
          const attId = attRes.rows[0]?.id;

          // Seed overtime for every 5th day
          if (day % 5 === 0) {
            const existingOt = await db.query(`SELECT id FROM overtime_records WHERE guard_id = $1 AND date = $2`, [guardId, dateStr]);
            if (!existingOt.rows || existingOt.rows.length === 0) {
              await db.query(
                `INSERT INTO overtime_records (guard_id, attendance_id, date, overtime_hours, status)
                 VALUES ($1, $2, $3, $4, $5)`,
                [guardId, attId || null, dateStr, 2.0, 'APPROVED']
              );
            }
          }
        }
      }
    }
    console.log('✅ Demo guards, salary configs, and monthly attendance seeded.');
  } catch (err) {
    console.error('Error seeding initial system data:', err.message);
  }
}

if (require.main === module) {
  seedDb().then(() => process.exit(0));
}

module.exports = seedDb;

