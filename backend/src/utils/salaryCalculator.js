/**
 * Core utility for calculating employee/guard salaries based on attendance,
 * overtime hours, holiday calendars, and configurations.
 */

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates earnings, overtime pay, deductions, and net salary.
 */
function calculateSalary({
  salaryType,
  basicSalary,
  otRatePerHour,
  isOtEligible,
  presentDays,
  absentDays,
  totalApprovedOtHours,
  totalAdvances,
  daysInMonth,
  totalShiftHoursWorked = 0
}) {
  const basic = parseFloat(basicSalary || 0);
  const otRate = parseFloat(otRatePerHour || 0);
  const advances = parseFloat(totalAdvances || 0);
  
  let basicEarnings = 0.00;
  let otEarnings = 0.00;

  // 1. Calculate Basic Earnings based on Salary Type
  if (salaryType === 'DAILY') {
    basicEarnings = basic * presentDays;
  } else if (salaryType === 'MONTHLY') {
    // If monthly, deduct salary for absent days proportionally
    if (daysInMonth > 0) {
      const deductionPerDay = basic / daysInMonth;
      basicEarnings = Math.max(0, basic - (deductionPerDay * absentDays));
    } else {
      basicEarnings = basic;
    }
  } else if (salaryType === 'HOURLY') {
    basicEarnings = basic * totalShiftHoursWorked;
  }

  // 2. Calculate Overtime Earnings
  if (isOtEligible && totalApprovedOtHours > 0) {
    otEarnings = totalApprovedOtHours * otRate;
  }

  // Round values to 2 decimal places
  basicEarnings = Math.round(basicEarnings * 100) / 100;
  otEarnings = Math.round(otEarnings * 100) / 100;
  
  // 3. Deductions (Advance Salary)
  const GlenAdvances = Math.min(basicEarnings + otEarnings, advances);
  const advanceDeduction = Math.round(GlenAdvances * 100) / 100;
  
  // 4. Net Salary
  const netSalary = Math.max(0, basicEarnings + otEarnings - advanceDeduction);

  return {
    presentDays,
    absentDays,
    overtimeHours: parseFloat(totalApprovedOtHours || 0),
    basicEarnings,
    otEarnings,
    advanceDeduction,
    otherDeductions: 0.00,
    netSalary: Math.round(netSalary * 100) / 100
  };
}

/**
 * Detailed calendar evaluation applying sandwich policy and weekly off rules.
 */
function evaluateMonthlyAttendance({
  year,
  month,
  weeklyOffs = [], // Array: e.g. ['Sunday']
  saturdayPolicy = 'ALL_WORKING', // 'ALL_OFF', '2ND_4TH_OFF', 'ALL_WORKING'
  sandwichPolicy = false,
  holidays = [], // Array of holiday event rows: [{ date: '2026-07-15', name: 'Diwali' }]
  attendance = [], // Array of marked check-in rows
  overtime = [] // Array of overtime logs
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const dayStates = [];

  // Create attendance map by YYYY-MM-DD
  const attendanceMap = new Map();
  attendance.forEach(a => {
    if (!a.date) return;
    const dateKey = new Date(a.date).toISOString().split('T')[0];
    attendanceMap.set(dateKey, a);
  });

  // Create approved overtime map by YYYY-MM-DD
  const overtimeMap = new Map();
  overtime.forEach(ot => {
    if (!ot.date) return;
    const dateKey = new Date(ot.date).toISOString().split('T')[0];
    if (ot.status === 'APPROVED') {
      overtimeMap.set(dateKey, parseFloat(ot.overtime_hours || 0));
    }
  });

  // Create holiday map by YYYY-MM-DD
  const holidayMap = new Map();
  holidays.forEach(h => {
    if (!h.date) return;
    const dateKey = new Date(h.date).toISOString().split('T')[0];
    holidayMap.set(dateKey, h.name);
  });

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 1. First pass: Identify if day is a weekly off or holiday
  for (let d = 1; d <= daysInMonth; d++) {
    // Note: Creating date in local timezone context
    const dateObj = new Date(year, month - 1, d);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const att = attendanceMap.get(dateStr);
    const isPresent = att && ['APPROVED', 'CHECKED_IN', 'CHECKED_OUT'].includes(att.status);

    let isOff = false;
    let offReason = null;

    // Check holiday list
    if (holidayMap.has(dateStr)) {
      isOff = true;
      offReason = `Holiday: ${holidayMap.get(dateStr)}`;
    } else {
      const dayName = weekdays[dateObj.getDay()];
      
      // Check Saturday policy
      if (dayName === 'Saturday') {
        if (saturdayPolicy === 'ALL_OFF') {
          isOff = true;
          offReason = 'Weekly Off (Saturday)';
        } else if (saturdayPolicy === '2ND_4TH_OFF') {
          const weekNum = Math.ceil(d / 7);
          if (weekNum === 2 || weekNum === 4) {
            isOff = true;
            offReason = `Weekly Off (${weekNum}nd/th Sat)`;
          }
        }
      } else if (weeklyOffs.includes(dayName)) {
        isOff = true;
        offReason = `Weekly Off (${dayName})`;
      }
    }

    dayStates.push({
      dayNum: d,
      dateStr,
      isPresent,
      isOff,
      offReason,
      att,
      otHours: overtimeMap.get(dateStr) || 0
    });
  }

  // Helper to find surrounding working days (excluding rest days/holidays)
  const getSurroundingWorkingDays = (idx) => {
    let prevWorking = null;
    let nextWorking = null;

    // Search backward
    for (let i = idx - 1; i >= 0; i--) {
      if (!dayStates[i].isOff) {
        prevWorking = dayStates[i];
        break;
      }
    }

    // Search forward
    for (let i = idx + 1; i < dayStates.length; i++) {
      if (!dayStates[i].isOff) {
        nextWorking = dayStates[i];
        break;
      }
    }

    return { prevWorking, nextWorking };
  };

  let presentCount = 0;
  let absentCount = 0;

  // 2. Second pass: Apply Sandwich logic to off-days
  const days = dayStates.map((day, idx) => {
    let finalStatus = 'ABSENT';
    let label = '';

    if (day.isPresent) {
      finalStatus = 'PRESENT';
      presentCount++;
    } else if (day.isOff) {
      if (sandwichPolicy) {
        const { prevWorking, nextWorking } = getSurroundingWorkingDays(idx);
        
        // If absent on BOTH surrounding working days, it gets sandwiched!
        const absentBefore = !prevWorking || !prevWorking.isPresent;
        const absentAfter = !nextWorking || !nextWorking.isPresent;

        if (absentBefore && absentAfter) {
          finalStatus = 'SANDWICHED_ABSENT';
          label = `Sandwiched (${day.offReason})`;
          absentCount++;
        } else {
          finalStatus = 'PAID_OFF';
          label = day.offReason;
          presentCount++; // Paid Off counts as present/paid
        }
      } else {
        finalStatus = 'PAID_OFF';
        label = day.offReason;
        presentCount++;
      }
    } else {
      finalStatus = 'ABSENT';
      absentCount++;
    }

    return {
      dayNum: day.dayNum,
      date: day.dateStr,
      status: finalStatus,
      label,
      checkInTime: day.att ? day.att.check_in_time : null,
      checkOutTime: day.att ? day.att.check_out_time : null,
      otHours: day.otHours
    };
  });

  return {
    days,
    presentDays: presentCount,
    absentDays: absentCount,
    daysInMonth
  };
}

module.exports = {
  calculateSalary,
  evaluateMonthlyAttendance,
  getDaysInMonth
};
