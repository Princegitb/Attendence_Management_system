const xlsx = require('xlsx');
const db = require('../db');

/**
 * Generates Excel template buffer for Guard Bulk Import
 */
function generateTemplateBuffer() {
  const sampleData = [
    {
      'Full Name': 'Rajesh Kumar',
      'Mobile Number': '9812345678',
      'Assigned Post': 'Main Gate - HQ',
      'Assigned Shift': 'Day Shift',
      'Date of Joining': '2026-01-15',
      'Status': 'ACTIVE'
    },
    {
      'Full Name': 'Vikram Sharma',
      'Mobile Number': '9876543211',
      'Assigned Post': 'Warehouse North',
      'Assigned Shift': 'Night Shift',
      'Date of Joining': '2026-02-01',
      'Status': 'ACTIVE'
    }
  ];

  const worksheet = xlsx.utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 22 }, // Full Name
    { wch: 16 }, // Mobile Number
    { wch: 25 }, // Assigned Post
    { wch: 18 }, // Assigned Shift
    { wch: 16 }, // Date of Joining
    { wch: 12 }  // Status
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Guards Template');

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Parses and processes Guard Bulk Import Excel buffer
 */
async function processGuardExcelImport(fileBuffer) {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows || rows.length === 0) {
    return {
      totalRows: 0,
      successCount: 0,
      failedCount: 0,
      errors: [{ row: 0, name: 'File', reason: 'Uploaded Excel file is empty or unreadable.' }]
    };
  }

  // Fetch current Posts & Shifts from DB for validation
  const postsRes = await db.query(`SELECT id, name FROM posts`);
  const shiftsRes = await db.query(`SELECT id, name FROM shifts`);

  const postsMap = new Map();
  postsRes.rows.forEach(p => postsMap.set(p.name.trim().toLowerCase(), p.id));

  const shiftsMap = new Map();
  shiftsRes.rows.forEach(s => shiftsMap.set(s.name.trim().toLowerCase(), s.id));

  const validRowsToInsert = [];
  const errors = [];
  const seenMobilesInFile = new Set();

  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2; // Row 1 is header
    const r = rows[index];

    const fullName = (r['Full Name'] || r['name'] || '').toString().trim();
    const mobile = (r['Mobile Number'] || r['mobile'] || '').toString().trim();
    const postName = (r['Assigned Post'] || r['post'] || '').toString().trim();
    const shiftName = (r['Assigned Shift'] || r['shift'] || '').toString().trim();
    const dateOfJoining = (r['Date of Joining'] || r['doj'] || '').toString().trim() || new Date().toISOString().split('T')[0];
    const status = (r['Status'] || r['status'] || 'ACTIVE').toString().trim().toUpperCase();

    if (!fullName) {
      errors.push({ row: rowNumber, name: 'Unknown', reason: 'Full Name is required' });
      continue;
    }

    if (mobile && seenMobilesInFile.has(mobile)) {
      errors.push({ row: rowNumber, name: fullName, reason: `Duplicate mobile number ${mobile} in uploaded file` });
      continue;
    }

    const postId = postsMap.get(postName.toLowerCase());
    if (!postId) {
      errors.push({ row: rowNumber, name: fullName, reason: `Assigned Post "${postName}" not found in system database` });
      continue;
    }

    const shiftId = shiftsMap.get(shiftName.toLowerCase());
    if (!shiftId) {
      errors.push({ row: rowNumber, name: fullName, reason: `Assigned Shift "${shiftName}" not found in system database` });
      continue;
    }

    if (mobile) seenMobilesInFile.add(mobile);

    validRowsToInsert.push({
      name: fullName,
      mobile: mobile || null,
      assigned_post_id: postId,
      assigned_shift_id: shiftId,
      date_of_joining: dateOfJoining,
      status: ['ACTIVE', 'INACTIVE'].includes(status) ? status : 'ACTIVE'
    });
  }

  let successCount = 0;

  // Insert valid rows into Database
  if (validRowsToInsert.length > 0) {
    const client = await db.getClient();
    try {
      if (client.query && typeof client.query === 'function') {
        // Run bulk insert
        for (const guard of validRowsToInsert) {
          await client.query(
            `INSERT INTO guards (name, mobile, assigned_post_id, assigned_shift_id, date_of_joining, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [guard.name, guard.mobile, guard.assigned_post_id, guard.assigned_shift_id, guard.date_of_joining, guard.status]
          );
          successCount++;
        }
      }
    } catch (dbErr) {
      errors.push({ row: 0, name: 'Database Error', reason: `DB insert error: ${dbErr.message}` });
    } finally {
      if (client.release) client.release();
    }
  }

  return {
    totalRows: rows.length,
    successCount,
    failedCount: errors.length,
    errors
  };
}

module.exports = {
  generateTemplateBuffer,
  processGuardExcelImport
};
