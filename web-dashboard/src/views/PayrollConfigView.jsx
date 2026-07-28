import React, { useEffect, useState } from 'react';
import { DollarSign, Edit3, Save, X, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function PayrollConfigView() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  
  // Edit form state
  const [salaryType, setSalaryType] = useState('DAILY');
  const [basicSalary, setBasicSalary] = useState('');
  const [otRatePerHour, setOtRatePerHour] = useState('');
  const [isOtEligible, setIsOtEligible] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Salary Configurations <DollarSign className="w-5 h-5 text-sky-400" />
        </h2>
        <p className="text-xs text-slate-400">Configure salary types, basic wages, and overtime eligibility for all guards.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
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
              ) : (
                configs.map((row) => {
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
                            <Edit3 className="w-3.5 h-3.5" /> Configure
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
