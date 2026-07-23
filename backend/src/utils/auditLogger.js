async function logAuditEvent() {
  // Audit logging disabled to optimize database storage space in Supabase
  return;
}

module.exports = { logAuditEvent };
