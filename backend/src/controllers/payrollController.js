const db = require('../db');
const { calculateSalary, evaluateMonthlyAttendance } = require('../utils/salaryCalculator');
const { logAuditEvent } = require('../utils/auditLogger');

// Helper to get number of days in a month
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// ==========================================
// 1. SALARY CONFIGURATION
// ==========================================
async function getConfigurations(req, res) {
  try {
    const result = await db.query(
      `SELECT g.id AS guard_id, g.name AS guard_name, g.mobile AS guard_mobile,
              sc.id AS config_id, sc.salary_type, sc.basic_salary, sc.ot_rate_per_hour, sc.is_ot_eligible
       FROM guards g
       LEFT JOIN salary_configurations sc ON g.id = sc.guard_id
       ORDER BY g.name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function updateConfiguration(req, res) {
  try {
    const { guard_id, salary_type, basic_salary, ot_rate_per_hour, is_ot_eligible } = req.body;
    
    if (!guard_id || !salary_type) {
      return res.status(400).json({ success: false, message: 'Guard ID and Salary Type are required.' });
    }

    // Check if configuration exists
    const checkRes = await db.query(`SELECT * FROM salary_configurations WHERE guard_id = $1`, [guard_id]);
    
    let result;
    if (checkRes.rows.length > 0) {
      result = await db.query(
        `UPDATE salary_configurations
         SET salary_type = $2, basic_salary = $3, ot_rate_per_hour = $4, is_ot_eligible = $5, updated_at = CURRENT_TIMESTAMP
         WHERE guard_id = $1
         RETURNING *`,
        [guard_id, salary_type, basic_salary || 0.00, ot_rate_per_hour || 0.00, is_ot_eligible || false]
      );
    } else {
      result = await db.query(
        `INSERT INTO salary_configurations (guard_id, salary_type, basic_salary, ot_rate_per_hour, is_ot_eligible)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [guard_id, salary_type, basic_salary || 0.00, ot_rate_per_hour || 0.00, is_ot_eligible || false]
      );
    }

    await logAuditEvent({
      action: 'UPDATE_SALARY_CONFIG',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      targetType: 'Guard',
      targetId: guard_id,
      newValue: result.rows[0],
      reason: `Updated salary config: Type=${salary_type}, Salary=${basic_salary}`
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function bulkUpdateConfigurations(req, res) {
  const client = await db.getClient();
  try {
    const { salary_type, basic_salary, ot_rate_per_hour, is_ot_eligible } = req.body;

    if (!salary_type) {
      return res.status(400).json({ success: false, message: 'Salary Type is required.' });
    }

    // Start database transaction
    await client.query('BEGIN');

    // 1. Get all active guards
    const guardsRes = await client.query(`SELECT id FROM guards WHERE status = 'ACTIVE'`);
    const guardIds = guardsRes.rows.map(g => g.id);

    if (guardIds.length === 0) {
      await client.query('COMMIT');
      return res.json({ success: true, message: 'No active guards found to configure.' });
    }

    // 2. Perform bulk insertion/updating (handling compatibility for PostgreSQL and mock)
    for (const guardId of guardIds) {
      const checkRes = await client.query(`SELECT id FROM salary_configurations WHERE guard_id = $1`, [guardId]);
      if (checkRes.rows.length > 0) {
        await client.query(
          `UPDATE salary_configurations
           SET salary_type = $2, basic_salary = $3, ot_rate_per_hour = $4, is_ot_eligible = $5, updated_at = CURRENT_TIMESTAMP
           WHERE guard_id = $1`,
          [guardId, salary_type, basic_salary || 0.00, ot_rate_per_hour || 0.00, is_ot_eligible || false]
        );
      } else {
        await client.query(
          `INSERT INTO salary_configurations (guard_id, salary_type, basic_salary, ot_rate_per_hour, is_ot_eligible)
           VALUES ($1, $2, $3, $4, $5)`,
          [guardId, salary_type, basic_salary || 0.00, ot_rate_per_hour || 0.00, is_ot_eligible || false]
        );
      }
    }

    await client.query('COMMIT');

    await logAuditEvent({
      action: 'BULK_UPDATE_SALARY_CONFIG',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      reason: `Bulk configured all ${guardIds.length} guards: Type=${salary_type}, Salary=${basic_salary}`
    });

    return res.json({ success: true, message: `Successfully updated configurations for all ${guardIds.length} active guards.` });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

async function getGuardPayrollDetails(req, res) {
  try {
    const { guard_id, month, year } = req.query;
    if (!guard_id || !month || !year) {
      return res.status(400).json({ success: false, message: 'Guard ID, Month, and Year are required.' });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const daysInMonth = getDaysInMonth(yearNum, monthNum);
    const startDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${daysInMonth}`;

    // 1. Fetch Guard Info
    const guardRes = await db.query(
      `SELECT g.id, g.name, g.mobile, p.name AS post_name, s.name AS shift_name
       FROM guards g
       LEFT JOIN posts p ON g.assigned_post_id = p.id
       LEFT JOIN shifts s ON g.assigned_shift_id = s.id
       WHERE g.id = $1`,
      [guard_id]
    );

    if (guardRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guard not found.' });
    }

    const guard = guardRes.rows[0];

    // 2. Fetch Salary Config
    const configRes = await db.query(
      `SELECT * FROM salary_configurations WHERE guard_id = $1`,
      [guard_id]
    );
    const config = configRes.rows[0] || null;

    // 3. Fetch Attendance Logs for this month
    const attRes = await db.query(
      `SELECT a.id, a.date, a.check_in_time, a.check_out_time, a.status,
              a.check_in_distance_from_post
       FROM attendance a
       WHERE a.guard_id = $1 AND a.date >= $2 AND a.date <= $3
       ORDER BY a.date ASC`,
      [guard_id, startDateStr, endDateStr]
    );

    // 4. Fetch Overtime records for this month (only count if not linked to a deleted/rejected attendance)
    const otRes = await db.query(
      `SELECT ot.* FROM overtime_records ot
       LEFT JOIN attendance a ON ot.attendance_id = a.id
       WHERE ot.guard_id = $1 AND ot.date >= $2 AND ot.date <= $3
         AND (ot.attendance_id IS NULL OR (a.status IS NOT NULL AND a.status IN ('APPROVED', 'CHECKED_IN', 'CHECKED_OUT')))`,
      [guard_id, startDateStr, endDateStr]
    );

    const presentDays = attRes.rows.filter(a => ['APPROVED', 'CHECKED_IN', 'CHECKED_OUT'].includes(a.status)).length;
    const absentDays = daysInMonth - presentDays;
    const approvedOtHours = otRes.rows.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + parseFloat(r.overtime_hours || 0), 0);

    const calculation = config ? calculateSalary({
      salaryType: config.salary_type,
      basicSalary: config.basic_salary,
      otRatePerHour: config.ot_rate_per_hour,
      isOtEligible: config.is_ot_eligible,
      presentDays,
      absentDays,
      totalApprovedOtHours: approvedOtHours,
      totalAdvances: 0,
      daysInMonth
    }) : null;

    const attendanceMap = Array.from({ length: daysInMonth }).map((_, index) => {
      const dayNum = index + 1;
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const att = attRes.rows.find(a => new Date(a.date).toISOString().split('T')[0] === dateStr);
      
      let dayStatus = 'ABSENT';
      let dayLabel = 'Absent';
      if (att) {
        if (att.status === 'APPROVED') {
          dayStatus = 'PRESENT';
          dayLabel = 'Present';
        } else if (att.status === 'CHECKED_IN') {
          dayStatus = 'CHECKED_IN';
          dayLabel = 'Checkin Done';
        } else if (att.status === 'CHECKED_OUT') {
          dayStatus = 'CHECKED_OUT';
          dayLabel = 'Checkout Done';
        } else if (att.status === 'PENDING_REVIEW') {
          dayStatus = 'PENDING';
          dayLabel = 'Pending Review';
        } else if (att.status === 'REJECTED') {
          dayStatus = 'REJECTED';
          dayLabel = 'Rejected';
        }
      }
      
      return {
        status: dayStatus,
        otHours: otRes.rows.find(ot => new Date(ot.date).toISOString().split('T')[0] === dateStr && ot.status === 'APPROVED')?.overtime_hours || 0,
        checkInTime: att ? att.check_in_time : null,
        checkOutTime: att ? att.check_out_time : null,
        label: dayLabel
      };
    });

    return res.json({
      success: true,
      guard,
      config,
      attendance: attendanceMap,
      overtime: otRes.rows,
      daysInMonth,
      summary: calculation
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 2. SALARY ADVANCE MANAGEMENT
// ==========================================
async function getAdvances(req, res) {
  try {
    const { guard_id } = req.query;
    let queryText = `
      SELECT sa.id, sa.guard_id, g.name AS guard_name, sa.amount, sa.advance_date, sa.reason, sa.created_at
      FROM salary_advances sa
      JOIN guards g ON sa.guard_id = g.id
    `;
    const params = [];
    if (guard_id) {
      params.push(guard_id);
      queryText += ` WHERE sa.guard_id = $1`;
    }
    queryText += ` ORDER BY sa.advance_date DESC`;

    const result = await db.query(queryText, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createAdvance(req, res) {
  try {
    const { guard_id, amount, advance_date, reason } = req.body;
    if (!guard_id || !amount) {
      return res.status(400).json({ success: false, message: 'Guard ID and Amount are required.' });
    }

    const result = await db.query(
      `INSERT INTO salary_advances (guard_id, amount, advance_date, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [guard_id, amount, advance_date || new Date().toISOString().split('T')[0], reason || '', req.user.id]
    );

    await logAuditEvent({
      action: 'RECORD_SALARY_ADVANCE',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      targetType: 'Guard',
      targetId: guard_id,
      newValue: result.rows[0],
      reason: `Recorded advance payment of ₹${amount}`
    });

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function updateAdvance(req, res) {
  try {
    const { id } = req.params;
    const { amount, advance_date, reason } = req.body;

    const checkRes = await db.query(`SELECT * FROM salary_advances WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Advance record not found.' });
    }

    const result = await db.query(
      `UPDATE salary_advances
       SET amount = $1, advance_date = $2, reason = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [amount, advance_date, reason, id]
    );

    await logAuditEvent({
      action: 'UPDATE_SALARY_ADVANCE',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      targetType: 'SalaryAdvance',
      targetId: id,
      oldValue: checkRes.rows[0],
      newValue: result.rows[0],
      reason: `Updated advance details`
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteAdvance(req, res) {
  try {
    const { id } = req.params;
    const checkRes = await db.query(`SELECT * FROM salary_advances WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Advance record not found.' });
    }

    await db.query(`DELETE FROM salary_advances WHERE id = $1`, [id]);

    await logAuditEvent({
      action: 'DELETE_SALARY_ADVANCE',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      targetType: 'SalaryAdvance',
      targetId: id,
      reason: `Deleted advance of ₹${checkRes.rows[0].amount}`
    });

    return res.json({ success: true, message: 'Advance salary record deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 3. OVERTIME RECORDS
// ==========================================
async function getOvertimeRecords(req, res) {
  try {
    const result = await db.query(
      `SELECT ot.id, ot.guard_id, g.name AS guard_name, ot.attendance_id, ot.date, ot.overtime_hours, ot.status
       FROM overtime_records ot
       JOIN guards g ON ot.guard_id = g.id
       ORDER BY ot.date DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function logOvertime(req, res) {
  try {
    const { guard_id, attendance_id, date, overtime_hours } = req.body;
    if (!guard_id || !date || overtime_hours === undefined) {
      return res.status(400).json({ success: false, message: 'Guard ID, Date, and Overtime Hours are required.' });
    }

    const checkRes = await db.query(`SELECT * FROM overtime_records WHERE guard_id = $1 AND date = $2`, [guard_id, date]);
    let result;
    if (checkRes.rows.length > 0) {
      result = await db.query(
        `UPDATE overtime_records SET overtime_hours = $1, status = 'PENDING', updated_at = CURRENT_TIMESTAMP
         WHERE guard_id = $2 AND date = $3 RETURNING *`,
        [overtime_hours, guard_id, date]
      );
    } else {
      result = await db.query(
        `INSERT INTO overtime_records (guard_id, attendance_id, date, overtime_hours)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [guard_id, attendance_id || null, date, overtime_hours]
      );
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function approveOvertime(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be APPROVED or REJECTED.' });
    }

    const result = await db.query(
      `UPDATE overtime_records SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [status, req.user.id, id]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 4. PAYROLL CALCULATION (DRY RUN)
// ==========================================
async function calculateMonthlyPayroll(req, res) {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and Year parameters are required.' });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const daysInMonth = getDaysInMonth(yearNum, monthNum);
    const startDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${daysInMonth}`;

    // Get all guards with salary configurations and shift times
    const guardsRes = await db.query(
      `SELECT g.id, g.name, g.mobile, g.assigned_post_id,
              sc.salary_type, sc.basic_salary, sc.ot_rate_per_hour, sc.is_ot_eligible,
              s.start_time, s.end_time
       FROM guards g
       JOIN salary_configurations sc ON g.id = sc.guard_id
       LEFT JOIN shifts s ON g.assigned_shift_id = s.id
       WHERE g.status = 'ACTIVE'`
    );

    const payrollRows = [];
    // Batch fetch attendance, overtime, and advances for all active guards
    const activeGuardIds = guardsRes.rows.map(g => g.id);

    let attRes = { rows: [] };
    let otRes = { rows: [] };
    let advRes = { rows: [] };

    if (activeGuardIds.length > 0) {
      attRes = await db.query(
        `SELECT guard_id, date, status, check_in_time, check_out_time FROM attendance
         WHERE date >= $1 AND date <= $2 AND guard_id = ANY($3::int[])`,
        [startDateStr, endDateStr, activeGuardIds]
      );

      otRes = await db.query(
        `SELECT ot.guard_id, ot.overtime_hours FROM overtime_records ot
         LEFT JOIN attendance a ON ot.attendance_id = a.id
         WHERE ot.date >= $1 AND ot.date <= $2 AND ot.status = 'APPROVED' AND ot.guard_id = ANY($3::int[])
           AND (ot.attendance_id IS NULL OR (a.status IS NOT NULL AND a.status IN ('APPROVED', 'CHECKED_IN', 'CHECKED_OUT')))`,
        [startDateStr, endDateStr, activeGuardIds]
      );

      advRes = await db.query(
        `SELECT guard_id, COALESCE(SUM(amount), 0) AS total_advances
         FROM salary_advances
         WHERE advance_date >= $1 AND advance_date <= $2 AND guard_id = ANY($3::int[])
         GROUP BY guard_id`,
        [startDateStr, endDateStr, activeGuardIds]
      );
    }

    // Index data in-memory
    const attendanceMap = {};
    attRes.rows.forEach(a => {
      attendanceMap[a.guard_id] = attendanceMap[a.guard_id] || [];
      attendanceMap[a.guard_id].push(a);
    });

    const overtimeMap = {};
    otRes.rows.forEach(o => {
      overtimeMap[o.guard_id] = (overtimeMap[o.guard_id] || 0) + parseFloat(o.overtime_hours || 0);
    });

    const advancesMap = {};
    advRes.rows.forEach(ad => {
      advancesMap[ad.guard_id] = parseFloat(ad.total_advances || 0);
    });

    for (const guard of guardsRes.rows) {
      const guardAtt = attendanceMap[guard.id] || [];
      
      let shiftDurationMinutes = 480; // default 8 hours
      if (guard.start_time && guard.end_time) {
        const startParts = guard.start_time.split(':').map(Number);
        const endParts = guard.end_time.split(':').map(Number);
        const startMins = startParts[0] * 60 + startParts[1];
        const endMins = endParts[0] * 60 + endParts[1];
        if (endMins >= startMins) {
           shiftDurationMinutes = endMins - startMins;
        } else {
           shiftDurationMinutes = (24 * 60 - startMins) + endMins;
        }
      }

      let totalWorkedMinutes = 0;
      for (const a of guardAtt) {
         if (!['APPROVED', 'CHECKED_IN', 'CHECKED_OUT'].includes(a.status)) continue;
         
         if (a.check_in_time && a.check_out_time) {
            const checkIn = new Date(a.check_in_time);
            const checkOut = new Date(a.check_out_time);
            let mins = (checkOut - checkIn) / 60000;
            if (mins < 0) mins = 0;
            if (mins > shiftDurationMinutes) mins = shiftDurationMinutes;
            totalWorkedMinutes += mins;
         } else if (a.check_in_time && !a.check_out_time && a.status === 'CHECKED_IN') {
            const checkIn = new Date(a.check_in_time);
            let checkOut = new Date(checkIn.getTime() + shiftDurationMinutes * 60000);
            
            const now = new Date();
            if (checkOut > now) checkOut = now;
            
            let mins = (checkOut - checkIn) / 60000;
            if (mins < 0) mins = 0;
            if (mins > shiftDurationMinutes) mins = shiftDurationMinutes;
            totalWorkedMinutes += mins;
         }
      }
      
      let presentDays = totalWorkedMinutes / shiftDurationMinutes;
      presentDays = Math.round(presentDays * 100) / 100; // 2 decimals
      const absentDays = Math.max(0, Math.round((daysInMonth - presentDays) * 100) / 100);
      
      const totalOtHours = overtimeMap[guard.id] || 0;
      const totalAdvances = advancesMap[guard.id] || 0;

      // Calculate final salary breakdown
      const calculation = calculateSalary({
        salaryType: guard.salary_type,
        basicSalary: guard.basic_salary,
        otRatePerHour: guard.ot_rate_per_hour,
        isOtEligible: guard.is_ot_eligible,
        presentDays,
        absentDays,
        totalApprovedOtHours: totalOtHours,
        totalAdvances,
        daysInMonth
      });

      payrollRows.push({
        guardId: guard.id,
        guardName: guard.name,
        guardMobile: guard.mobile,
        salaryType: guard.salary_type,
        basicSalary: guard.basic_salary,
        ...calculation
      });
    }

    return res.json({
      success: true,
      month: monthNum,
      year: yearNum,
      daysInMonth,
      data: payrollRows
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 5. PAYROLL GENERATION & LOCK
// ==========================================
async function generatePayroll(req, res) {
  const client = await db.getClient();
  try {
    const { month, year, employee_salaries, overwrite } = req.body;

    if (!month || !year || !employee_salaries || !Array.isArray(employee_salaries)) {
      return res.status(400).json({ success: false, message: 'Month, Year, and salary list are required.' });
    }

    // Start database transaction
    await client.query('BEGIN');

    if (!overwrite) {
      // Check if payroll already generated for this month
      const checkRes = await client.query(
        `SELECT id FROM payrolls WHERE month = $1 AND year = $2`,
        [month, year]
      );
      if (checkRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          code: 'ALREADY_EXISTS',
          message: 'Payroll for this month/year has already been generated.' 
        });
      }
    } else {
      // If overwrite is true, directly delete the existing payroll for this month/year
      // This is atomic and avoids race conditions where a select followed by a delete 
      // operates on stale row IDs.
      await client.query(`DELETE FROM payrolls WHERE month = $1 AND year = $2`, [month, year]);
    }

    // 1. Calculate Summary aggregates
    let totalBasic = 0;
    let totalOt = 0;
    let totalAdvances = 0;
    let totalNet = 0;

    employee_salaries.forEach(emp => {
      totalBasic += parseFloat(emp.basicEarnings || 0);
      totalOt += parseFloat(emp.otEarnings || 0);
      totalAdvances += parseFloat(emp.advanceDeduction || 0);
      totalNet += parseFloat(emp.netSalary || 0);
    });

    // 2. Insert Payroll Master row
    const payrollRes = await client.query(
      `INSERT INTO payrolls (
        month, year, status, total_basic_earnings, 
        total_ot_earnings, total_advance_deductions, total_net_salary, generated_by
      ) VALUES ($1, $2, 'APPROVED', $3, $4, $5, $6, $7)
      RETURNING id`,
      [month, year, totalBasic, totalOt, totalAdvances, totalNet, req.user.id]
    );

    const payrollId = payrollRes.rows[0].id;

    // 3. Insert Payroll Details row per guard
    for (const emp of employee_salaries) {
      await client.query(
        `INSERT INTO payroll_details (
          payroll_id, guard_id, present_days, absent_days, half_days,
          overtime_hours, basic_earnings, ot_earnings, advance_deduction, other_deductions, net_salary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          payrollId,
          emp.guardId,
          emp.presentDays,
          emp.absentDays,
          0, // half_days default
          emp.overtimeHours,
          emp.basicEarnings,
          emp.otEarnings,
          emp.advanceDeduction,
          emp.otherDeductions || 0.00,
          emp.netSalary
        ]
      );
    }

    await client.query('COMMIT');

    await logAuditEvent({
      action: 'GENERATE_PAYROLL',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      targetType: 'Payroll',
      targetId: payrollId,
      reason: `Generated and locked payroll for ${month}/${year}`
    });

    return res.status(201).json({ success: true, message: 'Payroll generated and locked successfully.', payrollId });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

async function getPayrollHistory(req, res) {
  try {
    const result = await db.query(
      `SELECT p.id, p.month, p.year, p.status, p.total_basic_earnings,
              p.total_ot_earnings, p.total_advance_deductions, p.total_net_salary,
              m.name AS generated_by_name
       FROM payrolls p
       JOIN managers m ON p.generated_by = m.id
       ORDER BY p.year DESC, p.month DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getPayrollDetails(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT pd.id, pd.payroll_id, pd.guard_id, g.name AS guard_name, g.mobile AS guard_mobile,
              pd.present_days, pd.absent_days, pd.overtime_hours,
              pd.basic_earnings, pd.ot_earnings, pd.advance_deduction, pd.other_deductions, pd.net_salary
       FROM payroll_details pd
       JOIN guards g ON pd.guard_id = g.id
       WHERE pd.payroll_id = $1
       ORDER BY g.name ASC`,
      [id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getConfigurations,
  updateConfiguration,
  bulkUpdateConfigurations,
  getGuardPayrollDetails,
  getAdvances,
  createAdvance,
  updateAdvance,
  deleteAdvance,
  getOvertimeRecords,
  logOvertime,
  approveOvertime,
  calculateMonthlyPayroll,
  generatePayroll,
  getPayrollHistory,
  getPayrollDetails
};
