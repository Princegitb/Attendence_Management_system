/**
 * PDF Payslip Generator Utility
 * Converts guard payslip data into a printable HTML document and triggers native browser PDF print window.
 */
export function generateGuardPayslipPDF(slipData, monthName, year) {
  if (!slipData || !slipData.guard) return;

  const guard = slipData.guard;
  const summary = slipData.summary || {};
  const config = slipData.config || {};
  const attendance = slipData.attendance || [];
  const daysInMonth = slipData.daysInMonth || 30;

  // Build printable HTML document
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payslip_${guard.name.replace(/\s+/g, '_')}_${monthName}_${year}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .company-subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .payslip-title {
            text-align: right;
          }
          .payslip-title h2 {
            margin: 0;
            font-size: 16px;
            color: #0284c7;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .payslip-title p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #475569;
            font-weight: 600;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
          }
          .info-label {
            color: #64748b;
            font-weight: 500;
          }
          .info-value {
            color: #0f172a;
            font-weight: 700;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #334155;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .calc-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .calc-table th {
            background: #f1f5f9;
            color: #475569;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 8px 12px;
            text-align: left;
            border: 1px solid #cbd5e1;
          }
          .calc-table td {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            font-size: 11px;
          }
          .calc-table tr.total-row td {
            background: #f8fafc;
            font-weight: 800;
            font-size: 13px;
            color: #0f172a;
            border-top: 2px solid #0284c7;
          }
          .text-right {
            text-align: right;
          }
          .net-amount {
            color: #059669;
            font-weight: 800;
            font-size: 14px;
          }
          .deduction {
            color: #dc2626;
          }
          .attendance-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 25px;
          }
          .att-header {
            text-align: center;
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            padding: 2px 0;
            text-transform: uppercase;
          }
          .att-box {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 4px;
            height: 34px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            background: #ffffff;
          }
          .att-box.present {
            background: #ecfdf5;
            border-color: #a7f3d0;
            color: #047857;
          }
          .att-box.ot {
            background: #fffbeb;
            border-color: #fde68a;
            color: #b45309;
          }
          .att-box.absent {
            background: #fef2f2;
            border-color: #fecaca;
            color: #b91c1c;
          }
          .att-day {
            font-size: 9px;
            font-weight: 700;
            color: #475569;
          }
          .att-badge {
            font-size: 9px;
            font-weight: 800;
          }
          .footer-sign {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 20px;
          }
          .sign-box {
            text-align: center;
            width: 180px;
          }
          .sign-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 4px;
          }
          .sign-text {
            font-size: 10px;
            color: #64748b;
            font-weight: 600;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="company-name">SMART GUARD SERVICES</div>
            <div class="company-subtitle">Workforce & Security Management System</div>
          </div>
          <div class="payslip-title">
            <h2>SALARY PAYSLIP</h2>
            <p>${monthName.toUpperCase()} ${year}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Guard Name:</span>
            <span class="info-value">${guard.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Mobile:</span>
            <span class="info-value">${guard.mobile || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Assigned Post:</span>
            <span class="info-value">${guard.post_name || 'Unassigned'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Assigned Shift:</span>
            <span class="info-value">${guard.shift_name || 'Standard Shift'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Salary Type:</span>
            <span class="info-value">${(config.salary_type || 'MONTHLY_FIXED').toUpperCase()}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Attendance Summary:</span>
            <span class="info-value">${summary.presentDays || 0} Present / ${summary.absentDays || 0} Absent</span>
          </div>
        </div>

        <div class="section-title">Earnings & Deductions Breakdown</div>
        <table class="calc-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Details / Rate</th>
              <th class="text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Wage / Fixed Earnings</td>
              <td class="text-right">₹${parseFloat(config.basic_salary || 0).toFixed(2)}</td>
              <td class="text-right">₹${parseFloat(summary.basicEarnings || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Overtime (OT) Earnings</td>
              <td class="text-right">${summary.overtimeHours || 0} hrs @ ₹${parseFloat(config.ot_rate_per_hour || 0).toFixed(2)}/hr</td>
              <td class="text-right">₹${parseFloat(summary.otEarnings || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Salary Advance / Deductions</td>
              <td class="text-right">Deducted</td>
              <td class="text-right deduction">-₹${parseFloat(summary.advanceDeduction || 0).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2">NET PAYABLE SALARY</td>
              <td class="text-right net-amount">₹${parseFloat(summary.netSalary || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Monthly Attendance Grid (${monthName} ${year})</div>
        <div class="attendance-grid">
          ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="att-header">${d}</div>`).join('')}
          ${Array.from({ length: new Date(year, monthsListToNumber(monthName) - 1, 1).getDay() })
            .map(() => '<div style="visibility:hidden"></div>').join('')}
          ${attendance.map((day, idx) => {
            const dayNum = idx + 1;
            const otHours = parseFloat(day.otHours || 0);
            const status = day.status;
            let cls = 'absent';
            let label = 'ABS';
            if (status === 'PRESENT') {
              if (otHours > 0) {
                cls = 'ot';
                label = `+${otHours}h`;
              } else {
                cls = 'present';
                label = 'P';
              }
            } else if (['CHECKED_IN', 'CHECKED_OUT', 'PENDING'].includes(status)) {
              cls = 'present';
              label = 'P';
            }

            return `
              <div class="att-box ${cls}">
                <span class="att-day">${dayNum}</span>
                <span class="att-badge">${label}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="footer-sign">
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-text">Guard Signature / Date</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-text">Authorized Signatory (Manager)</div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Open hidden iframe or window and trigger print/PDF preview
  const printWindow = window.open('', '_blank', 'width=900,height=900');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

function monthsListToNumber(monthName) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const idx = months.findIndex(m => m.toLowerCase() === String(monthName).toLowerCase());
  return idx !== -1 ? idx + 1 : 1;
}
