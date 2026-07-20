import React, { useEffect, useState } from 'react';
import { UserSquare2, Plus, Key, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function OfficersView() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [resultMsg, setResultMsg] = useState('');
  const [error, setError] = useState('');

  const loadOfficers = async () => {
    setLoading(true);
    try {
      const res = await api.getOfficers();
      if (res.success) setOfficers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!name || !mobile) {
      setError('Officer name and mobile number are required.');
      return;
    }

    try {
      const res = await api.createOfficer({ name, mobile });
      if (res.success) {
        setResultMsg(`Field Officer created! Initial Password: "${res.data.initialPassword}"`);
        setName('');
        setMobile('');
        setShowCreateModal(false);
        loadOfficers();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (id, officerName) => {
    if (!window.confirm(`Reset password for officer ${officerName} to default?`)) return;

    try {
      const res = await api.resetOfficerPassword(id);
      if (res.success) {
        alert(`Password for ${officerName} reset to: "${res.defaultPassword}"`);
        loadOfficers();
      }
    } catch (err) {
      alert('Failed to reset password: ' + err.message);
    }
  };

  const handleDeleteOfficer = async (id, officerName) => {
    if (!window.confirm(`Are you sure you want to delete Field Officer "${officerName}"?`)) return;

    try {
      const res = await api.deleteOfficer(id);
      if (res.success) {
        loadOfficers();
      } else {
        alert(res.message || 'Delete failed.');
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Field Officers Management <UserSquare2 className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Field Officers use the smartphone app to mark guard attendance.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Field Officer
        </button>
      </div>

      {resultMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resultMsg}</span>
        </div>
      )}

      {/* Officers Table */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-slate-700">Officer Name</th>
                <th className="p-3.5 border-b border-slate-700">Mobile (Username)</th>
                <th className="p-3.5 border-b border-slate-700">Must Change Password</th>
                <th className="p-3.5 border-b border-slate-700">Status</th>
                <th className="p-3.5 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">Loading field officers...</td>
                </tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No field officers registered yet.</td>
                </tr>
              ) : (
                officers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 font-semibold text-white">{o.name}</td>
                    <td className="p-3.5 text-sky-400 font-mono font-medium">{o.mobile}</td>
                    <td className="p-3.5 font-mono">
                      {o.must_change_password ? (
                        <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          YES (First Login Pending)
                        </span>
                      ) : (
                        <span className="text-slate-400">NO (Password Set)</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleResetPassword(o.id, o.name)}
                        title="Reset Password to Default"
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Key className="w-3.5 h-3.5" /> Reset Password
                      </button>
                      <button
                        onClick={() => handleDeleteOfficer(o.id, o.name)}
                        title="Delete Officer"
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors inline-flex items-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Officer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Register Field Officer</h3>
            <p className="text-xs text-slate-400">Initial Password rule: firstname (lowercase) + last 4 digits of mobile number.</p>

            {error && <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateOfficer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Prince Kumar"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (Username)</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9876542231"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold"
                >
                  Create Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
