/**
 * Missed-Checkout Cron Job
 *
 * Scans attendance rows where the guard checked in but never checked out,
 * and flags them as MISSED_CHECKOUT for manager review once the shift is well past.
 *
 * Rules:
 *   - Status must NOT be REJECTED, MISSED_CHECKOUT, or PENDING_REVIEW (no flagging on terminal states)
 *   - Time since shift end must exceed MAX_CHECKOUT_BUFFER_MIN (240 minutes = 4 hours)
 *   - The buffer matches the overnight-shift buffer used in attendanceController.js, so an
 *     overnight-shift checkout attempt right after midnight is still considered "current".
 *
 * Implementation notes:
 *   - Plain setInterval — no `node-cron` dependency.
 *   - Idempotent: rerunning the same tick simply re-flags the same rows.
 *   - Logs every flag to the audit log with performedBy='system:cron' for traceability.
 */

const db = require('../db');
const { logAuditEvent } = require('../utils/auditLogger');

const TIMEZONE = process.env.SYSTEM_TIMEZONE || 'Asia/Kolkata';
const MAX_CHECKOUT_BUFFER_MIN = 240; // 4 hours after shift end
const TICK_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes
const INITIAL_DELAY_MS = 60 * 1000; // first run 60 seconds after server start

/**
 * Parse a TIME string like "18:00:00" or "18:00" into minutes since midnight.
 * Returns null if the string is malformed.
 */
function parseTimeOfDayToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Build a Date object representing the shift end + buffer cutoff in the configured timezone.
 * Returns null if shift_end_time is missing.
 */
function computeCutoffDate(shiftDate, shiftEndTimeStr, now) {
  const endMin = parseTimeOfDayToMinutes(shiftEndTimeStr);
  if (endMin === null || !shiftDate) return null;

  // Compute timezone offset in minutes for configured TIMEZONE dynamically via Intl
  const offsetMinutes = (() => {
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        timeZoneName: 'shortOffset'
      });
      const parts = dtf.formatToParts(now);
      const offsetPart = parts.find(p => p.type === 'timeZoneName');
      if (!offsetPart) return 330; // fallback +05:30
      const m = offsetPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return 330;
      const sign = m[1] === '+' ? 1 : -1;
      return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
    } catch (e) {
      return 330; // fallback +05:30
    }
  })();

  // Format YYYY-MM-DD components into UTC epoch
  const dateParts = shiftDate.split('-').map(Number);
  if (dateParts.length < 3 || dateParts.some(isNaN)) return null;

  const year = dateParts[0];
  const month = dateParts[1] - 1; // 0-indexed
  const day = dateParts[2];

  // Midnight UTC of shiftDate - offsetMinutes + endMin + buffer
  const shiftMidnightUtcMs = Date.UTC(year, month, day, 0, 0, 0);
  const shiftEndUtcMs = shiftMidnightUtcMs + (endMin - offsetMinutes) * 60 * 1000;

  return new Date(shiftEndUtcMs + MAX_CHECKOUT_BUFFER_MIN * 60 * 1000);
}

/**
 * Find all attendance rows still open (no checkout) and eligible for MISSED_CHECKOUT flagging.
 * Eligible = check_out_time IS NULL AND status NOT IN (REJECTED, MISSED_CHECKOUT, PENDING_REVIEW)
 *            AND (now > shift_end + 240 min) — computed in JS for clarity.
 */
async function flagMissedCheckouts(now = new Date()) {
  const res = await db.query(`
    SELECT a.id AS attendance_id,
           a.guard_id,
           a.date,
           a.check_in_time,
           s.end_time AS shift_end_time,
           g.name AS guard_name
    FROM attendance a
    JOIN guards g ON a.guard_id = g.id
    LEFT JOIN shifts s ON g.assigned_shift_id = s.id
    WHERE a.check_out_time IS NULL
      AND a.status NOT IN ('REJECTED', 'MISSED_CHECKOUT', 'PENDING_REVIEW')
  `);

  let flagged = 0;

  for (const row of res.rows) {
    const cutoff = computeCutoffDate(row.date, row.shift_end_time, now);
    if (!cutoff) continue;
    if (now <= cutoff) continue; // still within grace, not yet flaggable

    await db.query(
      `UPDATE attendance SET status = 'MISSED_CHECKOUT' WHERE id = $1`,
      [row.attendance_id]
    );

    await logAuditEvent({
      action: 'MISSED_CHECKOUT_FLAGGED',
      performedBy: 'system:cron',
      performedByRole: 'SYSTEM',
      targetType: 'Attendance',
      targetId: row.attendance_id,
      reason: `Guard ${row.guard_name} (#${row.guard_id}) did not check out by shift end + ${MAX_CHECKOUT_BUFFER_MIN} min. Auto-flagged for Manager review.`
    });

    flagged++;
  }

  return flagged;
}

let timer = null;
let initialTimeout = null;

function startMissedCheckoutCron() {
  if (timer) return; // already running

  const tick = async () => {
    try {
      const n = await flagMissedCheckouts(new Date());
      if (n > 0) {
        console.log(`[cron] flagged ${n} missed checkouts`);
      }
    } catch (e) {
      console.error('[cron] missed-checkout job failed:', e.message);
    }
  };

  // First tick after a short delay so the DB is ready.
  initialTimeout = setTimeout(() => {
    tick();
    timer = setInterval(tick, TICK_INTERVAL_MS);
  }, INITIAL_DELAY_MS);

  console.log(`[cron] missed-checkout job scheduled (every ${TICK_INTERVAL_MS / 60000} min)`);
}

function stopMissedCheckoutCron() {
  if (initialTimeout) clearTimeout(initialTimeout);
  if (timer) clearInterval(timer);
  timer = null;
  initialTimeout = null;
}

module.exports = {
  startMissedCheckoutCron,
  stopMissedCheckoutCron,
  flagMissedCheckouts,
  // Exported for unit tests
  _internals: { computeCutoffDate, parseTimeOfDayToMinutes, MAX_CHECKOUT_BUFFER_MIN }
};
