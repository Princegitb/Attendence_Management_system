import React, { useState } from 'react';
import { X, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

export default function ManualCorrectionModal({ record, onClose, onSubmit }) {
  const [status, setStatus] = useState(record?.status || 'CHECKED_IN');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!record) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError('Please provide a mandatory correction reason (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit(record.id, status, reason.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply manual correction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Manual Attendance Correction</h3>
              <p className="text-xs text-slate-400">Guard: {record.guard_name} ({record.date})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Attendance Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="CHECKED_IN">CHECKED_IN (Present)</option>
              <option value="CHECKED_OUT">CHECKED_OUT (Completed)</option>
              <option value="LATE">LATE (Marked after shift start)</option>
              <option value="ABSENT">ABSENT (Guard not found at post)</option>
              <option value="MISSED_CHECKOUT">MISSED_CHECKOUT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Correction Reason (MANDATORY for Audit Log)</span>
              <span className="text-[10px] text-rose-400 font-normal">*Required</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide clear reason (e.g. Officer smartphone camera glitch resolved manually, verified by supervisor...)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            ></textarea>
          </div>

          <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
            <FileText className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>This action will be permanently recorded in the Audit Log along with your Manager credentials and exact reason.</span>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Confirm Correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
