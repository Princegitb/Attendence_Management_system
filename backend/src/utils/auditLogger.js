const db = require('../db');

/**
 * Persists an operations log entry into the database.
 * Wrapped in try/catch so that main operations (like logins or edits) do not fail if logging hits an error.
 */
async function logAuditEvent({
  action,
  performedBy,
  performedByRole,
  targetType = null,
  targetId = null,
  oldValue = null,
  newValue = null,
  reason = null
}) {
  try {
    const queryText = `
      INSERT INTO audit_logs (
        action, performed_by, performed_by_role, 
        target_type, target_id, old_value, new_value, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await db.query(queryText, [
      action,
      performedBy,
      performedByRole,
      targetType,
      targetId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      reason
    ]);
  } catch (err) {
    console.error('⚠️ [AUDIT LOG ERROR] Failed to record audit log:', err.message);
  }
}

module.exports = { logAuditEvent };
