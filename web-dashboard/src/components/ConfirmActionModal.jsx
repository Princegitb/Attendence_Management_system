import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, X } from 'lucide-react';

export default function ConfirmActionModal({ isOpen, actionType, guardName, onConfirm, onCancel, loading }) {
  if (!isOpen) return null;

  const isApprove = actionType === 'APPROVED';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isApprove 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {isApprove ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Confirm {isApprove ? 'Approval' : 'Rejection'}
              </h3>
              <p className="text-xs text-slate-400">Confirmation surety required</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-white">
            Are you sure you want to {isApprove ? 'APPROVE' : 'REJECT'} attendance for:
          </p>
          <div className="text-sm font-bold text-sky-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            {guardName || 'this guard'}
          </div>
          <p className="text-[11px] text-slate-400">
            This action will update the official attendance records and log an immutable audit event.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
              isApprove
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
            }`}
          >
            {loading ? 'Processing...' : isApprove ? 'Yes, Approve' : 'Yes, Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
