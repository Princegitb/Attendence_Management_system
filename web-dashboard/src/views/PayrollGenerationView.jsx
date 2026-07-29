import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Users, DollarSign, Award, RefreshCw, Send, CheckCircle2, History, Eye, ChevronRight, X, Clock, MapPin, User, Printer } from 'lucide-react';
import { api } from '../services/api';
import { generateGuardPayslipPDF } from '../utils/pdfGenerator';

export default function PayrollGenerationView() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [salaries, setSalaries] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('calculate'); // 'calculate' or 'history'
  
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Guard Detailed Slip Modal state
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipData, setSlipData] = useState(null);
  const [slipLoading, setSlipLoading] = useState(false);

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

  const handleGenerateSubmit = async (overwrite = false) => {
    if (salaries.length === 0) {
      alert('Calculate a preview first before generating payroll.');
      return;
    }

    if (!overwrite && !window.confirm(`Are you sure you want to lock and finalize payroll for ${monthsList.find(m => m.value === month)?.label} ${year}?`)) {
      return;
    }

    setGenerating(true);
    try {
      const res = await api.generatePayroll(month, year, salaries, overwrite);
      if (res.success) {
        alert('Payroll finalized and locked successfully!');
        setSalaries([]);
        loadHistory();
        setActiveSubTab('history');
      } else {
        if (res.code === 'ALREADY_EXISTS') {
          if (window.confirm('Payroll for this month has already been finalized. Do you want to overwrite it and generate a new one?')) {
            handleGenerateSubmit(true);
          }
        } else {
          alert(res.message || 'Generation failed');
        }
      }
    } catch (err) {
      alert(err.message || 'Error generating payroll');
    } finally {
      setGenerating(false);
    }
  };

  const viewDetails = async (payroll) => {
    setSelectedPayroll(payroll);
    setPayrollDetails([]);
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

  const openGuardSlip = async (guardId) => {
    setSlipLoading(true);
    setShowSlipModal(true);
    setSlipData(null);
    try {
      const res = await api.getGuardPayrollDetail(guardId, month, year);
      if (res.success) {
        setSlipData(res);
      } else {
        alert(res.message || 'Failed to load guard payslip details');
        setShowSlipModal(false);
      }
    } catch (err) {
      console.error('Failed to fetch guard slip:', err);
      setShowSlipModal(false);
    } finally {
      setSlipLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    }
  }, [activeSubTab]);

  // Aggregate stats
  const totalPayout = salaries.reduce((acc, row) => acc + parseFloat(row.netSalary || 0), 0);
  const totalOT = salaries.reduce((acc, row) => acc + parseFloat(row.otEarnings || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Monthly Payroll cycle <Award className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Preview month calculations, track overtime summaries, and freeze payroll ledger cycles.</p>
        </div>

        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={() => { setActiveSubTab('calculate'); setSelectedPayroll(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'calculate' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Run Payroll
          </button>
          <button
            onClick={() => { setActiveSubTab('history'); setSelectedPayroll(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'history' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <History className="w-4 h-4" /> Payroll History
          </button>
        </div>
      </div>

      {activeSubTab === 'calculate' ? (
        <div className="space-y-6">
          {/* Month Selector Filter Card */}
          <div className="bg-slate-850/80 p-5 rounded-3xl border border-slate-700/50 flex flex-wrap items-end gap-4 max-w-4xl shadow-xl backdrop-blur-md">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Calculation Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 w-44"
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
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 w-32"
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
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-sky-500/10 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Processing...' : 'Calculate Wages Preview'}
              </button>
              {salaries.length > 0 && (
                <button
                  onClick={() => handleGenerateSubmit(false)}
                  disabled={generating}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {generating ? 'Saving...' : 'Finalize & Approve Payroll'}
                </button>
              )}
            </div>
          </div>

          {/* Aggregate Summary Cards */}
          {salaries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-2 hover:border-sky-500/30 transition-colors">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Total Net Roster Payout</span>
                <div className="text-2xl font-black text-white font-mono">₹{totalPayout.toFixed(2)}</div>
              </div>
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-2 hover:border-sky-500/30 transition-colors">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Total Overtime Earnings</span>
                <div className="text-2xl font-black text-sky-400 font-mono">₹{totalOT.toFixed(2)}</div>
              </div>
              <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-2 hover:border-sky-500/30 transition-colors">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Guard Roster Size</span>
                <div className="text-2xl font-black text-white font-mono">{salaries.length} Guards</div>
              </div>
            </div>
          )}

          {/* Wages Table Preview */}
          {salaries.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-700/40 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Calculated Payroll Preview</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Click any guard to view detailed monthly attendance calendar & slip breakdown.</span>
                </div>
                <div className="relative max-w-xs w-full">
                  <input
                    type="text"
                    placeholder="Search guard name or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 placeholder-slate-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-4 border-b border-slate-700">Guard Name</th>
                      <th className="p-4 border-b border-slate-700">Salary Type</th>
                      <th className="p-4 border-b border-slate-700">Days Present</th>
                      <th className="p-4 border-b border-slate-700">Basic Earnings</th>
                      <th className="p-4 border-b border-slate-700">OT Hours</th>
                      <th className="p-4 border-b border-slate-700 text-sky-400">OT Earnings</th>
                      <th className="p-4 border-b border-slate-700 text-right">Net Salary</th>
                      <th className="p-4 border-b border-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {salaries.filter(row => 
                      row.guardName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (row.guardMobile && row.guardMobile.includes(searchQuery))
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500">No guards match your search query.</td>
                      </tr>
                    ) : (
                      salaries
                        .filter(row => 
                          row.guardName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (row.guardMobile && row.guardMobile.includes(searchQuery))
                        )
                        .map((row) => (
                          <tr key={row.guardId} className="hover:bg-slate-700/30 transition-colors">
                            <td className="p-4 font-semibold text-white">
                              <div>{row.guardName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.guardMobile || 'No mobile'}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-slate-700/60 bg-slate-900">
                            {row.salaryType}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {row.presentDays}d / {row.absentDays}a
                        </td>
                        <td className="p-4 font-mono">₹{parseFloat(row.basicEarnings || 0).toFixed(2)}</td>
                        <td className="p-4 font-mono text-slate-400">{row.overtimeHours || 0} hrs</td>
                        <td className="p-4 font-mono text-sky-400">₹{parseFloat(row.otEarnings || 0).toFixed(2)}</td>
                        <td className="p-4 font-mono font-bold text-white text-right">
                          ₹{parseFloat(row.netSalary || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => openGuardSlip(row.guardId)}
                            className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 rounded-3xl p-12 border border-slate-800 text-center text-slate-500 flex flex-col items-center justify-center space-y-3 max-w-xl">
              <CalendarIcon className="w-10 h-10 text-slate-700" />
              <div>
                <h4 className="text-sm font-semibold text-white">No Payroll Data calculated</h4>
                <p className="text-xs text-slate-400 mt-1">Select a Month & Year and click "Calculate Wages Preview" to fetch active attendance logs and compute payouts.</p>
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
                  <table className="w-full text-left text-[11px] text-slate-300 font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-2 border-b border-slate-700 font-sans">Guard Name</th>
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
                            <td className="p-2 font-medium text-white font-sans">{det.guard_name}</td>
                            <td className="p-2 text-slate-400">{det.present_days}p/{det.absent_days}a</td>
                            <td className="p-2">₹{parseFloat(det.basic_earnings).toFixed(2)}</td>
                            <td className="p-2">₹{parseFloat(det.ot_earnings).toFixed(2)} ({det.overtime_hours}h)</td>
                            <td className="p-2 text-rose-400">-₹{parseFloat(det.advance_deduction).toFixed(2)}</td>
                            <td className="p-2 font-bold text-white text-right">
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

      {/* DETAILED SLIP MODAL (POPUP CALENDAR VIEW) */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/60 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto selection:bg-sky-500 selection:text-white">
            <button
              onClick={() => setShowSlipModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {slipLoading ? (
              <div className="py-20 text-center text-slate-400">Fetching detailed guard records...</div>
            ) : !slipData ? (
              <div className="py-20 text-center text-slate-400">No data found.</div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/30 rounded-2xl flex items-center justify-center text-sky-400 shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {slipData.guard.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-4 font-mono">
                        <span>📱 {slipData.guard.mobile || 'N/A'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {slipData.guard.post_name || 'No Post'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {slipData.guard.shift_name || 'No Shift'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const monthLabel = monthsList.find(m => m.value === month)?.label || 'Payroll';
                      generateGuardPayslipPDF(slipData, monthLabel, year);
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all self-start sm:self-auto"
                  >
                    <Printer className="w-4 h-4" /> Download / Print PDF Payslip
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Calculations Details column */}
                  <div className="md:col-span-1 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payout Details</h4>
                    
                    <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Salary Type:</span>
                        <span className="font-bold text-white uppercase">{slipData.config?.salary_type || 'NOT SET'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Base Salary/Wage:</span>
                        <span className="font-bold text-white font-mono">₹{slipData.config?.basic_salary || '0.00'}</span>
                      </div>
                      {slipData.config?.is_ot_eligible && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">OT Hourly Rate:</span>
                          <span className="font-bold text-white font-mono">₹{slipData.config?.ot_rate_per_hour || '0.00'}/hr</span>
                        </div>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salary Computation</h4>
                    <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 space-y-3 text-xs">
                      <div className="flex justify-between border-b border-slate-700/40 pb-2">
                        <span className="text-slate-400">Basic Earnings:</span>
                        <span className="font-bold text-white font-mono">₹{slipData.summary?.basicEarnings.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/40 pb-2">
                        <span className="text-slate-400">OT Earnings ({slipData.summary?.overtimeHours} hrs):</span>
                        <span className="font-bold text-sky-400 font-mono">₹{slipData.summary?.otEarnings.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/40 pb-2">
                        <span className="text-slate-400">Advance Deductions:</span>
                        <span className="font-bold text-rose-400 font-mono">-₹{slipData.summary?.advanceDeduction.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-200 font-bold text-sm">Net Payable Salary:</span>
                        <span className="font-black text-emerald-400 font-mono text-base">₹{slipData.summary?.netSalary.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance calendar column */}
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                      <span>Monthly Attendance Grid</span>
                      <span className="font-sans text-[10px] text-slate-500 lowercase">({slipData.summary?.presentDays} present / {slipData.summary?.absentDays} absent)</span>
                    </h4>

                    {/* Renders a grid of days 1 to DaysInMonth */}
                    <div className="grid grid-cols-7 gap-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-700/40">
                      {/* Weekday Headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center font-bold text-[9px] text-slate-500 py-1 uppercase">{d}</div>
                      ))}

                      {/* Spacer Blocks for Day 1 Alignment */}
                      {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-14 opacity-0"></div>
                      ))}

                      {Array.from({ length: slipData.daysInMonth }).map((_, index) => {
                        const dayNum = index + 1;
                        const dayData = slipData.attendance[index] || { status: 'ABSENT', otHours: 0 };
                        const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(year, month - 1, dayNum).getDay()];
                        
                        const status = dayData.status;
                        const otHours = parseFloat(dayData.otHours || 0);

                        // Color scheme per status
                        const statusStyles = {
                          'PRESENT': otHours > 0
                            ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
                          'CHECKED_IN': 'bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20',
                          'CHECKED_OUT': 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20',
                          'PENDING': 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20',
                          'REJECTED': 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20',
                          'ABSENT': 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20',
                        };

                        const badgeLabel = {
                          'PRESENT': otHours > 0 ? `+${otHours}h` : 'P',
                          'CHECKED_IN': 'CI',
                          'CHECKED_OUT': 'CO',
                          'PENDING': 'PR',
                          'REJECTED': 'REJ',
                          'ABSENT': 'ABS',
                        };

                        const badgeColor = {
                          'PRESENT': otHours > 0 ? 'text-amber-400' : 'text-emerald-400',
                          'CHECKED_IN': 'text-sky-400',
                          'CHECKED_OUT': 'text-indigo-400',
                          'PENDING': 'text-amber-400',
                          'REJECTED': 'text-rose-400',
                          'ABSENT': 'text-rose-400',
                        };

                        return (
                          <div
                            key={dayNum}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-between h-14 min-w-[45px] relative group transition-all ${
                              statusStyles[status] || statusStyles['ABSENT']
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="text-[10px] font-bold text-slate-300">{dayNum}</span>
                              <span className="text-[8px] text-slate-500 uppercase tracking-tight">{dayOfWeek}</span>
                            </div>
                            
                            <span className={`text-[9px] font-black tracking-wide ${badgeColor[status] || 'text-slate-400'}`}>
                              {badgeLabel[status] || 'ABS'}
                            </span>

                            {/* HOVER TOOLTIP IN THE CALENDAR BOX */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 w-44 bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-[10px] text-slate-300 shadow-2xl space-y-1">
                              <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between">
                                <span>Day {dayNum} ({monthsList.find(m => m.value === month)?.label})</span>
                                <span className={badgeColor[status] || 'text-slate-400'}>{dayData.label || 'Absent'}</span>
                              </div>
                              {status !== 'ABSENT' ? (
                                <>
                                  <div>In: {dayData.checkInTime ? new Date(dayData.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</div>
                                  <div>Out: {dayData.checkOutTime ? new Date(dayData.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</div>
                                  {otHours > 0 && <div className="text-amber-400 font-bold">Approved OT: {otHours} hrs</div>}
                                  {status !== 'PRESENT' && <div className="text-[9px] text-amber-400/70 italic">⚠ Pending manager approval</div>}
                                </>
                              ) : (
                                <div className="text-[9px] text-slate-500">No attendance registered.</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 pt-2 justify-center border-t border-slate-800/40">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-md bg-emerald-500/20 border border-emerald-500/40"></div>
                        <span>P = Present</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-md bg-amber-500/20 border border-amber-500/40"></div>
                        <span>+h = Overtime</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-md bg-sky-500/20 border border-sky-500/40"></div>
                        <span>CI = Checkin Done</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-md bg-indigo-500/20 border border-indigo-500/40"></div>
                        <span>CO = Checkout Done</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-md bg-rose-500/20 border border-rose-500/40"></div>
                        <span>ABS = Absent</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
