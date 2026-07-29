import React, { useState } from 'react';
import { FileSpreadsheet, Download, Calendar, Filter } from 'lucide-react';
import { api } from '../services/api';
import { getLocalDateString } from '../utils/date';

export default function ReportsView() {
  const todayStr = getLocalDateString();
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await api.downloadReportCSV(fromDate, toDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${fromDate}_to_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to download report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Attendance Reports & Export <FileSpreadsheet className="w-5 h-5 text-sky-400" />
        </h2>
        <p className="text-xs text-slate-400">Export verified attendance logs filtered by date range into CSV format.</p>
      </div>

      <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/60 max-w-xl space-y-6 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Filter className="w-4 h-4 text-sky-400" /> Export Options
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-200">CSV Export Format Includes:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
            <li>Date, Guard Name, Mobile Number</li>
            <li>Assigned Post Name & Shift Name</li>
            <li>Marked By Officer Name</li>
            <li>Exact Server Timestamp (Check-in & Check-out)</li>
            <li>GPS Distance from Post (Meters) & Final Status</li>
          </ul>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-semibold shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> {exporting ? 'Generating Report...' : 'Export Attendance CSV Report'}
        </button>
      </div>
    </div>
  );
}
