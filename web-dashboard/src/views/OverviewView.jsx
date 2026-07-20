import React, { useEffect, useState } from 'react';
import { Users, MapPin, UserSquare2, ClipboardCheck, ShieldCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function OverviewView({ onNavigate }) {
  const [guards, setGuards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [gRes, pRes, oRes, aRes] = await Promise.all([
          api.getGuards(),
          api.getPosts(),
          api.getOfficers(),
          api.getAttendance(new Date().toISOString().split('T')[0])
        ]);

        if (gRes.success) setGuards(gRes.data || []);
        if (pRes.success) setPosts(pRes.data || []);
        if (oRes.success) setOfficers(oRes.data || []);
        if (aRes.success) setAttendance(aRes.data || []);
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalGuards = guards.length;
  const activePosts = posts.length;
  const activeOfficers = officers.length;
  const todayCheckedIn = attendance.filter(a => a.check_in_time).length;
  const todayCheckedOut = attendance.filter(a => a.check_out_time).length;
  const attendanceRate = totalGuards > 0 ? Math.round((todayCheckedIn / totalGuards) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-900/40 via-slate-800 to-indigo-900/40 border border-slate-700/60 p-6 rounded-3xl flex items-center justify-between shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Operations Command Overview <ShieldCheck className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-300">
            Real-time monitoring of security guard posts, field officers, and GPS verified attendance.
          </p>
        </div>
        <button
          onClick={() => onNavigate('attendance')}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
        >
          <ClipboardCheck className="w-4 h-4" /> Live Attendance Monitor
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Guards</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalGuards}</div>
          <div className="text-[11px] text-slate-400">Database Records</div>
        </div>

        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Posts (OSM Geo-fenced)</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{activePosts}</div>
          <div className="text-[11px] text-slate-400">GPS Geo-fence Active</div>
        </div>

        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Field Officers</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <UserSquare2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{activeOfficers}</div>
          <div className="text-[11px] text-slate-400">Smartphone App Authorized</div>
        </div>

        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Today's Check-Ins</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{todayCheckedIn} / {totalGuards}</div>
          <div className="text-[11px] text-emerald-400 font-semibold">{attendanceRate}% Attendance Rate</div>
        </div>
      </div>

      {/* Live Recent Activity Table */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Today's Live Attendance Feed</h3>
            <p className="text-xs text-slate-400">Verified by Field Officer live photos & server Haversine formula</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Date: {new Date().toISOString().split('T')[0]}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3 border-b border-slate-700">Guard</th>
                <th className="p-3 border-b border-slate-700">Post</th>
                <th className="p-3 border-b border-slate-700">Marked By Officer</th>
                <th className="p-3 border-b border-slate-700">Check-In Time</th>
                <th className="p-3 border-b border-slate-700">Check-Out Time</th>
                <th className="p-3 border-b border-slate-700">Distance from Post</th>
                <th className="p-3 border-b border-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No attendance records marked yet today. Field Officers visit guards to mark attendance.
                  </td>
                </tr>
              ) : (
                attendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-semibold text-white">{rec.guard_name}</td>
                    <td className="p-3 text-slate-300">{rec.post_name}</td>
                    <td className="p-3 text-sky-400">{rec.marked_by_officer}</td>
                    <td className="p-3 font-mono text-slate-300">
                      {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString() : '-'}
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString() : '-'}
                    </td>
                    <td className="p-3 font-mono text-emerald-400">{rec.check_in_distance_from_post || 0}m</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${rec.status === 'CHECKED_OUT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : rec.status === 'CHECKED_IN'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                        {rec.status}
                      </span>
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
