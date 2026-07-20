const db = require('../db');

async function logAuditEvent({ action, performedBy, performedByRole, targetType, targetId, oldValue, newValue, reason }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (action, performed_by, performed_by_role, target_type, target_id, old_value, new_value, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        action,
        performedBy,
        performedByRole,
        targetType || null,
        targetId || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        reason || null
      ]
    );
  } catch (err) {
    console.error('Failed to record audit log entry:', err.message);
  }
}

module.exports = { logAuditEvent };
