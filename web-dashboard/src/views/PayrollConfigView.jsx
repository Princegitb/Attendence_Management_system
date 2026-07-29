import React, { useEffect, useState } from 'react';
import { DollarSign, Edit3, Save, X, Settings, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function PayrollConfigView() {
  const [configs, setConfigs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  
  // Individual Edit form state
  const [salaryType, setSalaryType] = useState('DAILY');
  const [basicSalary, setBasicSalary] = useState('');
  const [otRatePerHour, setOtRatePerHour] = useState('');
  const [isOtEligible, setIsOtEligible] = useState(false);

  // Global Default Config Form State
  const [globalSalaryType, setGlobalSalaryType] = useState('DAILY');
  const [globalBasicSalary, setGlobalBasicSalary] = useState('1000');
  const [globalOtRate, setGlobalOtRate] = useState('150');
  const [globalOtEligible, setGlobalOtEligible] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.getPayrollConfigs();
      if (res.success) {
        setConfigs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load payroll configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const startEdit = (row) => {
    setEditingId(row.guard_id);
    setSalaryType(row.salary_type || 'DAILY');
    setBasicSalary(row.basic_salary || '0');
    setOtRatePerHour(row.ot_rate_per_hour || '0');
    setIsOtEligible(row.is_ot_eligible || false);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveConfig = async (guardId) => {
    try {
      const res = await api.updatePayrollConfig({
        guard_id: guardId,
        salary_type: salaryType,
        basic_salary: parseFloat(basicSalary || 0),
        ot_rate_per_hour: parseFloat(otRatePerHour || 0),
        is_ot_eligible: isOtEligible
      });

      if (res.success) {
        setEditingId(null);
        loadConfigs();
      } else {
        alert(res.message || 'Failed to save configuration');
      }
    } catch (err) {
      alert(err.message || 'Error occurred during save');
    }
  };

  const applyGlobalConfig = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to apply this default salary setup to ALL active guards? This will overwrite their current settings.`)) {
      return;
    }

    setGlobalLoading(true);
    try {
      const res = await api.bulkUpdatePayrollConfig({
        salary_type: globalSalaryType,
        basic_salary: parseFloat(globalBasicSalary || 0),
        ot_rate_per_hour: parseFloat(globalOtRate || 0),
        is_ot_eligible: globalOtEligible
      });

      if (res.success) {
        alert(res.message || 'Global configurations applied successfully!');
        loadConfigs();
      } else {
        alert(res.message || 'Failed to apply global configuration');
      }
    } catch (err) {
      alert(err.message || 'Error applying default settings');
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Salary configurations <DollarSign className="w-5 h-5 text-sky-400" />
        </h2>
        <p className="text-xs text-slate-400">Configure salary types, basic wages, and overtime eligibility for all guards.</p>
      </div>

      {/* Quick Salary Configuration Card (Common for All) */}
      <form onSubmit={applyGlobalConfig} className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/60 space-y-4 max-w-4xl shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-sky-400" /> Quick Configure Default Salary (Common for All)
        </h3>
        <p className="text-xs text-slate-400">Apply a default salary configuration to all guards instantly instead of setting them up individually.</p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Salary Type</label>
            <select
              value={globalSalaryType}
              onChange={(e) => setGlobalSalaryType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="DAILY">DAILY WAGE</option>
              <option value="MONTHLY">MONTHLY BASE</option>
              <option value="HOURLY">HOURLY WAGE</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Basic Salary / Daily Wage (₹)</label>
            <input
              type="number"
              value={globalBasicSalary}
              onChange={(e) => setGlobalBasicSalary(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 sm:pt-6">
            <input
              type="checkbox"
              id="globalOtEligible"
              checked={globalOtEligible}
              onChange={(e) => setGlobalOtEligible(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700"
            />
            <label htmlFor="globalOtEligible" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
              OT Eligible
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">OT Rate / Hour (₹)</label>
            <input
              type="number"
              value={globalOtRate}
              disabled={!globalOtEligible}
              onChange={(e) => setGlobalOtRate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-40"
            />
          </div>
        </div>

        <div className="border-t border-slate-700/40 pt-4 flex justify-end">
          <button
            type="submit"
            disabled={globalLoading}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {globalLoading ? 'Applying Defaults...' : 'Apply Default Settings to All Active Guards'}
          </button>
        </div>
      </form>

      {/* Roster Config List */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700/40 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Guard Configuration Detail Roster</h3>
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
                <th className="p-3.5 border-b border-slate-700">Guard Name</th>
                <th className="p-3.5 border-b border-slate-700">Mobile</th>
                <th className="p-3.5 border-b border-slate-700">Salary Type</th>
                <th className="p-3.5 border-b border-slate-700">Basic Wage / Rate</th>
                <th className="p-3.5 border-b border-slate-700">OT Eligible</th>
                <th className="p-3.5 border-b border-slate-700">OT Rate / Hour</th>
                <th className="p-3.5 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">Loading configurations...</td>
                </tr>
              ) : configs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">No guards registered in the database.</td>
                </tr>
              ) : configs.filter(row => 
                  row.guard_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  (row.guard_mobile && row.guard_mobile.includes(searchQuery))
                ).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">No guards match your search query.</td>
                </tr>
              ) : (
                configs
                  .filter(row => 
                    row.guard_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (row.guard_mobile && row.guard_mobile.includes(searchQuery))
                  )
                  .map((row) => {
                    const isEditing = editingId === row.guard_id;
                  return (
                    <tr key={row.guard_id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3.5 font-semibold text-white">{row.guard_name}</td>
                      <td className="p-3.5 text-slate-400">{row.guard_mobile || 'N/A'}</td>
                      
                      <td className="p-3.5">
                        {isEditing ? (
                          <select
                            value={salaryType}
                            onChange={(e) => setSalaryType(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-white rounded-lg p-1 text-xs focus:outline-none"
                          >
                            <option value="DAILY">DAILY</option>
                            <option value="MONTHLY">MONTHLY</option>
                            <option value="HOURLY">HOURLY</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            row.salary_type === 'MONTHLY'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              : row.salary_type === 'DAILY'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : row.salary_type === 'HOURLY'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-700/10 text-slate-400 border-slate-700/20'
                          }`}>
                            {row.salary_type || 'NOT CONFIGURED'}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-slate-200">
                        {isEditing ? (
                          <input
                            type="number"
                            value={basicSalary}
                            onChange={(e) => setBasicSalary(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white w-24 focus:outline-none"
                            placeholder="Amount (₹)"
                          />
                        ) : (
                          row.basic_salary ? `₹${row.basic_salary}` : '₹0.00'
                        )}
                      </td>

                      <td className="p-3.5">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={isOtEligible}
                            onChange={(e) => setIsOtEligible(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-700"
                          />
                        ) : (
                          <span className={row.is_ot_eligible ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                            {row.is_ot_eligible ? 'YES' : 'NO'}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-slate-200">
                        {isEditing ? (
                          <input
                            type="number"
                            value={otRatePerHour}
                            disabled={!isOtEligible}
                            onChange={(e) => setOtRatePerHour(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white w-24 focus:outline-none disabled:opacity-40"
                            placeholder="Rate (₹)"
                          />
                        ) : (
                          row.is_ot_eligible && row.ot_rate_per_hour ? `₹${row.ot_rate_per_hour}/hr` : '-'
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => saveConfig(row.guard_id)}
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Save Config"
                            >
                              <Save className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(row)}
                            className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Modify
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
