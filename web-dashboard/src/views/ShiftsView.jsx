import React, { useEffect, useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function ShiftsView() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    start_time: '08:00',
    end_time: '16:00',
    grace_period_minutes: 15
  });
  const [error, setError] = useState('');

  const loadShifts = async () => {
    setLoading(true);
    try {
      const res = await api.getShifts();
      if (res.success) setShifts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleDeleteShift = async (id, shiftName) => {
    if (!window.confirm(`Are you sure you want to delete shift "${shiftName}"?`)) return;
    try {
      const res = await api.deleteShift(id);
      if (res.success) {
        loadShifts();
      } else {
        alert(res.message || 'Delete failed.');
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.start_time || !formData.end_time) {
      setError('Shift name, start time, and end time are required.');
      return;
    }

    const payload = {
      ...formData,
      grace_period_minutes: parseInt(formData.grace_period_minutes) || 15
    };

    try {
      const res = await api.createShift(payload);
      if (res.success) {
        setShowModal(false);
        setFormData({ name: '', start_time: '08:00', end_time: '16:00', grace_period_minutes: 15 });
        loadShifts();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Shift Configurations <Clock className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Configure work shifts and late grace periods for attendance calculation.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Shift
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-6 text-center text-slate-400">Loading shifts...</div>
        ) : shifts.length === 0 ? (
          <div className="col-span-full p-6 text-center text-slate-500">No shifts created yet.</div>
        ) : (
          shifts.map((s) => (
            <div key={s.id} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{s.name}</h3>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Grace: {s.grace_period_minutes}m
                  </span>
                  <button
                    onClick={() => handleDeleteShift(s.id, s.name)}
                    title="Delete Shift"
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Time:</span>
                  <span className="font-mono text-white font-semibold">{s.start_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">End Time:</span>
                  <span className="font-mono text-white font-semibold">{s.end_time}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create Work Shift</h3>

            {error && <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleCreateShift} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Shift Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Day Shift / Night Duty"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={formData.grace_period_minutes}
                  onChange={(e) => setFormData({ ...formData, grace_period_minutes: e.target.value === '' ? '' : parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
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
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
