const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateTemplateBuffer, processGuardExcelImport } = require('../utils/excelParser');
const { logAuditEvent } = require('../utils/auditLogger');

// ==========================================
// 1. GUARD MANAGEMENT
// ==========================================
async function getGuards(req, res) {
  try {
    const result = await db.query(
      `SELECT g.id, g.name, g.mobile, g.date_of_joining, g.status,
              p.id AS post_id, p.name AS post_name,
              s.id AS shift_id, s.name AS shift_name
       FROM guards g
       LEFT JOIN posts p ON g.assigned_post_id = p.id
       LEFT JOIN shifts s ON g.assigned_shift_id = s.id
       ORDER BY g.id DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createGuard(req, res) {
  try {
    const { name, mobile, assigned_post_id, assigned_shift_id, date_of_joining, status } = req.body;
    if (!name || !assigned_post_id || !assigned_shift_id) {
      return res.status(400).json({ success: false, message: 'Name, assigned post, and assigned shift are required.' });
    }

    const result = await db.query(
      `INSERT INTO guards (name, mobile, assigned_post_id, assigned_shift_id, date_of_joining, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, mobile || null, assigned_post_id, assigned_shift_id, date_of_joining || new Date().toISOString().split('T')[0], status || 'ACTIVE']
    );

    await logAuditEvent({
      action: 'CREATE_GUARD',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'Guard',
      targetId: result.rows[0].id,
      newValue: result.rows[0],
      reason: `Guard ${name} created manually by Manager`
    });

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function updateGuard(req, res) {
  try {
    const { id } = req.params;
    const { name, mobile, assigned_post_id, assigned_shift_id, date_of_joining, status } = req.body;

    const oldRes = await db.query(`SELECT * FROM guards WHERE id = $1`, [id]);
    if (oldRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Guard not found' });

    const result = await db.query(
      `UPDATE guards
       SET name = $1, mobile = $2, assigned_post_id = $3, assigned_shift_id = $4, date_of_joining = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [name, mobile || null, assigned_post_id, assigned_shift_id, date_of_joining, status, id]
    );

    await logAuditEvent({
      action: 'UPDATE_GUARD',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'Guard',
      targetId: id,
      oldValue: oldRes.rows[0],
      newValue: result.rows[0],
      reason: `Guard ${name} details updated by Manager`
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteGuard(req, res) {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM guards WHERE id = $1`, [id]);

    await logAuditEvent({
      action: 'DELETE_GUARD',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'Guard',
      targetId: id,
      reason: `Guard #${id} deleted by Manager`
    });

    return res.json({ success: true, message: 'Guard deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 2. FIELD OFFICER MANAGEMENT
// ==========================================
async function getOfficers(req, res) {
  try {
    const result = await db.query(
      `SELECT id, name, mobile, must_change_password, status, created_at FROM field_officers ORDER BY id DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createOfficer(req, res) {
  try {
    const { name, mobile } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Officer name and mobile number are required.' });
    }

    const cleanMobile = mobile.toString().trim();
    const firstName = name.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const defaultPassword = firstName + cleanMobile.slice(-4);
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const result = await db.query(
      `INSERT INTO field_officers (name, mobile, password_hash, must_change_password, status)
       VALUES ($1, $2, $3, TRUE, 'ACTIVE')
       RETURNING id, name, mobile, must_change_password, status, created_at`,
      [name.trim(), cleanMobile, passwordHash]
    );

    await logAuditEvent({
      action: 'CREATE_FIELD_OFFICER',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'FieldOfficer',
      targetId: result.rows[0].id,
      newValue: result.rows[0],
      reason: `Field Officer ${name} created with initial password ${defaultPassword}`
    });

    return res.status(201).json({
      success: true,
      message: `Field Officer created successfully. Initial Password: ${defaultPassword}`,
      data: {
        ...result.rows[0],
        initialPassword: defaultPassword
      }
    });
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('duplicate')) {
      return res.status(400).json({ success: false, message: 'An officer with this mobile number already exists.' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function resetOfficerPassword(req, res) {
  try {
    const { id } = req.params;
    const officerRes = await db.query(`SELECT * FROM field_officers WHERE id = $1`, [id]);
    if (officerRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Officer not found' });

    const officer = officerRes.rows[0];
    const firstName = officer.name.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const defaultPassword = firstName + officer.mobile.slice(-4);
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await db.query(
      `UPDATE field_officers SET password_hash = $1, must_change_password = TRUE WHERE id = $2`,
      [passwordHash, id]
    );

    await logAuditEvent({
      action: 'RESET_OFFICER_PASSWORD',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'FieldOfficer',
      targetId: id,
      reason: `Password reset to default (${defaultPassword})`
    });

    return res.json({
      success: true,
      message: `Password reset to default: ${defaultPassword}`,
      defaultPassword
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteOfficer(req, res) {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM field_officers WHERE id = $1`, [id]);

    await logAuditEvent({
      action: 'DELETE_FIELD_OFFICER',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'FieldOfficer',
      targetId: id,
      reason: `Field Officer #${id} deleted by Manager`
    });

    return res.json({ success: true, message: 'Field Officer deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 3. POST / LOCATION MANAGEMENT
// ==========================================
async function getPosts(req, res) {
  try {
    const result = await db.query(`SELECT * FROM posts ORDER BY id DESC`);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createPost(req, res) {
  try {
    const { name, address, latitude, longitude, allowed_radius_metres, status } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Post name, latitude, and longitude are required.' });
    }

    const result = await db.query(
      `INSERT INTO posts (name, address, latitude, longitude, allowed_radius_metres, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, address || '', latitude, longitude, allowed_radius_metres || 100, status || 'ACTIVE']
    );

    await logAuditEvent({
      action: 'CREATE_POST',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'Post',
      targetId: result.rows[0].id,
      newValue: result.rows[0],
      reason: `Created security post "${name}"`
    });

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function updatePost(req, res) {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, allowed_radius_metres, status } = req.body;

    const oldRes = await db.query(`SELECT * FROM posts WHERE id = $1`, [id]);
    if (oldRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Post not found' });

    const result = await db.query(
      `UPDATE posts
       SET name = $1, address = $2, latitude = $3, longitude = $4, allowed_radius_metres = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [name, address, latitude, longitude, allowed_radius_metres, status, id]
    );

    await logAuditEvent({
      action: 'UPDATE_POST',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'Post',
      targetId: id,
      oldValue: oldRes.rows[0],
      newValue: result.rows[0],
      reason: `Updated post "${name}" coordinates / radius`
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 4. SHIFT MANAGEMENT
// ==========================================
async function getShifts(req, res) {
  try {
    const result = await db.query(`SELECT * FROM shifts ORDER BY id ASC`);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createShift(req, res) {
  try {
    const { name, start_time, end_time, grace_period_minutes } = req.body;
    if (!name || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Shift name, start time, and end time are required.' });
    }

    const result = await db.query(
      `INSERT INTO shifts (name, start_time, end_time, grace_period_minutes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, start_time, end_time, grace_period_minutes || 15]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 5. OFFICER ASSIGNMENTS MATRIX
// ==========================================
async function getAssignments(req, res) {
  try {
    const result = await db.query(
      `SELECT oa.id, oa.officer_id, fo.name AS officer_name, fo.mobile AS officer_mobile,
              oa.guard_id, g.name AS guard_name,
              oa.post_id, p.name AS post_name,
              oa.from_date, oa.to_date, oa.created_at
       FROM officer_assignments oa
       JOIN field_officers fo ON oa.officer_id = fo.id
       LEFT JOIN guards g ON oa.guard_id = g.id
       LEFT JOIN posts p ON oa.post_id = p.id
       ORDER BY oa.id DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createAssignment(req, res) {
  try {
    const { officer_id, guard_id, post_id, from_date, to_date } = req.body;
    if (!officer_id || (!guard_id && !post_id)) {
      return res.status(400).json({ success: false, message: 'Officer ID and either Guard ID or Post ID are required.' });
    }

    const result = await db.query(
      `INSERT INTO officer_assignments (officer_id, guard_id, post_id, from_date, to_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [officer_id, guard_id || null, post_id || null, from_date || null, to_date || null, req.user.id]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteAssignment(req, res) {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM officer_assignments WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Assignment removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 6. ATTENDANCE MONITORING & MANUAL CORRECTION
// ==========================================
async function getAttendanceLogs(req, res) {
  try {
    const { date, officer_id, post_id, status } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];

    let queryStr = `
      SELECT a.id, a.guard_id, g.name AS guard_name, g.mobile AS guard_mobile,
             p.name AS post_name, p.latitude AS post_lat, p.longitude AS post_lon, p.allowed_radius_metres,
             s.name AS shift_name, s.start_time AS shift_start_time, s.end_time AS shift_end_time,
             fo.name AS marked_by_officer,
             a.date, a.check_in_time, a.check_in_latitude, a.check_in_longitude, a.check_in_gps_accuracy,
             a.check_in_distance_from_post, a.check_in_photo_url,
             a.check_out_time, a.check_out_latitude, a.check_out_longitude, a.check_out_photo_url,
             a.status
      FROM attendance a
      JOIN guards g ON a.guard_id = g.id
      JOIN posts p ON g.assigned_post_id = p.id
      LEFT JOIN shifts s ON g.assigned_shift_id = s.id
      JOIN field_officers fo ON a.marked_by_officer_id = fo.id
      WHERE a.date = $1
    `;

    const params = [filterDate];

    if (officer_id) {
      params.push(officer_id);
      queryStr += ` AND a.marked_by_officer_id = $${params.length}`;
    }
    if (post_id) {
      params.push(post_id);
      queryStr += ` AND g.assigned_post_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      queryStr += ` AND a.status = $${params.length}`;
    }

    queryStr += ` ORDER BY a.id DESC`;

    const result = await db.query(queryStr, params);
    return res.json({ success: true, date: filterDate, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function correctAttendance(req, res) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'A detailed reason (at least 5 characters) is MANDATORY for manual attendance corrections.'
      });
    }

    const oldAtt = await db.query(`SELECT * FROM attendance WHERE id = $1`, [id]);
    if (oldAtt.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    let finalStatus = status;
    if (status === 'APPROVED' && oldAtt.rows[0].check_out_time) {
      finalStatus = 'CHECKED_OUT';
    }

    const updatedRes = await db.query(
      `UPDATE attendance SET status = $1 WHERE id = $2 RETURNING *`,
      [finalStatus, id]
    );

    await logAuditEvent({
      action: 'MANUAL_ATTENDANCE_CORRECTION',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'Attendance',
      targetId: id,
      oldValue: oldAtt.rows[0],
      newValue: updatedRes.rows[0],
      reason: reason.trim()
    });

    return res.json({
      success: true,
      message: 'Attendance record corrected successfully.',
      data: updatedRes.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 7. REPORTS EXPORT (CSV)
// ==========================================
async function exportAttendanceReport(req, res) {
  try {
    const { from_date, to_date } = req.query;
    const startDate = from_date || new Date().toISOString().split('T')[0];
    const endDate = to_date || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT a.date, g.name AS guard_name, p.name AS post_name, s.name AS shift_name,
              fo.name AS officer_name, a.check_in_time, a.check_in_distance_from_post,
              a.check_out_time, a.status
       FROM attendance a
       JOIN guards g ON a.guard_id = g.id
       JOIN posts p ON g.assigned_post_id = p.id
       LEFT JOIN shifts s ON g.assigned_shift_id = s.id
       JOIN field_officers fo ON a.marked_by_officer_id = fo.id
       WHERE a.date >= $1 AND a.date <= $2
       ORDER BY a.date DESC, g.name ASC`,
      [startDate, endDate]
    );

    let csvContent = 'Date,Guard Name,Post Name,Shift,Marked By Officer,Check-In Time,Check-In Distance (m),Check-Out Time,Status\n';

    result.rows.forEach(r => {
      const checkInStr = r.check_in_time ? new Date(r.check_in_time).toISOString().replace('T', ' ').slice(0, 19) : 'N/A';
      const checkOutStr = r.check_out_time ? new Date(r.check_out_time).toISOString().replace('T', ' ').slice(0, 19) : 'N/A';
      csvContent += `"${r.date}","${r.guard_name}","${r.post_name}","${r.shift_name || ''}","${r.officer_name}","${checkInStr}","${r.check_in_distance_from_post || 0}","${checkOutStr}","${r.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${startDate}_to_${endDate}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 8. AUDIT LOGS VIEWER
// ==========================================
async function getAuditLogs(req, res) {
  try {
    const result = await db.query(
      `SELECT id, action, performed_by, performed_by_role, target_type, target_id, old_value, new_value, reason, timestamp
       FROM audit_logs
       ORDER BY id DESC LIMIT 200`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ==========================================
// 9. EXCEL BULK IMPORT & TEMPLATE
// ==========================================
async function downloadExcelTemplate(req, res) {
  try {
    const buffer = generateTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="guard_import_template.xlsx"');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function importGuardsBulk(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx or .csv).' });
    }

    const report = await processGuardExcelImport(req.file.buffer);

    await logAuditEvent({
      action: 'BULK_IMPORT_GUARDS',
      performedBy: req.user.name,
      performedByRole: 'MANAGER',
      targetType: 'Guards',
      reason: `Bulk imported guards: ${report.successCount} succeeded, ${report.failedCount} failed out of ${report.totalRows}`
    });

    return res.json({
      success: true,
      message: `Bulk import process completed. ${report.successCount} guards inserted.`,
      report
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getGuards,
  createGuard,
  updateGuard,
  deleteGuard,
  getOfficers,
  createOfficer,
  resetOfficerPassword,
  deleteOfficer,
  getPosts,
  createPost,
  updatePost,
  getShifts,
  createShift,
  getAssignments,
  createAssignment,
  deleteAssignment,
  getAttendanceLogs,
  correctAttendance,
  exportAttendanceReport,
  getAuditLogs,
  downloadExcelTemplate,
  importGuardsBulk
};
