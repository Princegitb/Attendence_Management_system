/**
 * Core utility for calculating employee/guard salaries based on attendance,
 * overtime hours, advances, and configuration.
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
  
  // 3. Deductions (For now, just Advance Salary)
  const advanceDeduction = Math.min(basicEarnings + otEarnings, advances);
  
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

module.exports = { calculateSalary };
