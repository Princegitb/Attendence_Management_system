const assert = require('assert');
const db = require('../db');

// Mock request and response helpers
const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runTests() {
  console.log('🧪 Starting Overnight Shift Logic Tests...');

  // 1. Setup in-memory state
  const mockGuard = {
    id: 99,
    name: 'Overnight Guard',
    mobile: '9999999999',
    assigned_post_id: 1,
    assigned_shift_id: 99,
    status: 'ACTIVE'
  };

  const mockShift = {
    id: 99,
    name: 'Night Shift',
    start_time: '20:00:00',
    end_time: '04:00:00',
    grace_period_minutes: 15
  };

  db.inMemoryTables.guards.push(mockGuard);
  db.inMemoryTables.shifts.push(mockShift);

  // Import controller methods
  const { markCheckIn, markCheckOut, getOfficerGuardsChecklist } = require('../controllers/attendanceController');

  // Helper to trigger markCheckIn at a specific simulated system date & time
  const origDate = global.Date;
  const setSimulatedTime = (isoString) => {
    global.Date = class extends origDate {
      constructor(...args) {
        if (args.length > 0) return new origDate(...args);
        return new origDate(isoString);
      }
      static now() {
        return new origDate(isoString).getTime();
      }
    };
  };

  // Mock valid JPEG photo buffer
  const mockPhotoBuffer = Buffer.alloc(5000, 100);
  mockPhotoBuffer[0] = 0xFF;
  mockPhotoBuffer[1] = 0xD8;
  mockPhotoBuffer[2] = 0xFF;

  // --- Step A: Check-In at 8:05 PM (July 24) ---
  console.log('Simulating Check-In at 8:05 PM...');
  setSimulatedTime('2026-07-24T20:05:00+05:30'); // 8:05 PM IST

  const reqIn = {
    user: { id: 1 },
    body: { guard_id: 99, latitude: 28.613939, longitude: 77.209021, gps_accuracy: 10 },
    file: { buffer: mockPhotoBuffer, originalname: 'checkin.jpg' }
  };
  const resIn = mockResponse();

  await markCheckIn(reqIn, resIn);
  console.log('Checkin response:', resIn.statusCode, resIn.body);
  assert.strictEqual(resIn.statusCode || 200, 200, `Check-in failed: ${JSON.stringify(resIn.body)}`);
  
  // Verify entry in memory
  const checkInRec = db.inMemoryTables.attendance.find(a => String(a.guard_id) === '99');
  assert.ok(checkInRec, 'Attendance record should be created');
  assert.strictEqual(checkInRec.date, '2026-07-24', 'Logical date must be July 24th');
  console.log('✅ Check-In marked successfully for logical date: ' + checkInRec.date);

  // --- Step B: Retrieve Checklist at 2:00 AM (July 25 - Next Day) ---
  console.log('Simulating Checklist retrieval at 2:00 AM the next morning...');
  setSimulatedTime('2026-07-25T02:00:00+05:30'); // 2:00 AM IST

  const reqList = { user: { id: 1 } };
  const resList = mockResponse();
  await getOfficerGuardsChecklist(reqList, resList);
  
  assert.strictEqual(resList.statusCode || 200, 200);
  const checklistGuard = resList.body.data.guards.find(g => g.guardId === 99);
  assert.ok(checklistGuard, 'Guard should be in the checklist');
  assert.strictEqual(checklistGuard.attendance.status, 'APPROVED', 'Guard should remain checked in');
  console.log('✅ Checklist retrieval verified: Guard status is still active (APPROVED) after midnight.');

  // --- Step C: Check-Out at 4:10 AM (July 25 - Next Day) ---
  console.log('Simulating Check-Out at 4:10 AM...');
  setSimulatedTime('2026-07-25T04:10:00+05:30'); // 4:10 AM IST

  const reqOut = {
    user: { id: 1 },
    body: { guard_id: 99, latitude: 28.613939, longitude: 77.209021, gps_accuracy: 10 },
    file: { buffer: mockPhotoBuffer, originalname: 'checkout.jpg' }
  };
  const resOut = mockResponse();

  await markCheckOut(reqOut, resOut);
  assert.strictEqual(resOut.statusCode || 200, 200, `Check-out failed: ${JSON.stringify(resOut.body)}`);

  // Verify checkout fields updated in memory
  const checkOutRec = db.inMemoryTables.attendance.find(a => String(a.guard_id) === '99');
  assert.ok(checkOutRec.check_out_time, 'Check-out time should be recorded');
  assert.strictEqual(checkOutRec.status, 'CHECKED_OUT', 'Status should change to CHECKED_OUT');
  console.log('✅ Check-Out marked successfully on same record!');

  // Restore original Date object
  global.Date = origDate;

  console.log('🎉 ALL OVERNIGHT SHIFT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Overnight tests failed:', err);
  process.exit(1);
});
