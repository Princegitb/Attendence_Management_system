import React, { useEffect, useState } from 'react';
import { UserCheck, Plus, Trash2, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function AssignmentsView() {
  const [assignments, setAssignments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [guards, setGuards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    officer_id: '',
    guard_id: '',
    post_id: '',
    from_date: '',
    to_date: ''
  });
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, oRes, gRes, pRes] = await Promise.all([
        api.getAssignments(),
        api.getOfficers(),
        api.getGuards(),
        api.getPosts()
      ]);
      if (aRes.success) setAssignments(aRes.data || []);
      if (oRes.success) setOfficers(oRes.data || []);
      if (gRes.success) setGuards(gRes.data || []);
      if (pRes.success) setPosts(pRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!formData.officer_id || (!formData.guard_id && !formData.post_id)) {
      setError('Select an officer and either a specific guard or an entire post.');
      return;
    }

    try {
      const res = await api.createAssignment(formData);
      if (res.success) {
        setShowModal(false);
        setFormData({ officer_id: '', guard_id: '', post_id: '', from_date: '', to_date: '' });
        loadData();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Delete this officer assignment?')) return;
    try {
      const res = await api.deleteAssignment(id);
      if (res.success) loadData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Officer-to-Guard Assignment Matrix <UserCheck className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Defines which Field Officer is responsible for covering which guards/posts.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Assignment
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-slate-700">Field Officer</th>
                <th className="p-3.5 border-b border-slate-700">Assigned Guard / Post</th>
                <th className="p-3.5 border-b border-slate-700">Assignment Type</th>
                <th className="p-3.5 border-b border-slate-700">Date Range</th>
                <th className="p-3.5 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">Loading assignments...</td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No officer assignments created yet.</td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 font-semibold text-white">
                      <div>{a.officer_name}</div>
                      <div className="text-[10px] text-slate-500">{a.officer_mobile}</div>
                    </td>
                    <td className="p-3.5 text-sky-400 font-medium">
                      {a.guard_name ? `Guard: ${a.guard_name}` : `Entire Post: ${a.post_name}`}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {a.from_date ? 'Temporary Assignment' : 'Permanent Assignment'}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      {a.from_date ? `${a.from_date} to ${a.to_date || 'Ongoing'}` : 'Permanent'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create Officer Assignment</h3>

            {error && <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Field Officer</label>
                <select
                  value={formData.officer_id}
                  onChange={(e) => setFormData({ ...formData, officer_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select Officer</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({o.mobile})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assign to Specific Guard</label>
                <select
                  value={formData.guard_id}
                  onChange={(e) => setFormData({ ...formData, guard_id: e.target.value, post_id: '' })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">(Optional) Select Guard</option>
                  {guards.map(g => (
                    <option key={g.id} value={g.id}>{g.name} - Post: {g.post_name || 'N/A'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">OR Assign Entire Post Location</label>
                <select
                  value={formData.post_id}
                  onChange={(e) => setFormData({ ...formData, post_id: e.target.value, guard_id: '' })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">(Optional) Select Post Location</option>
                  {posts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">From Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.from_date}
                    onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">To Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.to_date}
                    onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
