import React, { useEffect, useState } from 'react';
import { History, ShieldAlert, UserCheck } from 'lucide-react';
import { api } from '../services/api';

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await api.getAuditLogs();
        if (res.success) setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Audit Trail & System Logs <History className="w-5 h-5 text-sky-400" />
        </h2>
        <p className="text-xs text-slate-400">Complete immutable record of all manager manual corrections, officer logins, and system changes.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-slate-700">Timestamp</th>
                <th className="p-3.5 border-b border-slate-700">Action</th>
                <th className="p-3.5 border-b border-slate-700">Performed By</th>
                <th className="p-3.5 border-b border-slate-700">Target Type</th>
                <th className="p-3.5 border-b border-slate-700">Audit Reason / Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">Loading audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No audit logs recorded yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-semibold text-white">
                      <span className="bg-slate-900 px-2 py-1 rounded-md border border-slate-700 font-mono text-[11px] text-sky-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-200 font-medium">
                      <div>{log.performed_by}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{log.performed_by_role}</div>
                    </td>
                    <td className="p-3.5 text-slate-400">{log.target_type || 'N/A'}</td>
                    <td className="p-3.5 text-amber-300 max-w-xs truncate">{log.reason || 'N/A'}</td>
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
