import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Filter, Calendar, Eye, Edit3, Camera, MapPin, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import AttendanceDetailModal from '../components/AttendanceDetailModal';
import ManualCorrectionModal from '../components/ManualCorrectionModal';

export default function AttendanceView() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [officerId, setOfficerId] = useState('');
  const [postId, setPostId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [attendance, setAttendance] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [correctingRecord, setCorrectingRecord] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, offRes, postRes] = await Promise.all([
        api.getAttendance(date, officerId, postId, statusFilter),
        api.getOfficers(),
        api.getPosts()
      ]);

      if (attRes.success) setAttendance(attRes.data || []);
      if (offRes.success) setOfficers(offRes.data || []);
      if (postRes.success) setPosts(postRes.data || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, officerId, postId, statusFilter]);

  const handleCorrectionSubmit = async (id, status, reason) => {
    const res = await api.correctAttendance(id, status, reason);
    if (res.success) {
      loadData();
    } else {
      throw new Error(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Attendance Monitor & Verification <ClipboardCheck className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">View live officer photos, GPS coords vs post coordinates, and audit history.</p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Feed
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date Filter</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Field Officer</label>
          <select
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">All Officers</option>
            {officers.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Post Location</label>
          <select
            value={postId}
            onChange={(e) => setPostId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">All Posts</option>
            {posts.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Attendance Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="CHECKED_OUT">CHECKED_OUT</option>
            <option value="LATE">LATE</option>
            <option value="ABSENT">ABSENT</option>
          </select>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-slate-700">Guard Name</th>
                <th className="p-3.5 border-b border-slate-700">Assigned Post</th>
                <th className="p-3.5 border-b border-slate-700">Check-In</th>
                <th className="p-3.5 border-b border-slate-700">Check-Out</th>
                <th className="p-3.5 border-b border-slate-700">Distance</th>
                <th className="p-3.5 border-b border-slate-700">Marked By (Officer)</th>
                <th className="p-3.5 border-b border-slate-700">Status</th>
                <th className="p-3.5 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">Loading attendance data...</td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">No attendance records found for current filter.</td>
                </tr>
              ) : (
                attendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 font-semibold text-white">
                      <div>{rec.guard_name}</div>
                      <div className="text-[10px] text-slate-500">{rec.guard_mobile || 'No mobile'}</div>
                    </td>
                    <td className="p-3.5 text-slate-300">{rec.post_name}</td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString() : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString() : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                      {rec.check_in_distance_from_post || 0}m
                    </td>
                    <td className="p-3.5 text-sky-400 font-medium">{rec.marked_by_officer}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        rec.status === 'CHECKED_OUT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : rec.status === 'CHECKED_IN'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        title="View Photos & Details"
                        className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                      <button
                        onClick={() => setCorrectingRecord(rec)}
                        title="Manual Correction"
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Correct
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <AttendanceDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onCorrect={(rec) => {
            setSelectedRecord(null);
            setCorrectingRecord(rec);
          }}
        />
      )}

      {/* Manual Correction Modal */}
      {correctingRecord && (
        <ManualCorrectionModal
          record={correctingRecord}
          onClose={() => setCorrectingRecord(null)}
          onSubmit={handleCorrectionSubmit}
        />
      )}
    </div>
  );
}
