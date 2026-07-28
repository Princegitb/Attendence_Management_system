import React, { useEffect, useState } from 'react';
import { Calendar, Users, DollarSign, Award, RefreshCw, Send, CheckCircle2, History, Eye, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

export default function PayrollGenerationView() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [salaries, setSalaries] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('calculate'); // 'calculate' or 'history'
  
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const monthsList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const calculatePreview = async () => {
    setLoading(true);
    try {
      const res = await api.calculatePayroll(month, year);
      if (res.success) {
        setSalaries(res.data || []);
      } else {
        alert(res.message || 'Calculation preview failed');
      }
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.getPayrollHistory();
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch (err) {
      console.error('History load failed:', err);
    }
  };

  const handleGenerateSubmit = async () => {
    if (salaries.length === 0) {
      alert('Calculate a preview first before generating payroll.');
      return;
    }

    if (!window.confirm(`Are you sure you want to lock and finalize payroll for ${monthsList.find(m => m.value === month)?.label} ${year}? This action will create audit logs and block duplicate runs for this month.`)) {
      return;
    }

    setGenerating(true);
    try {
      const res = await api.generatePayroll(month, year, salaries);
      if (res.success) {
        alert('Payroll finalized and locked successfully!');
        setSalaries([]);
        loadHistory();
        setActiveSubTab('history');
      } else {
        alert(res.message || 'Generation failed');
      }
    } catch (err) {
      alert(err.message || 'Error generating payroll');
    } finally {
      setGenerating(false);
    }
  };

  const viewDetails = async (payroll) => {
    setSelectedPayroll(payroll);
    setDetailsLoading(true);
    try {
      const res = await api.getPayrollDetails(payroll.id);
      if (res.success) {
        setPayrollDetails(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load payroll details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    }
  }, [activeSubTab]);

  // Aggregate stats
  const totalPayout = salaries.reduce((acc, row) => acc + parseFloat(row.netSalary), 0);
  const totalOT = salaries.reduce((acc, row) => acc + parseFloat(row.otEarnings), 0);
  const totalAdvances = salaries.reduce((acc, row) => acc + parseFloat(row.advanceDeduction), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Monthly Payroll cycle <Award className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Preview month calculations, deduct advances, and finalize guard payouts.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setActiveSubTab('calculate'); setSelectedPayroll(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'calculate' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> Run Payroll
          </button>
          <button
            onClick={() => { setActiveSubTab('history'); setSelectedPayroll(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'history' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <History className="w-4 h-4" /> Payroll History
          </button>
        </div>
      </div>

      {activeSubTab === 'calculate' ? (
        <div className="space-y-6">
          {/* Month Selector Filter Card */}
          <div className="bg-slate-800/60 p-5 rounded-3xl border border-slate-700/60 flex flex-wrap items-end gap-4 max-w-4xl shadow-xl">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Calculation Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none w-40"
              >
                {monthsList.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none w-28"
              >
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear - 1}>{currentYear - 1}</option>
                <option value={currentYear - 2}>{currentYear - 2}</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={calculatePreview}
                disabled={loading}
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-sky-500/10 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Calculating...' : 'Preview Wages'}
              </button>
              {salaries.length > 0 && (
                <button
                  onClick={handleGenerateSubmit}
                  disabled={generating}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {generating ? 'Finalizing...' : 'Finalize & Approve Payroll'}
                </button>
              )}
            </div>
          </div>

          {/* Aggregate Summary Cards */}
          {salaries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-w-4xl">
              <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Roster Payout</span>
                <div className="text-xl font-bold text-white">₹{totalPayout.toFixed(2)}</div>
              </div>
              <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Overtime Earning</span>
                <div className="text-xl font-bold text-sky-400">₹{totalOT.toFixed(2)}</div>
              </div>
              <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Advance Deducted</span>
                <div className="text-xl font-bold text-rose-400">₹{totalAdvances.toFixed(2)}</div>
              </div>
              <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block">Guard Roster Size</span>
                <div className="text-xl font-bold text-white">{salaries.length} present</div>
              </div>
            </div>
          )}

          {/* Wages Table Preview */}
          {salaries.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3.5 border-b border-slate-700">Guard Name</th>
                      <th className="p-3.5 border-b border-slate-700">Type</th>
                      <th className="p-3.5 border-b border-slate-700">Days Present</th>
                      <th className="p-3.5 border-b border-slate-700">Basic Earnings</th>
                      <th className="p-3.5 border-b border-slate-700">OT Hours</th>
                      <th className="p-3.5 border-b border-slate-700 text-sky-400">OT Earnings</th>
                      <th className="p-3.5 border-b border-slate-700 text-rose-400">Advance Ded.</th>
                      <th className="p-3.5 border-b border-slate-700 text-right">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {salaries.map((row) => (
                      <tr key={row.guardId} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3.5 font-semibold text-white">
                          <div>{row.guardName}</div>
                          <div className="text-[10px] text-slate-500">{row.guardMobile || 'No mobile'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-slate-700/60 bg-slate-900">
                            {row.salaryType}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {row.presentDays}d / {row.absentDays}a
                        </td>
                        <td className="p-3.5 font-mono">₹{row.basicEarnings.toFixed(2)}</td>
                        <td className="p-3.5 font-mono text-slate-400">{row.overtimeHours} hrs</td>
                        <td className="p-3.5 font-mono text-sky-400">₹{row.otEarnings.toFixed(2)}</td>
                        <td className="p-3.5 font-mono text-rose-400">-₹{row.advanceDeduction.toFixed(2)}</td>
                        <td className="p-3.5 font-mono font-bold text-white text-right">
                          ₹{row.netSalary.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 rounded-3xl p-10 border border-slate-800 text-center text-slate-500 flex flex-col items-center justify-center space-y-3 max-w-xl">
              <Calendar className="w-10 h-10 text-slate-700" />
              <div>
                <h4 className="text-sm font-semibold text-white">No Calculation Ran</h4>
                <p className="text-xs text-slate-400 mt-1">Select a Month & Year and click "Preview Wages" to fetch attendance and calculate salary breakdowns.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* History List */}
          <div className="md:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Payrolls</h3>
            {history.length === 0 ? (
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
                No past payroll records found.
              </div>
            ) : (
              history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => viewDetails(h)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                    selectedPayroll?.id === h.id
                      ? 'bg-sky-500/10 border-sky-500/40'
                      : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/30'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs text-white">
                      {monthsList.find(m => m.value === h.month)?.label} {h.year}
                    </h4>
                    <span className="text-[10px] text-slate-500 block">Generated by: {h.generated_by_name}</span>
                  </div>
                  <div className="text-right flex items-center gap-1">
                    <div>
                      <div className="text-xs font-bold text-emerald-400 font-mono">₹{parseFloat(h.total_net_salary).toFixed(2)}</div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Locked</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Details Panel */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Breakdown Details</h3>
            {selectedPayroll ? (
              <div className="bg-slate-800/30 border border-slate-700/60 rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Payroll Period: {monthsList.find(m => m.value === selectedPayroll.month)?.label} {selectedPayroll.year}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">Aggregates: Basic=₹{parseFloat(selectedPayroll.total_basic_earnings).toFixed(2)} | OT=₹{parseFloat(selectedPayroll.total_ot_earnings).toFixed(2)} | Advances=-₹{parseFloat(selectedPayroll.total_advance_deductions).toFixed(2)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    APPROVED & LOCKED
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-2 border-b border-slate-700">Guard Name</th>
                        <th className="p-2 border-b border-slate-700">Days</th>
                        <th className="p-2 border-b border-slate-700">Basic Earnings</th>
                        <th className="p-2 border-b border-slate-700">OT</th>
                        <th className="p-2 border-b border-slate-700 text-rose-400">Advance</th>
                        <th className="p-2 border-b border-slate-700 text-right text-emerald-400">Net Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {detailsLoading ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">Loading breakdown rows...</td>
                        </tr>
                      ) : (
                        payrollDetails.map((det) => (
                          <tr key={det.id} className="hover:bg-slate-700/20">
                            <td className="p-2 font-medium text-white">{det.guard_name}</td>
                            <td className="p-2 font-mono text-slate-400">{det.present_days}p/{det.absent_days}a</td>
                            <td className="p-2 font-mono">₹{parseFloat(det.basic_earnings).toFixed(2)}</td>
                            <td className="p-2 font-mono">₹{parseFloat(det.ot_earnings).toFixed(2)} ({det.overtime_hours}h)</td>
                            <td className="p-2 font-mono text-rose-400">-₹{parseFloat(det.advance_deduction).toFixed(2)}</td>
                            <td className="p-2 font-mono font-bold text-white text-right">
                              ₹{parseFloat(det.net_salary).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 rounded-3xl p-10 border border-slate-800 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                <Eye className="w-8 h-8 text-slate-700" />
                <span className="text-xs text-slate-400">Select a payroll month from the history list to load the individual guard breakdown.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
