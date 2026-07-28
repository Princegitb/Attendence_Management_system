const db = require('../db');
const { logAuditEvent } = require('../utils/auditLogger');

// Create a new Holiday Calendar
async function createCalendar(req, res) {
  try {
    const { name, year, weekly_offs, saturday_policy, sandwich_policy } = req.body;
    if (!name || !year) {
      return res.status(400).json({ success: false, message: 'Calendar Name and Year are required.' });
    }

    const result = await db.query(
      `INSERT INTO holiday_calendars (name, year, weekly_offs, saturday_policy, sandwich_policy)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, year, weekly_offs || [], saturday_policy || 'ALL_WORKING', sandwich_policy || false]
    );

    await logAuditEvent({
      action: 'CREATE_HOLIDAY_CALENDAR',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      reason: `Created calendar: ${name} for year ${year}`
    });

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Get all calendars
async function getCalendars(req, res) {
  try {
    const result = await db.query(`SELECT * FROM holiday_calendars ORDER BY created_at DESC`);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Add a specific holiday event to a calendar
async function addHoliday(req, res) {
  try {
    const { calendar_id, date, name, type } = req.body;
    if (!calendar_id || !date || !name || !type) {
      return res.status(400).json({ success: false, message: 'Calendar ID, Date, Name, and Holiday Type are required.' });
    }

    const result = await db.query(
      `INSERT INTO calendar_holidays (calendar_id, date, name, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [calendar_id, date, name, type]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Get holidays for a calendar
async function getCalendarHolidays(req, res) {
  try {
    const { calendar_id } = req.params;
    const result = await db.query(
      `SELECT * FROM calendar_holidays WHERE calendar_id = $1 ORDER BY date ASC`,
      [calendar_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Delete holiday event
async function deleteHoliday(req, res) {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM calendar_holidays WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Holiday deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Publish calendar
async function publishCalendar(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE holiday_calendars SET is_published = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Calendar not found.' });
    }

    await logAuditEvent({
      action: 'PUBLISH_HOLIDAY_CALENDAR',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      reason: `Published holiday calendar: ${result.rows[0].name}`
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Link Post/Location to a Calendar
async function linkPostToCalendar(req, res) {
  try {
    const { post_id, holiday_calendar_id } = req.body;
    if (!post_id) {
      return res.status(400).json({ success: false, message: 'Post ID is required.' });
    }

    const result = await db.query(
      `UPDATE posts SET holiday_calendar_id = $1 WHERE id = $2 RETURNING *`,
      [holiday_calendar_id || null, post_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post location not found.' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Manage Floating Holiday Requests (Approve/Reject)
async function approveFloatingHoliday(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be APPROVED or REJECTED.' });
    }

    const checkRes = await db.query(`SELECT * FROM floating_holiday_requests WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Floating request not found.' });
    }

    const result = await db.query(
      `UPDATE floating_holiday_requests
       SET status = $1, approved_by = $2
       WHERE id = $3
       RETURNING *`,
      [status, req.user.id, id]
    );

    // If approved, we need to create an attendance log for that date as "APPROVED"
    // to mark it as a paid present/holiday day.
    if (status === 'APPROVED') {
      const requestObj = checkRes.rows[0];
      // Check if attendance already exists
      const attCheck = await db.query(
        `SELECT id FROM attendance WHERE guard_id = $1 AND date = $2`,
        [requestObj.guard_id, requestObj.date]
      );
      if (attCheck.rows.length > 0) {
        await db.query(
          `UPDATE attendance SET status = 'APPROVED' WHERE id = $1`,
          [attCheck.rows[0].id]
        );
      } else {
        // Find a manager or officer to mark it (using default/first field officer or standard ID)
        await db.query(
          `INSERT INTO attendance (guard_id, marked_by_officer_id, date, status)
           VALUES ($1, $2, $3, 'APPROVED')`,
          [requestObj.guard_id, req.user.id, requestObj.date]
        );
      }
    }

    await logAuditEvent({
      action: 'APPROVE_FLOATING_HOLIDAY',
      performedBy: req.user.name,
      performedByRole: req.user.role,
      reason: `${status} floating holiday request for guard ID ${checkRes.rows[0].guard_id} on date ${checkRes.rows[0].date}`
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Get floating holiday requests
async function getFloatingRequests(req, res) {
  try {
    const result = await db.query(
      `SELECT fhr.id, fhr.guard_id, g.name AS guard_name, g.mobile AS guard_mobile,
              fhr.date, fhr.status, ch.name AS holiday_name
       FROM floating_holiday_requests fhr
       JOIN guards g ON fhr.guard_id = g.id
       JOIN calendar_holidays ch ON fhr.holiday_id = ch.id
       ORDER BY fhr.date DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createCalendar,
  getCalendars,
  addHoliday,
  getCalendarHolidays,
  deleteHoliday,
  publishCalendar,
  linkPostToCalendar,
  approveFloatingHoliday,
  getFloatingRequests
};
