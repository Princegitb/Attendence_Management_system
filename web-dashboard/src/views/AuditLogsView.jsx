import React, { useEffect, useState } from 'react';
import { History, RefreshCw, UserCheck, Shield, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Immutable Audit History <History className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Track operations, password resets, manual attendance corrections, and roster updates.</p>
        </div>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Logs
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-slate-700">Timestamp</th>
                <th className="p-3.5 border-b border-slate-700">Actor</th>
                <th className="p-3.5 border-b border-slate-700">Role</th>
                <th className="p-3.5 border-b border-slate-700">Action</th>
                <th className="p-3.5 border-b border-slate-700">Target Type</th>
                <th className="p-3.5 border-b border-slate-700">Target ID</th>
                <th className="p-3.5 border-b border-slate-700">Change Description / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">Loading audit history...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">No system events logged yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-semibold text-white">{log.performed_by}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.performed_by_role === 'MANAGER'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {log.performed_by_role}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-emerald-400">{log.action}</td>
                    <td className="p-3.5 text-slate-300">{log.target_type || '-'}</td>
                    <td className="p-3.5 font-mono text-slate-400">{log.target_id || '-'}</td>
                    <td className="p-3.5 max-w-xs truncate" title={log.reason}>
                      {log.reason || 'No description provided'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
