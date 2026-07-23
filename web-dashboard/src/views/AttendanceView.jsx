import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Filter, Calendar, Eye, Edit3, Camera, MapPin, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import AttendanceDetailModal from '../components/AttendanceDetailModal';
import ManualCorrectionModal from '../components/ManualCorrectionModal';
import ConfirmActionModal from '../components/ConfirmActionModal';

const formatTime12h = (timeVal) => {
  if (!timeVal) return '-';
  if (typeof timeVal === 'string' && timeVal.includes('T')) {
    return new Date(timeVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (typeof timeVal === 'string' && timeVal.includes(':')) {
    const parts = timeVal.split(':');
    const hours = parseInt(parts[0], 10);
    const mins = parts[1] || '00';
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${mins} ${suffix}`;
  }
  return String(timeVal);
};

export default function AttendanceView() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [officerId, setOfficerId] = useState('');
  const [postId, setPostId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');

  const [attendance, setAttendance] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [shifts, setShifts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [correctingRecord, setCorrectingRecord] = useState(null);

  const [confirmModalData, setConfirmModalData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, offRes, postRes, shiftRes] = await Promise.all([
        api.getAttendance(date, officerId, postId, statusFilter, shiftFilter),
        api.getOfficers(),
        api.getPosts(),
        api.getShifts()
      ]);

      if (attRes.success) setAttendance(attRes.data || []);
      if (offRes.success) setOfficers(offRes.data || []);
      if (postRes.success) setPosts(postRes.data || []);
      if (shiftRes.success) setShifts(shiftRes.data || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, officerId, postId, statusFilter, shiftFilter]);

  const handleCorrectionSubmit = async (id, status, reason) => {
    const res = await api.correctAttendance(id, status, reason);
    if (res.success) {
      loadData();
    } else {
      throw new Error(res.message);
    }
  };

  const promptStatusConfirmation = (id, newStatus, guardName, reason) => {
    setConfirmModalData({ id, newStatus, guardName, reason });
  };

  const handleConfirmAction = async () => {
    if (!confirmModalData) return;
    setConfirmLoading(true);
    try {
      const { id, newStatus, reason } = confirmModalData;
      const res = await api.correctAttendance(id, newStatus, reason);
      if (res.success) {
        setConfirmModalData(null);
        loadData();
      } else {
        alert(res.message || 'Action failed.');
      }
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const pendingReviewCount = attendance.filter(a => a.status === 'PENDING_REVIEW').length;

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

      {/* Pending Review Alert Banner */}
      {pendingReviewCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-amber-400 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-bold text-sm text-white">Action Required: {pendingReviewCount} Late Check-in(s) Pending Review</span>
              <p className="text-slate-300">Late check-ins (outside shift grace period) require Manager review and explicit approval/rejection.</p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('PENDING_REVIEW')}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shrink-0"
          >
            Filter Pending ({pendingReviewCount})
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Work Shift</label>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">All Shifts</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
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
            <option value="APPROVED">APPROVED (Auto / Manual)</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW (Late Check-Ins)</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="CHECKED_OUT">CHECKED_OUT</option>
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
                <th className="p-3.5 border-b border-slate-700 text-indigo-400">Expected Check-In</th>
                <th className="p-3.5 border-b border-slate-700 text-sky-400">Actual Check-In</th>
                <th className="p-3.5 border-b border-slate-700 text-indigo-400">Expected Check-Out</th>
                <th className="p-3.5 border-b border-slate-700 text-sky-400">Actual Check-Out</th>
                <th className="p-3.5 border-b border-slate-700">Distance</th>
                <th className="p-3.5 border-b border-slate-700">Marked By (Officer)</th>
                <th className="p-3.5 border-b border-slate-700">Status</th>
                <th className="p-3.5 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400">Loading attendance data...</td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500">No attendance records found for current filter.</td>
                </tr>
              ) : (
                attendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 font-semibold text-white">
                      <div>{rec.guard_name}</div>
                      <div className="text-[10px] text-slate-500">{rec.guard_mobile || 'No mobile'}</div>
                    </td>
                    <td className="p-3.5 text-slate-300">{rec.post_name}</td>
                    <td className="p-3.5 font-mono text-indigo-300 font-medium">
                      {formatTime12h(rec.shift_start_time)}
                    </td>
                    <td className="p-3.5 font-mono text-slate-200 font-semibold">
                      {rec.check_in_time ? formatTime12h(rec.check_in_time) : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-indigo-300 font-medium">
                      {formatTime12h(rec.shift_end_time)}
                    </td>
                    <td className="p-3.5 font-mono text-slate-200 font-semibold">
                      {rec.check_out_time ? formatTime12h(rec.check_out_time) : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                      {rec.check_in_distance_from_post || 0}m
                    </td>
                    <td className="p-3.5 text-sky-400 font-medium">{rec.marked_by_officer}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        rec.status === 'APPROVED' || rec.status === 'CHECKED_OUT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : rec.status === 'PENDING_REVIEW'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                          : rec.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      }`}>
                        {rec.status === 'PENDING_REVIEW' ? 'PENDING REVIEW (LATE)' : rec.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      {rec.status === 'PENDING_REVIEW' && (
                        <>
                          <button
                            onClick={() => promptStatusConfirmation(rec.id, 'APPROVED', rec.guard_name, 'Approved by Manager after review')}
                            title="Approve Attendance"
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => promptStatusConfirmation(rec.id, 'REJECTED', rec.guard_name, 'Rejected by Manager after review')}
                            title="Reject Attendance"
                            className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}

                      {rec.status !== 'PENDING_REVIEW' && rec.status !== 'REJECTED' && (
                        <button
                          onClick={() => promptStatusConfirmation(rec.id, 'REJECTED', rec.guard_name, 'Manually rejected by Manager')}
                          title="Reject Attendance"
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedRecord(rec)}
                        title="View Photos & Details"
                        className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>

                      <button
                        onClick={() => setCorrectingRecord(rec)}
                        title="Manual Correction"
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
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

      {/* Confirmation Modal */}
      {confirmModalData && (
        <ConfirmActionModal
          isOpen={!!confirmModalData}
          actionType={confirmModalData.newStatus}
          guardName={confirmModalData.guardName}
          loading={confirmLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModalData(null)}
        />
      )}

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
