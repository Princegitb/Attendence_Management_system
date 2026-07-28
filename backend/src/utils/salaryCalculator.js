function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates salary details based on wages and days worked
 * @param {Object} params
 * @param {string} params.salaryType - 'DAILY', 'MONTHLY', or 'HOURLY'
 * @param {number} params.basicSalary - Base rate
 * @param {number} params.otRatePerHour - Overtime rate
 * @param {boolean} params.isOtEligible - Whether OT is enabled
 * @param {number} params.presentDays - Present count
 * @param {number} params.absentDays - Absent count
 * @param {number} params.totalApprovedOtHours - Total OT hours
 * @param {number} params.advances - Loan/advance deduction amount
 * @param {number} params.daysInMonth - Total days of the month
 */
function calculateSalary({
  salaryType,
  basicSalary,
  otRatePerHour = 0,
  isOtEligible = false,
  presentDays,
  absentDays,
  totalApprovedOtHours = 0,
  advances = 0,
  daysInMonth
}) {
  let basicEarnings = 0;
  let otEarnings = 0;

  // 1. Basic Earnings Calculation
  if (salaryType === 'DAILY') {
    basicEarnings = basicSalary * presentDays;
  } else if (salaryType === 'MONTHLY') {
    // Monthly rate with absenteeism deductions
    const ratePerDay = basicSalary / daysInMonth;
    basicEarnings = basicSalary - (ratePerDay * absentDays);
    if (basicEarnings < 0) basicEarnings = 0;
  } else if (salaryType === 'HOURLY') {
    // 8 hours standard work day assumed for hourly structure
    basicEarnings = basicSalary * (presentDays * 8);
  }

  // 2. Overtime Earnings
  if (isOtEligible && totalApprovedOtHours > 0) {
    otEarnings = otRatePerHour * totalApprovedOtHours;
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

module.exports = {
  calculateSalary,
  getDaysInMonth
};
