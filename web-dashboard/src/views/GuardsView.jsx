import React, { useEffect, useState } from 'react';
import { Users, FileSpreadsheet, Plus, Trash2, Search, Pencil } from 'lucide-react';
import { api } from '../services/api';
import GuardImportModal from '../components/GuardImportModal';

export default function GuardsView() {
  const [guards, setGuards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGuard, setEditingGuard] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    assigned_post_id: '',
    assigned_shift_id: '',
    status: 'ACTIVE'
  });
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [gRes, pRes, sRes] = await Promise.all([
        api.getGuards(),
        api.getPosts(),
        api.getShifts()
      ]);
      if (gRes.success) setGuards(gRes.data || []);
      if (pRes.success) setPosts(pRes.data || []);
      if (sRes.success) setShifts(sRes.data || []);
      setSelectedIds([]); // clear selection when reloading
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveGuard = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.assigned_post_id || !formData.assigned_shift_id) {
      setError('Guard name, assigned post, and shift are required.');
      return;
    }

    try {
      let res;
      if (editingGuard) {
        res = await api.updateGuard(editingGuard.id, formData);
      } else {
        res = await api.createGuard(formData);
      }

      if (res.success) {
        setShowCreateModal(false);
        setEditingGuard(null);
        setFormData({ name: '', mobile: '', assigned_post_id: '', assigned_shift_id: '', status: 'ACTIVE' });
        loadData();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenEdit = (guard) => {
    setEditingGuard(guard);
    setFormData({
      name: guard.name || '',
      mobile: guard.mobile || '',
      assigned_post_id: guard.post_id || '',
      assigned_shift_id: guard.shift_id || '',
      status: guard.status || 'ACTIVE'
    });
    setError('');
    setShowCreateModal(true);
  };

  const handleDeleteGuard = async (id, guardName) => {
    if (!window.confirm(`Are you sure you want to delete guard "${guardName}"?`)) return;

    try {
      const res = await api.deleteGuard(id);
      if (res.success) {
        loadData();
      } else {
        alert(res.message || 'Delete failed.');
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const filteredGuards = guards.filter((g) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (g.name || '').toLowerCase().includes(term) ||
      (g.mobile || '').toLowerCase().includes(term) ||
      (g.post_name || '').toLowerCase().includes(term) ||
      (g.shift_name || '').toLowerCase().includes(term) ||
      `g-${g.id}`.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Guard Roster Management <Users className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Guards have NO app credentials. They are assigned to posts & shifts.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bulk Excel Import
          </button>
          <button
            onClick={() => {
              setEditingGuard(null);
              setFormData({ name: '', mobile: '', assigned_post_id: '', assigned_shift_id: '', status: 'ACTIVE' });
              setError('');
              setShowCreateModal(true);
            }}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Guard
          </button>
        </div>
      </div>

      {/* Bulk Actions or Search Bar */}
      {selectedIds.length > 0 ? (
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg text-xs font-semibold">
              {selectedIds.length} Selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear selection
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              onChange={async (e) => {
                const val = e.target.value;
                if (!val) return;
                if (window.confirm(`Change post for all ${selectedIds.length} selected guards?`)) {
                  try {
                    const res = await api.updateGuardsBulk(selectedIds, { assigned_post_id: val });
                    if (res.success) {
                      loadData();
                    } else {
                      alert(res.message);
                    }
                  } catch (err) {
                    alert(err.message);
                  }
                }
                e.target.value = '';
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Bulk Assign Post...</option>
              {posts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              onChange={async (e) => {
                const val = e.target.value;
                if (!val) return;
                if (window.confirm(`Change shift for all ${selectedIds.length} selected guards?`)) {
                  try {
                    const res = await api.updateGuardsBulk(selectedIds, { assigned_shift_id: val });
                    if (res.success) {
                      loadData();
                    } else {
                      alert(res.message);
                    }
                  } catch (err) {
                    alert(err.message);
                  }
                }
                e.target.value = '';
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Bulk Assign Shift...</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button
              onClick={async () => {
                if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected guards?`)) return;
                try {
                  const res = await api.deleteGuardsBulk(selectedIds);
                  if (res.success) {
                    loadData();
                  } else {
                    alert(res.message);
                  }
                } catch (err) {
                  alert(err.message);
                }
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      ) : (
        /* Search Bar Bar */
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search roster by guard name, mobile, post location, or shift..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Showing <span className="text-sky-400 font-bold">{filteredGuards.length}</span> of {guards.length} guards
          </div>
        </div>
      )}

      {/* Roster Table */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-slate-700 w-10">
                  <input
                    type="checkbox"
                    checked={filteredGuards.length > 0 && selectedIds.length === filteredGuards.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredGuards.map(g => g.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 border-b border-slate-700">Guard ID</th>
                <th className="p-3.5 border-b border-slate-700">Guard Name</th>
                <th className="p-3.5 border-b border-slate-700">Mobile Number</th>
                <th className="p-3.5 border-b border-slate-700">Assigned Post</th>
                <th className="p-3.5 border-b border-slate-700">Assigned Shift</th>
                <th className="p-3.5 border-b border-slate-700">Joining Date</th>
                <th className="p-3.5 border-b border-slate-700">Status</th>
                <th className="p-3.5 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400">Loading guard roster...</td>
                </tr>
              ) : filteredGuards.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    {searchTerm ? `No guards match "${searchTerm}".` : 'No guards registered. Use Bulk Excel Import to enroll guards.'}
                  </td>
                </tr>
              ) : (
                filteredGuards.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(g.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, g.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== g.id));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">#G-{g.id}</td>
                    <td className="p-3.5 font-semibold text-white">{g.name}</td>
                    <td className="p-3.5 text-slate-400 font-mono">{g.mobile || 'N/A'}</td>
                    <td className="p-3.5 text-sky-400 font-medium">{g.post_name || 'Unassigned'}</td>
                    <td className="p-3.5 text-indigo-400 font-medium">{g.shift_name || 'Unassigned'}</td>
                    <td className="p-3.5 text-slate-400">{g.date_of_joining ? String(g.date_of_joining).slice(0, 10) : 'N/A'}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        g.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        title="Edit Shift/Post & Details"
                        className="p-1.5 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors inline-flex items-center"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGuard(g.id, g.name)}
                        title="Delete Guard"
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Excel Import Modal */}
      {showImportModal && (
        <GuardImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Manual Guard Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingGuard ? `Edit Guard: ${editingGuard.name}` : 'Add Single Security Guard'}
            </h3>

            {error && <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleSaveGuard} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Guard Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (Optional)</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 9812345678"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Post Location</label>
                <select
                  value={formData.assigned_post_id}
                  onChange={(e) => setFormData({ ...formData, assigned_post_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select Post</option>
                  {posts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Shift</label>
                <select
                  value={formData.assigned_shift_id}
                  onChange={(e) => setFormData({ ...formData, assigned_shift_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select Shift</option>
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>
                  ))}
                </select>
              </div>

              {editingGuard && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGuard(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold"
                >
                  Save Guard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
