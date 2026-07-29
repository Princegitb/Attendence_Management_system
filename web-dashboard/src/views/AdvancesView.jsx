import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Trash2, Edit3, Save, X, Calendar, User, IndianRupee } from 'lucide-react';
import { api } from '../services/api';
import { getLocalDateString } from '../utils/date';

export default function AdvancesView() {
  const [advances, setAdvances] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);

  // New advance form state
  const [selectedGuardId, setSelectedGuardId] = useState('');
  const [amount, setAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(getLocalDateString());
  const [reason, setReason] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Editing advance row state
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editReason, setEditReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [advRes, guardRes] = await Promise.all([
        api.getAdvances(),
        api.getPayrollConfigs() // We can use configs list to fetch all guard names
      ]);
      if (advRes.success) setAdvances(advRes.data || []);
      if (guardRes.success) setGuards(guardRes.data || []);
    } catch (err) {
      console.error('Failed to load advances data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGuardId || !amount) {
      alert('Guard and Amount are required.');
      return;
    }

    try {
      const res = await api.createAdvance({
        guard_id: selectedGuardId,
        amount: parseFloat(amount),
        advance_date: advanceDate,
        reason: reason
      });

      if (res.success) {
        setShowAddForm(false);
        setSelectedGuardId('');
        setAmount('');
        setReason('');
        loadData();
      } else {
        alert(res.message || 'Failed to record advance');
      }
    } catch (err) {
      alert(err.message || 'Error occurred during creation');
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditAmount(row.amount);
    setEditDate(row.advance_date ? getLocalDateString(new Date(row.advance_date)) : '');
    setEditReason(row.reason || '');
  };

  const saveEdit = async (id) => {
    try {
      const res = await api.updateAdvance(id, {
        amount: parseFloat(editAmount),
        advance_date: editDate,
        reason: editReason
      });

      if (res.success) {
        setEditingId(null);
        loadData();
      } else {
        alert(res.message || 'Failed to update advance');
      }
    } catch (err) {
      alert(err.message || 'Error occurred during update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advance record? This will revert the deduction from payroll calculations.')) {
      return;
    }

    try {
      const res = await api.deleteAdvance(id);
      if (res.success) {
        loadData();
      } else {
        alert(res.message || 'Failed to delete advance');
      }
    } catch (err) {
      alert(err.message || 'Error occurred during deletion');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Advance Salary Ledger <Landmark className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Record advance salary payments. These payments are automatically deducted from the final month's payout.</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5 self-start md:self-auto"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancel Form' : 'Disburse Advance Salary'}
        </button>
      </div>

      {/* Disbursal Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-slate-800/60 p-5 rounded-3xl border border-slate-700/60 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl shadow-xl">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Select Guard</label>
            <select
              value={selectedGuardId}
              onChange={(e) => setSelectedGuardId(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Choose Guard...</option>
              {guards.map(g => (
                <option key={g.guard_id} value={g.guard_id}>{g.guard_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="e.g. 2000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Disbursal Date</label>
            <input
              type="date"
              value={advanceDate}
              onChange={(e) => setAdvanceDate(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-4 flex items-end justify-between gap-4 border-t border-slate-700/40 pt-4">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reason / Description</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Medical Emergency, Home Rent..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
            >
              Record Disbursal
            </button>
          </div>
        </form>
      )}

      {/* Ledger Table */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-slate-700">Date</th>
                <th className="p-3.5 border-b border-slate-700">Guard Name</th>
                <th className="p-3.5 border-b border-slate-700 text-rose-400">Advance Amount</th>
                <th className="p-3.5 border-b border-slate-700">Deduction Status</th>
                <th className="p-3.5 border-b border-slate-700">Reason</th>
                <th className="p-3.5 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">Loading ledger data...</td>
                </tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">No advance salary loans given this month.</td>
                </tr>
              ) : (
                advances.map((row) => {
                  const isEditing = editingId === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3.5 font-mono text-slate-400">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white"
                          />
                        ) : (
                          new Date(row.advance_date).toLocaleDateString()
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-white">{row.guard_name}</td>
                      <td className="p-3.5 font-mono text-rose-400 font-bold text-sm">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white w-24 focus:outline-none"
                          />
                        ) : (
                          `₹${row.amount}`
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Pending Payroll Deduction
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs truncate text-slate-300">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white w-full focus:outline-none"
                          />
                        ) : (
                          row.reason || '-'
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(row.id)}
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg inline-flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg inline-flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(row)}
                              className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg inline-flex items-center gap-1 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg inline-flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
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
