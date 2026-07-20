const db = require('../db');
const { calculateHaversineDistance } = require('../utils/haversine');
const { validatePhotoBuffer } = require('../utils/photoValidator');
const { uploadPhoto } = require('../utils/storage');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get assigned guards checklist for logged-in Field Officer for today
 */
async function getOfficerGuardsChecklist(req, res) {
  try {
    const officerId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

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
        a.status AS attendance_status
      FROM guards g
      JOIN posts p ON g.assigned_post_id = p.id
      LEFT JOIN shifts s ON g.assigned_shift_id = s.id
      JOIN officer_assignments oa ON (oa.guard_id = g.id OR oa.post_id = g.assigned_post_id)
      LEFT JOIN attendance a ON (a.guard_id = g.id AND a.date = $2)
      WHERE oa.officer_id = $1
        AND (oa.from_date IS NULL OR oa.from_date <= $2)
        AND (oa.to_date IS NULL OR oa.to_date >= $2)
        AND g.status = 'ACTIVE'
      ORDER BY g.name ASC;
    `;

    const result = await db.query(queryStr, [officerId, today]);

    const guardsList = result.rows.map(row => {
      let status = 'PENDING';
      if (row.check_out_time) {
        status = 'CHECKED_OUT';
      } else if (row.check_in_time) {
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
          status: status
        }
      };
    });

    return res.json({
      success: true,
      data: {
        date: today,
        totalGuards: guardsList.length,
        pendingCount: guardsList.filter(g => g.attendance.status === 'PENDING').length,
        checkedInCount: guardsList.filter(g => g.attendance.status === 'CHECKED_IN').length,
        checkedOutCount: guardsList.filter(g => g.attendance.status === 'CHECKED_OUT').length,
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

    const today = new Date().toISOString().split('T')[0];
    const serverTimestamp = new Date();

    // 1. Idempotency Check: Verify if attendance already exists for today
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

    // 2. Fetch Guard & Assigned Post
    const guardRes = await db.query(
      `SELECT g.id, g.name, p.id AS post_id, p.name AS post_name, p.latitude AS post_lat, p.longitude AS post_lon, p.allowed_radius_metres
       FROM guards g
       JOIN posts p ON g.assigned_post_id = p.id
       WHERE g.id = $1 AND g.status = 'ACTIVE'`,
      [guard_id]
    );

    if (guardRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Active guard or assigned post not found.' });
    }

    const guard = guardRes.rows[0];
    const postLat = parseFloat(guard.post_lat);
    const postLon = parseFloat(guard.post_lon);
    const allowedRadius = parseInt(guard.allowed_radius_metres || 100);

    // 3. Server-Side Haversine Geo-fence Verification
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

    // 5. Upload compressed photo to object storage
    const uploadResult = await uploadPhoto(photoFile.buffer, photoFile.originalname);

    // 6. Create or update attendance record with snapshots
    const insertRes = await db.query(
      `INSERT INTO attendance (
        guard_id, marked_by_officer_id, date, check_in_time, 
        check_in_latitude, check_in_longitude, check_in_gps_accuracy, 
        check_in_distance_from_post, check_in_photo_url, 
        post_id_snapshot, radius_snapshot, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, check_in_time, status`,
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
        'CHECKED_IN'
      ]
    );

    await logAuditEvent({
      action: 'GUARD_CHECK_IN',
      performedBy: req.user.name,
      performedByRole: 'OFFICER',
      targetType: 'Guard',
      targetId: guard.id,
      reason: `Guard ${guard.name} checked in successfully (${distanceMeters}m from post)`
    });

    return res.json({
      success: true,
      message: `Check-in recorded for ${guard.name} successfully.`,
      data: {
        attendanceId: insertRes.rows[0].id,
        guardId: guard.id,
        guardName: guard.name,
        checkInTime: insertRes.rows[0].check_in_time,
        distanceMeters,
        photoUrl: uploadResult.url,
        status: 'CHECKED_IN'
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

    const today = new Date().toISOString().split('T')[0];
    const serverTimestamp = new Date();

    // 1. Check existing check-in attendance
    const existingAtt = await db.query(
      `SELECT id, check_in_time, check_out_time FROM attendance WHERE guard_id = $1 AND date = $2`,
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

    // 2. Fetch Guard & Assigned Post
    const guardRes = await db.query(
      `SELECT g.id, g.name, p.id AS post_id, p.name AS post_name, p.latitude AS post_lat, p.longitude AS post_lon, p.allowed_radius_metres
       FROM guards g
       JOIN posts p ON g.assigned_post_id = p.id
       WHERE g.id = $1`,
      [guard_id]
    );

    const guard = guardRes.rows[0];
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

    // 6. Update attendance record with check-out data
    const updateRes = await db.query(
      `UPDATE attendance
       SET check_out_time = $1, check_out_latitude = $2, check_out_longitude = $3, 
           check_out_photo_url = $4, status = 'CHECKED_OUT'
       WHERE id = $5
       RETURNING id, check_out_time, status`,
      [serverTimestamp, latitude, longitude, uploadResult.url, existingAtt.rows[0].id]
    );

    await logAuditEvent({
      action: 'GUARD_CHECK_OUT',
      performedBy: req.user.name,
      performedByRole: 'OFFICER',
      targetType: 'Guard',
      targetId: guard.id,
      reason: `Guard ${guard.name} checked out successfully (${distanceMeters}m from post)`
    });

    return res.json({
      success: true,
      message: `Check-out recorded for ${guard.name} successfully.`,
      data: {
        attendanceId: updateRes.rows[0].id,
        guardId: guard.id,
        guardName: guard.name,
        checkOutTime: updateRes.rows[0].check_out_time,
        distanceMeters,
        photoUrl: uploadResult.url,
        status: 'CHECKED_OUT'
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
