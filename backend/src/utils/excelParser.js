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
 * Parses a date value from Excel (which can be a number like 46037, string, Date object, or undefined)
 * into an ISO date string (YYYY-MM-DD).
 */
function parseExcelDate(rawVal) {
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return new Date().toISOString().split('T')[0];
  }

  // 1. If already a valid JS Date object
  if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
    return rawVal.toISOString().split('T')[0];
  }

  // 2. If number or numeric string (Excel serial date like 46037 or "46037")
  const num = Number(rawVal);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    // Excel base epoch calculation: 25569 days offset from Unix epoch (1970-01-01)
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const str = String(rawVal).trim();
  if (!str) {
    return new Date().toISOString().split('T')[0];
  }

  // 3. Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 4. Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 5. Fallback JS Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  // Default fallback if date could not be parsed
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses and processes Guard Bulk Import Excel buffer
 */
async function processGuardExcelImport(fileBuffer) {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
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
  (postsRes.rows || []).forEach(p => p && p.name && postsMap.set(p.name.trim().toLowerCase(), p.id));

  const shiftsMap = new Map();
  (shiftsRes.rows || []).forEach(s => s && s.name && shiftsMap.set(s.name.trim().toLowerCase(), s.id));

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
    const rawDoj = r['Date of Joining'] !== undefined ? r['Date of Joining'] : r['doj'];
    const dateOfJoining = parseExcelDate(rawDoj);
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
      rowNumber,
      guard: {
        name: fullName,
        mobile: mobile || null,
        assigned_post_id: postId,
        assigned_shift_id: shiftId,
        date_of_joining: dateOfJoining,
        status: ['ACTIVE', 'INACTIVE'].includes(status) ? status : 'ACTIVE'
      }
    });
  }

  let successCount = 0;

  // Insert valid rows into Database
  if (validRowsToInsert.length > 0) {
    const client = await db.getClient();
    try {
      if (client.query && typeof client.query === 'function') {
        // Insert guard rows individually to isolate failures
        for (const item of validRowsToInsert) {
          try {
            await client.query(
              `INSERT INTO guards (name, mobile, assigned_post_id, assigned_shift_id, date_of_joining, status)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [item.guard.name, item.guard.mobile, item.guard.assigned_post_id, item.guard.assigned_shift_id, item.guard.date_of_joining, item.guard.status]
            );
            successCount++;
          } catch (rowDbErr) {
            let reason = `DB insert error: ${rowDbErr.message}`;
            if (rowDbErr.code === '23505') {
              reason = `Mobile number '${item.guard.mobile}' already exists in system database`;
            }
            errors.push({ row: item.rowNumber, name: item.guard.name, reason });
          }
        }
      }
    } catch (dbErr) {
      errors.push({ row: 0, name: 'Database Error', reason: `DB connection error: ${dbErr.message}` });
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

