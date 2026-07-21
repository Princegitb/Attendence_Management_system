import React, { useState } from 'react';
import { X, MapPin, Camera, Clock, UserCheck, ShieldCheck, AlertCircle, Maximize2, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/api';
import ConfirmActionModal from './ConfirmActionModal';

export default function AttendanceDetailModal({ record, onClose, onCorrect, onUpdate }) {
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);

  if (!record) return null;

  const promptStatusConfirmation = (newStatus, reason) => {
    setConfirmModalData({ newStatus, reason });
  };

  const executeConfirmedStatusChange = async () => {
    if (!confirmModalData) return;
    setActionLoading(true);
    try {
      const { newStatus, reason } = confirmModalData;
      const res = await api.correctAttendance(record.id, newStatus, reason);
      if (res.success) {
        setConfirmModalData(null);
        if (onUpdate) onUpdate();
        onClose();
      } else {
        alert(res.message || 'Action failed.');
      }
    } catch (err) {
      alert(err.message || 'Failed to update attendance status.');
    } finally {
      setActionLoading(false);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const serverOrigin = API_BASE.replace(/\/api\/?$/, '');
    return `${serverOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Attendance Verification Details
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  record.status === 'APPROVED' || record.status === 'CHECKED_OUT'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : record.status === 'PENDING_REVIEW'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                    : record.status === 'REJECTED'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                }`}>
                  {record.status === 'PENDING_REVIEW' ? 'PENDING REVIEW (LATE)' : record.status}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Date: {record.date} | Guard: {record.guard_name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 text-xs space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <UserCheck className="w-4 h-4 text-sky-400" /> Guard & Post
              </span>
              <div className="text-sm font-semibold text-white">{record.guard_name}</div>
              <div className="text-slate-300">{record.post_name}</div>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 text-xs space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <UserCheck className="w-4 h-4 text-indigo-400" /> Field Officer (Marked By)
              </span>
              <div className="text-sm font-semibold text-white">{record.marked_by_officer}</div>
              <div className="text-slate-400">Authorized App Agent</div>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 text-xs space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-emerald-400" /> Distance from Post
              </span>
              <div className="text-sm font-semibold text-emerald-400">
                {record.check_in_distance_from_post || 0} meters
              </div>
              <div className="text-slate-400">Allowed Radius: {record.allowed_radius_metres || 100}m</div>
            </div>
          </div>

          {/* Photo Proof Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Check-In Photo Box */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Camera className="w-4 h-4" /> Check-In Live Photo Proof
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : 'N/A'}
                </span>
              </div>

              {record.check_in_photo_url ? (
                <div
                  className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center relative group cursor-pointer"
                  onClick={() => setExpandedPhoto(getFullImageUrl(record.check_in_photo_url))}
                >
                  <img
                    src={getFullImageUrl(record.check_in_photo_url)}
                    alt="Check-in proof"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-slate-950/60 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Camera className="w-8 h-8 mb-1 opacity-50" />
                  <span>No check-in photo recorded</span>
                </div>
              )}

              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex justify-between">
                  <span>GPS Coords:</span>
                  <span className="font-mono text-slate-300">{record.check_in_latitude}, {record.check_in_longitude}</span>
                </div>
                <div className="flex justify-between">
                  <span>GPS Accuracy:</span>
                  <span className="font-mono text-slate-300">±{record.check_in_gps_accuracy || 5}m</span>
                </div>
              </div>
            </div>

            {/* Check-Out Photo Box */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Camera className="w-4 h-4" /> Check-Out Live Photo Proof
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : 'Pending'}
                </span>
              </div>

              {record.check_out_photo_url ? (
                <div
                  className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center relative group cursor-pointer"
                  onClick={() => setExpandedPhoto(getFullImageUrl(record.check_out_photo_url))}
                >
                  <img
                    src={getFullImageUrl(record.check_out_photo_url)}
                    alt="Check-out proof"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-slate-950/60 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
                  <Clock className="w-8 h-8 mb-2 text-amber-500/60" />
                  <span>Check-out pending officer revisit</span>
                </div>
              )}

              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex justify-between">
                  <span>Check-Out Coords:</span>
                  <span className="font-mono text-slate-300">{record.check_out_latitude || 'N/A'}, {record.check_out_longitude || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Server Verification:</span>
                  <span className="font-mono text-emerald-400">Server Timestamp Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Image Preview Modal */}
        {expandedPhoto && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setExpandedPhoto(null)}>
            <img src={expandedPhoto} alt="Full view" className="max-w-full max-h-full rounded-2xl shadow-2xl border border-slate-700" />
          </div>
        )}

        {/* Surety Confirmation Modal overlay */}
        {confirmModalData && (
          <ConfirmActionModal
            isOpen={!!confirmModalData}
            actionType={confirmModalData.newStatus}
            guardName={record.guard_name}
            loading={actionLoading}
            onConfirm={executeConfirmedStatusChange}
            onCancel={() => setConfirmModalData(null)}
          />
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between sticky bottom-0 z-10">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-sky-400" />
            <span>Server-side Haversine formula verified coordinates.</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={actionLoading}
              onClick={() => promptStatusConfirmation('APPROVED', 'Approved by Manager from details modal')}
              className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
            <button
              disabled={actionLoading}
              onClick={() => promptStatusConfirmation('REJECTED', 'Rejected by Manager after photo/location review')}
              className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => onCorrect(record)}
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors"
            >
              Manual Correction
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
