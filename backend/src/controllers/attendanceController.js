const db = require('../db');
const { calculateHaversineDistance } = require('../utils/haversine');
const { validatePhotoBuffer } = require('../utils/photoValidator');
const { uploadPhoto } = require('../utils/storage');
const { logAuditEvent } = require('../utils/auditLogger');

const TIMEZONE = process.env.SYSTEM_TIMEZONE || 'Asia/Kolkata';

const getTimezoneOffsetString = (date = new Date()) => {
  try {
    const tzString = date.toLocaleString('en-US', { timeZone: TIMEZONE, timeZoneName: 'shortOffset' });
    const match = tzString.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    if (!match) return '+00:00';
    const hours = match[1].replace('+', '');
    const minutes = match[2] || '00';
    const sign = match[1].startsWith('-') ? '-' : '+';
    const paddedHours = String(Math.abs(parseInt(hours, 10))).padStart(2, '0');
    return `${sign}${paddedHours}:${minutes}`;
  } catch (e) {
    return '+05:30';
  }
};

const getLocalTimeDetails = (serverTimestamp = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(serverTimestamp);
  const getPart = (type) => parts.find(p => p.type === type).value;

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');

  let hour = parseInt(getPart('hour'), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  const dateStr = `${year}-${month}-${day}`;
  const totalMinutes = hour * 60 + minute;

  return {
    dateStr,
    hour,
    minute,
    second,
    totalMinutes
  };
};

const getLocalDateString = (dateObj = new Date()) => {
  return getLocalTimeDetails(dateObj).dateStr;
};

const getLogicalShiftDate = (guard, serverTimestamp = new Date()) => {
  const { dateStr, totalMinutes: currMin } = getLocalTimeDetails(serverTimestamp);
  if (!guard || !guard.start_time || !guard.end_time) {
    return dateStr;
  }

  const [shStartH, shStartM] = guard.start_time.split(':').map(Number);
  const [shEndH, shEndM] = guard.end_time.split(':').map(Number);

  const startMin = shStartH * 60 + shStartM;
  const endMin = shEndH * 60 + shEndM;

  const isOvernight = endMin < startMin;

  if (isOvernight) {
    const checkoutBufferMinutes = 240; // 4 hours checkout buffer after shift ends
    if (currMin <= (endMin + checkoutBufferMinutes)) {
      const yesterdayObj = new Date(serverTimestamp);
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      return getLocalDateString(yesterdayObj);
    }
  }

  return dateStr;
};

/**
 * Get assigned guards checklist for logged-in Field Officer for today
 */
async function getOfficerGuardsChecklist(req, res) {
  try {
    const officerId = req.user.id;
    const serverTimestamp = new Date();
    const { dateStr: today, totalMinutes: currMin } = getLocalTimeDetails(serverTimestamp);

    const yesterdayDateObj = new Date(serverTimestamp);
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);
    const yesterday = getLocalDateString(yesterdayDateObj);

    // Fetch guards assigned directly to officer or assigned via post
    const queryStr = `
      SELECT
        g.id AS guard_id,
        g.name AS guard_name,
        g.mobile AS guard_mobile,
        g.status AS guard_status,
        p.id AS post_id,
        p.name AS post_name,
        p.address AS post_address,
        p.latitude AS post_latitude,
        p.longitude AS post_longitude,
        p.allowed_radius_metres,
        s.id AS shift_id,
        s.name AS shift_name,
        s.start_time,
        s.end_time,
        a.id AS attendance_id,
        a.check_in_time,
        a.check_in_photo_url,
        a.check_in_distance_from_post,
        a.check_out_time,
        a.check_out_photo_url,
        a.status AS attendance_status,
        a.late_by_minutes,
        a.overtime_minutes
      FROM guards g
      JOIN posts p ON g.assigned_post_id = p.id
      LEFT JOIN shifts s ON g.assigned_shift_id = s.id
      JOIN officer_assignments oa ON (oa.guard_id = g.id OR oa.post_id = g.assigned_post_id)
      LEFT JOIN attendance a ON (
        a.guard_id = g.id AND a.date = (
          CASE
            WHEN s.end_time < s.start_time AND $4 <= (EXTRACT(HOUR FROM s.end_time) * 60 + EXTRACT(MINUTE FROM s.end_time) + 240)
            THEN $3::DATE
            ELSE $2::DATE
          END
        )
      )
      WHERE oa.officer_id = $1
        AND (oa.from_date IS NULL OR oa.from_date <= $2)
        AND (oa.to_date IS NULL OR oa.to_date >= $2)
        AND g.status = 'ACTIVE'
      ORDER BY g.name ASC;
    `;

    const result = await db.query(queryStr, [officerId, today, yesterday, currMin]);

    const guardsList = result.rows.map(row => {
      let status = 'PENDING';
      if (row.check_out_time) {
        status = 'CHECKED_OUT';
      } else if (row.attendance_status) {
        status = row.attendance_status;
      } else if (row.check_in_time) {
        // Legacy fallback: if a check_in_time exists but stored status is null,
        // assume auto-approved CHECKED_IN.
        status = 'CHECKED_IN';
      }

      return {
        guardId: row.guard_id,
        guardName: row.guard_name,
        guardMobile: row.guard_mobile,
        post: {
          id: row.post_id,
          name: row.post_name,
          address: row.post_address,
          latitude: parseFloat(row.post_latitude),
          longitude: parseFloat(row.post_longitude),
          allowedRadiusMetres: row.allowed_radius_metres
        },
        shift: {
          id: row.shift_id,
          name: row.shift_name,
          startTime: row.start_time,
          endTime: row.end_time
        },
        attendance: {
          id: row.attendance_id || null,
          checkInTime: row.check_in_time || null,
          checkInPhotoUrl: row.check_in_photo_url || null,
          checkInDistance: row.check_in_distance_from_post ? parseFloat(row.check_in_distance_from_post) : null,
          checkOutTime: row.check_out_time || null,
          checkOutPhotoUrl: row.check_out_photo_url || null,
          status: status,
          lateByMinutes: row.late_by_minutes != null ? parseInt(row.late_by_minutes, 10) : 0,
          overtimeMinutes: row.overtime_minutes != null ? parseInt(row.overtime_minutes, 10) : 0
        }
      };
    });

    return res.json({
      success: true,
      data: {
        date: today,
        totalGuards: guardsList.length,
        pendingCount: guardsList.filter(g => g.attendance.status === 'PENDING').length,
        checkedInCount: guardsList.filter(g => ['CHECKED_IN', 'PENDING_REVIEW'].includes(g.attendance.status)).length,
        checkedOutCount: guardsList.filter(g => ['CHECKED_OUT', 'APPROVED'].includes(g.attendance.status)).length,
        guards: guardsList
      }
    });

  } catch (err) {
    console.error('Error fetching officer guards checklist:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve guard checklist.' });
  }
}

/**
 * Mark Guard Check-In (Field Officer flow)
 */
async function markCheckIn(req, res) {
  try {
    const officerId = req.user.id;
    const { guard_id, latitude, longitude, gps_accuracy } = req.body;
    const photoFile = req.file;

    if (!guard_id || latitude === undefined || longitude === undefined || !photoFile) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: guard_id, latitude, longitude, and photo file.'
      });
    }

    const serverTimestamp = new Date();

    // 1. Fetch Guard, Assigned Post & Assigned Shift
    const guardRes = await db.query(
      `SELECT g.id, g.name, p.id AS post_id, p.name AS post_name, p.latitude AS post_lat, p.longitude AS post_lon, p.allowed_radius_metres,
              s.id AS shift_id, s.name AS shift_name, s.start_time, s.end_time, s.grace_period_minutes
       FROM guards g
       JOIN posts p ON g.assigned_post_id = p.id
       LEFT JOIN shifts s ON g.assigned_shift_id = s.id
       WHERE g.id = $1 AND g.status = 'ACTIVE'`,
      [guard_id]
    );

    if (guardRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Active guard or assigned post not found.' });
    }

    const guard = guardRes.rows[0];

    // IDOR Check: verify officer is assigned to this guard or post today
    const assignmentRes = await db.query(
      `SELECT 1 FROM officer_assignments
       WHERE officer_id = $1 AND (guard_id = $2 OR post_id = $3)
         AND (from_date IS NULL OR from_date <= CURRENT_DATE)
         AND (to_date IS NULL OR to_date >= CURRENT_DATE)`,
      [officerId, guard.id, guard.post_id]
    );
    if (assignmentRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not assigned to mark attendance for this guard or post today.'
      });
    }

    // 2. Compute Logical Shift Date
    const today = getLogicalShiftDate(guard, serverTimestamp);

    // 3. Idempotency Check: Verify if attendance already exists for the logical date
    const existingAtt = await db.query(
      `SELECT id, check_in_time FROM attendance WHERE guard_id = $1 AND date = $2`,
      [guard_id, today]
    );

    if (existingAtt.rows.length > 0 && existingAtt.rows[0].check_in_time) {
      return res.status(409).json({
        success: false,
        message: 'Check-in has already been marked for this guard today.'
      });
    }
    const postLat = parseFloat(guard.post_lat !== undefined ? guard.post_lat : guard.post_latitude);
    const postLon = parseFloat(guard.post_lon !== undefined ? guard.post_lon : guard.post_longitude);
    const allowedRadius = parseInt(guard.allowed_radius_metres || 100);

    // 3. Server-Side Haversine Geo-fence Verification (STRICT: Reject if location is wrong)
    const distanceMeters = calculateHaversineDistance(latitude, longitude, postLat, postLon);

    if (distanceMeters > allowedRadius) {
      return res.status(400).json({
        success: false,
        message: `Geo-fence verification failed. You are ${distanceMeters}m away from ${guard.name}'s assigned post ("${guard.post_name}"). Required radius is within ${allowedRadius}m. Move closer to mark attendance.`
      });
    }

    // 4. Validate Photo Buffer (reject blank/black/corrupted images)
    const photoValidation = validatePhotoBuffer(photoFile.buffer);
    if (!photoValidation.valid) {
      return res.status(400).json({
        success: false,
        message: photoValidation.reason
      });
    }

    // 5. Shift & Grace Period Verification → Auto-Approval Decision Tree
    // - On-time (or within grace) → auto-approved, status = CHECKED_IN
    // - Late (beyond grace) → PENDING_REVIEW (manager must approve/reject)
    // late_by_minutes is recorded for analytics even on auto-approved check-ins.
    let initialStatus = 'CHECKED_IN';
    let statusMessage = `Check-in recorded for ${guard.name}. Auto-approved (on time).`;
    let lateByMinutes = 0;

    if (guard.start_time) {
      const { totalMinutes: currentTotalMinutes } = getLocalTimeDetails(serverTimestamp);
      const [shiftH, shiftM] = guard.start_time.split(':').map(Number);
      const shiftTotalMinutes = shiftH * 60 + shiftM;
      const graceMinutes = parseInt(guard.grace_period_minutes || 15);

      if (currentTotalMinutes > (shiftTotalMinutes + graceMinutes)) {
        initialStatus = 'PENDING_REVIEW';
        lateByMinutes = currentTotalMinutes - shiftTotalMinutes;
        statusMessage = `Check-in submitted for ${guard.name} (${lateByMinutes} min late). Kept for Manager review.`;
      } else if (currentTotalMinutes > shiftTotalMinutes) {
        // Within grace: still auto-approved, but record small lateness for analytics
        lateByMinutes = currentTotalMinutes - shiftTotalMinutes;
        statusMessage = `Check-in recorded for ${guard.name}. Auto-approved (within grace, ${lateByMinutes} min late).`;
      }
    }

    // 6. Upload compressed photo to object storage
    const uploadResult = await uploadPhoto(photoFile.buffer, photoFile.originalname);

    // 7. Create attendance record with initial status (CHECKED_IN auto-approved or PENDING_REVIEW)
    let insertRes;
    try {
      insertRes = await db.query(
        `INSERT INTO attendance (
          guard_id, marked_by_officer_id, date, check_in_time,
          check_in_latitude, check_in_longitude, check_in_gps_accuracy,
          check_in_distance_from_post, check_in_photo_url,
          post_id_snapshot, radius_snapshot, status, late_by_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, check_in_time, status, late_by_minutes`,
        [
          guard.id,
          officerId,
          today,
          serverTimestamp,
          latitude,
          longitude,
          gps_accuracy || 0,
          distanceMeters,
          uploadResult.url,
          guard.post_id,
          allowedRadius,
          initialStatus,
          lateByMinutes
        ]
      );
    } catch (dbErr) {
      // Catch unique constraint race condition (duplicate key error)
      if (dbErr.code === '23505' || dbErr.message.includes('unique') || dbErr.message.includes('duplicate')) {
        return res.status(409).json({
          success: false,
          message: 'Check-in has already been marked for this guard today.'
        });
      }
      throw dbErr;
    }

    await logAuditEvent({
      action: 'GUARD_CHECK_IN',
      performedBy: req.user.name,
      performedByRole: 'OFFICER',
      targetType: 'Guard',
      targetId: guard.id,
      reason: `Guard ${guard.name} checked in (${distanceMeters}m from post). Status: ${initialStatus}` +
              (lateByMinutes > 0 ? ` (${lateByMinutes} min late)` : '')
    });

    return res.json({
      success: true,
      message: statusMessage,
      data: {
        attendanceId: insertRes.rows[0].id,
        guardId: guard.id,
        guardName: guard.name,
        checkInTime: insertRes.rows[0].check_in_time,
        distanceMeters,
        photoUrl: uploadResult.url,
        status: initialStatus,
        lateByMinutes,
        autoApproved: initialStatus === 'CHECKED_IN'
      }
    });

  } catch (err) {
    console.error('Check-in error:', err);
    return res.status(500).json({ success: false, message: 'Server error marking check-in.' });
  }
}

/**
 * Mark Guard Check-Out (Field Officer flow)
 */
async function markCheckOut(req, res) {
  try {
    const officerId = req.user.id;
    const { guard_id, latitude, longitude, gps_accuracy } = req.body;
    const photoFile = req.file;

    if (!guard_id || latitude === undefined || longitude === undefined || !photoFile) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: guard_id, latitude, longitude, and photo file.'
      });
    }

    const serverTimestamp = new Date();

    // 1. Fetch Guard, Assigned Post & Assigned Shift
    const guardRes = await db.query(
      `SELECT g.id, g.name, p.id AS post_id, p.name AS post_name, p.latitude AS post_lat, p.longitude AS post_lon, p.allowed_radius_metres,
              s.id AS shift_id, s.name AS shift_name, s.start_time, s.end_time
       FROM guards g
       JOIN posts p ON g.assigned_post_id = p.id
       LEFT JOIN shifts s ON g.assigned_shift_id = s.id
       WHERE g.id = $1`,
      [guard_id]
    );

    if (guardRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guard or assigned post not found.' });
    }

    const guard = guardRes.rows[0];

    // IDOR Check: verify officer is assigned to this guard or post today
    const assignmentRes = await db.query(
      `SELECT 1 FROM officer_assignments
       WHERE officer_id = $1 AND (guard_id = $2 OR post_id = $3)
         AND (from_date IS NULL OR from_date <= CURRENT_DATE)
         AND (to_date IS NULL OR to_date >= CURRENT_DATE)`,
      [officerId, guard.id, guard.post_id]
    );
    if (assignmentRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not assigned to mark attendance for this guard or post today.'
      });
    }

    // 2. Compute Logical Shift Date
    const today = getLogicalShiftDate(guard, serverTimestamp);

    // 3. Check existing check-in attendance for the logical date
    const existingAtt = await db.query(
      `SELECT id, check_in_time, check_out_time, status FROM attendance WHERE guard_id = $1 AND date = $2`,
      [guard_id, today]
    );

    if (existingAtt.rows.length === 0 || !existingAtt.rows[0].check_in_time) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark check-out without prior check-in for today.'
      });
    }

    if (existingAtt.rows[0].check_out_time) {
      return res.status(409).json({
        success: false,
        message: 'Check-out has already been marked for this guard today.'
      });
    }

    const postLat = parseFloat(guard.post_lat);
    const postLon = parseFloat(guard.post_lon);
    const allowedRadius = parseInt(guard.allowed_radius_metres || 100);

    // 3. Server-Side Haversine Verification
    const distanceMeters = calculateHaversineDistance(latitude, longitude, postLat, postLon);

    if (distanceMeters > allowedRadius) {
      return res.status(400).json({
        success: false,
        message: `Geo-fence verification failed. You are ${distanceMeters}m away from ${guard.name}'s assigned post ("${guard.post_name}"). Move closer to mark check-out.`
      });
    }

    // 4. Validate Photo Buffer
    const photoValidation = validatePhotoBuffer(photoFile.buffer);
    if (!photoValidation.valid) {
      return res.status(400).json({ success: false, message: photoValidation.reason });
    }

    // 5. Upload photo
    const uploadResult = await uploadPhoto(photoFile.buffer, photoFile.originalname);

    // 6. Construct expected shift start and end times in local timezone
    const [startH, startM, startS] = guard.start_time.split(':').map(Number);
    const [endH, endM, endS] = guard.end_time.split(':').map(Number);

    const tzOffset = getTimezoneOffsetString(serverTimestamp);

    // Expected shift start is on the logical shift date
    const expectedShiftStart = new Date(`${today}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:${String(startS || 0).padStart(2, '0')}${tzOffset}`);
    
    // Expected shift end
    let expectedShiftEnd = new Date(`${today}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:${String(endS || 0).padStart(2, '0')}${tzOffset}`);
    
    // If shift end time is less than start time, it's an overnight shift (ends on the next calendar day)
    const startTotalMin = startH * 60 + startM;
    const endTotalMin = endH * 60 + endM;
    if (endTotalMin < startTotalMin) {
      expectedShiftEnd.setDate(expectedShiftEnd.getDate() + 1);
    }

    // 6a. Early checkout safety check:
    // If check-out is more than 30 minutes before expected shift end, flag it for Manager review.
    const checkoutTimeObj = new Date(serverTimestamp);
    const earlyCheckoutThresholdMs = 30 * 60 * 1000; // 30 minutes
    const isEarlyCheckout = checkoutTimeObj < new Date(expectedShiftEnd.getTime() - earlyCheckoutThresholdMs);

    // 6b. Set status on checkout:
    // - If currentStatus is CHECKED_IN (on-time check-in or approved late check-in):
    //   - If early checkout -> Set to PENDING_REVIEW (flag for manager review).
    //   - If on time -> Auto-approve to APPROVED.
    // - If currentStatus is PENDING_REVIEW (late check-in not yet approved): Set to CHECKED_OUT.
    // - Otherwise, preserve REJECTED.
    const currentStatus = existingAtt.rows[0].status;
    let newStatus = 'CHECKED_OUT';
    if (currentStatus === 'REJECTED') {
      newStatus = 'REJECTED';
    } else if (currentStatus === 'CHECKED_IN') {
      if (isEarlyCheckout) {
        newStatus = 'PENDING_REVIEW';
      } else {
        newStatus = 'APPROVED';
      }
    } else if (currentStatus === 'PENDING_REVIEW') {
      newStatus = 'CHECKED_OUT';
    }

    // 6c. Compute overtime minutes beyond shift end (if checkout is past expected shift end)
    let overtimeMinutes = 0;
    let otHours = 0;
    let otRecordId = null;

    if (['CHECKED_OUT', 'APPROVED'].includes(newStatus) && checkoutTimeObj > expectedShiftEnd) {
      const diffMs = checkoutTimeObj - expectedShiftEnd;
      overtimeMinutes = Math.floor(diffMs / (60 * 1000));
      otHours = +(overtimeMinutes / 60).toFixed(2);
    }

    // 7. Persist checkout with overtime_minutes
    const updateRes = await db.query(
      `UPDATE attendance
       SET check_out_time = $1, check_out_latitude = $2, check_out_longitude = $3,
           check_out_photo_url = $4, status = $5, overtime_minutes = $6
       WHERE id = $7
       RETURNING id, check_out_time, status, late_by_minutes, overtime_minutes`,
      [serverTimestamp, latitude, longitude, uploadResult.url, newStatus, overtimeMinutes, existingAtt.rows[0].id]
    );

    // 8. Route overtime to Manager queue (PENDING)
    if (otHours > 0) {
      // Always route overtime to the manager queue (strip auto-approve)
      const otRecordStatus = 'PENDING'; 
      const otInsert = await db.query(
        `INSERT INTO overtime_records
           (guard_id, attendance_id, date, overtime_hours, status, approved_by,
            auto_generated, source, updated_at)
         VALUES ($1, $2, $3, $4, $5, NULL, TRUE, 'LATE_CHECKOUT_PENDING', NOW())
         ON CONFLICT (guard_id, date) DO UPDATE
           SET overtime_hours  = EXCLUDED.overtime_hours,
               attendance_id   = EXCLUDED.attendance_id,
               status          = 'PENDING',
               auto_generated  = TRUE,
               source          = 'LATE_CHECKOUT_PENDING',
               updated_at      = NOW()
         RETURNING id`,
        [guard.id, existingAtt.rows[0].id, today, otHours, otRecordStatus]
      );
      otRecordId = otInsert.rows[0].id;
    }

    // Render overtime as "Xh Ym" when ≥ 60 min, otherwise "Ym".
    const formatOvertime = (totalMin) => {
      if (!totalMin || totalMin <= 0) return '0m';
      if (totalMin < 60) return `${totalMin}m`;
      const h = Math.floor(totalMin / 60);
      const rem = totalMin % 60;
      return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
    };
    const otLabel = formatOvertime(overtimeMinutes);

    // Calculate worked minutes to check for Short Day
    const checkInTimeObj = new Date(existingAtt.rows[0].check_in_time);
    let workedMinutes = Math.floor((checkoutTimeObj - checkInTimeObj) / 60000);
    if (workedMinutes < 0) workedMinutes = 0;
    
    const shiftDurationMinutes = (endTotalMin >= startTotalMin) 
      ? endTotalMin - startTotalMin 
      : (24 * 60 - startTotalMin) + endTotalMin;

    if (workedMinutes < shiftDurationMinutes) {
      const shortMins = shiftDurationMinutes - workedMinutes;
      await logAuditEvent({
        action: 'SHORT_DAY_LOGGED',
        performedBy: 'SYSTEM',
        performedByRole: 'SYSTEM',
        targetType: 'Guard',
        targetId: guard.id,
        reason: `Short day detected: Guard ${guard.name} worked ${workedMinutes}m out of scheduled ${shiftDurationMinutes}m (short by ${shortMins}m).`
      });
    }

    await logAuditEvent({
      action: 'GUARD_CHECK_OUT',
      performedBy: req.user.name,
      performedByRole: 'OFFICER',
      targetType: 'Guard',
      targetId: guard.id,
      reason: `Guard ${guard.name} checked out (${distanceMeters}m from post). Status: ${newStatus}` +
              (overtimeMinutes > 0 ? `, Overtime: ${otLabel} (Pending Manager Approval)` : '')
    });

    return res.json({
      success: true,
      message: overtimeMinutes > 0
        ? `Check-out recorded for ${guard.name}. Overtime: ${otLabel} (pending approval).`
        : `Check-out recorded for ${guard.name} successfully.`,
      data: {
        attendanceId: updateRes.rows[0].id,
        guardId: guard.id,
        guardName: guard.name,
        checkOutTime: updateRes.rows[0].check_out_time,
        distanceMeters,
        photoUrl: uploadResult.url,
        status: newStatus,
        overtimeMinutes,
        overtimeHours: otHours,
        overtimeRecordId: otRecordId,
        autoApproved: true
      }
    });

  } catch (err) {
    console.error('Check-out error:', err);
    return res.status(500).json({ success: false, message: 'Server error marking check-out.' });
  }
}

module.exports = {
  getOfficerGuardsChecklist,
  markCheckIn,
  markCheckOut
};
